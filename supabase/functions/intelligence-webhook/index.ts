import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-evidly-intelligence-secret",
};

/**
 * intelligence-webhook — Receives pushes FROM the EvidLY Intelligence project
 *
 * Auth: x-evidly-intelligence-secret header must match INTELLIGENCE_WEBHOOK_SECRET.
 *
 * Phase 3 (V9 fix): All writes now go to intelligence_insights (not ai_insights)
 * with source_type='webhook_inbound'.
 *
 * Supported events:
 *   - new_insight:              Write to intelligence_insights + notifications
 *   - executive_snapshot_ready: Write to intelligence_insights
 *   - recall_alert:             Write critical recall alert to intelligence_insights
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Validate secret ──────────────────────────────────────
  const secret = req.headers.get("x-evidly-intelligence-secret");
  const expectedSecret = Deno.env.get("INTELLIGENCE_WEBHOOK_SECRET");

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders,
    });
  }

  // ── Parse payload ────────────────────────────────────────
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const orgId = payload.client_live_org_id;

  if (!orgId) {
    return new Response(
      JSON.stringify({ error: "Missing client_live_org_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Handle events ────────────────────────────────────────

  if (payload.event === "new_insight") {
    // Phase 3 (V9 fix): write to intelligence_insights instead of ai_insights
    await supabase.from("intelligence_insights").insert({
      organization_id: orgId,
      source_type: "webhook_inbound",
      category: payload.category || "intelligence_alert",
      impact_level: payload.impact_level || "medium",
      urgency: payload.urgency || (payload.impact_level === "critical" ? "immediate" : "standard"),
      title: payload.headline || "Intelligence Alert",
      headline: (payload.headline || "Intelligence Alert").slice(0, 120),
      summary: payload.summary || payload.headline || "",
      status: "published",
      source_name: "evidly_intelligence",
      confidence_score: payload.confidence_score ?? 0.80,
      affected_counties: payload.affected_counties || [],
      raw_source_data: {
        intelligence_insight_id: payload.insight_id,
        action_items: payload.action_items,
        relevance_score: payload.relevance_score,
        source: "evidly_intelligence",
      },
    });

    // Write to notifications for the notification bell
    await supabase.from("notifications").insert({
      org_id: orgId,
      title: payload.headline,
      type: "intelligence",
      severity: payload.impact_level,
      read: false,
      metadata: { intelligence_insight_id: payload.insight_id },
    });

    // If critical: queue email/SMS via existing notification_queue
    if (
      payload.impact_level === "critical" ||
      payload.urgency === "immediate"
    ) {
      await supabase.from("notification_queue").insert({
        org_id: orgId,
        type: "intelligence_critical",
        subject: "\u{1F6A8} Critical Intelligence Alert: " + payload.headline,
        body:
          payload.headline +
          "\n\n" +
          (payload.action_items || []).join("\n"),
        priority: "high",
      });
    }
  }

  if (payload.event === "executive_snapshot_ready") {
    // Phase 3 (V9 fix): write to intelligence_insights
    await supabase.from("intelligence_insights").insert({
      organization_id: orgId,
      source_type: "webhook_inbound",
      category: "executive_snapshot",
      impact_level: "low",
      urgency: "informational",
      title: "Your Executive Intelligence Brief is ready",
      headline: "Executive Intelligence Brief ready",
      summary: "A new executive intelligence brief has been generated and is ready for review.",
      status: "published",
      source_name: "evidly_intelligence",
      confidence_score: 1.00,
      raw_source_data: {
        snapshot_id: payload.snapshot_id,
        share_token: payload.share_token,
        source: "evidly_intelligence",
      },
    });
  }

  if (payload.event === "recall_alert") {
    // Phase 3 (V9 fix): write to intelligence_insights
    await supabase.from("intelligence_insights").insert({
      organization_id: orgId,
      source_type: "webhook_inbound",
      category: "recall_alert",
      impact_level: "critical",
      urgency: "immediate",
      title: "Recall Alert: " + (payload.product_name || "Unknown Product"),
      headline: ("Recall Alert: " + (payload.product_name || "Unknown Product")).slice(0, 120),
      summary: `Critical recall alert for ${payload.product_name || "unknown product"}. Risk level: ${payload.risk_level || "unknown"}.`,
      status: "published",
      source_name: "evidly_intelligence",
      confidence_score: 0.95,
      raw_source_data: {
        recall_id: payload.recall_id,
        risk_level: payload.risk_level,
        source: "evidly_intelligence",
      },
    });
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
