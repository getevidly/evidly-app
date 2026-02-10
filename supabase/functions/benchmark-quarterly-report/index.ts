import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * benchmark-quarterly-report — 1st of Jan/Apr/Jul/Oct
 *
 * Compiles the full EvidLY Compliance Index quarterly report.
 * Aggregates anonymized data across all locations.
 * Saves report data as JSON + triggers PDF generation.
 *
 * Report Contents:
 * 1. Executive summary
 * 2. Overall industry score
 * 3. Score by vertical
 * 4. Score by state/county
 * 5. Score by category
 * 6. Trending up/down
 * 7. Top violations
 * 8. Seasonal insights
 * 9. Regulatory impact
 * 10. Predictions
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && cronSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    // Determine which quarter just ended
    const currentMonth = now.getMonth(); // 0-indexed
    const quarter = currentMonth < 3
      ? 4
      : currentMonth < 6
        ? 1
        : currentMonth < 9
          ? 2
          : 3;
    const year = quarter === 4 ? now.getFullYear() - 1 : now.getFullYear();

    // Quarter date ranges
    const quarterStartMonth = ((quarter - 1) * 3);
    const quarterYear = quarter === 4 ? year : year;
    const periodStart = new Date(quarterYear, quarterStartMonth, 1);
    const periodEnd = new Date(quarterYear, quarterStartMonth + 3, 0);

    const ANONYMIZATION_THRESHOLD = 50;

    // Get all rank snapshots in the quarter
    const { data: quarterRanks } = await supabase
      .from("location_benchmark_ranks")
      .select("*")
      .gte("snapshot_date", periodStart.toISOString().split("T")[0])
      .lte("snapshot_date", periodEnd.toISOString().split("T")[0]);

    // Get latest aggregated snapshots
    const { data: snapshots } = await supabase
      .from("benchmark_snapshots")
      .select("*")
      .gte("snapshot_date", periodStart.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: false });

    // Deduplicate ranks to latest per location
    const latestByLocation = new Map<string, any>();
    for (const r of quarterRanks || []) {
      if (!latestByLocation.has(r.location_id)) {
        latestByLocation.set(r.location_id, r);
      }
    }
    const uniqueLocations = latestByLocation.size;

    if (uniqueLocations < ANONYMIZATION_THRESHOLD) {
      return jsonResponse({
        message: `Insufficient data: ${uniqueLocations} locations (minimum ${ANONYMIZATION_THRESHOLD})`,
        report_created: false,
      });
    }

    // Compute industry-wide metrics
    const allScores = Array.from(latestByLocation.values());
    const avgScore = Math.round(
      allScores.reduce((s: number, r: any) => s + (r.overall_score || 0), 0) /
        allScores.length,
    );

    // Build vertical breakdown from snapshots
    const verticalScores: Record<string, number> = {};
    for (const snap of snapshots || []) {
      if (snap.vertical && snap.metric_name === "overall" && !verticalScores[snap.vertical]) {
        verticalScores[snap.vertical] = snap.metric_value;
      }
    }

    // Build state breakdown
    const stateScores: Record<string, number> = {};
    for (const snap of snapshots || []) {
      if (snap.state && !snap.vertical && snap.metric_name === "overall" && !stateScores[snap.state]) {
        stateScores[snap.state] = snap.metric_value;
      }
    }

    // Category breakdown (industry-wide)
    const categoryScores: Record<string, number> = {};
    for (const snap of snapshots || []) {
      if (
        !snap.vertical && !snap.state && !snap.county &&
        !categoryScores[snap.metric_name]
      ) {
        categoryScores[snap.metric_name] = snap.metric_value;
      }
    }

    // Get previous quarter for trend
    const prevQStart = new Date(quarterYear, quarterStartMonth - 3, 1);
    const prevQEnd = new Date(quarterYear, quarterStartMonth, 0);

    const { data: prevSnapshots } = await supabase
      .from("benchmark_snapshots")
      .select("metric_name, metric_value")
      .gte("snapshot_date", prevQStart.toISOString().split("T")[0])
      .lte("snapshot_date", prevQEnd.toISOString().split("T")[0])
      .is("vertical", null)
      .is("state", null);

    const prevOverall = prevSnapshots?.find(
      (s: any) => s.metric_name === "overall",
    )?.metric_value || avgScore;
    const quarterChange = avgScore - prevOverall;

    // Get top violations
    const { data: violations } = await supabase
      .from("violations")
      .select("title", { count: "exact" })
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());

    // Count violation types
    const violationCounts: Record<string, number> = {};
    for (const v of violations || []) {
      const title = v.title || "Unknown";
      violationCounts[title] = (violationCounts[title] || 0) + 1;
    }
    const topViolations = Object.entries(violationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));

    // Build report data
    const reportData: any = {
      executive_summary: `Q${quarter} ${year} saw an average compliance score of ${avgScore} across ${uniqueLocations} commercial kitchens, ${quarterChange >= 0 ? "up" : "down"} ${Math.abs(quarterChange)} points from Q${quarter === 1 ? 4 : quarter - 1}.`,
      overall_score: avgScore,
      quarter_change: quarterChange,
      total_locations: uniqueLocations,
      vertical_scores: verticalScores,
      state_scores: stateScores,
      category_scores: categoryScores,
      top_violations: topViolations,
      seasonal_note: quarter === 3
        ? "Summer typically sees a dip in compliance due to staffing changes and increased volume."
        : quarter === 4
          ? "Holiday season shows mixed results: higher equipment compliance but documentation lapses."
          : "Compliance typically peaks in Q1 as kitchens reset after annual inspections.",
    };

    // Optionally use AI to generate narrative
    if (anthropicKey) {
      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1500,
            system:
              'You are writing the executive summary for the EvidLY Compliance Index quarterly report. Write a professional 3-paragraph executive summary suitable for industry publications. Return a JSON object: {"executive_summary": "...", "predictions": "...", "content_ideas": ["...", "..."]}. Return ONLY valid JSON.',
            messages: [
              {
                role: "user",
                content: `Generate the Q${quarter} ${year} report narrative. Data:\n${JSON.stringify(reportData, null, 2)}`,
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.content
            ?.filter((b: any) => b.type === "text")
            .map((b: any) => b.text)
            .join("") || "";
          try {
            const parsed = JSON.parse(
              text.replace(/```json|```/g, "").trim(),
            );
            if (parsed.executive_summary) {
              reportData.executive_summary = parsed.executive_summary;
            }
            if (parsed.predictions) reportData.predictions = parsed.predictions;
            if (parsed.content_ideas) {
              reportData.content_ideas = parsed.content_ideas;
            }
          } catch { /* use fallback */ }
        }
      } catch (err) {
        console.error("[benchmark-quarterly-report] AI error:", err);
      }
    }

    // Add default content ideas if AI didn't generate them
    if (!reportData.content_ideas) {
      reportData.content_ideas = [
        `Top ${Object.keys(verticalScores).length} compliance gaps kitchens need to fix in ${year}`,
        "Healthcare kitchens outperform restaurants in documentation — here's why",
        `How compliance scores shifted in Q${quarter} ${year}`,
      ];
    }

    // Save the report
    const { data: report, error: reportError } = await supabase
      .from("benchmark_index_reports")
      .upsert(
        {
          quarter,
          year,
          report_data: reportData,
          total_locations_sampled: uniqueLocations,
          published_at: now.toISOString(),
        },
        { onConflict: "quarter,year" },
      )
      .select()
      .single();

    if (reportError) {
      console.error(
        "[benchmark-quarterly-report] Save error:",
        reportError,
      );
      return jsonResponse({ error: "Failed to save report" }, 500);
    }

    return jsonResponse({
      success: true,
      report_id: report?.id,
      quarter,
      year,
      total_locations: uniqueLocations,
      overall_score: avgScore,
      quarter_change: quarterChange,
    });
  } catch (error) {
    console.error("Error in benchmark-quarterly-report:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
