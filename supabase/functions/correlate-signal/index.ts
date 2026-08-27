import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * correlate-signal — Compute which organizations a published signal affects.
 *
 * Called after a signal is published. Writes to intelligence_correlations.
 * Match types: national, county, industry, requirement.
 *
 * Relevance rule: a signal correlates to an org ONLY through a county match, a
 * requirement match, or a kitchen-impacting national category. Generic national
 * noise produces no correlation at all — see NATIONAL_BROADCAST_CATEGORIES.
 *
 * POST { signal_id: UUID }
 * Returns { success, correlations_created, matches: { national, county, industry, requirement } }
 */

// ── Category → Requirement code mapping ──────────────────────
// Maps signal categories to service_type_definition codes.
//
// Deliberately unmapped, and each for a reason:
//   seasonal_risk — retired. Weather is ruled out as a correlation basis, so
//     with it also off the national whitelist it now produces no correlation
//     of any type. It previously mapped to KEC/HVAC/REFR and reached every org
//     holding any of those three schedules.
//   food_handler  — no canonical code exists for it. service_type_definitions
//     is a vendor-service taxonomy (24 codes, all schedulable services); its
//     food_safety category holds only BFT, GT and PC. Staff certification is
//     not a service schedule, and FS is Fire Suppression System, not food
//     safety — mapping to it would correlate handler-certification signals to
//     fire suppression cadences. Left unmapped rather than forced.
//   legislative, info — informational only.
const CATEGORY_TO_REQUIREMENTS: Record<string, string[]> = {
  nfpa_update:          ["KEC", "FS", "FA", "FPM", "GFX", "RGC", "SP", "FE"],
  fire_safety:          ["KEC", "FS", "FA", "FPM", "GFX", "RGC", "SP", "FE"],
  recall_alert:         ["KEC", "GFX", "REFR", "EQRP"],
  recall:               ["KEC", "GFX", "REFR", "EQRP"],
  enforcement_surge:    ["KEC", "FS", "GT"],
  outbreak_alert:       ["GT", "REFR", "PC"],
  adverse_event_alert:  ["GT", "REFR"],
  food_code_update:     ["GT", "REFR", "PC"],
  grease_trap:          ["GT"],
  hood_cleaning:        ["KEC", "GFX", "FPM", "RGC"],
  ventilation:          ["KEC", "FPM"],
};

// Human-readable names for requirement codes
const REQUIREMENT_NAMES: Record<string, string> = {
  KEC: "Kitchen Exhaust Cleaning", FS: "Fire Suppression System",
  FA: "Fire Alarm", FPM: "Fan Performance Management",
  GFX: "Grease Filter Exchange", RGC: "Rooftop Grease Containment",
  SP: "Fire Sprinkler", FE: "Fire Extinguisher",
  GT: "Grease Trap Service", REFR: "Refrigeration Service",
  EQRP: "Equipment Repair", HVAC: "HVAC Service", PC: "Pest Control",
};

/**
 * The only categories permitted to correlate nationally — i.e. to every org,
 * with no county or requirement evidence tying the signal to that kitchen.
 *
 * The rule: a signal reaches an org through a county match, a requirement
 * match, or membership of this list. Nothing else broadcasts. A category
 * absent here (regulatory_updates, regulatory_change, info, legislative, and
 * anything unlisted) can still reach an org via requirement — and via county
 * only if COUNTY_CORRELATABLE_CATEGORIES admits it, which for those four it
 * does not. seasonal_risk and food_handler are absent from every list, so
 * they now correlate through nothing at all.
 *
 * Membership means the category impacts kitchen operations directly enough
 * that every operator should see it regardless of jurisdiction.
 */
const NATIONAL_BROADCAST_CATEGORIES = new Set<string>([
  "recall_alert",
  "outbreak_alert",
  "food_code_update",
  "nfpa_update",
  "fire_safety",
  "hood_cleaning",
  "ventilation",
  "grease_trap",
  "enforcement_surge",
]);

/**
 * The only categories permitted to correlate by county.
 *
 * The rule: a county match is evidence that a signal reaches THIS kitchen's
 * jurisdiction — it is not evidence that the signal is about kitchens at all.
 * Gating it on the same categories that already earn a national or requirement
 * match keeps geography from becoming a side door for unfiltered content.
 *
 * Derived from the two lists above rather than restated, so it cannot drift
 * out of step with them. Anything outside it — regulatory_updates,
 * regulatory_change, info, legislative, and anything unlisted — creates no
 * county correlation. After a relabel pass, correctly-labeled content
 * re-enters through its real category.
 */
