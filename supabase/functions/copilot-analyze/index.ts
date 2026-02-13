import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * copilot-analyze — Proactive AI Compliance Copilot (Task #47, Roadmap #9)
 *
 * Scheduled daily at 6 AM for each active location.
 * Analyzes compliance data across 5 modules and generates copilot insights:
 *
 * 1. Temperature Pattern Analysis — drift detection, repeated excursions
 * 2. Checklist Compliance Analysis — missed days, repeatedly failed items
 * 3. Equipment Service Analysis — overdue services, expiring warranties
 * 4. Document Expiry Analysis — permits/certs expiring within 30 days
 * 5. Weekly Compliance Summary — Monday-only AI-generated digest
 *
 * Rate limited: max 10 insights per location per run.
 * Critical insights trigger email notification.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional cron secret verification
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && cronSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const isMonday = now.getDay() === 1;

    // Get all active locations
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, organization_id")
      .eq("active", true);

    if (!locations?.length) {
      return jsonResponse({ message: "No active locations", insights_created: 0 });
    }

    let totalInsightsCreated = 0;

    for (const location of locations) {
      const insights: InsightInput[] = [];

      // ═══ 1. TEMPERATURE PATTERN ANALYSIS ═══════════════════
      const { data: tempLogs } = await supabase
        .from("temperature_logs")
        .select("id, unit_name, temperature, recorded_at, status, threshold_min, threshold_max")
        .eq("location_id", location.id)
        .gte("recorded_at", thirtyDaysAgo)
        .order("recorded_at", { ascending: false });

      if (tempLogs?.length) {
        // Group by equipment
        const byUnit = new Map<string, typeof tempLogs>();
        for (const log of tempLogs) {
          const key = log.unit_name;
          if (!byUnit.has(key)) byUnit.set(key, []);
          byUnit.get(key)!.push(log);
        }

        for (const [unitName, readings] of byUnit) {
          // Detect repeated out-of-range readings in 7 days
          const recentOutOfRange = readings.filter(
            (r) => r.status === "out_of_range" || r.status === "critical"
          ).filter((r) => new Date(r.recorded_at) >= new Date(sevenDaysAgo));

          if (recentOutOfRange.length >= 3) {
            insights.push({
              insight_type: "alert",
              severity: "urgent",
              title: `${unitName} — repeated temperature excursions`,
              body:
                `${unitName} has had ${recentOutOfRange.length} out-of-range readings in the past 7 days. ` +
                `This is a food safety risk. Immediate inspection recommended. ` +
                `Most common causes: failing compressor, damaged door seal, overloading, or thermostat malfunction.`,
              source_module: "temperature",
              suggested_actions: [
                { action: "Create incident report", priority: "high", type: "auto_incident" },
                { action: "Schedule vendor inspection", priority: "high", type: "notify_vendor" },
              ],
              data_references: { readingIds: recentOutOfRange.map((r) => r.id), unitName },
            });
          }

          // Detect temperature drift (trending toward threshold)
          if (readings.length >= 7) {
            const recent7 = readings.slice(0, 7);
            const older7 = readings.slice(7, 14);
            if (older7.length >= 3) {
              const recentAvg = recent7.reduce((s, r) => s + r.temperature, 0) / recent7.length;
              const olderAvg = older7.reduce((s, r) => s + r.temperature, 0) / older7.length;
              const threshold = readings[0].threshold_max || 41;

              if (recentAvg > olderAvg && recentAvg < threshold) {
                const driftRate = (recentAvg - olderAvg) / 7; // degrees per day
                const daysToThreshold = driftRate > 0 ? Math.ceil((threshold - recentAvg) / driftRate) : 999;

                if (daysToThreshold <= 14 && daysToThreshold > 0) {
                  insights.push({
                    insight_type: "prediction",
                    severity: "advisory",
                    title: `${unitName} temperature trending up`,
                    body:
                      `${unitName} has been slowly warming. Current average: ${recentAvg.toFixed(1)}°F ` +
                      `(threshold: ${threshold}°F). At this rate, it will exceed the threshold in ` +
                      `approximately ${daysToThreshold} days. This pattern often indicates a compressor issue, ` +
                      `dirty coils, or a failing door gasket.`,
                    source_module: "temperature",
                    suggested_actions: [
                      { action: "Schedule maintenance inspection", priority: "medium", type: "notify_vendor" },
                    ],
                    data_references: { unitName, recentAvg, olderAvg, daysToThreshold },
                  });
                }
              }
            }
          }
        }
      }

      // ═══ 2. CHECKLIST COMPLIANCE ANALYSIS ══════════════════
      const { data: checklists } = await supabase
        .from("checklist_logs")
        .select("id, completed_at, checklist_items, completion_rate")
        .eq("location_id", location.id)
        .gte("completed_at", thirtyDaysAgo);

      if (checklists) {
        // Detect completion rate drop
        const recentWeek = checklists.filter(
          (c) => new Date(c.completed_at) >= new Date(sevenDaysAgo)
        );
        const olderWeek = checklists.filter(
          (c) =>
            new Date(c.completed_at) < new Date(sevenDaysAgo) &&
            new Date(c.completed_at) >=
              new Date(new Date(sevenDaysAgo).getTime() - 7 * 86400000)
        );

        if (recentWeek.length > 0 && olderWeek.length > 0) {
          const recentRate =
            recentWeek.reduce((s, c) => s + (c.completion_rate || 0), 0) / recentWeek.length;
          const olderRate =
            olderWeek.reduce((s, c) => s + (c.completion_rate || 0), 0) / olderWeek.length;

          if (recentRate < 80 || (olderRate - recentRate) > 10) {
            insights.push({
              insight_type: "pattern",
              severity: "advisory",
              title: "Checklist completion rate dropped",
              body:
                `Weekly checklist completion rate fell from ${olderRate.toFixed(0)}% to ` +
                `${recentRate.toFixed(0)}%. Consider adjusting the schedule or assigning backup completers.`,
              source_module: "checklist",
              suggested_actions: [
                { action: "Review checklist schedule", priority: "medium", type: "suggest_checklist" },
              ],
              data_references: { recentRate, olderRate },
            });
          }
        }
      }

      // ═══ 3. EQUIPMENT SERVICE ANALYSIS ═════════════════════
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id, name, next_service_due, warranty_end, service_vendor_id, service_type")
        .eq("location_id", location.id);

      if (equipment) {
        for (const eq of equipment) {
          // Overdue service
          if (eq.next_service_due && new Date(eq.next_service_due) < now) {
            const daysOverdue = Math.floor(
              (now.getTime() - new Date(eq.next_service_due).getTime()) / 86400000
            );
            insights.push({
              insight_type: "alert",
              severity: daysOverdue > 30 ? "urgent" : "advisory",
              title: `${eq.name} service overdue by ${daysOverdue} days`,
              body:
                `The ${eq.service_type || "scheduled service"} for ${eq.name} was due on ` +
                `${new Date(eq.next_service_due).toLocaleDateString()}. This affects your compliance score.`,
              source_module: "equipment",
              suggested_actions: [
                { action: "Contact vendor to schedule", priority: "high", type: "notify_vendor" },
              ],
              data_references: { equipmentId: eq.id, daysOverdue },
            });
          }

          // Warranty expiring within 60 days
          if (eq.warranty_end) {
            const daysUntil = Math.floor(
              (new Date(eq.warranty_end).getTime() - now.getTime()) / 86400000
            );
            if (daysUntil > 0 && daysUntil <= 60) {
              insights.push({
                insight_type: "recommendation",
                severity: "info",
                title: `${eq.name} warranty expires in ${daysUntil} days`,
                body:
                  `Consider scheduling a full inspection before warranty expires. ` +
                  `Issues found during warranty can be covered by the manufacturer.`,
                source_module: "equipment",
                data_references: { equipmentId: eq.id, daysUntil },
              });
            }
          }
        }
      }

      // ═══ 4. DOCUMENT EXPIRY ANALYSIS ══════════════════════
      const { data: expiringDocs } = await supabase
        .from("documents")
        .select("id, name, expiry_date, doc_type")
        .eq("location_id", location.id)
        .gte("expiry_date", now.toISOString())
        .lte("expiry_date", new Date(now.getTime() + 30 * 86400000).toISOString());

      if (expiringDocs) {
        for (const doc of expiringDocs) {
          const daysUntil = Math.floor(
            (new Date(doc.expiry_date).getTime() - now.getTime()) / 86400000
          );
          insights.push({
            insight_type: "alert",
            severity: daysUntil <= 7 ? "urgent" : "advisory",
            title: `${doc.name} expires in ${daysUntil} days`,
            body:
              `Your ${doc.name} expires on ${new Date(doc.expiry_date).toLocaleDateString()}. ` +
              `Contact the issuing authority for renewal.`,
            source_module: "vendor",
            suggested_actions: [
              { action: "Begin renewal process", priority: daysUntil <= 7 ? "high" : "medium" },
            ],
            data_references: { documentId: doc.id, daysUntil },
          });
        }
      }

      // ═══ 5. WEEKLY COMPLIANCE SUMMARY (Monday only) ═══════
      if (isMonday && anthropicKey) {
        // Gather weekly stats
        const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

        const [tempCount, outOfRangeCount, checklistCount, incidentCount] = await Promise.all([
          supabase.from("temperature_logs").select("id", { count: "exact", head: true })
            .eq("location_id", location.id).gte("recorded_at", weekStart),
          supabase.from("temperature_logs").select("id", { count: "exact", head: true })
            .eq("location_id", location.id).gte("recorded_at", weekStart)
            .in("status", ["out_of_range", "critical"]),
          supabase.from("checklist_logs").select("id", { count: "exact", head: true })
            .eq("location_id", location.id).gte("completed_at", weekStart),
          supabase.from("incidents").select("id", { count: "exact", head: true })
            .eq("location_id", location.id).gte("created_at", weekStart),
        ]);

        const stats = {
          tempReadings: tempCount.count || 0,
          tempOutOfRange: outOfRangeCount.count || 0,
          checklistsCompleted: checklistCount.count || 0,
          incidentsOpened: incidentCount.count || 0,
        };

        try {
          const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 300,
              system:
                "You are the EvidLY compliance copilot. Write a brief, actionable weekly summary for a kitchen manager. Be specific with numbers. Keep it under 150 words. No fluff.",
              messages: [
                {
                  role: "user",
                  content: `Write a weekly compliance summary for ${location.name}:\n- Temperature readings: ${stats.tempReadings} total, ${stats.tempOutOfRange} out of range\n- Checklists completed: ${stats.checklistsCompleted}\n- Incidents opened: ${stats.incidentsOpened}`,
                },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const summaryText = aiData.content?.[0]?.text || "Weekly summary unavailable.";

            insights.push({
              insight_type: "digest",
              severity: "info",
              title: `Weekly Compliance Summary — ${location.name}`,
              body: summaryText,
              source_module: "compliance",
              suggested_actions: [
                { action: "View full report", priority: "low", type: "weekly_summary" },
              ],
              data_references: stats,
            });
          }
        } catch {
          // AI summary generation failed — non-critical, skip
        }
      }

      // ═══ RATE LIMIT & SAVE ════════════════════════════════
      const limitedInsights = insights.slice(0, 10);

      if (limitedInsights.length > 0) {
        const rows = limitedInsights.map((i) => ({
          organization_id: location.organization_id,
          location_id: location.id,
          insight_type: i.insight_type,
          severity: i.severity,
          title: i.title,
          body: i.body,
          data_references: i.data_references || {},
          suggested_actions: i.suggested_actions || [],
          status: "new",
          expires_at:
            i.severity === "urgent"
              ? new Date(now.getTime() + 7 * 86400000).toISOString()
              : new Date(now.getTime() + 30 * 86400000).toISOString(),
        }));

        const { error, count } = await supabase
          .from("ai_insights")
          .insert(rows);

        if (!error) {
          totalInsightsCreated += limitedInsights.length;
        }

        // Send email for critical/urgent insights
        const urgent = limitedInsights.filter((i) => i.severity === "urgent");
        if (urgent.length > 0) {
          // Queue email via existing notification infrastructure
          await supabase.from("notification_queue").insert(
            urgent.map((i) => ({
              organization_id: location.organization_id,
              location_id: location.id,
              channel: "email",
              subject: `[Copilot Alert] ${i.title}`,
              body: i.body,
              priority: "high",
            }))
          );
        }
      }
    }

    return jsonResponse({
      message: "Copilot analysis complete",
      locations_analyzed: locations.length,
      insights_created: totalInsightsCreated,
      is_monday_summary: isMonday,
    });
  } catch (error) {
    console.error("copilot-analyze error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal error" },
      500
    );
  }
});

// ── Types ───────────────────────────────────────────────

interface InsightInput {
  insight_type: string;
  severity: string;
  title: string;
  body: string;
  source_module: string;
  suggested_actions?: Array<{ action: string; priority: string; type?: string }>;
  data_references?: Record<string, unknown>;
}

// ── Helpers ─────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
