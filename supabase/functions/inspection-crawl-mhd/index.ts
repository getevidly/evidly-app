import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshInspectionStats, refreshFacilityCadence } from "../_shared/refreshInspectionStats.ts";

/**
 * inspection-crawl-mhd — one crawler for all five MyHealthDepartment
 * counties (Sacramento, Orange, Placer, San Luis Obispo, Tehama).
 *
 * The five run identical software behind a single JSON-RPC endpoint that
 * differs only by a `path` string, so one adapter covers all of them:
 *
 *   POST https://inspections.myhealthdepartment.com/
 *   {"task":"searchInspections","data":{"path":"sacramento",...}}
 *
 * WRITES ONLY facilities, inspections and mhd_crawl_tasks. It sends
 * nothing and generates no triggers — trigger generation is a separate
 * step that already exists.
 *
 * Why day-slicing: the API caps a page at 25 rows and refuses any
 * `start` beyond ~200, so a single query can never return more than 225
 * rows and reports no total. Narrowing the date filter to one day resets
 * that ceiling, and daily volume (~70 for Sacramento) sits far below it,
 * so a day exhausts naturally. A day that still returns a full page at
 * start=200 is genuinely over the ceiling and is parked as an error for
 * a half-day split rather than silently truncated.
 *
 * NOTE ON VIOLATIONS: searchInspections returns no violation detail, so
 * these inspections are loaded without violation children. That is
 * expected. The CITED/CLEAN split for these counties needs the
 * facility-detail endpoint and is deliberately out of scope here.
 */

