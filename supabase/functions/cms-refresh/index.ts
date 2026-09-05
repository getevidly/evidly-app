import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * cms-refresh — loads the California nursing-home picture into
 * cms_facilities from CMS and CDPH.
 *
 * WRITES ONLY cms_facilities. It never touches cms_call_log, and it never
 * names call_status or next_step_date in any upsert, so call history and
 * operator state survive every refresh. That is enforced by construction:
 * each step builds a row object containing only its own columns.
 *
 * SOURCES — all public, no auth:
 *   Provider Information      4pq5-n9py   1,165 CA rows
 *   Health Deficiencies       r5ix-sfxw  58,141 CA rows
 *   Fire Safety Deficiencies  ifjz-ge4w  23,779 CA rows
 *   Penalties                 g6vv-u9sr   1,310 CA rows
 *   CDPH ELMS facility list   data.chhs.ca.gov, health_facility_locations.csv
 *
 * WHY THE DATASTORE API AND NOT THE CSVs. The published CSVs are national:
 * Health Deficiencies alone is 158MB and Fire Safety 66MB, which no edge
 * invocation can hold. The Provider Data Catalog's datastore query API
 * takes a server-side `state = CA` condition and returns JSON, which turns
 * 224MB of download into ~84k CA rows. Pages cap at 1000 (5000 errors), so
 * the large steps page through: health 59 pages, fire 24.
 *
 * TAG NUMBERS ARE ZERO-PADDED TO FOUR DIGITS in both citation files —
 * F812 is "0812", K324 is "0324". Matching on "812" silently returns
 * nothing, which would look like a clean facility rather than a bug.
 *
 * BATCHED BY STEP. Body { step } accepts:
 *   providers | health | fire | penalties | cdph | all
 * Each single step sits well inside the 150s ceiling. `all` runs them in
 * sequence and is the one that can approach it; the response always
 * reports which steps actually ran so a partial run is visible rather
 * than silent.
 *
 * both_same_survey needs dates from BOTH citation files, so the `fire`
 * step also pulls the three F-tag date sets (5 small pages) and counts the
 * dates where a CCN has K324 and an F-tag on the same survey date.
 */

const CMS_API = "https://data.cms.gov/provider-data/api/1/datastore/query";
const DATASETS = {
  providers: "4pq5-n9py",
  health: "r5ix-sfxw",
  fire: "ifjz-ge4w",
  penalties: "g6vv-u9sr",
} as const;

const CDPH_CSV =
  "https://data.chhs.ca.gov/dataset/3b5b80e8-6b8d-4715-b3c0-2699af6e72e5/resource/f0ae5731-fef8-417f-839d-54a0ed3a126e/download/health_facility_locations.csv";

const PAGE = 1000;          // the datastore API's hard ceiling
const MAX_PAGES = 200;      // a paging loop must never be unbounded
const CHUNK = 500;          // rows per upsert

const FOOD_TAGS = ["0812", "0908", "0921"] as const;
const FIRE_TAGS = ["0324", "0353", "0345"] as const;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const txt = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const num = (v: unknown): number | null => {
  const s = txt(v);
  if (s === null) return null;
  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
};

