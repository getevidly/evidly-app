// ============================================================
// Correlation Engine — Daily risk assessment from intelligence
// ============================================================
// Scheduled daily (after intelligence-collect). Evaluates 8
// deterministic rules that correlate published intelligence
// with compliance snapshots to produce risk_assessments rows.
//
// Rules are pure logic — no AI/LLM calls. Each rule maps an
// intelligence category to a risk dimension with fixed weights.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Severity weight maps ────────────────────────────────────

function severityWeight(impactLevel: string): number {
  switch (impactLevel) {
    case "critical": return 25;
    case "high": return 15;
    case "medium": return 8;
    case "low": return 3;
    default: return 5;
  }
}

function complianceImpactWeight(impactLevel: string): number {
  switch (impactLevel) {
    case "critical": return 20;
    case "high": return 12;
    default: return 5;
  }
}

function getTier(score: number): string {
  if (score >= 90) return "preferred";
  if (score >= 75) return "standard";
  if (score >= 60) return "elevated";
  return "high";
}

// ── Types ───────────────────────────────────────────────────

interface LocationContext {
  id: string;
  organization_id: string;
  counties: string[]; // lowercase county names from jurisdictions
  state: string;
  snapshot: {
    id: string;
    overall_score: number;
    food_safety_score: number | null;
    facility_safety_score: number | null;
    temp_in_range_pct: number | null;
    checklists_completed_pct: number | null;
  } | null;
}

interface InsightRow {
  id: string;
  category: string;
  impact_level: string;
  affected_counties: string[];
  status: string;
  source_type: string;
  created_at: string;
}

interface Driver {
  driver: string;
  ref?: string;
  detail?: string;
  points: number;
}

interface RiskAccumulator {
  revenue_risk: number;
  cost_risk: number;
  liability_risk: number;
  operational_risk: number;
  drivers: Driver[];
  intelligence_refs: string[];
}

// ── Correlation Rules ───────────────────────────────────────

function evaluateRules(
  loc: LocationContext,
  insights: InsightRow[],
  _gradeChanged: boolean,
  _gradeDelta: number,
): RiskAccumulator {
  const risk: RiskAccumulator = {
    revenue_risk: 0,
    cost_risk: 0,
    liability_risk: 0,
    operational_risk: 0,
    drivers: [],
    intelligence_refs: [],
  };

  const countySet = new Set(loc.counties.map(c => c.toLowerCase()));

  for (const insight of insights) {
    const insightCounties = (insight.affected_counties || []).map(c => c.toLowerCase());
    const countyMatch = insightCounties.some(c => countySet.has(c));

    // If no county overlap, skip this insight for this location
    if (!countyMatch && insight.category !== "recall_alert") continue;

    // RULE 1: OUTBREAK → LIABILITY
    if (insight.category === "outbreak_alert" && countyMatch) {
      const pts = severityWeight(insight.impact_level);
      risk.liability_risk += pts;
      risk.drivers.push({ driver: "active_outbreak", ref: insight.id, points: pts });
      risk.intelligence_refs.push(insight.id);
    }

    // RULE 2: RECALL → COST (county match OR state-level for critical/high)
    if (
      insight.category === "recall_alert" &&
      (insight.impact_level === "critical" || insight.impact_level === "high")
    ) {
      // Recalls are often state/national scope — match if county overlaps OR no counties specified (broad recall)
      if (countyMatch || insightCounties.length === 0) {
        risk.cost_risk += 15;
        risk.drivers.push({ driver: "active_recall", ref: insight.id, points: 15 });
        risk.intelligence_refs.push(insight.id);
      }
    }

    // RULE 3: WEATHER → OPERATIONAL
    if (insight.category === "weather_risk" && countyMatch) {
      const pts = severityWeight(insight.impact_level);
      risk.operational_risk += pts;
      risk.drivers.push({ driver: "weather_risk", ref: insight.id, points: pts });
      risk.intelligence_refs.push(insight.id);
    }

    // RULE 4: ENFORCEMENT SURGE → LIABILITY
    if (insight.category === "enforcement_surge" && countyMatch) {
      risk.liability_risk += 10;
      risk.drivers.push({ driver: "enforcement_surge", ref: insight.id, points: 10 });
      risk.intelligence_refs.push(insight.id);
    }

    // RULE 5: INSPECTOR PATTERN → OPERATIONAL
    if (insight.category === "inspector_pattern" && countyMatch) {
      risk.operational_risk += 5;
      risk.drivers.push({ driver: "inspector_focus", ref: insight.id, points: 5 });
      risk.intelligence_refs.push(insight.id);
    }

    // RULE 6: REGULATORY CHANGE → OPERATIONAL
    if (
      (insight.category === "regulatory_change" || insight.category === "regulatory_updates") &&
      (insight.impact_level === "critical" || insight.impact_level === "high") &&
      countyMatch
    ) {
      const pts = complianceImpactWeight(insight.impact_level);
      risk.operational_risk += pts;
      risk.drivers.push({ driver: "regulatory_change", ref: insight.id, points: pts });
      risk.intelligence_refs.push(insight.id);
    }
  }

  // RULE 7: MISSED TEMPS → REVENUE (snapshot-based, not per-insight)
  if (
    loc.snapshot &&
    loc.snapshot.temp_in_range_pct !== null &&
    loc.snapshot.temp_in_range_pct < 80
  ) {
    // Check if there's ANY active intelligence alert for this location's counties
    const hasActiveAlert = insights.some(i => {
      const iCounties = (i.affected_counties || []).map(c => c.toLowerCase());
      return iCounties.some(c => countySet.has(c));
    });

    if (hasActiveAlert) {
      risk.revenue_risk += 20;
      risk.drivers.push({
        driver: "missed_logs_plus_alert",
        detail: `temp_in_range_pct=${loc.snapshot.temp_in_range_pct}%`,
        points: 20,
      });
    }
  }

  // RULE 8: GRADE CHANGE → LIABILITY (detected from score_calculations history)
  if (_gradeChanged) {
    const pts = Math.abs(_gradeDelta) * 3; // ~3 pts per grade point change
    risk.liability_risk += pts;
    risk.drivers.push({
      driver: "grade_change",
      detail: `grade_delta=${_gradeDelta}`,
      points: pts,
    });
  }

  // Cap all risk dimensions at 100
  risk.revenue_risk = Math.min(100, risk.revenue_risk);
  risk.cost_risk = Math.min(100, risk.cost_risk);
  risk.liability_risk = Math.min(100, risk.liability_risk);
  risk.operational_risk = Math.min(100, risk.operational_risk);

  return risk;
}

