import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshInspectionStats, refreshFacilityCadence } from "../_shared/refreshInspectionStats.ts";

/**
 * la-live-crawl — live inspection dates for Los Angeles County.
 *
 * WRITES ONLY facilities and inspections, plus the derived cadence/stats
 * tables via the shared refreshers. It sends nothing.
 *
 * Body: { jurisdiction: "la-county-ca" }
 *
 * WHY THIS EXISTS. LA's ArcGIS open-data drop is quarterly and lands two
 * months after the quarter closes — its own description says "updated
 * quarterly", and the file we hold ends 2026-06-30. The county's
 * eCompliance portal carries the same inspections ~8 days behind real
 * time. This reads the portal so LA stops being a stale county.
 *
 * THE FETCH — two plain GETs, no CSRF, no form post:
 *   1. GET /servlet/guest?service=1&enterprise=1&qbItem=2  -> JSESSIONID
 *   2. GET /ec/inspections.csv  with that cookie           -> ~9MB, ~122k rows
 * The page's CSRFToken guards the SEARCH form only; the CSV export needs
 * nothing but a live session, and it ignores the search entirely — it
 * always returns the whole county. Verified: 121,994 rows in 2.96s.
 *
 * THE CSV: no header, six RFC-4180 fields —
 *   name, last_routine_date, score, address, city, PR-id
 * It is genuinely quoted: ~1,047 rows carry commas inside quoted names or
 * addresses ("WING ON MARKET 705, INC"), so it needs a real parser rather
 * than a split on commas. 62% of rows have an empty score, and some dates
 * come through as the Unix epoch (1969-12-31) where the county holds none.
 *
 * THE PR->FA BRIDGE. The portal keys programs as PR-ids; our LA facilities
 * are keyed FA. The bulk load stored the PR in inspections.program_id (=
 * raw_payload.record_id) for 100% of 90,460 rows, and PR->FA is strictly
 * 1:1 (0 PRs map to more than one FA). So the portal joins onto our
 * existing facilities exactly, with no name or address matching.
 *
 * ROWS WHOSE PR WE DO NOT HOLD ARE SKIPPED. The export covers every
 * program type the county regulates — housing, pools, body art, tobacco —
 * and carries no type column, so an unknown PR cannot be told apart from a
 * swimming pool. New LA restaurants therefore lag until the next quarterly
 * bulk load. Creating them blind would put pools in the restaurant queue.
 *
 * NO VIOLATIONS, BY THE COUNTY'S CHOICE. The portal states that reports
 * for inspections on or after 2025-08-25 must be obtained by a CPRA
 * request. LA is therefore a Due-only county: regenerate_triggers_for_slug
 * keeps it out of cited/clean (a fresh inspection with no violation rows
 * would otherwise read as "clean" purely because the data is withheld) and
 * now allows it for due.
 *
 * THE SCORE IS STORED AS PUBLISHED AND NOTHING IS DERIVED FROM IT. outcome
 * stays null: the portal publishes a score, not a grade, and turning one
 * into the other would be inventing a result the jurisdiction did not
 * issue.
 */

const SLUG = "la-county-ca";
const ENTRY =
  "https://ehservices.publichealth.lacounty.gov/servlet/guest?service=1&enterprise=1&qbItem=2";
const CSV_URL = "https://ehservices.publichealth.lacounty.gov/ec/inspections.csv";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** PostgREST caps a page; 1000 is the safe default on this project. */
const MAP_PAGE = 1000;
/** Guard against an unbounded map read if the table ever grows oddly. */
const MAX_MAP_PAGES = 200;
const CHUNK = 500;
/** Dates outside this window are the county's null-date artefacts. */
const MIN_SENSIBLE_DATE = "2000-01-01";

