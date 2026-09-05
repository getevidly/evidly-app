import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshInspectionStats, refreshFacilityCadence } from "../_shared/refreshInspectionStats.ts";

/**
 * stan-crawl — Stanislaus County food facility crawler.
 *
 * WRITES ONLY facilities, inspections and stan_crawl_tasks. Sends
 * nothing, generates no triggers.
 *
 * The API is a plain REST endpoint that is honest about truncation:
 *
 *   GET /foodinspections/api/facilities?city=TURLOCK&pageSize=1000
 *   → {items:[…], totalCount, page, pageSize, isTruncated}
 *
 * Measured behaviour that shapes this crawler:
 *   - pageSize caps at 1000 (asking 5000 yields 1000).
 *   - `page` works only up to 1000 rows total; page 11 at pageSize 100
 *     silently clamps back to page 10. So paging cannot escape the cap
 *     and there is no point walking pages — one 1000-row call gets
 *     everything a slice will ever give.
 *   - totalCount reports the cap, not the true population, so it is
 *     meaningless when isTruncated is true.
 *   - Only `city` and `name` are accepted; `zip` and `address` 400.
 *   - `name` is a CONTAINS match, not a prefix.
 *
 * So the rule is simply: fetch a slice at pageSize=1000. isTruncated
 * false means complete. isTruncated true means the slice hides an
 * unknown number of rows and must be split finer — never partially
 * loaded, because we cannot tell which rows are missing.
 *
 * Rows are per-INSPECTION, not per-facility: one lBusinessID recurs with
 * different lInspectionID/dtInspection, so this does carry history.
 */

const TIME_BUDGET_MS = 90_000;
const PAGE_SIZE = 1000;
const HTTP_PAUSE_MS = 200;
/** Split alphabet for a slice that overflows the 1000-row cap. */
const SPLIT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface StanRow {
  lBusinessID?: number;
  sName?: string;
  lStrNum?: number | null;
  sAddress?: string | null;
  sCity?: string | null;
  lInspectionID?: number;
  dtInspection?: string | null;
  inspectionType?: string | null;
  bFacClosed?: boolean;
  [k: string]: unknown;
}

interface SliceResult {
  items: StanRow[];
  totalCount: number;
  isTruncated: boolean;
}

/**
 * A slice_key is "CITY" for a city slice, or "CITY|LETTERS" for a
 * name slice nested inside a city.
 */
function parseSlice(kind: string, key: string): { city: string; name: string } {
  if (kind === "city") return { city: key, name: "" };
  const i = key.indexOf("|");
  return i < 0 ? { city: "", name: key } : { city: key.slice(0, i), name: key.slice(i + 1) };
}

async function fetchSlice(
  endpoint: string,
  city: string,
  name: string,
): Promise<SliceResult> {
  const qs = new URLSearchParams();
  if (city) qs.set("city", city);
  if (name) qs.set("name", name);
  qs.set("pageSize", String(PAGE_SIZE));
  const url = `${endpoint}?${qs.toString()}`;

  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: {
          "accept": "application/json",
          "referer": "https://secure.stancounty.com/foodinspections",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const j = await resp.json();
      return {
        items: (j.items ?? []) as StanRow[],
        totalCount: Number(j.totalCount ?? 0),
        isTruncated: !!j.isTruncated,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt === 0) await sleep(5_000);
    }
  }
  throw new Error(lastErr);
}