// ── Main handler ────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional: filter to a single location
    let targetLocationId: string | null = null;
    try {
      const body = await req.json();
      targetLocationId = body?.location_id || null;
    } catch {
      // No body or invalid JSON — process all locations
    }

    console.log(`[correlation-engine] Starting at ${new Date().toISOString()}`);

    // ── 1. Fetch active locations with their counties ──
    let locQuery = supabase
      .from("locations")
      .select("id, organization_id, state")
      .eq("status", "active");

    if (targetLocationId) {
      locQuery = locQuery.eq("id", targetLocationId);
    }

    const { data: locations, error: locErr } = await locQuery;
    if (locErr) throw locErr;
    if (!locations?.length) {
      return jsonResponse({ message: "No active locations", assessments_created: 0 });
    }

    // Fetch jurisdiction mappings for all locations
    const locationIds = locations.map((l: any) => l.id);
    const { data: ljRows } = await supabase
      .from("location_jurisdictions")
      .select("location_id, jurisdictions(county)")
      .in("location_id", locationIds);

    // Build county map: location_id → county[]
    const countyMap = new Map<string, string[]>();
    for (const lj of ljRows || []) {
      const county = (lj as any).jurisdictions?.county;
      if (county) {
        const existing = countyMap.get(lj.location_id) || [];
        if (!existing.includes(county.toLowerCase())) {
          existing.push(county.toLowerCase());
        }
        countyMap.set(lj.location_id, existing);
      }
    }

    // ── 2. Fetch latest compliance snapshots ──
    const { data: snapshots } = await supabase
      .from("compliance_score_snapshots")
      .select("id, location_id, overall_score, food_safety_score, facility_safety_score, temp_in_range_pct, checklists_completed_pct")
      .in("location_id", locationIds)
      .order("score_date", { ascending: false });

    // Deduplicate to latest per location
    const snapshotMap = new Map<string, any>();
    for (const s of snapshots || []) {
      if (!snapshotMap.has(s.location_id)) {
        snapshotMap.set(s.location_id, s);
      }
    }

    // ── 3. Fetch published intelligence insights (last 30 days) ──
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: insights } = await supabase
      .from("intelligence_insights")
      .select("id, category, impact_level, affected_counties, status, source_type, created_at")
      .eq("status", "published")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200);

    const publishedInsights: InsightRow[] = (insights || []).map((i: any) => ({
      id: i.id,
      category: i.category,
      impact_level: i.impact_level,
      affected_counties: i.affected_counties || [],
      status: i.status,
      source_type: i.source_type,
      created_at: i.created_at,
    }));

    // ── 4. Detect grade changes (Rule 8) ──
    // Compare latest 2 score_calculations "combined" entries per location
    const { data: recentCalcs } = await supabase
      .from("score_calculations")
      .select("location_id, normalized_score, created_at")
      .in("location_id", locationIds)
      .eq("sub_component", "combined")
      .order("created_at", { ascending: false })
      .limit(locationIds.length * 4); // 2 per location × 2 pillars max

    const gradeChangeMap = new Map<string, { changed: boolean; delta: number }>();
    const calcsByLoc = new Map<string, any[]>();
    for (const c of recentCalcs || []) {
      const arr = calcsByLoc.get(c.location_id) || [];
      arr.push(c);
      calcsByLoc.set(c.location_id, arr);
    }
    for (const [locId, calcs] of calcsByLoc) {
      if (calcs.length >= 2) {
        const newest = calcs[0].normalized_score;
        const previous = calcs[1].normalized_score;
        const delta = newest - previous;
        gradeChangeMap.set(locId, { changed: Math.abs(delta) >= 5, delta });
      }
    }

    // ── 5. Evaluate rules per location and write risk_assessments ──
    let assessmentsCreated = 0;
    const errors: string[] = [];

    for (const loc of locations) {
      try {
        const snapshot = snapshotMap.get(loc.id) || null;
        const counties = countyMap.get(loc.id) || [];
        const gradeInfo = gradeChangeMap.get(loc.id) || { changed: false, delta: 0 };

        const ctx: LocationContext = {
          id: loc.id,
          organization_id: loc.organization_id,
          counties,
          state: loc.state || "CA",
          snapshot: snapshot ? {
            id: snapshot.id,
            overall_score: snapshot.overall_score,
            food_safety_score: snapshot.food_safety_score,
            facility_safety_score: snapshot.facility_safety_score,
            temp_in_range_pct: snapshot.temp_in_range_pct,
            checklists_completed_pct: snapshot.checklists_completed_pct,
          } : null,
        };

        const risk = evaluateRules(ctx, publishedInsights, gradeInfo.changed, gradeInfo.delta);

        // Compute insurance_overall: 100 - weighted risk
        const weightedRisk =
          risk.revenue_risk * 0.25 +
          risk.cost_risk * 0.25 +
          risk.liability_risk * 0.30 +
          risk.operational_risk * 0.20;
        const insuranceOverall = Math.max(0, Math.round(100 - weightedRisk));
        const insuranceTier = getTier(insuranceOverall);

        // Compute inputs_hash for reproducibility
        const hashPayload = JSON.stringify({
          location_id: loc.id,
          snapshot_id: snapshot?.id,
          insight_count: publishedInsights.length,
          grade_changed: gradeInfo.changed,
        });
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashPayload));
        const inputsHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

        // Deduplicate intelligence_refs
        const uniqueRefs = [...new Set(risk.intelligence_refs)];

        const { error: insertErr } = await supabase
          .from("risk_assessments")
          .insert({
            organization_id: loc.organization_id,
            location_id: loc.id,
            score_snapshot_id: snapshot?.id || null,
            revenue_risk: risk.revenue_risk,
            cost_risk: risk.cost_risk,
            liability_risk: risk.liability_risk,
            operational_risk: risk.operational_risk,
            insurance_overall: insuranceOverall,
            insurance_tier: insuranceTier,
            drivers_json: risk.drivers,
            intelligence_refs: uniqueRefs,
            model_version: "1.0",
            inputs_hash: inputsHash,
          });

        if (insertErr) {
          errors.push(`Location ${loc.id}: ${insertErr.message}`);
        } else {
          assessmentsCreated++;
        }
      } catch (locErr) {
        errors.push(`Location ${loc.id}: ${(locErr as Error).message}`);
      }
    }

    console.log(
      `[correlation-engine] Complete: ${assessmentsCreated}/${locations.length} assessments, ${errors.length} errors`,
    );

    return jsonResponse({
      status: "completed",
      locations_processed: locations.length,
      assessments_created: assessmentsCreated,
      insights_evaluated: publishedInsights.length,
      errors: errors.length > 0 ? errors : undefined,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[correlation-engine] Fatal error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
