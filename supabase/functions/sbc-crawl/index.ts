import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * sbc-crawl — San Bernardino County food facility crawler.
 *
 * WRITES ONLY facilities, inspections and sbc_crawl_tasks. Sends nothing,
 * generates no triggers.
 *
 * The portal is an ASP.NET WebMethod that returns RENDERED HTML INSIDE A
 * JSON STRING — a third payload shape after Stanislaus (clean JSON) and
 * Merced (plain HTML):
 *
 *   POST /FacilityList.aspx/getFacilityList
 *   {"mdl":{"__type":"DEHSPortalModel.FacilityPageM","Page":1,…},"searchFor":""}
 *   → {"d":"<div class='row' onclick='ViewFacInfo(\"FA0003080\");'>…"}
 *
 * Two measured facts that shape this crawler:
 *
 *  1. `__type` is "DEHSPortalModel.FacilityPageM" — NOT FacilityPageModel.
 *     The expanded spelling returns HTTP 500 "Operation is not valid due to
 *     the current state of the object."
 *
 *  2. PAGING PAST THE END DOES NOT RETURN EMPTY. Pages 1-191 give 50 rows,
 *     page 192 gives 28 (the true end, 9,578 facilities). Pages 193, 200
 *     and 500 each return a FULL, IDENTICAL 50-row page. So the queue is
 *     seeded to a fixed 192 and the crawler never pages until empty — that
 *     loop would never terminate and would rewrite the same rows forever.
 *
 * The list row carries an inspection date and a score, so inspections are
 * written from the list alone. There is NO violation detail here — probing
 * /Facility/{id} and /Permits/{id} returns the 740KB list shell, not a
 * detail payload. San Bernardino is a Due-trigger county.
 */

const TIME_BUDGET_MS = 90_000;
const HTTP_PAUSE_MS = 200;
const LAST_PAGE = 192;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Strip tags, decode the entities this portal emits, collapse whitespace. */
function clean(html: string): string {
  return html
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

/** "7/23/2026" → "2026-07-23". */
function toIsoDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

interface SbcRow {
  key: string;
  name: string | null;
  address: string | null;
  city: string | null;
  inspectionDate: string | null;
  score: number | null;
  permitRef: string | null;
}

/**
 * Parse the row fragments. Each carries its labels inline
 * ("Facility:&nbsp;", "Address:&nbsp;", …) which is what anchors the
 * extraction — column order alone would be brittle.
 */
function parseRows(html: string): SbcRow[] {
  const out: SbcRow[] = [];
  const chunks = html.split("<div class='row'");
  for (let i = 1; i < chunks.length; i++) {
    const frag = "<div class='row'" + chunks[i];
    const keyM = frag.match(/ViewFacInfo\("([^"]+)"\)/);
    if (!keyM) continue;

    const pick = (label: string): string | null => {
      const re = new RegExp(label + ":\\s*&nbsp;<\\/span>([\\s\\S]*?)<\\/div>");
      const m = frag.match(re);
      return m ? clean(m[1]) || null : null;
    };

    const rawDate = (frag.match(/Inspection:\s*&nbsp;<\/span>(\d{1,2}\/\d{1,2}\/\d{4})/) || [])[1] ?? null;
    const scoreM = frag.match(/Score:\s*&nbsp;<\/span>[\s\S]*?>(\d+)<\/a>/);
    const permitM = frag.match(/href='\/Permits\/([^']+)'/);

    out.push({
      key: keyM[1],
      name: pick("Facility"),
      address: pick("Address"),
      city: pick("City"),
      inspectionDate: rawDate ? toIsoDate(rawDate) : null,
      score: scoreM ? Number(scoreM[1]) : null,
      permitRef: permitM ? permitM[1] : null,
    });
  }
  return out;
}