export const COUNTY_CORRELATABLE_CATEGORIES: ReadonlySet<string> = new Set([
  ...NATIONAL_BROADCAST_CATEGORIES,
  ...Object.keys(CATEGORY_TO_REQUIREMENTS),
]);

/**
 * Titles the analyzer itself marks as non-applicable. These are signals whose
 * own headline states they do not apply to commercial kitchens, so they are
 * skipped before any correlation is computed.
 */
const NOT_APPLICABLE_TITLE = /^\s*(recall\s+)?not\s+(applicable|relevant)\b/i;

// System/template org IDs to exclude
const EXCLUDED_ORG_IDS = new Set([
  "00000000-0000-0000-0000-000000000001", // __SYSTEM_TEMPLATES__
]);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { signal_id } = await req.json();
    if (!signal_id) {
      return new Response(
        JSON.stringify({ error: "signal_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 1. Load the signal ──────────────────────────────────
    const { data: signal, error: sigErr } = await supabase
      .from("intelligence_signals")
      .select("id, title, scope, category, signal_type, counties_affected, target_industries, target_all_industries, target_counties, signal_scope")
      .eq("id", signal_id)
      .single();

    if (sigErr || !signal) {
      return new Response(
        JSON.stringify({ error: `Signal not found: ${sigErr?.message || signal_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 1b. Belt: the signal declares its own irrelevance ────
    if (NOT_APPLICABLE_TITLE.test(signal.title || "")) {
      console.log(
        `[correlate-signal] skipped as non-applicable: "${signal.title}" (id=${signal.id})`,
      );
      return new Response(
        JSON.stringify({
          success: true,
          correlations_created: 0,
          skipped: "not_applicable_title",
          matches: { national: 0, county: 0, industry: 0, requirement: 0 },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Load all non-system organizations ────────────────
    const { data: allOrgs } = await supabase
      .from("organizations")
      .select("id, name, industry_type");

    const orgs = (allOrgs || []).filter(
      (o: any) => !EXCLUDED_ORG_IDS.has(o.id) && o.industry_type !== "system",
    );
    const orgMap = new Map(orgs.map((o: any) => [o.id, o]));

    // ── 3. Load locations with jurisdiction county lookup ────
    const { data: allLocs } = await supabase
      .from("locations")
      .select("id, organization_id, city, state, jurisdiction_id");

    const locations = allLocs || [];

    // Build jurisdiction_id → county lookup
    const jurisdictionIds = [...new Set(
      locations.map((l: any) => l.jurisdiction_id).filter(Boolean),
    )];
    const jurisdictionCountyMap = new Map<string, string>();
    if (jurisdictionIds.length > 0) {
      const { data: jurs } = await supabase
        .from("jurisdictions")
        .select("id, county")
        .in("id", jurisdictionIds);
      for (const j of jurs || []) {
        jurisdictionCountyMap.set(j.id, j.county);
      }
    }

    // ── 4. Load location service schedules for requirement matching ──
    const { data: schedules } = await supabase
      .from("location_service_schedules")
      .select("location_id, service_type_code");

    // Build org → requirement codes
    const orgRequirements = new Map<string, Set<string>>();
    const locToOrg = new Map<string, string>();
    for (const loc of locations) {
      if (loc.organization_id) locToOrg.set(loc.id, loc.organization_id);
    }
    for (const s of schedules || []) {
      const orgId = locToOrg.get(s.location_id);
      if (orgId) {
        if (!orgRequirements.has(orgId)) orgRequirements.set(orgId, new Set());
        orgRequirements.get(orgId)!.add(s.service_type_code);
      }
    }

    // ── 5. Compute correlations ─────────────────────────────
    interface CorrelationRow {
      signal_id: string;
      organization_id: string;
      location_id: string | null;
      match_type: string;
      match_reason: string;
      requirement_code: string | null;
      relevance_score: number;
    }

    const rows: CorrelationRow[] = [];
    const effectiveScope = signal.signal_scope || signal.scope || "national";
    const effectiveCounties: string[] = (
      signal.target_counties?.length > 0
        ? signal.target_counties
        : signal.counties_affected || []
    ).map((c: string) => c.toLowerCase());

    // Build county → org/location map from jurisdiction lookup
    const countyOrgLocations = new Map<string, { orgId: string; locId: string }[]>();
    for (const loc of locations) {
      if (!loc.jurisdiction_id || !loc.organization_id) continue;
      const county = jurisdictionCountyMap.get(loc.jurisdiction_id);
      if (!county) continue;
      const key = county.toLowerCase();
      if (!countyOrgLocations.has(key)) countyOrgLocations.set(key, []);
      countyOrgLocations.get(key)!.push({ orgId: loc.organization_id, locId: loc.id });
    }

    // Scope alone no longer broadcasts. effectiveScope defaults to "national"
    // when a signal carries no scope at all, so without this gate an untagged
    // signal of any category reached every org.
    const nationalAllowed =
      (effectiveScope === "national" || effectiveScope === "statewide") &&
      NATIONAL_BROADCAST_CATEGORIES.has(signal.category);

    // Geography alone no longer correlates — see COUNTY_CORRELATABLE_CATEGORIES.
    const countyAllowed = COUNTY_CORRELATABLE_CATEGORIES.has(signal.category);
    if (!countyAllowed && effectiveCounties.length > 0) {
      console.log(
        `[correlate-signal] county match suppressed: category="${signal.category}" ` +
        `carries ${effectiveCounties.length} county(ies) but is not correlatable`,
      );
    }

    if (!nationalAllowed && (effectiveScope === "national" || effectiveScope === "statewide")) {
      console.log(
        `[correlate-signal] national match suppressed: category="${signal.category}" ` +
        `scope="${effectiveScope}" is not kitchen-impacting — county/requirement only`,
      );
    }

    const matchCounts = { national: 0, county: 0, industry: 0, requirement: 0 };

    for (const org of orgs) {
      // ── 5a. NATIONAL match ──────────────────────────────
      // Gated on category, not scope alone: see NATIONAL_BROADCAST_CATEGORIES.
      if (nationalAllowed) {
        rows.push({
          signal_id: signal.id,
          organization_id: org.id,
          location_id: null,
          match_type: "national",
          match_reason: effectiveScope === "national"
            ? "National scope — affects all commercial kitchens"
            : "Statewide — affects all California locations",
          requirement_code: null,
          relevance_score: 0.30,
        });
        matchCounts.national++;
      }

      // ── 5b. COUNTY match ────────────────────────────────
      // Gated on category as well as geography.
      if (countyAllowed && effectiveCounties.length > 0) {
        for (const county of effectiveCounties) {
          const entries = countyOrgLocations.get(county) || [];
          for (const entry of entries) {
            if (entry.orgId === org.id) {
              const displayCounty = county.replace(/\b\w/g, (l) => l.toUpperCase());
              rows.push({
                signal_id: signal.id,
                organization_id: org.id,
                location_id: entry.locId,
                match_type: "county",
                match_reason: `Your kitchen operates in ${displayCounty} County`,
                requirement_code: null,
                relevance_score: 0.70,
              });
              matchCounts.county++;
              break; // one county match per org is enough
            }
          }
        }
      }

      // ── 5c. INDUSTRY match ──────────────────────────────
      const targetIndustries = signal.target_industries || [];
      if (
        !signal.target_all_industries &&
        targetIndustries.length > 0 &&
        org.industry_type &&
        targetIndustries.includes(org.industry_type)
      ) {
        rows.push({
          signal_id: signal.id,
          organization_id: org.id,
          location_id: null,
          match_type: "industry",
          match_reason: `Applies to ${org.industry_type} operations`,
          requirement_code: null,
          relevance_score: 0.60,
        });
        matchCounts.industry++;
      }

      // ── 5d. REQUIREMENT match ───────────────────────────
      const reqCodes = CATEGORY_TO_REQUIREMENTS[signal.category] || [];
      const orgReqs = orgRequirements.get(org.id);
      if (reqCodes.length > 0 && orgReqs) {
        const matching = reqCodes.filter((c) => orgReqs.has(c));
        if (matching.length > 0) {
          const primaryCode = matching[0];
          const name = REQUIREMENT_NAMES[primaryCode] || primaryCode;
          rows.push({
            signal_id: signal.id,
            organization_id: org.id,
            location_id: null,
            match_type: "requirement",
            match_reason: `Touches your ${name} requirement`,
            requirement_code: primaryCode,
            relevance_score: 0.90,
          });
          matchCounts.requirement++;
        }
      }
    }

    // ── 6. Upsert correlations ──────────────────────────────
    let created = 0;
    if (rows.length > 0) {
      const { error: upsertErr, count } = await supabase
        .from("intelligence_correlations")
        .upsert(rows, { onConflict: "signal_id,organization_id,match_type", count: "exact" });

      if (upsertErr) {
        console.error("[correlate-signal] Upsert error:", upsertErr.message);
        return new Response(
          JSON.stringify({ error: `Upsert failed: ${upsertErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      created = count ?? rows.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        signal_id,
        correlations_created: created,
        matches: matchCounts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[correlate-signal] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
