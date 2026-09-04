import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshInspectionStats } from "../_shared/refreshInspectionStats.ts";

/**
 * merced-crawl — Merced County food facility crawler.
 *
 * WRITES ONLY facilities, inspections, violations and merced_crawl_tasks.
 * Sends nothing, generates no triggers.
 *
 * Merced is the first fresh source that carries VIOLATION DETAIL, so this
 * is the first crawler in the project to populate `violations`.
 *
 * Two pages, both plain server-rendered ASP.NET WebForms:
 *
 *   LIST   FoodInspect.aspx
 *          The whole county in one GET — 1,081 rows, no paging, no cap.
 *          Each row: detail link (FA… id), name, current rating, last
 *          inspection date, city, address. Facilities load from this pass
 *          alone, so no detail fetch is needed to create them.
 *
 *   DETAIL FoodInspectDetail.aspx?id=FA…
 *          One `…rptResultsByInspection_ctlNN_grdDetail` table PER
 *          INSPECTION — this page carries HISTORY, not just the latest
 *          inspection. Each grid's rows are
 *          [date, violation, points, correction, comments, facility area].
 *
 * A clean inspection still renders one grid row, with the violation cell
 * reading "No violations were noted during this inspection." That is
 * Merced's clean signal — absence of a real violation, as with LA/SF — so
 * the inspection row is still written and simply gets no children.
 *
 * violations has no source_id column; its unique index is
 * (inspection_id, source_violation_key), so the key is scoped per
 * inspection and carries a deterministic ordinal — a second violation row
 * must never silently collapse into the first.
 */

const TIME_BUDGET_MS = 90_000;
const HTTP_PAUSE_MS = 200;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Strip tags, decode the few entities this site emits, collapse whitespace. */
function clean(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** "8-20-2026" → "2026-08-20". Returns null on anything unexpected. */
function toIsoDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

async function getPage(url: string): Promise<string> {
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, "accept": "text/html" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt === 0) await sleep(5_000);
    }
  }
  throw new Error(lastErr);
}

interface ListRow {
  key: string; name: string; rating: string; lastDate: string; city: string; address: string;
}

/** Parse the list grid. One row per facility. */
function parseList(html: string): ListRow[] {
  const re =
    /<a href="FoodInspectDetail\.aspx\?id=(FA\d+)">Detail<\/a><\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td>/g;
  const out: ListRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push({
      key: m[1],
      name: clean(m[2]),
      rating: clean(m[3]),
      lastDate: clean(m[4]),
      city: clean(m[5]),
      address: clean(m[6]),
    });
  }
  return out;
}

interface VioRow {
  date: string; violation: string; points: string; correction: string; comments: string; area: string;
}