/** Stop claiming new work at 90s; the platform's idle ceiling is 150s. */
const TIME_BUDGET_MS = 90_000;
const PAGE_SIZE = 25;
/** A page starting here that is still full means the day exceeds the ceiling. */
const OFFSET_CEILING = 200;
const HTTP_PAUSE_MS = 200;
/** Only this county's payload carries a phone number. */
const PHONE_PATHS = new Set(["ca-san-luis-county"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface MhdRow {
  inspectionID?: string;
  inspectionDate?: string;
  inspectionType?: string;
  score?: number | null;
  establishmentName?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  zip?: string | null;
  permitID?: string;
  phone?: string | null;
  [k: string]: unknown;
}

/** One page of one day. Retries once on a transport failure. */
async function fetchPage(
  endpoint: string,
  path: string,
  day: string,
  start: number,
): Promise<MhdRow[]> {
  const body = {
    task: "searchInspections",
    data: {
      path,
      programName: "",
      filters: { date: `${day} to ${day}`, purpose: "", type: "" },
      start,
      count: PAGE_SIZE,
      searchStr: "",
      lat: 0,
      lng: 0,
      sort: {},
    },
  };

  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // The portal 403s a bare client; mirror what the page sends.
          "accept": "*/*",
          "origin": "https://inspections.myhealthdepartment.com",
          "referer": `https://inspections.myhealthdepartment.com/${path}`,
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const j = await resp.json();
      if (j && typeof j === "object" && (j as Record<string, unknown>).error === true) {
        throw new Error(String((j as Record<string, unknown>).msg ?? "api error"));
      }

      // The response is an object with numeric keys, not an array.
      return Object.keys(j)
        .filter((k) => /^\d+$/.test(k))
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => (j as Record<string, MhdRow>)[k]);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      // A transport blip gets one more go; a 4xx/5xx will simply fail again.
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

  // ── Source config, keyed by source_id ────────────────────────────
  const { data: srcData, error: srcErr } = await supabase
    .from("inspection_sources")
    .select("id, endpoint_config")
    .eq("platform_family", "myhealthdepartment");

  if (srcErr || !srcData || srcData.length === 0) {
    return Response.json(
      { error: "No myhealthdepartment sources found.", detail: srcErr },
      { status: 500 },
    );
  }

  const cfgById = new Map<string, { endpoint: string; path: string }>();
  for (const s of srcData as { id: string; endpoint_config: Record<string, string> }[]) {
    cfgById.set(s.id, {
      endpoint: s.endpoint_config?.endpoint ?? "https://inspections.myhealthdepartment.com/",
      path: s.endpoint_config?.path ?? "",
    });
  }

  // Release claims a previous run died holding.
  await supabase
    .from("mhd_crawl_tasks")
    .update({ status: "pending", claimed_at: null })
    .eq("status", "running")
    .lt("claimed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  let tasksProcessed = 0;
  let tasksErrored = 0;
  let facilitiesWritten = 0;
  let inspectionsWritten = 0;
  const perSource: Record<string, number> = {};
  const taskSummaries: Record<string, unknown>[] = [];

  while (Date.now() - startTime < TIME_BUDGET_MS) {
    // ── Claim the oldest pending task, any source ──────────────────
    const { data: tasks, error: taskErr } = await supabase
      .from("mhd_crawl_tasks")
      .select("id, source_id, day, attempts")
      .eq("status", "pending")
      .order("day", { ascending: true })
      .limit(1);

    if (taskErr) {
      tasksErrored++;
      taskSummaries.push({ error: `task query failed: ${taskErr.message}` });
      break;
    }
    if (!tasks || tasks.length === 0) break;

    const task = tasks[0] as { id: string; source_id: string; day: string; attempts: number };
    const cfg = cfgById.get(task.source_id);

    const { error: claimErr } = await supabase
      .from("mhd_crawl_tasks")
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

    if (!cfg || !cfg.path) {
      await supabase
        .from("mhd_crawl_tasks")
        .update({ status: "error", last_error: "source has no endpoint_config.path", completed_at: new Date().toISOString() })
        .eq("id", task.id);
      tasksErrored++;
      continue;
    }

    try {
      // ── Page the day until a short page ends it ──────────────────
      const rows: MhdRow[] = [];
      let start = 0;
      let overCeiling = false;

      for (;;) {
        const page = await fetchPage(cfg.endpoint, cfg.path, task.day, start);
        rows.push(...page);

        if (page.length < PAGE_SIZE) break;
        if (start >= OFFSET_CEILING) {
          // Still full at the ceiling: the day genuinely holds more than
          // the API will hand over. Park it rather than truncate silently.
          overCeiling = true;
          break;
        }
        start += PAGE_SIZE;
        await sleep(HTTP_PAUSE_MS);
      }

      if (overCeiling) {
        await supabase
          .from("mhd_crawl_tasks")
          .update({
            status: "error",
            last_error: "exceeds 225, needs half-day split",
            rows_found: rows.length,
            completed_at: new Date().toISOString(),
          })
          .eq("id", task.id);
        tasksErrored++;
        taskSummaries.push({ taskId: task.id, path: cfg.path, day: task.day, rows: rows.length, error: "exceeds 225" });
        await sleep(HTTP_PAUSE_MS);
        continue;
      }

      // ── Facilities ───────────────────────────────────────────────
      const carriesPhone = PHONE_PATHS.has(cfg.path);
      const facByKey = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        const key = r.permitID;
        if (!key) continue;
        const street = [r.addressLine1, r.addressLine2]
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter(Boolean)
          .join(" ");
        facByKey.set(key, {
          source_id: task.source_id,
          source_facility_key: key,
          name: r.establishmentName ?? null,
          address: street || null,
          city: r.city ?? null,
          zip: r.zip ?? null,
          ...(carriesPhone ? { phone: r.phone ?? null } : {}),
          identity_status: "unresolved",
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

      // ── Inspections (need facility_id, so resolve the keys back) ──
      let inspectionsThisTask = 0;
      if (facRows.length > 0) {
        const { data: facIds, error: idErr } = await supabase
          .from("facilities")
          .select("id, source_facility_key")
          .eq("source_id", task.source_id)
          .in("source_facility_key", [...facByKey.keys()]);
        if (idErr) throw new Error(`facility id lookup: ${idErr.message}`);

        const idByKey = new Map<string, string>();
        for (const f of (facIds ?? []) as { id: string; source_facility_key: string }[]) {
          idByKey.set(f.source_facility_key, f.id);
        }

        const inspByKey = new Map<string, Record<string, unknown>>();
        for (const r of rows) {
          const insKey = r.inspectionID;
          const facId = r.permitID ? idByKey.get(r.permitID) : undefined;
          if (!insKey || !facId) continue;
          inspByKey.set(insKey, {
            facility_id: facId,
            source_id: task.source_id,
            source_facility_key: r.permitID,
            source_inspection_key: insKey,
            inspection_date: (r.inspectionDate ?? "").slice(0, 10) || null,
            inspection_type: r.inspectionType ?? null,
            score: typeof r.score === "number" ? r.score : null,
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
        .from("mhd_crawl_tasks")
        .update({ status: "done", rows_found: rows.length, last_error: null, completed_at: new Date().toISOString() })
        .eq("id", task.id);

      tasksProcessed++;
      perSource[cfg.path] = (perSource[cfg.path] ?? 0) + rows.length;
      taskSummaries.push({
        taskId: task.id, path: cfg.path, day: task.day,
        rows: rows.length, facilities: facRows.length, inspections: inspectionsThisTask,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("mhd_crawl_tasks")
        .update({ status: "error", last_error: msg, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      tasksErrored++;
      taskSummaries.push({ taskId: task.id, path: cfg.path, day: task.day, error: msg });
    }

    await sleep(HTTP_PAUSE_MS);
  }

  const { count: remainingPending } = await supabase
    .from("mhd_crawl_tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Keep the Inspections tab's summary KPIs current; see
  // _shared/refreshInspectionStats.ts. Never throws.
  // Cadence feeds the DUE rule in regenerate-triggers; recompute it
  // here, once per crawl, so regeneration stays a cheap lookup.
  const cadenceRefreshed = await refreshFacilityCadence(supabase, null);
  const statsRefreshed = await refreshInspectionStats(supabase);

  return Response.json({
    ok: true,
    statsRefreshed,
    cadenceRefreshed,
    tasksProcessed,
    tasksErrored,
    facilitiesWritten,
    inspectionsWritten,
    perSource,
    remainingPending: remainingPending ?? null,
    elapsedMs: Date.now() - startTime,
    taskSummaries,
  });
});
