import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { generateDigestHtml, type DigestData, type DigestLocationScore } from '../_shared/digest-template.ts';

let corsHeaders = getCorsHeaders(null);

/**
 * ai-weekly-digest — Scheduled Monday 3pm UTC (repointed from weekly-digest)
 *
 * Generates personalized digest per user based on role.
 * Compiles metrics, insights, upcoming deadlines.
 * Calls Claude API to create narrative summary.
 * Delivers via polished branded email (_shared/email.ts + _shared/digest-template.ts)
 * and in-app record (ai_weekly_digests + intelligence_insights).
 *
 * Opt-out: skips users with digest_opt_out=true in notification_preferences.
 * Email: uses _shared/email.ts (Resend, from noreply@getevidly.com).
 * Template: uses _shared/digest-template.ts (polished table-based HTML).
 */
Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional: verify cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && cronSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(0, 0, 0, 0); // Monday 00:00
    const periodStart = new Date(periodEnd.getTime() - 7 * 86400000);

    const weekStartStr = periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weekEndStr = periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // Get all organizations with active subscriptions
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name");

    if (!orgs?.length) {
      return jsonResponse({ message: "No organizations", digests_created: 0 });
    }

    let digestsCreated = 0;
    let emailsSent = 0;
    let optedOut = 0;

    for (const org of orgs) {
      // Get organization's locations
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", org.id)
        .eq("active", true);

      if (!locations?.length) continue;

      // Get users for this org
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, full_name, role")
        .eq("organization_id", org.id);

      if (!users?.length) continue;

      // ── Digest opt-out check (batch query) ────────────────────
      const userIds = users.map((u: any) => u.id);
      const { data: optOutRows } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .in("user_id", userIds)
        .eq("organization_id", org.id)
        .eq("digest_opt_out", true);

      const optedOutUserIds = new Set((optOutRows || []).map((r: any) => r.user_id));

      // Gather org-wide metrics for the week
      const locationIds = locations.map((l: any) => l.id);

      const [tempLogs, checklists, incidents, documents, insights] =
        await Promise.all([
          supabase
            .from("temperature_logs")
            .select("location_id, status", { count: "exact" })
            .in("facility_id", locationIds)
            .gte("reading_time", periodStart.toISOString())
            .lte("reading_time", periodEnd.toISOString()),
          supabase
            .from("checklists")
            .select("location_id, status", { count: "exact" })
            .in("location_id", locationIds)
            .gte("created_at", periodStart.toISOString())
            .lte("created_at", periodEnd.toISOString()),
          supabase
            .from("violations")
            .select("location_id, severity, status", { count: "exact" })
            .in("location_id", locationIds)
            .gte("created_at", periodStart.toISOString()),
          // Fixed: use compliance_documents (live) instead of documents (legacy)
          supabase
            .from("compliance_documents")
            .select("organization_id, name, expiry_date, status")
            .eq("organization_id", org.id)
            .in("status", ["expiring", "expired"]),
          supabase
            .from("ai_insights")
            .select("title, severity, status")
            .eq("organization_id", org.id)
            .gte("created_at", periodStart.toISOString()),
        ]);

      // Build metrics summary
      const totalTemps = tempLogs.count || 0;
      const outOfRangeTemps = (tempLogs.data || []).filter(
        (t: any) => t.status === "out_of_range" || t.status === "critical",
      ).length;
      const totalChecklists = checklists.count || 0;
      const completedChecklists = (checklists.data || []).filter(
        (c: any) => c.status === "completed",
      ).length;
      const newIncidents = incidents.count || 0;
      const expiringDocs = (documents.data || []).length;
      const activeInsights = (insights.data || []).filter(
        (i: any) => i.status === "new",
      ).length;

      // Build per-location status for digest template
      const locationScores: DigestLocationScore[] = locations.map((loc: any) => {
        const locIncidents = (incidents.data || []).filter(
          (i: any) => i.location_id === loc.id,
        );
        const locOutOfRange = (tempLogs.data || []).filter(
          (t: any) => t.location_id === loc.id &&
            (t.status === "out_of_range" || t.status === "critical"),
        ).length;
        const hasCritical = locIncidents.some((i: any) => i.severity === "critical");

        if (hasCritical) return { name: loc.name, status: "Critical" as const };
        if (locOutOfRange > 0 || locIncidents.length > 0) return { name: loc.name, status: "Needs Attention" as const };
        return { name: loc.name, status: "Inspection Ready" as const };
      });

      const onTimePercent = totalTemps > 0
        ? Math.round(((totalTemps - outOfRangeTemps) / totalTemps) * 100)
        : 100;
      const checklistPercent = totalChecklists > 0
        ? Math.round((completedChecklists / totalChecklists) * 100)
        : 100;

      const metricsContext = `
Organization: ${org.name}
Period: ${periodStart.toLocaleDateString()} — ${periodEnd.toLocaleDateString()}
Locations: ${locations.map((l: any) => l.name).join(", ")}

Metrics:
- Temperature logs recorded: ${totalTemps} (${outOfRangeTemps} out of range)
- Checklists: ${completedChecklists}/${totalChecklists} completed (${checklistPercent}%)
- New incidents this week: ${newIncidents}
- Documents expiring or expired: ${expiringDocs}
- Active AI insights: ${activeInsights}

Top AI Insights:
${(insights.data || []).slice(0, 5).map((i: any) => `  - [${i.severity}] ${i.title}`).join("\n")}
      `.trim();

      // For each user, generate a role-appropriate digest
      for (const user of users) {
        // ── Opt-out check ──
        if (optedOutUserIds.has(user.id)) {
          optedOut++;
          continue;
        }

        let digestContent: any;

        if (anthropicKey) {
          // Use AI to generate narrative
          const roleContext =
            user.role === "executive"
              ? "Focus on high-level KPIs, trends, and strategic recommendations."
              : user.role === "management"
                ? "Include operational details, staff performance, and action items."
                : "Focus on immediate tasks, reminders, and daily operational items.";

          try {
            const anthropicRes = await fetch(
              "https://api.anthropic.com/v1/messages",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": anthropicKey,
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-5-20250929",
                  max_tokens: 1200,
                  system: `You are generating a weekly compliance digest for a commercial kitchen manager. Equipment items (hood cleaning, exhaust fan service, fire suppression, grease traps, fire extinguishers) are FACILITY SAFETY issues under NFPA 96 (2025 Edition) — never categorize them as food/health safety. Ice machines are FOOD SAFETY issues (food contact surfaces per FDA §4-602.11) — never categorize ice machine cleaning as facility safety. ${roleContext} Return a JSON object:
{
  "summary": "2-3 sentence executive summary",
  "highlights": ["Array of 3-5 key highlights"],
  "concerns": ["Array of items needing attention"],
  "upcoming": ["Array of upcoming deadlines"],
  "score_trend": "Brief score trend description",
  "recommendation": "One key recommendation for the week"
}
Return ONLY valid JSON. Only cite specific regulations or code sections you are certain about. This digest is compliance guidance only — not legal advice.`,
                  messages: [
                    {
                      role: "user",
                      content: `Generate a weekly digest for ${user.full_name} (${user.role}):\n\n${metricsContext}`,
                    },
                  ],
                }),
              },
            );

            if (anthropicRes.ok) {
              const data = await anthropicRes.json();
              const text =
                data.content
                  ?.filter((b: any) => b.type === "text")
                  .map((b: any) => b.text)
                  .join("") || "";
              try {
                digestContent = JSON.parse(
                  text.replace(/```json|```/g, "").trim(),
                );
              } catch {
                digestContent = null;
              }
            }
          } catch (err) {
            console.error(
              `[ai-weekly-digest] AI error for ${user.full_name}:`,
              err,
            );
          }
        }

        // Fallback if AI unavailable
        if (!digestContent) {
          digestContent = {
            summary: `Weekly compliance summary for ${org.name} (${periodStart.toLocaleDateString()} — ${periodEnd.toLocaleDateString()}).`,
            highlights: [
              `${totalTemps} temperature logs recorded`,
              `${completedChecklists}/${totalChecklists} checklists completed`,
              `${activeInsights} AI insights require attention`,
            ],
            concerns:
              outOfRangeTemps > 0
                ? [`${outOfRangeTemps} out-of-range temperature readings`]
                : [],
            upcoming:
              expiringDocs > 0
                ? [`${expiringDocs} documents expiring or expired`]
                : [],
            score_trend: "Review dashboard for current scores",
            recommendation:
              "Review all active AI insights and take action on urgent items.",
          };
        }

        // Save digest
        const { error: digestError } = await supabase
          .from("ai_weekly_digests")
          .insert({
            organization_id: org.id,
            location_id: null, // org-wide
            user_id: user.id,
            role: user.role,
            digest_content: digestContent,
            period_start: periodStart.toISOString().split("T")[0],
            period_end: periodEnd.toISOString().split("T")[0],
            delivered_via: "in_app",
            delivered_at: now.toISOString(),
          });

        if (digestError) {
          console.error(
            `[ai-weekly-digest] Save error for ${user.full_name}:`,
            digestError,
          );
          continue;
        }

        digestsCreated++;

        // Write notification to intelligence_insights
        await supabase.from("intelligence_insights").insert({
          organization_id: org.id,
          source_type: "ai_digest",
          category: "weekly_digest",
          impact_level: "low",
          urgency: "informational",
          title: `Weekly Compliance Digest — ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
          headline: `Weekly Digest ${periodStart.toLocaleDateString()}–${periodEnd.toLocaleDateString()}`,
          summary: digestContent.summary || "Weekly compliance digest is ready for review.",
          status: "published",
          source_name: "evidly_internal",
          confidence_score: 1.00,
          raw_source_data: { type: "digest", user_id: user.id },
        });

        // ── Send polished email via _shared/email.ts ──────────────
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            user.id,
          );
          const email = authUser?.user?.email;

          if (email) {
            // Build DigestData for polished template
            const digestData: DigestData = {
              orgName: org.name,
              weekStart: weekStartStr,
              weekEnd: weekEndStr,
              locations: locationScores,
              highlights: digestContent.highlights || [],
              concerns: digestContent.concerns || [],
              tempStats: {
                total: totalTemps,
                onTimePercent,
                outOfRange: outOfRangeTemps,
                weekOverWeek: 0, // no prior-week comparison yet
              },
              checklistStats: {
                completed: completedChecklists,
                required: totalChecklists,
                percent: checklistPercent,
                weekOverWeek: 0,
              },
              aiSummary: digestContent.summary,
              aiRecommendation: digestContent.recommendation,
              upcoming: digestContent.upcoming,
            };

            const html = generateDigestHtml(digestData);

            const result = await sendEmail({
              to: email,
              subject: `Weekly Compliance Digest — ${org.name}`,
              html,
            });

            if (result) {
              emailsSent++;
              await supabase
                .from("ai_weekly_digests")
                .update({ delivered_via: "email" })
                .eq("user_id", user.id)
                .eq(
                  "period_start",
                  periodStart.toISOString().split("T")[0],
                );
            }
          }
        } catch (emailErr) {
          console.error(
            `[ai-weekly-digest] Email error for ${user.full_name}:`,
            emailErr,
          );
        }
      }
    }

    return jsonResponse({
      success: true,
      organizations_processed: orgs.length,
      digests_created: digestsCreated,
      emails_sent: emailsSent,
      opted_out: optedOut,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in ai-weekly-digest:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
