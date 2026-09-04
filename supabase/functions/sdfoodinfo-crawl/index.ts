import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshInspectionStats, refreshFacilityCadence } from "../_shared/refreshInspectionStats.ts";

/**
 * sdfoodinfo-crawl — recent-inspection refresh for San Diego County.
 *
 * WRITES ONLY facilities, inspections, violations, plus the derived
 * cadence/stats tables via the shared refreshers. It sends nothing.
 *
 * Body: { jurisdiction: "san-diego-ca", since_days?: number }
 *
 * THE API, recovered by watching the real site rather than guessing:
 *
 *   POST https://www.sdfoodinfo.org/restaurants/search.htm
 *   Content-Type: application/x-www-form-urlencoded
 *   start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&page_number=1&page_count=100
 *
 * The search JS lives in restaurant.js, which the page injects at runtime —
 * it is absent from the served HTML, which is why a static fetch of the
 * page finds no endpoint at all.
 *
 * A DATE FILTER EXISTS, and it is the difference between viable and not:
 *   start_date/end_date over 7 days -> total_count 449, ~5-8s per page
 *   no date filter at all           -> total_count 16872, 62s for one page
 * A dateless sweep cannot fit in an edge function. The dated query can.
 *
 * NO GEO ANCHOR. Passing lat/lng/miles makes the server return real
 * coordinates but silently drops the facilities it has no coordinates for
 * (449 -> 445). Completeness wins; see the lat/lng note below.
 *
 * A dated query selects FACILITIES that were inspected in the window, then
 * returns each one's ENTIRE inspection history (2023->today). That is not
 * waste — it refreshes the full record for every facility that moved, and
 * the upsert keys make re-writing history free.
 *
 * KEY CONVENTIONS — reproduced exactly from the rows the bulk load wrote.
 * Getting these wrong duplicates instead of updating:
 *   facility   source_facility_key   = business_id          "211943846586"
 *   inspection source_inspection_key = inspection_id        "5719134"
 *   violation  source_violation_key  = "{inspection_id}|{violation}|{rn}"
 *                                      "5719134|Food Contact Surfaces|1"
 * `rn` is not in the API payload. It is the 1-based ordinal of a violation
 * among same-named violations within one inspection, computed here the way
 * the original load computed it. It is 1 for all 145,840 rows on file, but
 * the counter is what makes the key unique if a name ever repeats.
 *
 * LAT/LNG ARE NOT OVERWRITTEN. All 16,538 stored facilities carry real
 * coordinates; the dateless search returns "0" for a few percent of rows.
 * Writing those back would destroy good data to record an absence, so a
 * zero or missing coordinate leaves the stored value untouched.
 *
 * IDENTITY_STATUS IS NOT WRITTEN. The column defaults to 'unresolved', so
 * a new facility still lands unresolved while an operator's resolution on
 * an existing one survives the crawl.
 */

const SEARCH_URL = "https://www.sdfoodinfo.org/restaurants/search.htm";
const SLUG = "san-diego-ca";

const PAGE_COUNT = 100;      // facilities per request; ~700KB and ~8s each
const MAX_PAGES = 25;        // hard cap — a crawl loop must never be unbounded
const FETCH_BUDGET_MS = 105_000; // stop fetching in time to still write
const CHUNK = 500;           // rows per upsert
const DEFAULT_SINCE_DAYS = 7;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const textOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

