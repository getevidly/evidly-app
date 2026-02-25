import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * ai-predictive-alerts — Scheduled weekly (Sunday 6am)
 *
 * Projects cert/doc/inspection expiration timelines.
 * Compares current trends to historical baselines.
 * Generates predictions with confidence levels.
 * Creates ai_insights records.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
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
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000).toISOString();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 86400000).toISOString();

    // Get all active locations
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, organization_id")
      .eq("active", true);

    if (!locations?.length) {
      return jsonResponse({ message: "No active locations", alerts_created: 0 });
    }

    let alertsCreated = 0;

    for (const location of locations) {
      const insights: any[] = [];

      // ── Document/Cert Expiration Predictions ─────────────────
      const { data: expiringDocs } = await supabase
        .from("documents")
        .select("id, name, category, expiration_date")
        .eq("location_id", location.id)
        .not("expiration_date", "is", null)
        .lte("expiration_date", sixtyDaysFromNow)
        .gte("expiration_date", now.toISOString());

      if (expiringDocs?.length) {
        for (const doc of expiringDocs) {
          const expiryDate = new Date(doc.expiration_date);
          const daysUntil = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / 86400000,
          );

          const severity =
            daysUntil <= 7 ? "urgent" : daysUntil <= 30 ? "advisory" : "info";

          insights.push({
            location_id: location.id,
            organization_id: location.organization_id,
            insight_type: "prediction",
            severity,
            title: `${doc.category || doc.name} expires in ${daysUntil} days — ${location.name}`,
            body: `${doc.name} expires on ${expiryDate.toLocaleDateString()}. ${daysUntil <= 14 ? "Immediate action required to avoid compliance gap." : "Plan renewal to avoid last-minute rush."}`,
            data_references: [
              {
                type: "document",
                id: doc.id,
                name: doc.name,
                expires: doc.expiration_date,
              },
            ],
            suggested_actions: [
              {
                action: `Start ${doc.category || "document"} renewal process`,
                priority: severity === "urgent" ? "high" : "medium",
              },
              {
                action: "Contact issuing authority for processing timeline",
                priority: "medium",
              },
            ],
            expires_at: doc.expiration_date,
          });
        }
      }

      // ── Already-expired documents ────────────────────────────
      const { data: expiredDocs } = await supabase
        .from("documents")
        .select("id, name, category, expiration_date")
        .eq("location_id", location.id)
        .not("expiration_date", "is", null)
        .lt("expiration_date", now.toISOString());

      if (expiredDocs?.length) {
        for (const doc of expiredDocs) {
          const expiryDate = new Date(doc.expiration_date);
          const daysOverdue = Math.ceil(
            (now.getTime() - expiryDate.getTime()) / 86400000,
          );

          insights.push({
            location_id: location.id,
            organization_id: location.organization_id,
            insight_type: "prediction",
            severity: "urgent",
            title: `${doc.category || doc.name} expired ${daysOverdue} days ago — ${location.name}`,
            body: `${doc.name} expired on ${expiryDate.toLocaleDateString()}. Operating without valid documentation may result in violations or closure.`,
            data_references: [
              {
                type: "document",
                id: doc.id,
                name: doc.name,
                expired: doc.expiration_date,
                days_overdue: daysOverdue,
              },
            ],
            suggested_actions: [
              { action: `Renew ${doc.category || "document"} immediately`, priority: "high" },
              { action: "Document the gap period and corrective steps taken", priority: "high" },
            ],
          });
        }
      }

      // ── Vendor Service Overdue Predictions ───────────────────
      const { data: vendorServices } = await supabase
        .from("vendor_services")
        .select("id, company_name, service_type, next_due, status")
        .eq("location_id", location.id)
        .not("next_due", "is", null)
        .lte("next_due", thirtyDaysFromNow);

      if (vendorServices?.length) {
        for (const vs of vendorServices) {
          const dueDate = new Date(vs.next_due);
          const daysUntil = Math.ceil(
            (dueDate.getTime() - now.getTime()) / 86400000,
          );
          const isOverdue = daysUntil < 0;

          insights.push({
            location_id: location.id,
            organization_id: location.organization_id,
            insight_type: "prediction",
            severity: isOverdue || daysUntil <= 7 ? "urgent" : "advisory",
            title: `${vs.service_type} ${isOverdue ? `${Math.abs(daysUntil)} days overdue` : `due in ${daysUntil} days`} — ${location.name}`,
            body: `${vs.company_name} ${vs.service_type} ${isOverdue ? "is overdue" : "is coming due"}. ${isOverdue ? "Schedule immediately." : "Plan ahead to avoid disruption."}`,
            data_references: [
              {
                type: "vendor_service",
                id: vs.id,
                vendor: vs.company_name,
                due: vs.next_due,
              },
            ],
            suggested_actions: [
              {
                action: `Contact ${vs.company_name} to schedule ${vs.service_type}`,
                priority: isOverdue ? "high" : "medium",
              },
            ],
          });
        }
      }

      // ── Insert insights (Phase 3: write to intelligence_insights, deduplicate) ──
      if (insights.length > 0) {
        // Check for existing recent insights with same title to avoid duplicates
        const { data: existing } = await supabase
          .from("intelligence_insights")
          .select("title")
          .eq("source_type", "ai_prediction")
          .gte("created_at", new Date(now.getTime() - 7 * 86400000).toISOString());

        const existingTitles = new Set((existing || []).map((e: any) => e.title));
        const newInsights = insights.filter((i: any) => !existingTitles.has(i.title));

        if (newInsights.length > 0) {
          const mapped = newInsights.map((i: any) => ({
            organization_id: i.organization_id,
            source_type: "ai_prediction",
            category: "ai_predictive_alert",
            impact_level: i.severity === "urgent" ? "high" : i.severity === "advisory" ? "medium" : "low",
            urgency: i.severity === "urgent" ? "immediate" : "standard",
            title: i.title,
            headline: i.title.slice(0, 120),
            summary: i.body,
            status: "published",
            source_name: "evidly_internal",
            confidence_score: 0.80,
            raw_source_data: { data_references: i.data_references, suggested_actions: i.suggested_actions, location_id: i.location_id, expires_at: i.expires_at },
          }));
          const { error } = await supabase.from("intelligence_insights").insert(mapped);
          if (error) {
            console.error(
              `[ai-predictive-alerts] Error for ${location.name}:`,
              error,
            );
          } else {
            alertsCreated += newInsights.length;
          }
        }
      }
    }

    return jsonResponse({
      success: true,
      locations_analyzed: locations.length,
      alerts_created: alertsCreated,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in ai-predictive-alerts:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