/** One page of a CA-filtered datastore query. */
async function cmsPage(
  datasetId: string,
  offset: number,
  extra?: { property: string; value: string },
): Promise<any[]> {
  const p = new URLSearchParams();
  p.set("conditions[0][property]", "state");
  p.set("conditions[0][value]", "CA");
  p.set("conditions[0][operator]", "=");
  if (extra) {
    p.set("conditions[1][property]", extra.property);
    p.set("conditions[1][value]", extra.value);
    p.set("conditions[1][operator]", "=");
  }
  p.set("limit", String(PAGE));
  p.set("offset", String(offset));

  const res = await fetch(`${CMS_API}/${datasetId}/0?${p}`, {
    headers: { "User-Agent": UA, "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`CMS ${datasetId} offset ${offset}: HTTP ${res.status}`);
  const body = await res.json();
  return Array.isArray(body?.results) ? body.results : [];
}

/** Every CA row of a dataset, paged. Never unbounded. */
async function cmsAll(
  datasetId: string,
  extra?: { property: string; value: string },
): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const rows = await cmsPage(datasetId, i * PAGE, extra);
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
  throw new Error(`CMS ${datasetId}: exceeded ${MAX_PAGES} pages; refusing a partial load`);
}

/** RFC-4180 line parser — CDPH addresses and names carry commas. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
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
  const step = (typeof body.step === "string" ? body.step.trim() : "all").toLowerCase();
  const VALID = ["providers", "health", "fire", "penalties", "cdph", "all"];
  if (!VALID.includes(step)) {
    return Response.json({ ok: false, error: `step must be one of ${VALID.join(", ")}` }, { status: 400 });
  }
  const run = (s: string) => step === "all" || step === s;

  const nowIso = new Date().toISOString();
  const stepsRun: string[] = [];
  const errors: string[] = [];
  let facilitiesUpserted = 0;
  let cdphFallbackMatches = 0;

  /** Only touch CCNs the provider list established. A citation or penalty
   *  for a CCN outside the CA provider file must not conjure a facility. */
  const knownCcns = async (): Promise<Set<string>> => {
    const s = new Set<string>();
    for (let i = 0; i < MAX_PAGES; i++) {
      const { data, error } = await supabase
        .from("cms_facilities").select("ccn").range(i * PAGE, i * PAGE + PAGE - 1);
      if (error) throw new Error(`ccn list: ${error.message}`);
      const rows = (data ?? []) as { ccn: string }[];
      rows.forEach((r) => s.add(r.ccn));
      if (rows.length < PAGE) break;
    }
    return s;
  };

  /** Upsert on ccn. The caller supplies only its own columns, which is
   *  what keeps call_status and next_step_date out of every write. */
  const upsert = async (rows: Record<string, unknown>[]) => {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase
        .from("cms_facilities")
        .upsert(rows.slice(i, i + CHUNK), { onConflict: "ccn" });
      if (error) throw new Error(`upsert: ${error.message}`);
      facilitiesUpserted += Math.min(CHUNK, rows.length - i);
    }
  };

  try {
    // ── providers ────────────────────────────────────────────────────
    if (run("providers")) {
      const rows = await cmsAll(DATASETS.providers);
      const byCcn = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        const ccn = txt(r.cms_certification_number_ccn);
        if (!ccn) continue;
        byCcn.set(ccn, {
          ccn,
          name: txt(r.provider_name),
          address: txt(r.provider_address),
          city: txt(r.citytown),
          county: txt(r.countyparish),
          zip: txt(r.zip_code),
          state: "CA",
          phone: txt(r.telephone_number),
          chain_name: txt(r.chain_name),
          chain_id: txt(r.chain_id),
          beds: intOrNull(r.number_of_certified_beds),
          overall_rating: intOrNull(r.overall_rating),
          health_rating: intOrNull(r.health_inspection_rating),
          sff_status: txt(r.special_focus_status),
          source_refreshed_at: nowIso,
          updated_at: nowIso,
        });
      }
      await upsert([...byCcn.values()]);
      stepsRun.push(`providers(${byCcn.size})`);
    }

    // ── health deficiencies ──────────────────────────────────────────
    if (run("health")) {
      const known = await knownCcns();
      const rows = await cmsAll(DATASETS.health);
      const agg = new Map<string, { f: Record<string, number>; last: string | null }>();
      for (const r of rows) {
        const ccn = txt(r.cms_certification_number_ccn);
        if (!ccn || !known.has(ccn)) continue;
        const a = agg.get(ccn) ?? { f: { "0812": 0, "0908": 0, "0921": 0 }, last: null };
        const tag = txt(r.deficiency_tag_number);
        if (tag && tag in a.f) a.f[tag]++;
        const d = txt(r.survey_date);
        if (d && (!a.last || d > a.last)) a.last = d;
        agg.set(ccn, a);
      }
      await upsert([...agg.entries()].map(([ccn, a]) => ({
        ccn,
        f812: a.f["0812"], f908: a.f["0908"], f921: a.f["0921"],
        food_tags: a.f["0812"] + a.f["0908"] + a.f["0921"],
        last_survey_date: a.last,
        source_refreshed_at: nowIso,
        updated_at: nowIso,
      })));
      stepsRun.push(`health(${rows.length} rows -> ${agg.size} ccns)`);
    }

    // ── fire safety deficiencies, plus both_same_survey ──────────────
    if (run("fire")) {
      const known = await knownCcns();
      const rows = await cmsAll(DATASETS.fire);

      // F-tag survey dates, fetched narrowly rather than re-paging all
      // 58k health rows: three tag-filtered queries, ~4 pages total.
      const foodDates = new Map<string, Set<string>>();
      for (const t of FOOD_TAGS) {
        const fr = await cmsAll(DATASETS.health, { property: "deficiency_tag_number", value: t });
        for (const r of fr) {
          const ccn = txt(r.cms_certification_number_ccn);
          const d = txt(r.survey_date);
          if (!ccn || !d || !known.has(ccn)) continue;
          if (!foodDates.has(ccn)) foodDates.set(ccn, new Set());
          foodDates.get(ccn)!.add(d);
        }
      }

      const agg = new Map<string, { k: Record<string, number>; last: string | null; k324Dates: Set<string> }>();
      for (const r of rows) {
        const ccn = txt(r.cms_certification_number_ccn);
        if (!ccn || !known.has(ccn)) continue;
        const a = agg.get(ccn) ?? { k: { "0324": 0, "0353": 0, "0345": 0 }, last: null, k324Dates: new Set<string>() };
        const tag = txt(r.deficiency_tag_number);
        const d = txt(r.survey_date);
        if (tag && tag in a.k) {
          a.k[tag]++;
          if (tag === "0324" && d) a.k324Dates.add(d);
        }
        if (d && (!a.last || d > a.last)) a.last = d;
        agg.set(ccn, a);
      }

      // last_survey_date spans BOTH files, so never move it backwards.
      // Paged in chunks: a single .in() would silently truncate past the
      // row cap and quietly lose the health file's dates for the tail.
      const prevLast = new Map<string, string | null>();
      const aggCcns = [...agg.keys()];
      for (let i = 0; i < aggCcns.length; i += 300) {
        const { data, error } = await supabase
          .from("cms_facilities").select("ccn, last_survey_date")
          .in("ccn", aggCcns.slice(i, i + 300));
        if (error) throw new Error(`prev last_survey_date: ${error.message}`);
        for (const r of ((data ?? []) as any[])) prevLast.set(r.ccn, r.last_survey_date);
      }

      await upsert([...agg.entries()].map(([ccn, a]) => {
        const fd = foodDates.get(ccn);
        const both = fd ? [...a.k324Dates].filter((d) => fd.has(d)).length : 0;
        const prev = prevLast.get(ccn) ?? null;
        const last = !a.last ? prev : (!prev || a.last > prev ? a.last : prev);
        return {
          ccn,
          k324: a.k["0324"], k353: a.k["0353"], k345: a.k["0345"],
          fire_tags: a.k["0324"] + a.k["0353"] + a.k["0345"],
          both_same_survey: both,
          last_survey_date: last,
          source_refreshed_at: nowIso,
          updated_at: nowIso,
        };
      }));
      stepsRun.push(`fire(${rows.length} rows -> ${agg.size} ccns)`);
    }

    // ── penalties ────────────────────────────────────────────────────
    if (run("penalties")) {
      const known = await knownCcns();
      const rows = await cmsAll(DATASETS.penalties);
      const agg = new Map<string, { total: number; events: number }>();
      for (const r of rows) {
        const ccn = txt(r.cms_certification_number_ccn);
        if (!ccn || !known.has(ccn)) continue;
        const amt = num(r.fine_amount) ?? 0;
        const a = agg.get(ccn) ?? { total: 0, events: 0 };
        a.total += amt;
        a.events += 1;
        agg.set(ccn, a);
      }
      await upsert([...agg.entries()].map(([ccn, a]) => ({
        ccn, fines_total: a.total, fine_events: a.events,
        source_refreshed_at: nowIso, updated_at: nowIso,
      })));
      stepsRun.push(`penalties(${rows.length} rows -> ${agg.size} ccns)`);
    }

    // ── CDPH ELMS: administrator name / email / phone ────────────────
    if (run("cdph")) {
      const known = await knownCcns();
      const res = await fetch(CDPH_CSV, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) throw new Error(`CDPH: HTTP ${res.status}`);
      const text = await res.text();
      if (/^\s*<!doctype|^\s*<html/i.test(text.slice(0, 200))) {
        throw new Error("CDPH returned HTML, not CSV — the resource URL changed");
      }
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      const hdr = parseCsvLine(lines[0]);
      const ix = (n: string) => hdr.indexOf(n);
      const iCcn = ix("CCN"), iAdmin = ix("FACADMIN"), iMail = ix("CONTACT_EMAIL"),
            iPhone = ix("CONTACT_PHONE_NUMBER"), iName = ix("FACNAME"), iCity = ix("CITY");
      if ([iCcn, iAdmin, iMail, iPhone, iName, iCity].some((i) => i < 0)) {
        throw new Error("CDPH header changed; expected CCN, FACADMIN, CONTACT_EMAIL, CONTACT_PHONE_NUMBER, FACNAME, CITY");
      }

      // Name+city index, built only from CDPH rows that carry NO CCN —
      // the fallback must never override or compete with a real CCN join.
      // CDPH does NOT zero-pad the CCN — it stores 56090 where CMS stores
      // 056090 — so an exact string join silently matches only the rows
      // that happen to already be six digits (387 of 1,164). Padding to
      // six is what makes the join land.
      const padCcn = (s: string | null) => (s ? s.padStart(6, "0") : null);

      const byCcn = new Map<string, string[]>();
      const byNameCity = new Map<string, string[]>();
      for (let i = 1; i < lines.length; i++) {
        const f = parseCsvLine(lines[i]);
        const ccn = padCcn(txt(f[iCcn]));
        if (ccn) { if (!byCcn.has(ccn)) byCcn.set(ccn, f); }
        else {
          const k = `${(f[iName] ?? "").trim().toUpperCase()}|${(f[iCity] ?? "").trim().toUpperCase()}`;
          if (k !== "|" && !byNameCity.has(k)) byNameCity.set(k, f);
        }
      }

      // PAGED. An unpaged select stops at PostgREST's 1000-row default,
      // which silently capped this join at 993 of 1,165 facilities and
      // looked like missing CDPH data rather than a truncated read.
      const facs: any[] = [];
      for (let i = 0; i < MAX_PAGES; i++) {
        const { data, error } = await supabase
          .from("cms_facilities").select("ccn, name, city")
          .order("ccn", { ascending: true })
          .range(i * PAGE, i * PAGE + PAGE - 1);
        if (error) throw new Error(`facility read: ${error.message}`);
        const rows = (data ?? []) as any[];
        facs.push(...rows);
        if (rows.length < PAGE) break;
      }

      const out: Record<string, unknown>[] = [];
      for (const fac of facs) {
        if (!known.has(fac.ccn)) continue;
        let row = byCcn.get(fac.ccn);
        if (!row) {
          const k = `${(fac.name ?? "").trim().toUpperCase()}|${(fac.city ?? "").trim().toUpperCase()}`;
          row = byNameCity.get(k);
          if (row) cdphFallbackMatches++;
        }
        if (!row) continue;
        out.push({
          ccn: fac.ccn,
          admin_name: txt(row[iAdmin]),
          admin_email: txt(row[iMail]),
          admin_phone: txt(row[iPhone]),
          source_refreshed_at: nowIso,
          updated_at: nowIso,
        });
      }
      await upsert(out);
      stepsRun.push(`cdph(${out.length} matched, ${cdphFallbackMatches} by name+city)`);
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  // ── Report counts straight from the table ────────────────────────
  const countOf = async (apply?: (q: any) => any): Promise<number> => {
    let q: any = supabase.from("cms_facilities").select("*", { count: "exact", head: true });
    if (apply) q = apply(q);
    const { count } = await q;
    return count ?? 0;
  };
  const finesSum = await (async () => {
    let total = 0;
    for (let i = 0; i < MAX_PAGES; i++) {
      const { data } = await supabase.from("cms_facilities")
        .select("fines_total").range(i * PAGE, i * PAGE + PAGE - 1);
      const rows = (data ?? []) as { fines_total: number | null }[];
      rows.forEach((r) => { total += Number(r.fines_total ?? 0); });
      if (rows.length < PAGE) break;
    }
    return total;
  })();

  return Response.json({
    ok: errors.length === 0,
    step,
    steps_run: stepsRun,
    batched: step !== "all",
    facilities_upserted: facilitiesUpserted,
    with_phone: await countOf((q) => q.not("phone", "is", null)),
    with_email: await countOf((q) => q.not("admin_email", "is", null)),
    with_admin: await countOf((q) => q.not("admin_name", "is", null)),
    sff_flagged: await countOf((q) => q.not("sff_status", "is", null)),
    with_k324: await countOf((q) => q.gt("k324", 0)),
    with_both_same_survey: await countOf((q) => q.gt("both_same_survey", 0)),
    fines_total_sum: finesSum,
    cdph_fallback_matches: cdphFallbackMatches,
    elapsedMs: Date.now() - startTime,
    errors,
  });
});