/** One page of the dated search. Returns the parsed body or throws. */
async function searchPage(
  startDate: string,
  endDate: string,
  pageNumber: number,
): Promise<{ result: any[]; total_count: number }> {
  const body = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    page_number: String(pageNumber),
    page_count: String(PAGE_COUNT),
  });

  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": UA,
      "Referer": "https://www.sdfoodinfo.org/restaurants/list_restaurants.html",
    },
    body,
  });

  if (!res.ok) throw new Error(`search.htm page ${pageNumber}: HTTP ${res.status}`);

  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // An HTML body here means a block page or an outage, not a result set.
    throw new Error(`search.htm page ${pageNumber}: non-JSON response (${text.slice(0, 120)})`);
  }
  return {
    result: Array.isArray(parsed?.result) ? parsed.result : [],
    total_count: Number(parsed?.total_count ?? 0),
  };
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ── Admin gate: @getevidly.com operator, or the service role ───────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const roleClaim = (() => {
    try {
      const part = token.split(".")[1];
      if (!part) return null;
      const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
      return (JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))) as { role?: string }).role ?? null;
    } catch { return null; }
  })();
  if (!(roleClaim === "service_role" || token === serviceKey)) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller?.email?.endsWith("@getevidly.com")) {
      return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { body = ((await req.json()) ?? {}) as Record<string, unknown>; } catch { /* empty ok */ }
  }

  const slug = typeof body.jurisdiction === "string" ? body.jurisdiction.trim() : SLUG;
  if (slug !== SLUG) {
    return Response.json(
      { ok: false, error: `sdfoodinfo-crawl serves ${SLUG}; got "${slug}"` },
      { status: 400 },
    );
  }

  // since_days: body override, else the stored operator setting.
  let sinceDays = DEFAULT_SINCE_DAYS;
  {
    const n = typeof body.since_days === "string" ? Number(body.since_days) : body.since_days;
    if (typeof n === "number" && Number.isInteger(n) && n > 0) {
      sinceDays = n;
    } else {
      const { data } = await supabase
        .from("inspection_settings").select("recency_days").eq("id", 1).maybeSingle();
      if (data?.recency_days) sinceDays = data.recency_days as number;
    }
  }

  const today = new Date();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDays);
  const startDate = ymd(since);
  const endDate = ymd(today);

  const { data: srcRow, error: srcErr } = await supabase
    .from("inspection_sources")
    .select("id, jurisdictions!inner(slug)")
    .eq("jurisdictions.slug", slug)
    .maybeSingle();
  if (srcErr || !srcRow) {
    return Response.json({ ok: false, error: `no source for ${slug}` }, { status: 500 });
  }
  const sourceId = (srcRow as { id: string }).id;

  let facilitiesWritten = 0;
  let inspectionsWritten = 0;
  let violationsWritten = 0;
  let pagesFetched = 0;
  let totalCount = 0;
  let truncated = false;
  const errors: string[] = [];

  try {
    // ── Fetch the dated window, page by page, bounded three ways ─────
    const businesses: any[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      if (Date.now() - startTime > FETCH_BUDGET_MS) { truncated = true; break; }

      const { result, total_count } = await searchPage(startDate, endDate, page);
      pagesFetched++;
      if (page === 1) totalCount = total_count;
      businesses.push(...result);

      if (result.length < PAGE_COUNT) break;          // last page
      if (businesses.length >= total_count) break;    // covered
      if (page === MAX_PAGES) truncated = true;
      await sleep(150);
    }

    // ── Facilities ───────────────────────────────────────────────────
    // Deduped by key: a repeated key inside one upsert batch fails with
    // "ON CONFLICT DO UPDATE command cannot affect row a second time".
    const facByKey = new Map<string, Record<string, unknown>>();
    for (const b of businesses) {
      const key = textOrNull(b.business_id);
      if (!key) continue;
      const lat = numOrNull(b.lat);
      const lng = numOrNull(b.long);
      const row: Record<string, unknown> = {
        source_id: sourceId,
        source_facility_key: key,
        name: textOrNull(b.name),
        address: textOrNull(b.address),
        city: textOrNull(b.city),
        zip: textOrNull(b.zip),
        phone: textOrNull(b.phone),
        last_crawled_at: new Date().toISOString(),
      };
      // Only real coordinates; a 0 means "not geocoded", not "at 0,0".
      if (lat !== null && lat !== 0) row.lat = lat;
      if (lng !== null && lng !== 0) row.lng = lng;
      facByKey.set(key, row);
    }

    const facRows = [...facByKey.values()];
    for (let i = 0; i < facRows.length; i += CHUNK) {
      const { error } = await supabase
        .from("facilities")
        .upsert(facRows.slice(i, i + CHUNK), { onConflict: "source_id,source_facility_key" });
      if (error) throw new Error(`facilities: ${error.message}`);
      facilitiesWritten += Math.min(CHUNK, facRows.length - i);
    }

    // Resolve facility ids for the keys just written.
    const facIdByKey = new Map<string, string>();
    const facKeys = [...facByKey.keys()];
    for (let i = 0; i < facKeys.length; i += 300) {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, source_facility_key")
        .eq("source_id", sourceId)
        .in("source_facility_key", facKeys.slice(i, i + 300));
      if (error) throw new Error(`facility ids: ${error.message}`);
      for (const r of (data ?? []) as any[]) facIdByKey.set(String(r.source_facility_key), r.id);
    }

    // ── Inspections ──────────────────────────────────────────────────
    const inspByKey = new Map<string, Record<string, unknown>>();
    // Keep the API violation arrays alongside, keyed by inspection key.
    const vioByInspKey = new Map<string, any[]>();

    for (const b of businesses) {
      const facKey = textOrNull(b.business_id);
      const facilityId = facKey ? facIdByKey.get(facKey) : undefined;
      if (!facKey || !facilityId) continue;

      for (const ins of (Array.isArray(b.inspections) ? b.inspections : [])) {
        const inspKey = textOrNull(ins.inspection_id);
        const date = textOrNull(ins.completed_date);
        if (!inspKey || !date) continue;

        inspByKey.set(inspKey, {
          facility_id: facilityId,
          source_id: sourceId,
          source_facility_key: facKey,
          source_inspection_key: inspKey,
          inspection_date: date,
          inspection_type: textOrNull(ins.type),
          outcome: textOrNull(ins.grade),      // "" grade means ungraded, not a grade
          score: numOrNull(ins.score),
          // The shape the bulk load stored: the API object minus the
          // link fields and the nested violations.
          raw_payload: {
            business_id: facKey,
            completed_date: date,
            custom_id: ins.custom_id ?? "",
            description: ins.description ?? "",
            grade: ins.grade ?? "",
            inspection_id: inspKey,
            score: ins.score ?? "",
            status: ins.status ?? "",
            type: ins.type ?? "",
          },
        });

        if (Array.isArray(ins.violations) && ins.violations.length > 0) {
          vioByInspKey.set(inspKey, ins.violations);
        }
      }
    }

    const inspRows = [...inspByKey.values()];
    for (let i = 0; i < inspRows.length; i += CHUNK) {
      const { error } = await supabase
        .from("inspections")
        .upsert(inspRows.slice(i, i + CHUNK), { onConflict: "source_id,source_inspection_key" });
      if (error) throw new Error(`inspections: ${error.message}`);
      inspectionsWritten += Math.min(CHUNK, inspRows.length - i);
    }

    // ── Violations ───────────────────────────────────────────────────
    // Need the inspection UUIDs, so read back the keys just written.
    const inspIdByKey = new Map<string, string>();
    const inspKeys = [...inspByKey.keys()];
    for (let i = 0; i < inspKeys.length; i += 300) {
      const { data, error } = await supabase
        .from("inspections")
        .select("id, source_inspection_key")
        .eq("source_id", sourceId)
        .in("source_inspection_key", inspKeys.slice(i, i + 300));
      if (error) throw new Error(`inspection ids: ${error.message}`);
      for (const r of (data ?? []) as any[]) inspIdByKey.set(String(r.source_inspection_key), r.id);
    }

    const vioByKey = new Map<string, Record<string, unknown>>();
    for (const [inspKey, vios] of vioByInspKey) {
      const inspectionId = inspIdByKey.get(inspKey);
      if (!inspectionId) continue;

      // rn: the ordinal among same-named violations in this inspection.
      const seen = new Map<string, number>();
      for (const v of vios) {
        const name = textOrNull(v.violation);
        if (!name) continue;
        const rn = (seen.get(name) ?? 0) + 1;
        seen.set(name, rn);

        const vioKey = `${inspKey}|${name}|${rn}`;
        vioByKey.set(`${inspectionId}::${vioKey}`, {
          inspection_id: inspectionId,
          source_violation_key: vioKey,
          source_code: name,
          description: textOrNull(v.violation_text) ?? name,
          severity_raw: v.major_violation === "Y" ? "major" : "minor",
          corrected_on_site: false,
          raw_payload: {
            inspection_id: inspKey,
            major_violation: v.major_violation ?? "",
            rn,
            status: v.status ?? "",
            violation: name,
            violation_accela: v.violation_accela ?? "",
            violation_text: v.violation_text ?? "",
          },
        });
      }
    }

    const vioRows = [...vioByKey.values()];
    for (let i = 0; i < vioRows.length; i += CHUNK) {
      const { error } = await supabase
        .from("violations")
        .upsert(vioRows.slice(i, i + CHUNK), { onConflict: "inspection_id,source_violation_key" });
      if (error) throw new Error(`violations: ${error.message}`);
      violationsWritten += Math.min(CHUNK, vioRows.length - i);
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const cadenceRefreshed = await refreshFacilityCadence(supabase, slug);
  const statsRefreshed = await refreshInspectionStats(supabase);

  return Response.json({
    ok: errors.length === 0,
    jurisdiction: slug,
    since_days: sinceDays,
    // `since` mirrors the other crawlers so refresh-jurisdiction can read
    // one field name across all of them; `window` carries both ends.
    since: startDate,
    window: { start_date: startDate, end_date: endDate },
    pagesFetched,
    totalCount,
    truncated,
    facilitiesWritten,
    inspectionsWritten,
    violationsWritten,
    cadenceRefreshed,
    statsRefreshed,
    elapsedMs: Date.now() - startTime,
    errors,
  });
});