/** Minimal RFC-4180 line parser: quoted fields, embedded commas, "" escapes. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur); cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const textOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const numOrNull = (v: unknown): number | null => {
  const s = textOrNull(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

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

  const slug = typeof body.jurisdiction === "string" && body.jurisdiction.trim()
    ? body.jurisdiction.trim()
    : SLUG;
  if (slug !== SLUG) {
    return Response.json(
      { ok: false, error: `la-live-crawl serves ${SLUG}; got "${slug}"` },
      { status: 400 },
    );
  }

  const { data: srcRow, error: srcErr } = await supabase
    .from("inspection_sources")
    .select("id, jurisdictions!inner(slug)")
    .eq("jurisdictions.slug", slug)
    .maybeSingle();
  if (srcErr || !srcRow) {
    return Response.json({ ok: false, error: `no source for ${slug}` }, { status: 500 });
  }
  const sourceId = (srcRow as { id: string }).id;

  let csvRows = 0;
  let matched = 0;
  let skippedUnknownPr = 0;
  let skippedBadDate = 0;
  let skippedNotNewer = 0;
  let facilitiesWritten = 0;
  let inspectionsWritten = 0;
  const errors: string[] = [];
  let newestSeen: string | null = null;
  let mapPagesRead = 0;
  let prMapSize = 0;

  try {
    // ── 1. Session, then the whole-county CSV ────────────────────────
    const entryRes = await fetch(ENTRY, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!entryRes.ok) throw new Error(`portal entry: HTTP ${entryRes.status}`);
    const setCookie = entryRes.headers.get("set-cookie") ?? "";
    await entryRes.text(); // drain
    const jsession = setCookie.match(/JSESSIONID=([^;,\s]+)/)?.[1];
    if (!jsession) throw new Error("portal entry returned no JSESSIONID; the session flow changed");

    const csvRes = await fetch(CSV_URL, {
      headers: {
        "User-Agent": UA,
        "Cookie": `JSESSIONID=${jsession}`,
        "Referer": "https://ehservices.publichealth.lacounty.gov/ezsearch",
        "Accept": "text/csv,*/*",
      },
    });
    if (!csvRes.ok) throw new Error(`inspections.csv: HTTP ${csvRes.status}`);
    const csvType = csvRes.headers.get("content-type") ?? "";
    const csvText = await csvRes.text();
    if (!csvType.includes("csv") && /<html/i.test(csvText.slice(0, 300))) {
      throw new Error("inspections.csv returned HTML, not CSV — session or portal change");
    }

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
    csvRows = lines.length;
    if (csvRows < 1000) throw new Error(`inspections.csv returned only ${csvRows} rows; refusing a partial load`);

    // ── 2. PR -> {facility_id, newest date we already hold} ───────────
    // The bridge. Built from our own rows, so a portal row can only ever
    // land on a facility the bulk load already established.
    // KEYSET pagination, not range/OFFSET. Walking 90,460 rows with
    // .range() makes Postgres skip an ever-growing prefix, and by roughly
    // the 40th page a single page exceeds the authenticator role's 8s
    // statement timeout — the read fails outright. Seeking on the last id
    // keeps every page an index scan of constant cost.
    const prMap = new Map<string, { facilityId: string; newest: string }>();
    let lastId = "00000000-0000-0000-0000-000000000000";
    let mapPages = 0;
    for (let page = 0; page < MAX_MAP_PAGES; page++) {
      const { data, error } = await supabase
        .from("inspections")
        .select("id, program_id, facility_id, inspection_date")
        .eq("source_id", sourceId)
        .not("program_id", "is", null)
        .gt("id", lastId)
        .order("id", { ascending: true })
        .limit(MAP_PAGE);
      if (error) throw new Error(`pr map: ${error.message}`);
      const rows = (data ?? []) as any[];
      if (rows.length === 0) break;
      mapPages++;
      for (const r of rows) {
        const pr = textOrNull(r.program_id);
        const d = textOrNull(r.inspection_date);
        if (pr && r.facility_id && d) {
          const cur = prMap.get(pr);
          if (!cur) prMap.set(pr, { facilityId: r.facility_id, newest: d });
          else if (d > cur.newest) cur.newest = d;
        }
      }
      lastId = rows[rows.length - 1].id as string;
      if (rows.length < MAP_PAGE) break;
    }
    mapPagesRead = mapPages;
    prMapSize = prMap.size;
    if (prMapSize === 0) throw new Error("PR->FA map came back empty; refusing to run blind");

    // ── 3. Walk the CSV ──────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    // Deduped per facility (a facility can run several programs) and per
    // inspection key, because a repeated key inside one upsert batch fails
    // with "ON CONFLICT DO UPDATE command cannot affect row a second time".
    const facByKey = new Map<string, Record<string, unknown>>();
    const inspByKey = new Map<string, Record<string, unknown>>();
    const nowIso = new Date().toISOString();

    for (const line of lines) {
      const f = parseCsvLine(line);
      if (f.length < 6) continue;
      // Fields are positional from the right so a stray extra column
      // cannot silently shift the PR id.
      const pr = textOrNull(f[f.length - 1]);
      const city = textOrNull(f[f.length - 2]);
      const address = textOrNull(f[f.length - 3]);
      const score = numOrNull(f[f.length - 4]);
      const date = textOrNull(f[f.length - 5]);
      const name = textOrNull(f.slice(0, f.length - 5).join(","));

      if (!pr || !/^PR\d+$/.test(pr)) continue;

      const hit = prMap.get(pr);
      if (!hit) { skippedUnknownPr++; continue; }

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < MIN_SENSIBLE_DATE || date > today) {
        skippedBadDate++;
        continue;
      }
      matched++;
      if (!newestSeen || date > newestSeen) newestSeen = date;

      // Only genuinely new information. Re-inserting an inspection the
      // bulk load already holds would double it under a second key and
      // corrupt the median gap that Due triggers are computed from.
      if (date <= hit.newest) { skippedNotNewer++; continue; }

      // Facility: address/city refresh only. NAME IS NEVER WRITTEN — the
      // portal publishes the PROGRAM name and our row carries the FACILITY
      // name; they differ on ~1 in 4 rows ("KFC" vs "KENTUCKY FRIED
      // CHICKEN"), and a facility running two programs would flip between
      // them on every crawl. identity_status/is_client are omitted so an
      // operator's resolution survives.
      // Every row in one upsert batch must carry the SAME key set —
      // PostgREST rejects a batch whose objects differ in shape — so
      // address/city are always present or the facility row is skipped.
      // Verified across all 121,994 portal rows: neither is ever empty.
      if (address && city) {
        const prev = facByKey.get(hit.facilityId) as any;
        // A facility can run several programs; take the newest so the
        // result does not depend on CSV order.
        if (!prev || date > prev.__date) {
          facByKey.set(hit.facilityId, {
            __date: date,
            address,
            city,
            last_crawled_at: nowIso,
          });
        }
      }

      // Key space is disjoint from the bulk load's: every one of the
      // 90,460 existing LA keys is exactly 9 characters and none contains
      // a pipe, so PR|date|portal cannot collide with them.
      const inspKey = `${pr}|${date}|portal`;
      inspByKey.set(inspKey, {
        facility_id: hit.facilityId,
        source_id: sourceId,
        source_facility_key: null, // filled below from the facility row
        source_inspection_key: inspKey,
        inspection_date: date,
        inspection_type: "ROUTINE INSPECTION",
        outcome: null, // the portal publishes a score, not a grade
        score,
        program_id: pr,
        raw_payload: {
          source: "ehservices-portal",
          program_id: pr,
          program_name: name,
          last_routine_date: date,
          score: score === null ? "" : String(score),
          address,
          city,
        },
      });
    }

    // source_facility_key must match the facility's own key, so read the
    // FA keys for exactly the facilities being touched.
    const facIds = [...facByKey.keys()];
    const faByFacilityId = new Map<string, string>();
    for (let i = 0; i < facIds.length; i += 300) {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, source_facility_key")
        .in("id", facIds.slice(i, i + 300));
      if (error) throw new Error(`facility keys: ${error.message}`);
      for (const r of (data ?? []) as any[]) faByFacilityId.set(r.id, r.source_facility_key);
    }

    // ── 4. Upserts ───────────────────────────────────────────────────
    // `id` is deliberately not sent: the conflict target is
    // (source_id, source_facility_key) and supplying a primary key too
    // gives Postgres a second way to conflict.
    const facRows = [...facByKey.entries()].map(([facilityId, r]) => {
      const { __date: _drop, ...rest } = r as any;
      return { ...rest, source_id: sourceId, source_facility_key: faByFacilityId.get(facilityId) };
    }).filter((r: any) => r.source_facility_key);

    for (let i = 0; i < facRows.length; i += CHUNK) {
      const { error } = await supabase
        .from("facilities")
        .upsert(facRows.slice(i, i + CHUNK), { onConflict: "source_id,source_facility_key" });
      if (error) throw new Error(`facilities: ${error.message}`);
      facilitiesWritten += Math.min(CHUNK, facRows.length - i);
    }

    const inspRows = [...inspByKey.values()]
      .map((r: any) => ({ ...r, source_facility_key: faByFacilityId.get(r.facility_id) }))
      .filter((r: any) => r.source_facility_key);

    for (let i = 0; i < inspRows.length; i += CHUNK) {
      const { error } = await supabase
        .from("inspections")
        .upsert(inspRows.slice(i, i + CHUNK), { onConflict: "source_id,source_inspection_key" });
      if (error) throw new Error(`inspections: ${error.message}`);
      inspectionsWritten += Math.min(CHUNK, inspRows.length - i);
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const cadenceRefreshed = await refreshFacilityCadence(supabase, slug);
  const statsRefreshed = await refreshInspectionStats(supabase);

  return Response.json({
    ok: errors.length === 0,
    jurisdiction: slug,
    csvRows,
    prMapSize,
    mapPagesRead,
    matchedToOurFacilities: matched,
    skippedUnknownPr,
    skippedBadDate,
    skippedNotNewerThanHeld: skippedNotNewer,
    newestPortalDate: newestSeen,
    facilitiesWritten,
    inspectionsWritten,
    violationsWritten: 0, // the county withholds them; see the header
    cadenceRefreshed,
    statsRefreshed,
    elapsedMs: Date.now() - startTime,
    errors,
  });
});
