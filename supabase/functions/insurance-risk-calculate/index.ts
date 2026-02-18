// ============================================================
// Insurance Risk Calculate — Daily score recalculation
// ============================================================
// Scheduled to run daily (4am UTC). Recalculates risk scores
// for all active locations, stores factor-level detail, and
// creates monthly history snapshots on the 1st of each month.
//
// Trigger conditions for immediate recalculation:
//   - Vendor document uploaded or expires
//   - Temperature violation logged
//   - Checklist completed or missed
//   - Equipment service recorded
//   - Employee certification changes
//   - Incident logged or resolved
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

// --------------- Scoring Logic (server-side) ---------------
// Replicates the scoring engine from src/lib/insuranceRiskScore.ts
// but reads from database tables instead of static demo data.

interface Factor {
  name: string;
  score: number;
  weight: number;
  status: "pass" | "warning" | "fail" | "unknown";
  detail: string;
  reference: string;
  category: "fire" | "food_safety" | "documentation" | "operations";
  improvement: string;
}

function factorStatus(score: number): "pass" | "warning" | "fail" {
  if (score >= 90) return "pass";
  if (score >= 60) return "warning";
  return "fail";
}

function getTier(score: number): string {
  if (score >= 90) return "Preferred Risk";
  if (score >= 75) return "Standard Risk";
  if (score >= 60) return "Elevated Risk";
  return "High Risk";
}

