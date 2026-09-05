import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshInspectionStats, refreshFacilityCadence } from "../_shared/refreshInspectionStats.ts";

/**
 * socrata-crawl — recent-window refresh for the two Socrata counties,
 * Santa Clara and San Francisco. Both were bulk loaded with no callable
 * crawler; this gives them one so refresh-jurisdiction can serve them.
 *
 * WRITES ONLY facilities, inspections and violations, then refreshes
 * facility_inspection_cadence and inspection_stats through the shared
 * helpers. Sends nothing.
 *
 * Socrata speaks SoQL, so "recent" is a dated query rather than a full
 * reload: $where on the date column, $limit/$offset to paginate.
 *
 * EVERY KEY BELOW WAS RECOVERED FROM THE ALREADY-LOADED ROWS, not
 * invented. Getting one wrong would insert duplicates rather than update
 * in place, so they are reproduced exactly:
 *
 *   Santa Clara  facility   business_id                     "PR0300002"
 *                inspection inpsection_id                   "DADBRD7YV"
 *                violation  <inspId>|<code>|<n>             "DADBRD7YV|K33|1"
 *   San Francisco facility  permit_number                   "06733186"
 *                inspection <permit>|<inspection_date>|<n>  "00720|2025-04-14T00:00:00.000|1"
 *                violation  <inspectionKey>#<n>             "00720|2025-04-14T00:00:00.000|1#1"
 *
 * Two source quirks that are easy to get wrong:
 *   - Santa Clara's inspection id field is misspelled `inpsection_id`
 *     in the dataset itself, and its date is "20260803", not ISO.
 *   - San Francisco publishes no inspection id, and packs every violation
 *     of an inspection into one `violation_codes` string delimited by
 *     "., " — a period then comma-space. Splitting on "," alone would
 *     shred each citation, because the code lists contain commas.
 */

const PAGE = 1000;
/** Bounded even though a recent window is small. */
const MAX_PAGES = 50;
const DEFAULT_SINCE_DAYS = 7;

interface DatasetSpec {
  slug: string;
  host: string;
}

const SOCRATA: Record<string, DatasetSpec> = {
  "santa-clara-ca": { slug: "santa-clara-ca", host: "data.sccgov.org" },
  "san-francisco-ca": { slug: "san-francisco-ca", host: "data.sfgov.org" },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function soql(host: string, id: string, qs: string): Promise<any[]> {
  const url = `https://${host}/resource/${id}.json?${qs}`;
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt === 0) await sleep(3_000);
    }
  }
  throw new Error(`${id}: ${lastErr}`);
}

/** Page a dataset to completion, bounded. */
async function soqlAll(host: string, id: string, where: string): Promise<any[]> {
  const out: any[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = `${where ? `$where=${encodeURIComponent(where)}&` : ""}$limit=${PAGE}&$offset=${page * PAGE}`;
    const rows = await soql(host, id, qs);
    out.push(...rows);
    if (rows.length < PAGE) break;
    await sleep(150);
  }
  return out;
}