Deno.serve(async (_req: Request) => {
  const startTime = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: srcRow, error: srcErr } = await supabase
    .from("inspection_sources")
    .select("id, endpoint_config")
    .eq("platform_family", "stanislaus_rest")
    .maybeSingle();

  if (srcErr || !srcRow) {
    return Response.json({ error: "stanislaus_rest source not found", detail: srcErr }, { status: 500 });
  }

  const sourceId = (srcRow as { id: string }).id;
  const endpoint =
    ((srcRow as { endpoint_config: Record<string, string> }).endpoint_config?.endpoint) ??
    "https://secure.stancounty.com/foodinspections/api/facilities";

  // Release claims a dead run left behind.
  await supabase
    .from("stan_crawl_tasks")
    .update({ status: "pending", claimed_at: null })
    .eq("source_id", sourceId)
    .eq("status", "running")
    .lt("claimed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  let tasksProcessed = 0;
  let tasksSplit = 0;
  let tasksErrored = 0;
  let facilitiesWritten = 0;
  let inspectionsWritten = 0;
  const taskSummaries: Record<string, unknown>[] = [];

  while (Date.now() - startTime < TIME_BUDGET_MS) {
    const { data: tasks, error: taskErr } = await supabase
      .from("stan_crawl_tasks")
      .select("id, slice_kind, slice_key, attempts")
      .eq("source_id", sourceId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (taskErr) {
      tasksErrored++;
      taskSummaries.push({ error: `task query failed: ${taskErr.message}` });
      break;
    }
    if (!tasks || tasks.length === 0) break;

    const task = tasks[0] as { id: string; slice_kind: string; slice_key: string; attempts: number };

    const { error: claimErr } = await supabase
      .from("stan_crawl_tasks")
      .update({
        status: "running",
        claimed_at: new Date().toISOString(),
        attempts: (task.attempts || 0) + 1,
      })
      .eq("id", task.id);

    if (claimErr) {
      tasksErrored++;
      taskSummaries.push({ taskId: task.id, error: `claim failed: ${claimErr.message}` });
      continue;
    }

    try {
      const { city, name } = parseSlice(task.slice_kind, task.slice_key);
      const res = await fetchSlice(endpoint, city, name);

      // ── Truncated: split rather than load a partial slice ────────
      if (res.isTruncated) {
        const children = SPLIT_CHARS.map((ch) => ({
          source_id: sourceId,
          slice_kind: "name_prefix",
          slice_key: `${city}|${name}${ch}`,
        }));

        const { error: spawnErr } = await supabase
          .from("stan_crawl_tasks")
          .upsert(children, { onConflict: "source_id,slice_kind,slice_key", ignoreDuplicates: true });
        if (spawnErr) throw new Error(`spawn: ${spawnErr.message}`);

        await supabase
          .from("stan_crawl_tasks")
          .update({
            status: "split",
            truncated: true,
            facilities_found: res.items.length,
            completed_at: new Date().toISOString(),
          })
          .eq("id", task.id);

        tasksSplit++;
        taskSummaries.push({
          slice: task.slice_key, kind: task.slice_kind,
          truncated: true, spawned: children.length,
        });
        await sleep(HTTP_PAUSE_MS);
        continue;
      }

      // ── Complete slice: load it ──────────────────────────────────
      const rows = res.items;

      const facByKey = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        if (r.lBusinessID == null) continue;
        const street = [
          r.lStrNum != null ? String(r.lStrNum) : "",
          typeof r.sAddress === "string" ? r.sAddress.trim() : "",
        ].filter(Boolean).join(" ").trim();
        facByKey.set(String(r.lBusinessID), {
          source_id: sourceId,
          source_facility_key: String(r.lBusinessID),
          name: r.sName ?? null,
          address: street || null,
          city: r.sCity ?? null,
          zip: null,
          phone: null,
          last_crawled_at: new Date().toISOString(),
        });
      }

      const facRows = [...facByKey.values()];
      if (facRows.length > 0) {
        const { error: facErr } = await supabase
          .from("facilities")
          .upsert(facRows, { onConflict: "source_id,source_facility_key" });
        if (facErr) throw new Error(`facilities upsert: ${facErr.message}`);
        facilitiesWritten += facRows.length;
      }

      let inspectionsThisTask = 0;
      if (facRows.length > 0) {
        const { data: facIds, error: idErr } = await supabase
          .from("facilities")
          .select("id, source_facility_key")
          .eq("source_id", sourceId)
          .in("source_facility_key", [...facByKey.keys()]);
        if (idErr) throw new Error(`facility id lookup: ${idErr.message}`);

        const idByKey = new Map<string, string>();
        for (const f of (facIds ?? []) as { id: string; source_facility_key: string }[]) {
          idByKey.set(f.source_facility_key, f.id);
        }

        const inspByKey = new Map<string, Record<string, unknown>>();
        for (const r of rows) {
          if (r.lInspectionID == null || r.lBusinessID == null) continue;
          const facId = idByKey.get(String(r.lBusinessID));
          if (!facId) continue;
          inspByKey.set(String(r.lInspectionID), {
            facility_id: facId,
            source_id: sourceId,
            source_facility_key: String(r.lBusinessID),
            source_inspection_key: String(r.lInspectionID),
            inspection_date: (r.dtInspection ?? "").slice(0, 10) || null,
            inspection_type: r.inspectionType ?? null,
            raw_payload: r,
          });
        }

        const inspRows = [...inspByKey.values()];
        if (inspRows.length > 0) {
          const { error: insErr } = await supabase
            .from("inspections")
            .upsert(inspRows, { onConflict: "source_id,source_inspection_key" });
          if (insErr) throw new Error(`inspections upsert: ${insErr.message}`);
          inspectionsWritten += inspRows.length;
          inspectionsThisTask = inspRows.length;
        }
      }

      await supabase
        .from("stan_crawl_tasks")
        .update({
          status: "done",
          facilities_found: facRows.length,
          truncated: false,
          last_error: null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      tasksProcessed++;
      taskSummaries.push({
        slice: task.slice_key, kind: task.slice_kind,
        rows: rows.length, facilities: facRows.length, inspections: inspectionsThisTask,
        totalCount: res.totalCount,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("stan_crawl_tasks")
        .update({ status: "error", last_error: msg, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      tasksErrored++;
      taskSummaries.push({ slice: task.slice_key, kind: task.slice_kind, error: msg });
    }

    await sleep(HTTP_PAUSE_MS);
  }

  const { count: remainingPending } = await supabase
    .from("stan_crawl_tasks")
    .select("*", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .eq("status", "pending");

  // Keep the Inspections tab's summary KPIs current; see
  // _shared/refreshInspectionStats.ts. Never throws.
  // Cadence feeds the DUE rule in regenerate-triggers; recompute it
  // here, once per crawl, so regeneration stays a cheap lookup.
  const cadenceRefreshed = await refreshFacilityCadence(supabase, 'stanislaus-ca');
  const statsRefreshed = await refreshInspectionStats(supabase);

  return Response.json({
    ok: true,
    statsRefreshed,
    cadenceRefreshed,
    tasksProcessed,
    tasksSplit,
    tasksErrored,
    facilitiesWritten,
    inspectionsWritten,
    remainingPending: remainingPending ?? null,
    elapsedMs: Date.now() - startTime,
    // The list endpoint returns one row per inspection, so history comes
    // with it — no separate per-facility history endpoint is needed for
    // what this loads. Violation detail is NOT present in these rows and
    // would require a per-inspection endpoint we have not identified.
    historyNote:
      "list rows are per-inspection (lBusinessID repeats across lInspectionID), so inspection history is included; violation detail is absent and would need a separate endpoint",
    taskSummaries,
  });
});