async function fetchPage(endpoint: string, page: number, permit: string): Promise<SbcRow[]> {
  const body = {
    mdl: {
      __type: "DEHSPortalModel.FacilityPageM",
      Page: page,
      latitude: 0,
      longitude: 0,
      Score: "",
      Permit: permit,
      // facility asc is a stable ordering; sorting by date would shift
      // beneath the page walk as the county posts new inspections.
      Sort: "facility asc",
    },
    searchFor: "",
  };

  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          "user-agent": UA,
          "referer": "https://ehscsp.dph.sbcounty.gov/FacilityList/Food",
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const html = (j as { d?: string }).d ?? "";
      if (!html) throw new Error("empty payload");
      return parseRows(html);
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
    .eq("platform_family", "sbc_webmethod")
    .maybeSingle();

  if (srcErr || !srcRow) {
    return Response.json({ error: "sbc_webmethod source not found", detail: srcErr }, { status: 500 });
  }
  const sourceId = (srcRow as { id: string }).id;
  const cfg = (srcRow as { endpoint_config: Record<string, string> }).endpoint_config ?? {};
  const endpoint = cfg.endpoint ?? "https://ehscsp.dph.sbcounty.gov/FacilityList.aspx/getFacilityList";
  const permit = cfg.permit_code ?? "16";

  await supabase
    .from("sbc_crawl_tasks")
    .update({ status: "pending", claimed_at: null })
    .eq("source_id", sourceId)
    .eq("status", "running")
    .lt("claimed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  let tasksProcessed = 0;
  let tasksErrored = 0;
  let facilitiesWritten = 0;
  let inspectionsWritten = 0;
  let rowsWithoutDate = 0;
  const errors: string[] = [];

  while (Date.now() - startTime < TIME_BUDGET_MS) {
    const { data: tasks, error: taskErr } = await supabase
      .from("sbc_crawl_tasks")
      .select("id, page, attempts")
      .eq("source_id", sourceId)
      .eq("status", "pending")
      .order("page", { ascending: true })
      .limit(1);

    if (taskErr) { tasksErrored++; errors.push(`task query: ${taskErr.message}`); break; }
    if (!tasks || tasks.length === 0) break;

    const task = tasks[0] as { id: string; page: number; attempts: number };

    const { error: claimErr } = await supabase
      .from("sbc_crawl_tasks")
      .update({ status: "running", claimed_at: new Date().toISOString(), attempts: (task.attempts || 0) + 1 })
      .eq("id", task.id);
    if (claimErr) { tasksErrored++; errors.push(`claim: ${claimErr.message}`); continue; }

    try {
      if (task.page > LAST_PAGE) {
        // Defensive: the portal would hand back a full duplicate page.
        throw new Error(`page ${task.page} is past the ceiling of ${LAST_PAGE}`);
      }

      const rows = await fetchPage(endpoint, task.page, permit);
      if (rows.length === 0) throw new Error("parsed zero rows — fragment structure may have changed");

      const facByKey = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        facByKey.set(r.key, {
          source_id: sourceId,
          source_facility_key: r.key,
          name: r.name,
          address: r.address,
          city: r.city,
          zip: null,   // the fragment carries no zip
          phone: null, // nor a phone
          identity_status: "unresolved",
          last_crawled_at: new Date().toISOString(),
        });
      }

      const facRows = [...facByKey.values()];
      const { error: facErr } = await supabase
        .from("facilities")
        .upsert(facRows, { onConflict: "source_id,source_facility_key" });
      if (facErr) throw new Error(`facilities upsert: ${facErr.message}`);
      facilitiesWritten += facRows.length;

      // Inspections need facility_id, so resolve the keys back.
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
        if (!r.inspectionDate) { rowsWithoutDate++; continue; }
        const facId = idByKey.get(r.key);
        if (!facId) continue;
        inspByKey.set(`${r.key}|${r.inspectionDate}`, {
          facility_id: facId,
          source_id: sourceId,
          source_facility_key: r.key,
          source_inspection_key: `${r.key}|${r.inspectionDate}`,
          inspection_date: r.inspectionDate,
          inspection_type: null,
          score: r.score,
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
      }

      await supabase
        .from("sbc_crawl_tasks")
        .update({
          status: "done",
          facilities_found: facRows.length,
          last_error: null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      tasksProcessed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("sbc_crawl_tasks")
        .update({ status: "error", last_error: msg, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      tasksErrored++;
      if (errors.length < 5) errors.push(`page ${task.page}: ${msg}`);
    }

    await sleep(HTTP_PAUSE_MS);
  }

  const { count: remainingPending } = await supabase
    .from("sbc_crawl_tasks")
    .select("*", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .eq("status", "pending");

  return Response.json({
    ok: true,
    tasksProcessed,
    facilitiesWritten,
    inspectionsWritten,
    rowsWithoutDate,
    tasksErrored,
    remainingPending: remainingPending ?? null,
    elapsedMs: Date.now() - startTime,
    historyNote:
      "list rows carry ONE inspection date + score each, so exactly one inspection per facility — this is current state, not history. No violation detail exists on this portal (/Facility/{id} and /Permits/{id} both return the list shell), so CITED/CLEAN cannot be derived; San Bernardino is a Due-trigger county until a detail source is found.",
    errors,
  });
});
