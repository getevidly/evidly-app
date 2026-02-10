import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * benchmark-aggregate — Weekly Sunday 4am
 *
 * Rebuilds aggregate benchmark tables from anonymized location data.
 * Computes percentile breakpoints per vertical, state, county, size tier.
 * Only publishes segments with 10+ data points (privacy threshold).
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && cronSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const today = new Date().toISOString().split("T")[0];
    const PRIVACY_THRESHOLD = 10;

    // Get the latest rank snapshot for each location
    const { data: ranks } = await supabase
      .from("location_benchmark_ranks")
      .select("*, locations!inner(vertical, state, county, organization_id)")
      .order("snapshot_date", { ascending: false });

    if (!ranks?.length) {
      return jsonResponse({
        message: "No rank data available",
        snapshots_created: 0,
      });
    }

    // Deduplicate to latest per location
    const latestByLocation = new Map<string, any>();
    for (const r of ranks) {
      if (!latestByLocation.has(r.location_id)) {
        latestByLocation.set(r.location_id, r);
      }
    }
    const latestRanks = Array.from(latestByLocation.values());

    // Helper: compute percentiles from a sorted array
    function computePercentiles(
      values: number[],
    ): {
      avg: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
    } {
      if (values.length === 0) {
        return { avg: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 };
      }
      const sorted = [...values].sort((a, b) => a - b);
      const pct = (p: number) =>
        sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
      const avg = Math.round(
        sorted.reduce((s, v) => s + v, 0) / sorted.length,
      );
      return {
        avg,
        p25: pct(0.25),
        p50: pct(0.5),
        p75: pct(0.75),
        p90: pct(0.9),
        p95: pct(0.95),
      };
    }

    // Group scores by segments
    type Segment = {
      vertical: string | null;
      state: string | null;
      county: string | null;
    };

    function segmentKey(s: Segment): string {
      return `${s.vertical || "ALL"}|${s.state || "ALL"}|${s.county || "ALL"}`;
    }

    const segmentScores = new Map<
      string,
      { segment: Segment; overall: number[]; operational: number[]; equipment: number[]; documentation: number[] }
    >();

    function addToSegment(segment: Segment, rank: any) {
      const key = segmentKey(segment);
      if (!segmentScores.has(key)) {
        segmentScores.set(key, {
          segment,
          overall: [],
          operational: [],
          equipment: [],
          documentation: [],
        });
      }
      const s = segmentScores.get(key)!;
      if (rank.overall_score != null) s.overall.push(rank.overall_score);
      if (rank.operational_percentile != null) {
        s.operational.push(rank.operational_percentile);
      }
      if (rank.equipment_percentile != null) {
        s.equipment.push(rank.equipment_percentile);
      }
      if (rank.documentation_percentile != null) {
        s.documentation.push(rank.documentation_percentile);
      }
    }

    for (const rank of latestRanks) {
      const loc = rank.locations;
      // Industry-wide
      addToSegment({ vertical: null, state: null, county: null }, rank);
      // By vertical
      if (loc?.vertical) {
        addToSegment({ vertical: loc.vertical, state: null, county: null }, rank);
      }
      // By state
      if (loc?.state) {
        addToSegment({ vertical: null, state: loc.state, county: null }, rank);
      }
      // By vertical + state
      if (loc?.vertical && loc?.state) {
        addToSegment({ vertical: loc.vertical, state: loc.state, county: null }, rank);
      }
      // By county
      if (loc?.county) {
        addToSegment({ vertical: null, state: null, county: loc.county }, rank);
      }
    }

    let snapshotsCreated = 0;

    for (const [, entry] of segmentScores) {
      // Privacy threshold
      if (entry.overall.length < PRIVACY_THRESHOLD) continue;

      const metrics = [
        { name: "overall", values: entry.overall },
        { name: "operational", values: entry.operational },
        { name: "equipment", values: entry.equipment },
        { name: "documentation", values: entry.documentation },
      ];

      for (const metric of metrics) {
        if (metric.values.length === 0) continue;
        const pcts = computePercentiles(metric.values);

        const { error } = await supabase
          .from("benchmark_snapshots")
          .insert({
            snapshot_date: today,
            vertical: entry.segment.vertical,
            state: entry.segment.state,
            county: entry.segment.county,
            metric_name: metric.name,
            metric_value: pcts.avg,
            sample_size: metric.values.length,
            percentile_25: pcts.p25,
            percentile_50: pcts.p50,
            percentile_75: pcts.p75,
            percentile_90: pcts.p90,
            percentile_95: pcts.p95,
          });

        if (!error) snapshotsCreated++;
      }
    }

    return jsonResponse({
      success: true,
      snapshot_date: today,
      total_locations: latestRanks.length,
      segments_processed: segmentScores.size,
      snapshots_created: snapshotsCreated,
      privacy_threshold: PRIVACY_THRESHOLD,
    });
  } catch (error) {
    console.error("Error in benchmark-aggregate:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
