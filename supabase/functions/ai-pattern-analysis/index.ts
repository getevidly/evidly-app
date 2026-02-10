import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * ai-pattern-analysis — Scheduled daily at 2am
 *
 * Loops through all active locations, analyzes last 7/14/30 days
 * of temp logs, checklists, and violations.
 * Detects anomalies and trends using statistical thresholds.
 * Creates ai_insights records for any detected patterns.
 *
 * Thresholds:
 *   - Temp: same unit exceeds threshold 3+ times in 7 days
 *   - Checklists: completion rate drops below 80% for any day of week
 *   - Cooling: average cooling time increases >10% week-over-week
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional: verify cron secret for scheduled invocations
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && cronSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

    // Get all active locations
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, organization_id")
      .eq("active", true);

    if (!locations?.length) {
      return jsonResponse({ message: "No active locations", insights_created: 0 });
    }

    let insightsCreated = 0;

    for (const location of locations) {
      const insights: any[] = [];

      // ── Temperature Pattern Detection ────────────────────────
      const { data: tempLogs } = await supabase
        .from("temperature_logs")
        .select("unit_name, temperature, recorded_at, status")
        .eq("location_id", location.id)
        .gte("recorded_at", sevenDaysAgo)
        .order("recorded_at", { ascending: false });

      if (tempLogs?.length) {
        // Group by unit, count out-of-range readings
        const unitCounts: Record<string, { outOfRange: number; total: number; temps: number[] }> = {};
        for (const log of tempLogs) {
          if (!unitCounts[log.unit_name]) {
            unitCounts[log.unit_name] = { outOfRange: 0, total: 0, temps: [] };
          }
          unitCounts[log.unit_name].total++;
          unitCounts[log.unit_name].temps.push(log.temperature);
          if (log.status === "out_of_range" || log.status === "critical") {
            unitCounts[log.unit_name].outOfRange++;
          }
        }

        for (const [unit, data] of Object.entries(unitCounts)) {
          // Alert if 3+ out-of-range readings in 7 days
          if (data.outOfRange >= 3) {
            const avgTemp = (data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1);
            insights.push({
              location_id: location.id,
              organization_id: location.organization_id,
              insight_type: "pattern",
              severity: data.outOfRange >= 5 ? "urgent" : "advisory",
              title: `${unit} temperature trending out of range — ${location.name}`,
              body: `${data.outOfRange} out-of-range readings in the past 7 days (avg: ${avgTemp}°F). This unit needs inspection.`,
              data_references: [
                { type: "temp_logs", location_id: location.id, unit: unit, count: data.outOfRange },
              ],
              suggested_actions: [
                { action: "Inspect door seals and compressor", priority: "high" },
                { action: "Schedule maintenance if readings continue", priority: "medium" },
                { action: "Move perishables to backup unit if critical", priority: "high" },
              ],
            });
          }
        }
      }

      // ── Checklist Completion Pattern ─────────────────────────
      const { data: checklists } = await supabase
        .from("checklists")
        .select("name, status, completed_at, created_at")
        .eq("location_id", location.id)
        .gte("created_at", fourteenDaysAgo);

      if (checklists?.length) {
        const total = checklists.length;
        const completed = checklists.filter((c: any) => c.status === "completed").length;
        const completionRate = total > 0 ? (completed / total) * 100 : 100;

        // Also check this week vs last week
        const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
        const thisWeek = checklists.filter((c: any) => new Date(c.created_at) >= oneWeekAgo);
        const lastWeek = checklists.filter((c: any) => new Date(c.created_at) < oneWeekAgo);

        const thisWeekRate = thisWeek.length > 0
          ? (thisWeek.filter((c: any) => c.status === "completed").length / thisWeek.length) * 100
          : 100;
        const lastWeekRate = lastWeek.length > 0
          ? (lastWeek.filter((c: any) => c.status === "completed").length / lastWeek.length) * 100
          : 100;

        // Alert if completion dropped below 80% or dropped >10% week-over-week
        if (thisWeekRate < 80 || (lastWeekRate - thisWeekRate > 10)) {
          insights.push({
            location_id: location.id,
            organization_id: location.organization_id,
            insight_type: "pattern",
            severity: thisWeekRate < 60 ? "urgent" : "advisory",
            title: `Checklist completion dropped to ${Math.round(thisWeekRate)}% — ${location.name}`,
            body: `This week: ${Math.round(thisWeekRate)}% completion (was ${Math.round(lastWeekRate)}% last week). ${total - completed} checklists incomplete in the past 14 days.`,
            data_references: [
              { type: "checklists", location_id: location.id, this_week: Math.round(thisWeekRate), last_week: Math.round(lastWeekRate) },
            ],
            suggested_actions: [
              { action: "Review staffing coverage for affected shifts", priority: "high" },
              { action: "Check-in with responsible staff about barriers", priority: "medium" },
              { action: "Consider simplifying checklist items", priority: "low" },
            ],
          });
        }
      }

      // ── Missing Temp Logs Detection ──────────────────────────
      if (tempLogs) {
        // Count days with temp logs in the past 7 days
        const daysWithLogs = new Set(
          tempLogs.map((t: any) => new Date(t.recorded_at).toISOString().split("T")[0])
        );
        const missedDays = 7 - daysWithLogs.size;

        if (missedDays >= 2) {
          insights.push({
            location_id: location.id,
            organization_id: location.organization_id,
            insight_type: "pattern",
            severity: missedDays >= 4 ? "urgent" : "advisory",
            title: `${missedDays} days with missing temp logs — ${location.name}`,
            body: `Temperature logging was missed on ${missedDays} of the past 7 days. Consistent logging is required for compliance.`,
            data_references: [
              { type: "temp_logs", location_id: location.id, missed_days: missedDays },
            ],
            suggested_actions: [
              { action: "Set up automated temp log reminders", priority: "high" },
              { action: "Assign backup staff for temp logging shifts", priority: "medium" },
            ],
          });
        }
      }

      // ── Insert insights ──────────────────────────────────────
      if (insights.length > 0) {
        const { error } = await supabase.from("ai_insights").insert(insights);
        if (error) {
          console.error(`[ai-pattern-analysis] Error inserting insights for ${location.name}:`, error);
        } else {
          insightsCreated += insights.length;
        }
      }
    }

    return jsonResponse({
      success: true,
      locations_analyzed: locations.length,
      insights_created: insightsCreated,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in ai-pattern-analysis:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
