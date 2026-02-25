import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * benchmark-snapshot — Daily 3am
 *
 * Calculates each active location's percentile rank against
 * current aggregate benchmarks. Writes to location_benchmark_ranks.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && cronSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const today = new Date().toISOString().split("T")[0];

    // Get all active locations with their scores
    const { data: locations } = await supabase
      .from("locations")
      .select(
        "id, name, organization_id, vertical, state, county, active",
      )
      .eq("active", true);

    if (!locations?.length) {
      return jsonResponse({ message: "No active locations", ranks_updated: 0 });
    }

    // Get latest compliance scores for each location
    // In production, this comes from a computed scores table
    const locationIds = locations.map((l: any) => l.id);

    // Get latest aggregates for comparison
    const { data: aggregates } = await supabase
      .from("benchmark_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(20);

    // Build a map of metric averages
    const metricAvg: Record<string, number> = {};
    for (const agg of aggregates || []) {
      if (!agg.vertical) {
        // Industry-wide
        metricAvg[agg.metric_name] = agg.metric_value;
      }
    }

    const overallAvg = metricAvg["overall"] || 79;
    const operationalAvg = metricAvg["operational"] || 79;
    const equipmentAvg = metricAvg["equipment"] || 76;
    const documentationAvg = metricAvg["documentation"] || 81;

    let ranksUpdated = 0;

    // Calculate percentiles (simplified: based on distance from average)
    const calcPct = (score: number, avg: number): number => {
      const diff = score - avg;
      return Math.max(5, Math.min(99, Math.round(50 + diff * 2.5)));
    };

    for (const loc of locations) {
      // Phase 2 (V6 fix): read from canonical compliance_score_snapshots first
      const { data: snapRows } = await supabase
        .from("compliance_score_snapshots")
        .select("id, overall_score, temp_in_range_pct, checklists_completed_pct, documents_current_pct")
        .eq("location_id", loc.id)
        .order("score_date", { ascending: false })
        .limit(1);

      const snapshot = snapRows?.[0];

      let overallScore: number;
      let operationalScore: number;
      let equipmentScore: number;
      let documentationScore: number;
      let scoreSnapshotId: string | null = null;

      if (snapshot) {
        // Use canonical snapshot scores
        scoreSnapshotId = snapshot.id;
        operationalScore = snapshot.temp_in_range_pct ?? 80;
        equipmentScore = snapshot.checklists_completed_pct ?? 75;
        documentationScore = snapshot.documents_current_pct ?? 70;
        overallScore = snapshot.overall_score;
      } else {
        // Fallback: compute from raw compliance data (pre-Phase 1 locations)
        const [tempResult, checklistResult, docResult] = await Promise.all([
          supabase
            .from("temperature_logs")
            .select("status", { count: "exact" })
            .eq("location_id", loc.id)
            .gte(
              "recorded_at",
              new Date(Date.now() - 30 * 86400000).toISOString(),
            ),
          supabase
            .from("checklists")
            .select("status", { count: "exact" })
            .eq("location_id", loc.id)
            .gte(
              "created_at",
              new Date(Date.now() - 30 * 86400000).toISOString(),
            ),
          supabase
            .from("documents")
            .select("id", { count: "exact" })
            .eq("location_id", loc.id)
            .not("expiration_date", "is", null),
        ]);

        const totalTemps = tempResult.count || 0;
        const inRangeTemps = (tempResult.data || []).filter(
          (t: any) => t.status === "in_range",
        ).length;
        operationalScore = totalTemps > 0
          ? Math.round((inRangeTemps / totalTemps) * 100)
          : 80;

        const totalChecklists = checklistResult.count || 0;
        const completedChecklists = (checklistResult.data || []).filter(
          (c: any) => c.status === "completed",
        ).length;
        equipmentScore = totalChecklists > 0
          ? Math.round((completedChecklists / totalChecklists) * 100)
          : 75;

        const docCount = docResult.count || 0;
        documentationScore = docCount > 5 ? 85 : 70;

        overallScore = Math.round(
          operationalScore * 0.5 +
            equipmentScore * 0.25 +
            documentationScore * 0.25,
        );
      }

      const { error } = await supabase
        .from("location_benchmark_ranks")
        .insert({
          location_id: loc.id,
          snapshot_date: today,
          vertical: loc.vertical || null,
          overall_score: overallScore,
          overall_percentile: calcPct(overallScore, overallAvg),
          operational_percentile: calcPct(operationalScore, operationalAvg),
          equipment_percentile: calcPct(equipmentScore, equipmentAvg),
          documentation_percentile: calcPct(
            documentationScore,
            documentationAvg,
          ),
          peer_group_size: locations.length,
          score_snapshot_id: scoreSnapshotId,
        });

      if (!error) ranksUpdated++;
    }

    return jsonResponse({
      success: true,
      snapshot_date: today,
      locations_processed: locations.length,
      ranks_updated: ranksUpdated,
    });
  } catch (error) {
    console.error("Error in benchmark-snapshot:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
