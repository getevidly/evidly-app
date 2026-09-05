import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PUBLIC_CORS_HEADERS } from "../_shared/cors.ts";

/**
 * kitchen-safety-report — the public read for the Commercial Kitchen
 * Safety Report on getstovio.com.
 *
 * WRITES NOTHING. It performs exactly one read: the pre-computed row in
 * kitchen_safety_report_cache.
 *
 * WHY IT IS SAFE TO EXPOSE PUBLICLY. The safety of this endpoint does not
 * rest on the gate — it rests on the shape of the data behind it. The
 * cache table holds only counts and percentages by facility type and by
 * CalCode form item. No facility name, address, id or single-facility row
 * is ever written into it by refresh_kitchen_safety_report(), so there is
 * nothing row-level here to leak even if the endpoint is called by
 * anyone. The county parameter is checked against a fixed allow-list, so
 * it cannot be used to reach anything else.
 *
 * THE GATE IS OPTIONAL, AND OFF BY DEFAULT. Set STOVIO_REPORT_KEY on the
 * function to require `x-report-key` on every call; leave it unset and the
 * endpoint is public. This is deliberate: if Stovio renders these pages in
 * the browser, any key ships in the bundle and protects nothing, whereas a
 * server-rendered Stovio can hold one properly. The right answer depends
 * on a stack this repo cannot see, so the switch is left ready rather than
 * guessed at. Either way the payload is aggregate-only.
 *
 * IT NEVER COMPUTES. The aggregation spans ~960k violations and takes ~47
 * seconds — far past PostgREST's 8s ceiling and uncomfortable against the
 * platform's 150s request limit. refresh_kitchen_safety_report() does that
 * work on a maintenance timeout; this endpoint only serves the result, so
 * it answers in well under a second.
 *
 * Request (GET query string or POST body):
 *   { "county": "la-county-ca" }   one county
 *   { "counties": "all" }          every cached county
 */

/** Fixed allow-list: a county slug can never be used to reach other data. */
const COUNTIES = [
  "la-county-ca",
  "san-diego-ca",
  "san-francisco-ca",
  "santa-clara-ca",
  "ventura-ca",
  "merced-ca",
] as const;

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  const headers = { ...PUBLIC_CORS_HEADERS, "Content-Type": "application/json" };
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: PUBLIC_CORS_HEADERS });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  // ── Optional shared key ──────────────────────────────────────────
  const requiredKey = Deno.env.get("STOVIO_REPORT_KEY");
  if (requiredKey) {
    const given = req.headers.get("x-report-key");
    if (given !== requiredKey) {
      return json({ ok: false, reason: "forbidden" }, 403);
    }
  }

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { body = ((await req.json()) ?? {}) as Record<string, unknown>; } catch { /* empty ok */ }
  }

  const county = (url.searchParams.get("county") ?? (body.county as string | undefined) ?? "").trim();
  const counties = (url.searchParams.get("counties") ?? (body.counties as string | undefined) ?? "").trim();
  const wantsAll = counties.toLowerCase() === "all";

  if (!wantsAll && !county) {
    return json(
      { ok: false, error: `Pass { county: <slug> } or { counties: "all" }. Slugs: ${COUNTIES.join(", ")}` },
      400,
    );
  }
  if (!wantsAll && !(COUNTIES as readonly string[]).includes(county)) {
    return json(
      { ok: false, error: `Unknown county "${county}". Slugs: ${COUNTIES.join(", ")}` },
      404,
    );
  }

  // The cache table is RLS-readable, but the service-role client keeps this
  // independent of whatever policy the table carries later.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let q = supabase
    .from("kitchen_safety_report_cache")
    .select("county, report_json, computed_at");
  if (!wantsAll) q = q.eq("county", county);

  const { data, error } = await q;
  if (error) {
    console.error("[kitchen-safety-report] cache read failed:", error.message);
    return json({ ok: false, error: "Could not load the report." }, 500);
  }
  const rows = (data ?? []) as Array<{ county: string; report_json: any; computed_at: string }>;
  if (rows.length === 0) {
    return json(
      { ok: false, error: "No report has been computed yet. Run refresh_kitchen_safety_report()." },
      503,
    );
  }

  const reports = rows
    .sort((a, b) => a.county.localeCompare(b.county))
    .map((r) => ({ ...r.report_json, computed_at: r.computed_at }));

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    // Named so a consumer knows the figures are a snapshot, not live reads.
    source: "EvidLY inspection record, aggregated",
    // Category labels are the California standardized retail food
    // inspection form, which is why they are comparable between counties.
    category_basis: "California standardized retail food inspection form (54 items)",
    // Size bands are NOT comparable between counties — LA bands restaurants
    // by seats, San Francisco by square feet — so each county carries its
    // own type_basis and by_type is never rolled up across counties.
    cross_county_axis: "category only; facility size bands differ by county",
    count: reports.length,
    reports: wantsAll ? reports : reports[0],
    elapsedMs: Date.now() - startTime,
  });
});