/** Parse the detail page into one entry per inspection grid. */
function parseDetail(html: string): {
  facilityName: string | null;
  address: string | null;
  inspections: { date: string; rating: string | null; points: number | null; rows: VioRow[] }[];
} {
  const nameM = html.match(/id="ctl00_content_lblFacility"[^>]*>([\s\S]*?)<\/span>/);
  const addrM = html.match(/id="ctl00_content_lblAddress"[^>]*>([\s\S]*?)<\/span>/);

  // "Rating on date 8-20-2026: Satisfactory (Total Points: 11.00)"
  const ratingByDate = new Map<string, { rating: string; points: number }>();
  const rRe = /Rating on date\s*([\d-]+)\s*:\s*([A-Za-z]+)\s*\(Total Points:\s*([\d.]+)\)/g;
  let rm: RegExpExecArray | null;
  while ((rm = rRe.exec(html)) !== null) {
    ratingByDate.set(rm[1].trim(), { rating: rm[2].trim(), points: parseFloat(rm[3]) });
  }

  // One grid per inspection.
  const gridRe = /<table[^>]*id="[^"]*grdDetail"[^>]*>([\s\S]*?)<\/table>/g;
  const rowRe =
    /<tr>\s*<td align="center">([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td align="center">([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td>\s*<\/tr>/g;

  const inspections: { date: string; rating: string | null; points: number | null; rows: VioRow[] }[] = [];
  let g: RegExpExecArray | null;
  while ((g = gridRe.exec(html)) !== null) {
    const body = g[1];
    const rows: VioRow[] = [];
    rowRe.lastIndex = 0;
    let r: RegExpExecArray | null;
    while ((r = rowRe.exec(body)) !== null) {
      rows.push({
        date: clean(r[1]),
        violation: clean(r[2]),
        points: clean(r[3]),
        correction: clean(r[4]),
        comments: clean(r[5]),
        area: clean(r[6]),
      });
    }
    if (rows.length === 0) continue;
    const rawDate = rows[0].date;
    const meta = ratingByDate.get(rawDate);
    inspections.push({
      date: rawDate,
      rating: meta?.rating ?? null,
      points: meta?.points ?? null,
      rows,
    });
  }

  return {
    facilityName: nameM ? clean(nameM[1]) : null,
    address: addrM ? clean(addrM[1]) : null,
    inspections,
  };
}

/** Merced's clean signal is a sentinel row, not an empty grid. */
function isCleanRow(v: VioRow): boolean {
  return /no violations were noted/i.test(v.violation);
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
    .eq("platform_family", "merced_aspx")
    .maybeSingle();

  if (srcErr || !srcRow) {
    return Response.json({ error: "merced_aspx source not found", detail: srcErr }, { status: 500 });
  }
  const sourceId = (srcRow as { id: string }).id;
  const cfg = (srcRow as { endpoint_config: Record<string, string> }).endpoint_config ?? {};
  const listUrl = cfg.list_url ??
    "https://apps.co.merced.ca.us/PublicApplets/pages/FoodInspect/FoodInspect.aspx";
  const detailUrl = cfg.detail_url ??
    "https://apps.co.merced.ca.us/PublicApplets/pages/FoodInspect/FoodInspectDetail.aspx";

  let facilitiesWritten = 0;
  let inspectionsWritten = 0;
  let violationsWritten = 0;
  let tasksProcessed = 0;
  let tasksErrored = 0;
  let tasksSeeded = 0;
  let listFacilities = 0;
  const errors: string[] = [];

  // Release claims a dead run left holding.
  await supabase
    .from("merced_crawl_tasks")
    .update({ status: "pending", claimed_at: null })
    .eq("source_id", sourceId)
    .eq("status", "running")
    .lt("claimed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  // ── Seed pass: only when the queue has never been built ──────────
  const { count: existingTasks } = await supabase
    .from("merced_crawl_tasks")
    .select("*", { count: "exact", head: true })
    .eq("source_id", sourceId);

  if ((existingTasks ?? 0) === 0) {
    const html = await getPage(listUrl);
    const rows = parseList(html);
    listFacilities = rows.length;
    if (rows.length === 0) {
      return Response.json({ error: "list parsed zero rows — structure changed" }, { status: 500 });
    }

    // Facilities come straight off the list; no detail fetch needed.
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((r) => ({
        source_id: sourceId,
        source_facility_key: r.key,
        name: r.name || null,
        address: r.address || null,
        city: r.city || null,
        zip: null,
        phone: null,
        identity_status: "unresolved",
        last_crawled_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("facilities")
        .upsert(chunk, { onConflict: "source_id,source_facility_key" });
      if (error) return Response.json({ error: `facilities upsert: ${error.message}` }, { status: 500 });
      facilitiesWritten += chunk.length;
    }

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((r) => ({
        source_id: sourceId,
        facility_key: r.key,
      }));
      const { error } = await supabase
        .from("merced_crawl_tasks")
        .upsert(chunk, { onConflict: "source_id,facility_key", ignoreDuplicates: true });
      if (error) return Response.json({ error: `task seed: ${error.message}` }, { status: 500 });
      tasksSeeded += chunk.length;
    }
  }

  // ── Detail pass ──────────────────────────────────────────────────
  while (Date.now() - startTime < TIME_BUDGET_MS) {
    const { data: tasks, error: taskErr } = await supabase
      .from("merced_crawl_tasks")
      .select("id, facility_key, attempts")
      .eq("source_id", sourceId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (taskErr) { tasksErrored++; errors.push(`task query: ${taskErr.message}`); break; }
    if (!tasks || tasks.length === 0) break;

    const task = tasks[0] as { id: string; facility_key: string; attempts: number };

    const { error: claimErr } = await supabase
      .from("merced_crawl_tasks")
      .update({ status: "running", claimed_at: new Date().toISOString(), attempts: (task.attempts || 0) + 1 })
      .eq("id", task.id);
    if (claimErr) { tasksErrored++; errors.push(`claim: ${claimErr.message}`); continue; }

    try {
      const html = await getPage(`${detailUrl}?id=${encodeURIComponent(task.facility_key)}`);
      const parsed = parseDetail(html);

      const { data: facRow, error: facErr } = await supabase
        .from("facilities")
        .select("id")
        .eq("source_id", sourceId)
        .eq("source_facility_key", task.facility_key)
        .maybeSingle();
      if (facErr) throw new Error(`facility lookup: ${facErr.message}`);
      if (!facRow) throw new Error("facility row missing for task key");
      const facilityId = (facRow as { id: string }).id;

      for (const insp of parsed.inspections) {
        const iso = toIsoDate(insp.date);
        if (!iso) continue;
        const inspKey = `${task.facility_key}|${iso}`;

        const { data: insRow, error: insErr } = await supabase
          .from("inspections")
          .upsert({
            facility_id: facilityId,
            source_id: sourceId,
            source_facility_key: task.facility_key,
            source_inspection_key: inspKey,
            inspection_date: iso,
            inspection_type: insp.rating ?? null,
            score: insp.points,
            raw_payload: { rating: insp.rating, points: insp.points, date: insp.date, rows: insp.rows },
          }, { onConflict: "source_id,source_inspection_key" })
          .select("id")
          .maybeSingle();
        if (insErr) throw new Error(`inspections upsert: ${insErr.message}`);
        if (!insRow) continue;
        inspectionsWritten++;
        const inspectionId = (insRow as { id: string }).id;

        // Ordinal is the row's position in this inspection's grid, so a
        // repeated violation text cannot collapse onto its predecessor.
        const vios = insp.rows
          .map((v, ordinal) => ({ v, ordinal }))
          .filter(({ v }) => !isCleanRow(v))
          .map(({ v, ordinal }) => ({
            inspection_id: inspectionId,
            source_violation_key: `${task.facility_key}|${iso}|${ordinal}`,
            source_code: null,
            description: v.violation || null,
            severity_raw: v.points || null,
            raw_payload: v,
          }));

        if (vios.length > 0) {
          const { error: vErr } = await supabase
            .from("violations")
            .upsert(vios, { onConflict: "inspection_id,source_violation_key" });
          if (vErr) throw new Error(`violations upsert: ${vErr.message}`);
          violationsWritten += vios.length;
        }
      }

      await supabase
        .from("merced_crawl_tasks")
        .update({ status: "done", last_error: null, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      tasksProcessed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("merced_crawl_tasks")
        .update({ status: "error", last_error: msg, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      tasksErrored++;
      if (errors.length < 5) errors.push(`${task.facility_key}: ${msg}`);
    }

    await sleep(HTTP_PAUSE_MS);
  }

  const { count: remainingPending } = await supabase
    .from("merced_crawl_tasks")
    .select("*", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .eq("status", "pending");

  // Keep the Inspections tab's summary KPIs current; see
  // _shared/refreshInspectionStats.ts. Never throws.
  const statsRefreshed = await refreshInspectionStats(supabase);

  return Response.json({
    ok: true,
    statsRefreshed,
    listFacilities,
    tasksSeeded,
    tasksProcessed,
    facilitiesWritten,
    inspectionsWritten,
    violationsWritten,
    tasksErrored,
    remainingPending: remainingPending ?? null,
    elapsedMs: Date.now() - startTime,
    errors,
  });
});
