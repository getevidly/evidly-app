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
 * Supported events:
 *   - new_insight:              Write to ai_insights + notifications, queue critical alerts
 *   - executive_snapshot_ready: Write to ai_insights so dashboard surfaces the brief
 *   - recall_alert:             Write critical recall alert to ai_insights
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
    // Write to ai_insights so dashboard shows it immediately
    await supabase.from("ai_insights").insert({
      org_id: orgId,
      title: payload.headline,
      description: payload.summary || payload.headline,
      type: "intelligence_alert",
      severity: payload.impact_level,
      category: payload.category,
      metadata: {
        intelligence_insight_id: payload.insight_id,
        category: payload.category,
        action_items: payload.action_items,
        affected_counties: payload.affected_counties,
        relevance_score: payload.relevance_score,
        confidence_score: payload.confidence_score,
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
    await supabase.from("ai_insights").insert({
      org_id: orgId,
      title: "Your Executive Intelligence Brief is ready",
      type: "executive_snapshot",
      severity: "informational",
      metadata: {
        snapshot_id: payload.snapshot_id,
        share_token: payload.share_token,
        source: "evidly_intelligence",
      },
    });
  }

  if (payload.event === "recall_alert") {
    await supabase.from("ai_insights").insert({
      org_id: orgId,
      title: "\u26A0\uFE0F Recall Alert: " + payload.product_name,
      type: "recall_alert",
      severity: "critical",
      metadata: {
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
