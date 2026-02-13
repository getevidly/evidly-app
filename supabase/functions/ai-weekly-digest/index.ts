import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * ai-weekly-digest — Scheduled Monday 6am
 *
 * Generates personalized digest per user based on role.
 * Compiles metrics, insights, upcoming deadlines.
 * Calls Claude API to create narrative summary.
 * Delivers via Resend email + in-app notification.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

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

    // Get all organizations with active subscriptions
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name");

    if (!orgs?.length) {
      return jsonResponse({ message: "No organizations", digests_created: 0 });
    }

    let digestsCreated = 0;

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

      // Gather org-wide metrics for the week
      const locationIds = locations.map((l: any) => l.id);

      const [tempLogs, checklists, incidents, documents, insights] =
        await Promise.all([
          supabase
            .from("temperature_logs")
            .select("location_id, status", { count: "exact" })
            .in("location_id", locationIds)
            .gte("recorded_at", periodStart.toISOString())
            .lte("recorded_at", periodEnd.toISOString()),
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
          supabase
            .from("documents")
            .select("location_id, name, expiration_date")
            .in("location_id", locationIds)
            .not("expiration_date", "is", null)
            .lte(
              "expiration_date",
              new Date(now.getTime() + 30 * 86400000).toISOString(),
            ),
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

      const metricsContext = `
Organization: ${org.name}
Period: ${periodStart.toLocaleDateString()} — ${periodEnd.toLocaleDateString()}
Locations: ${locations.map((l: any) => l.name).join(", ")}

Metrics:
- Temperature logs recorded: ${totalTemps} (${outOfRangeTemps} out of range)
- Checklists: ${completedChecklists}/${totalChecklists} completed (${totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0}%)
- New incidents this week: ${newIncidents}
- Documents expiring within 30 days: ${expiringDocs}
- Active AI insights: ${activeInsights}

Top AI Insights:
${(insights.data || []).slice(0, 5).map((i: any) => `  - [${i.severity}] ${i.title}`).join("\n")}
      `.trim();

      // For each user, generate a role-appropriate digest
      for (const user of users) {
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
                  system: `You are generating a weekly compliance digest for a commercial kitchen manager. Equipment items (hood cleaning, exhaust fan service, fire suppression, grease traps, fire extinguishers) are FIRE SAFETY issues under NFPA 96 (2025 Edition) — never categorize them as food/health safety. Ice machines are FOOD SAFETY issues (food contact surfaces per FDA §4-602.11) — never categorize ice machine cleaning as fire safety. ${roleContext} Return a JSON object:
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
                ? [`${expiringDocs} documents expiring within 30 days`]
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

        // Create in-app notification
        await supabase.from("ai_insights").insert({
          organization_id: org.id,
          insight_type: "digest",
          severity: "info",
          title: `Weekly Compliance Digest — ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
          body: digestContent.summary,
          data_references: [{ type: "digest", user_id: user.id }],
          suggested_actions: [],
        });

        // Send email via Resend if configured
        if (resendKey) {
          try {
            // Get user email
            const { data: authUser } = await supabase.auth.admin.getUserById(
              user.id,
            );
            const email = authUser?.user?.email;

            if (email) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "EvidLY <digest@evidly.com>",
                  to: email,
                  subject: `Weekly Compliance Digest — ${org.name}`,
                  html: `
                    <h2>Weekly Compliance Digest</h2>
                    <p><strong>${org.name}</strong> — ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}</p>
                    <p>${digestContent.summary}</p>
                    <h3>Highlights</h3>
                    <ul>${(digestContent.highlights || []).map((h: string) => `<li>${h}</li>`).join("")}</ul>
                    ${digestContent.concerns?.length ? `<h3>Needs Attention</h3><ul>${digestContent.concerns.map((c: string) => `<li>${c}</li>`).join("")}</ul>` : ""}
                    <p><strong>Recommendation:</strong> ${digestContent.recommendation}</p>
                    <p><a href="https://evidly-app.vercel.app/dashboard">View Dashboard →</a></p>
                  `,
                }),
              });

              // Update delivery method
              await supabase
                .from("ai_weekly_digests")
                .update({ delivered_via: "email" })
                .eq("user_id", user.id)
                .eq(
                  "period_start",
                  periodStart.toISOString().split("T")[0],
                );
            }
          } catch (emailErr) {
            console.error(
              `[ai-weekly-digest] Email error for ${user.full_name}:`,
              emailErr,
            );
          }
        }
      }
    }

    return jsonResponse({
      success: true,
      organizations_processed: orgs.length,
      digests_created: digestsCreated,
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