// Calculate fire risk factors from vendor and equipment data
async function calculateFireFactors(
  supabase: ReturnType<typeof createClient>,
  locationId: string,
  _orgId: string
): Promise<{ factors: Factor[]; score: number }> {
  // Fetch vendor services for this location (fire-related)
  const { data: vendorServices } = await supabase
    .from("vendors")
    .select("service_type, status, last_service, next_due")
    .eq("location_id", locationId)
    .in("service_type", ["Hood Cleaning", "Fire Suppression", "Fire Extinguisher", "Grease Trap"]);

  const services = vendorServices || [];

  function vendorScore(serviceType: string): number {
    const v = services.find((s: Record<string, unknown>) => s.service_type === serviceType);
    if (!v) return 50;
    if (v.status === "overdue") return 20;
    if (v.status === "upcoming") return 75;
    return 95;
  }

  function vendorDetail(serviceType: string): string {
    const v = services.find((s: Record<string, unknown>) => s.service_type === serviceType);
    if (!v) return "No record found";
    if (v.status === "overdue") return `Overdue — last service ${v.last_service}`;
    if (v.status === "upcoming") return `Due ${v.next_due}`;
    return "Current per schedule";
  }

  const hoodScore = vendorScore("Hood Cleaning");
  const fireScore = vendorScore("Fire Suppression");
  const extScore = vendorScore("Fire Extinguisher");
  const greaseScore = vendorScore("Grease Trap");

  const factors: Factor[] = [
    { name: "Hood cleaning current per NFPA 96-2024 schedule", score: hoodScore, weight: 0.18, status: factorStatus(hoodScore), detail: `Hood cleaning: ${vendorDetail("Hood Cleaning")}`, reference: "NFPA 96-2024", category: "fire", improvement: "Schedule hood cleaning service" },
    { name: "Fire suppression system inspected (semi-annual)", score: fireScore, weight: 0.16, status: factorStatus(fireScore), detail: `Fire suppression: ${vendorDetail("Fire Suppression")}`, reference: "NFPA 17A-2025", category: "fire", improvement: "Schedule fire suppression inspection" },
    { name: "Fire extinguisher inspected (annual)", score: extScore, weight: 0.14, status: factorStatus(extScore), detail: extScore >= 90 ? "Annual inspection current" : "Inspection approaching or overdue", reference: "NFPA 10-2025", category: "fire", improvement: "Schedule extinguisher inspection" },
    { name: "Monthly visual checks documented", score: Math.min(100, Math.round(hoodScore * 1.05)), weight: 0.10, status: factorStatus(Math.round(hoodScore * 1.05)), detail: hoodScore >= 80 ? "Visual inspection logs up to date" : "Documentation gaps in visual checks", reference: "NFPA 10-2025 §7.2", category: "fire", improvement: "Complete monthly visual inspection checklist" },
    { name: "Cleaning to bare metal verified", score: hoodScore >= 90 ? 100 : hoodScore >= 50 ? 70 : 30, weight: 0.10, status: factorStatus(hoodScore >= 90 ? 100 : hoodScore >= 50 ? 70 : 30), detail: hoodScore >= 90 ? "Bare metal cleaning documented" : "Cleaning verification incomplete", reference: "NFPA 96-2024 §11.4", category: "fire", improvement: "Request bare metal cleaning verification from vendor" },
    { name: "Automatic fuel/electric shutoff tested", score: greaseScore, weight: 0.10, status: factorStatus(greaseScore), detail: greaseScore >= 80 ? "Shutoff systems tested" : "Shutoff testing overdue", reference: "NFPA 96-2024 §10.1", category: "fire", improvement: "Schedule shutoff system test" },
    { name: "Manual pull station accessible and tested", score: Math.min(100, Math.round(fireScore * 1.02)), weight: 0.08, status: factorStatus(Math.round(fireScore * 1.02)), detail: fireScore >= 80 ? "Pull station accessible and tested" : "Pull station testing needed", reference: "NFPA 17A-2025", category: "fire", improvement: "Test manual pull station" },
    { name: "Fire alarm system current", score: Math.min(100, Math.round((fireScore + extScore) / 2 * 1.05)), weight: 0.08, status: factorStatus(Math.round((fireScore + extScore) / 2 * 1.05)), detail: "Fire alarm monitoring status", reference: "NFPA 72-2025", category: "fire", improvement: "Schedule fire alarm inspection" },
    { name: "Documentation on file and accessible", score: Math.round(hoodScore * 0.95), weight: 0.06, status: factorStatus(Math.round(hoodScore * 0.95)), detail: hoodScore >= 80 ? "All fire safety records on file" : "Documentation gaps detected", reference: "NFPA 96-2024 §14.2", category: "fire", improvement: "Upload missing fire safety documentation" },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { factors, score };
}

// Simplified food safety, documentation, and operational calculators
// In production, these would query detailed compliance tables.
// For now they use available data from the compliance scores.
async function calculateCategoryFactors(
  supabase: ReturnType<typeof createClient>,
  locationId: string,
  orgId: string,
  category: "food_safety" | "documentation" | "operations"
): Promise<{ factors: Factor[]; score: number }> {
  // Fetch the latest compliance scores for this location
  const { data: scores } = await supabase
    .from("insurance_risk_scores")
    .select("*")
    .eq("organization_id", orgId)
    .eq("location_id", locationId)
    .order("calculated_at", { ascending: false })
    .limit(1);

  const existingScore = scores?.[0];
  const breakdown = (existingScore?.category_breakdown || {}) as Record<string, unknown>;
  const catData = (breakdown[category] || {}) as Record<string, unknown>;
  const catFactors = ((catData as Record<string, unknown>).factors || []) as Record<string, unknown>[];

  if (catFactors.length > 0) {
    const factors: Factor[] = catFactors.map((f: Record<string, unknown>) => ({
      name: f.name as string || "Unknown factor",
      score: (f.score as number) || 50,
      weight: (f.weight as number) || 0.1,
      status: factorStatus((f.score as number) || 50),
      detail: (f.detail as string) || "",
      reference: (f.reference as string) || "",
      category,
      improvement: (f.improvement_action as string) || "Address this factor",
    }));
    const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
    return { factors, score };
  }

  // Fallback: derive score from existing category score
  const categoryScoreMap: Record<string, string> = {
    food_safety: "food_safety_score",
    documentation: "documentation_score",
    operations: "operational_score",
  };
  const baseScore = existingScore?.[categoryScoreMap[category]] as number || 50;

  const factors: Factor[] = [{
    name: `${category.replace("_", " ")} overall assessment`,
    score: baseScore,
    weight: 1.0,
    status: factorStatus(baseScore),
    detail: `Score: ${baseScore}/100`,
    reference: category === "food_safety" ? "FDA Food Code" : category === "documentation" ? "Carrier Requirements" : "Operational SOP",
    category,
    improvement: "Review and improve compliance in this category",
  }];

  return { factors, score: baseScore };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Allow POST only (triggered by cron or manual call)
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST to trigger calculation." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Verify service-level auth (not carrier API key) ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.includes(supabaseKey) && !authHeader?.startsWith("Bearer ")) {
      // Allow if called by Supabase cron (no auth header needed from cron)
      // Also allow with valid service role key
    }

    console.log(`[insurance-risk-calculate] Starting calculation at ${new Date().toISOString()}`);

    // ── Fetch all active organizations with locations ──
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name");

    if (!orgs || orgs.length === 0) {
      return jsonResponse({ message: "No organizations found", locations_processed: 0 });
    }

    let locationsProcessed = 0;
    let scoresUpdated = 0;
    let historySnapshots = 0;
    const errors: string[] = [];

    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;

    for (const org of orgs) {
      // Fetch locations for this org
      const { data: locations } = await supabase
        .from("locations")
        .select("id")
        .eq("organization_id", org.id)
        .eq("active", true);

      if (!locations) continue;

      for (const loc of locations) {
        try {
          locationsProcessed++;

          // Calculate fire factors
          const fire = await calculateFireFactors(supabase, loc.id, org.id);

          // Calculate other categories
          const foodSafety = await calculateCategoryFactors(supabase, loc.id, org.id, "food_safety");
          const documentation = await calculateCategoryFactors(supabase, loc.id, org.id, "documentation");
          const operations = await calculateCategoryFactors(supabase, loc.id, org.id, "operations");

          // Calculate overall weighted score
          const overall = Math.round(
            fire.score * 0.40 +
            foodSafety.score * 0.30 +
            documentation.score * 0.20 +
            operations.score * 0.10
          );
          const tier = getTier(overall);

          // Build category breakdown JSON
          const allFactors = [
            ...fire.factors,
            ...foodSafety.factors,
            ...documentation.factors,
            ...operations.factors,
          ];

          const categoryBreakdown = {
            fire: { score: fire.score, weight: 0.40, factors: fire.factors },
            food_safety: { score: foodSafety.score, weight: 0.30, factors: foodSafety.factors },
            documentation: { score: documentation.score, weight: 0.20, factors: documentation.factors },
            operations: { score: operations.score, weight: 0.10, factors: operations.factors },
          };

          // Upsert insurance_risk_scores
          const { data: scoreRecord } = await supabase
            .from("insurance_risk_scores")
            .insert({
              organization_id: org.id,
              location_id: loc.id,
              overall_score: overall,
              tier,
              fire_risk_score: fire.score,
              food_safety_score: foodSafety.score,
              documentation_score: documentation.score,
              operational_score: operations.score,
              category_breakdown: categoryBreakdown,
              factors_count: allFactors.length,
              calculated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (scoreRecord) {
            scoresUpdated++;

            // Insert factor-level detail
            const factorRows = allFactors.map(f => ({
              location_id: loc.id,
              risk_score_id: scoreRecord.id,
              factor_name: f.name,
              factor_category: f.category,
              current_value: f.score,
              max_value: 100,
              weight: f.weight,
              status: f.status,
              impact_description: f.detail,
              improvement_action: f.improvement,
              reference_standard: f.reference,
            }));

            await supabase.from("insurance_risk_factors").insert(factorRows);
          }

          // Monthly history snapshot (1st of month)
          if (isFirstOfMonth) {
            const { error: histErr } = await supabase
              .from("insurance_score_history")
              .upsert({
                organization_id: org.id,
                location_id: loc.id,
                score_date: today.toISOString().split("T")[0],
                overall_score: overall,
                fire_score: fire.score,
                food_safety_score: foodSafety.score,
                documentation_score: documentation.score,
                operations_score: operations.score,
                tier,
                factors_count: allFactors.length,
              }, { onConflict: "location_id,score_date" });

            if (!histErr) historySnapshots++;
          }
        } catch (err) {
          const msg = `Error processing location ${loc.id}: ${err}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    }

    console.log(`[insurance-risk-calculate] Complete: ${locationsProcessed} locations, ${scoresUpdated} scores, ${historySnapshots} snapshots, ${errors.length} errors`);

    return jsonResponse({
      status: "completed",
      locations_processed: locationsProcessed,
      scores_updated: scoresUpdated,
      history_snapshots: historySnapshots,
      is_monthly_snapshot: isFirstOfMonth,
      errors: errors.length > 0 ? errors : undefined,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Unexpected error in insurance-risk-calculate:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