/** "20260803" → "2026-08-03". Santa Clara only. */
function sccDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
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

  const slug = typeof body.jurisdiction === "string" ? body.jurisdiction.trim() : "";
  const spec = SOCRATA[slug];
  if (!spec) {
    return Response.json(
      { ok: false, error: `socrata-crawl serves ${Object.keys(SOCRATA).join(", ")}; got "${slug}"` },
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

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDays);
  const sinceIso = since.toISOString().slice(0, 10);

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
  const errors: string[] = [];

  // NEVER write identity_status, is_client, or resolved_pipeline_id here.
  // Those are operator decisions. A re-crawl that included
  // identity_status: "unresolved" reset every facility an operator had
  // resolved, because an upsert overwrites exactly the columns it names.
  // Omitting them means an existing resolution survives the crawl and a
  // brand-new facility still lands unresolved via the column default.
  const upsertFacilities = async (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from("facilities")
      .upsert(rows, { onConflict: "source_id,source_facility_key" });
    if (error) throw new Error(`facilities: ${error.message}`);
    facilitiesWritten += rows.length;
  };

  const idsByKey = async (keys: string[]) => {
    const map = new Map<string, string>();
    for (let i = 0; i < keys.length; i += 500) {
      const { data, error } = await supabase
        .from("facilities").select("id, source_facility_key")
        .eq("source_id", sourceId).in("source_facility_key", keys.slice(i, i + 500));
      if (error) throw new Error(`facility ids: ${error.message}`);
      for (const f of (data ?? []) as { id: string; source_facility_key: string }[]) {
        map.set(f.source_facility_key, f.id);
      }
    }
    return map;
  };

  try {
    if (slug === "santa-clara-ca") {
      // date is a YYYYMMDD string, so a string comparison is the filter.
      const sinceCompact = sinceIso.replace(/-/g, "");
      const insps = await soqlAll(spec.host, "2u2d-8jej", `date >= '${sinceCompact}'`);

      const bizIds = [...new Set(insps.map((r) => String(r.business_id ?? "")).filter(Boolean))];
      const bizRows: any[] = [];
      for (let i = 0; i < bizIds.length; i += 200) {
        const list = bizIds.slice(i, i + 200).map((b) => `'${b.replace(/'/g, "''")}'`).join(",");
        bizRows.push(...await soqlAll(spec.host, "vuw7-jmjk", `business_id in (${list})`));
        await sleep(120);
      }

      await upsertFacilities(bizRows.map((b) => ({
        source_id: sourceId,
        source_facility_key: String(b.business_id),
        name: b.name ?? null,
        address: b.address ?? null,
        city: b.city ?? null,
        zip: b.postal_code ?? null,
        phone: b.phone_number ?? null,
        last_crawled_at: new Date().toISOString(),
      })));

      const facMap = await idsByKey(bizIds);

      const inspRows = insps
        .filter((r) => r.inpsection_id && facMap.get(String(r.business_id)) && sccDate(r.date))
        .map((r) => ({
          facility_id: facMap.get(String(r.business_id))!,
          source_id: sourceId,
          source_facility_key: String(r.business_id),
          source_inspection_key: String(r.inpsection_id), // dataset's own typo
          inspection_date: sccDate(r.date),
          inspection_type: r.type ?? null,
          raw_payload: r,
        }));

      if (inspRows.length > 0) {
        const { error } = await supabase
          .from("inspections").upsert(inspRows, { onConflict: "source_id,source_inspection_key" });
        if (error) throw new Error(`inspections: ${error.message}`);
        inspectionsWritten = inspRows.length;
      }

      // Violations key off inspection_id, so fetch by the ids just loaded.
      const inspKeys = inspRows.map((r) => r.source_inspection_key);
      if (inspKeys.length > 0) {
        const { data: dbInsp } = await supabase
          .from("inspections").select("id, source_inspection_key")
          .eq("source_id", sourceId).in("source_inspection_key", inspKeys);
        const inspIdByKey = new Map<string, string>();
        for (const r of (dbInsp ?? []) as { id: string; source_inspection_key: string }[]) {
          inspIdByKey.set(r.source_inspection_key, r.id);
        }

        const vios: any[] = [];
        for (let i = 0; i < inspKeys.length; i += 200) {
          const list = inspKeys.slice(i, i + 200).map((k) => `'${k.replace(/'/g, "''")}'`).join(",");
          vios.push(...await soqlAll(spec.host, "wkaa-4ccv", `inspection_id in (${list})`));
          await sleep(120);
        }

        const seen = new Map<string, number>();
        const vioRows = vios
          .map((v) => {
            const inspId = inspIdByKey.get(String(v.inspection_id));
            if (!inspId) return null;
            const code = String(v.code ?? "");
            const k = `${v.inspection_id}|${code}`;
            const n = (seen.get(k) ?? 0) + 1;
            seen.set(k, n);
            return {
              inspection_id: inspId,
              source_violation_key: `${v.inspection_id}|${code}|${n}`,
              source_code: code || null,
              description: v.description ?? null,
              severity_raw: v.critical === true ? "critical" : "noncritical",
              raw_payload: v,
            };
          })
          .filter(Boolean) as any[];

        if (vioRows.length > 0) {
          const { error } = await supabase
            .from("violations").upsert(vioRows, { onConflict: "inspection_id,source_violation_key" });
          if (error) throw new Error(`violations: ${error.message}`);
          violationsWritten = vioRows.length;
        }
      }
    } else {
      // ── San Francisco ────────────────────────────────────────────
      const rows = await soqlAll(spec.host, "tvy3-wexg", `inspection_date >= '${sinceIso}'`);

      const byKey = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        const permit = String(r.permit_number ?? "").trim();
        if (!permit) continue;
        byKey.set(permit, {
          source_id: sourceId,
          source_facility_key: permit,
          name: r.dba ?? null,
          address: r.street_address_clean ?? r.street_address ?? null,
          city: "San Francisco",
          zip: null, // the dataset publishes none
          phone: null,
          last_crawled_at: new Date().toISOString(),
        });
      }
      await upsertFacilities([...byKey.values()]);
      const facMap = await idsByKey([...byKey.keys()]);

      // No published inspection id: the key is permit|date|rownum, where
      // rownum orders inspections sharing a permit and date.
      const rowNum = new Map<string, number>();
      const inspRows: any[] = [];
      const keyForRow: string[] = [];
      for (const r of rows) {
        const permit = String(r.permit_number ?? "").trim();
        const date = String(r.inspection_date ?? "");
        const facId = facMap.get(permit);
        if (!permit || !date || !facId) { keyForRow.push(""); continue; }
        const g = `${permit}|${date}`;
        const n = (rowNum.get(g) ?? 0) + 1;
        rowNum.set(g, n);
        const key = `${permit}|${date}|${n}`;
        keyForRow.push(key);
        inspRows.push({
          facility_id: facId,
          source_id: sourceId,
          source_facility_key: permit,
          source_inspection_key: key,
          inspection_date: date.slice(0, 10),
          inspection_type: r.inspection_frequency_type ? null : null,
          raw_payload: r,
        });
      }

      if (inspRows.length > 0) {
        const { error } = await supabase
          .from("inspections").upsert(inspRows, { onConflict: "source_id,source_inspection_key" });
        if (error) throw new Error(`inspections: ${error.message}`);
        inspectionsWritten = inspRows.length;
      }

      const { data: dbInsp } = await supabase
        .from("inspections").select("id, source_inspection_key")
        .eq("source_id", sourceId).in("source_inspection_key", inspRows.map((r) => r.source_inspection_key));
      const inspIdByKey = new Map<string, string>();
      for (const r of (dbInsp ?? []) as { id: string; source_inspection_key: string }[]) {
        inspIdByKey.set(r.source_inspection_key, r.id);
      }

      // "., " separates citations. A plain comma would shred them: the
      // code lists themselves are comma-separated.
      const vioRows: any[] = [];
      rows.forEach((r, idx) => {
        const key = keyForRow[idx];
        const inspId = key ? inspIdByKey.get(key) : undefined;
        const blob = String(r.violation_codes ?? "").trim();
        if (!inspId || !blob) return;
        blob.split("., ").map((e) => e.trim()).filter(Boolean).forEach((entry, i) => {
          const dash = entry.indexOf(" - ");
          vioRows.push({
            inspection_id: inspId,
            source_violation_key: `${key}#${i + 1}`,
            source_code: (dash > 0 ? entry.slice(0, dash) : entry).trim() || null,
            description: entry,
            severity_raw: null,
            raw_payload: { entry, permit_number: r.permit_number, inspection_date: r.inspection_date },
          });
        });
      });

      if (vioRows.length > 0) {
        const { error } = await supabase
          .from("violations").upsert(vioRows, { onConflict: "inspection_id,source_violation_key" });
        if (error) throw new Error(`violations: ${error.message}`);
        violationsWritten = vioRows.length;
      }
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
    since: sinceIso,
    facilitiesWritten,
    inspectionsWritten,
    violationsWritten,
    cadenceRefreshed,
    statsRefreshed,
    elapsedMs: Date.now() - startTime,
    errors,
  });
});
