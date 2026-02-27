// ============================================================
// intelligence-match — Match insights to client subscriptions & deliver
// Called with POST { insight_id: string }
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/claude.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { insight_id } = await req.json();
  if (!insight_id) {
    return new Response(
      JSON.stringify({ error: "insight_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 1. Read insight with source info
  const { data: insight, error: fetchErr } = await supabase
    .from("intelligence_insights")
    .select("*, intelligence_sources(slug, source_type)")
    .eq("id", insight_id)
    .single();

  if (fetchErr || !insight) {
    return new Response(
      JSON.stringify({ error: "Insight not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2. Query all active clients with their subscriptions
  // Schema: intelligence_clients.active, client_subscriptions.active
  const { data: clients } = await supabase
    .from("intelligence_clients")
    .select("*, client_subscriptions(*)")
    .eq("active", true);

  let clientsMatched = 0;
  let deliveriesSent = 0;

  const webhookUrl = Deno.env.get("LIVE_APP_WEBHOOK_URL");
  const webhookSecret = Deno.env.get("LIVE_APP_WEBHOOK_SECRET");

  for (const client of clients || []) {
    const subs = (client.client_subscriptions || []).filter((s: any) => s.active);
    if (subs.length === 0) continue;

    // Check if any subscription matches this insight
    let matched = false;

    for (const sub of subs) {
      // Filter 1: source_type match (if subscription specifies one)
      if (sub.source_type && insight.intelligence_sources?.source_type !== sub.source_type) {
        continue;
      }

      // Filter 2: severity_filter includes insight.impact_level
      const severityFilter: string[] = sub.severity_filter || ["critical", "high", "medium"];
      if (insight.impact_level && !severityFilter.includes(insight.impact_level)) {
        continue;
      }

      // Filter 3: jurisdiction overlap (empty = match all)
      const subJurisdictions: string[] = sub.jurisdictions || [];
      const insightJurisdictions: string[] = insight.jurisdictions || [];
      if (subJurisdictions.length > 0 && insightJurisdictions.length > 0) {
        const overlap = subJurisdictions.some((j: string) => insightJurisdictions.includes(j));
        if (!overlap) continue;
      }

      matched = true;
      break;
    }

    if (!matched) continue;

    // Calculate relevance_score (0-1)
    let relevanceScore = 0;
    const clientJurisdictions: string[] = client.jurisdictions || [];
    const insightCounties: string[] = insight.jurisdictions || [];

    // +0.35 if client county directly matches
    if (clientJurisdictions.length > 0 && insightCounties.length > 0) {
      const countyMatch = clientJurisdictions.some((j: string) => insightCounties.includes(j));
      if (countyMatch) relevanceScore += 0.35;
    } else if (insightCounties.length === 0) {
      // National scope — partial match
      relevanceScore += 0.15;
    }

    // +0.20 if critical
    if (insight.impact_level === "critical") relevanceScore += 0.20;
    // +0.15 if high
    else if (insight.impact_level === "high") relevanceScore += 0.15;

    // +0.15 if high confidence
    if ((insight.confidence || 0) > 0.8) relevanceScore += 0.15;

    // +0.15 if pillar overlap with client metadata
    const clientPillars: string[] = client.metadata?.pillar_focus || ["food_safety", "facility_safety"];
    const insightPillars: string[] = insight.affected_pillars || [];
    if (insightPillars.length > 0 && clientPillars.some((p: string) => insightPillars.includes(p))) {
      relevanceScore += 0.15;
    }

    relevanceScore = Math.min(1, relevanceScore);

    // INSERT into insight_deliveries (ON CONFLICT-safe via checking first)
    const { data: existingDelivery } = await supabase
      .from("insight_deliveries")
      .select("id")
      .eq("insight_id", insight.id)
      .eq("client_id", client.id)
      .limit(1);

    if (existingDelivery && existingDelivery.length > 0) continue;

    const { data: delivery, error: deliveryErr } = await supabase
      .from("insight_deliveries")
      .insert({
        insight_id: insight.id,
        client_id: client.id,
        delivery_method: "webhook",
        webhook_url: client.webhook_url || webhookUrl,
        status: "pending",
        attempt_count: 0,
        metadata: { relevance_score: relevanceScore },
      })
      .select()
      .single();

    if (deliveryErr) {
      console.error("Delivery insert error:", deliveryErr.message);
      continue;
    }

    clientsMatched++;

    // POST to live app webhook
    const targetUrl = client.webhook_url || webhookUrl;
    if (!targetUrl) {
      await supabase.from("insight_deliveries").update({
        status: "failed",
        error_message: "No webhook URL configured",
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
      }).eq("id", delivery.id);
      continue;
    }

    try {
      const payload = {
        event: "new_insight",
        client_live_org_id: client.app_org_id,
        insight_id: insight.id,
        headline: insight.metadata?.headline || insight.title,
        impact_level: insight.impact_level,
        urgency: insight.metadata?.urgency || "standard",
        category: insight.metadata?.category || insight.insight_type,
        affected_counties: insight.jurisdictions || [],
        action_items: insight.recommended_actions || [],
        relevance_score: relevanceScore,
        confidence_score: insight.confidence || 0.5,
      };

      const resp = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-evidly-intelligence-secret": webhookSecret || "",
        },
        body: JSON.stringify(payload),
      });

      await supabase.from("insight_deliveries").update({
        status: resp.ok ? "delivered" : "failed",
        http_status: resp.status,
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        delivered_at: resp.ok ? new Date().toISOString() : null,
        error_message: resp.ok ? null : `HTTP ${resp.status}`,
      }).eq("id", delivery.id);

      if (resp.ok) deliveriesSent++;
    } catch (err: any) {
      await supabase.from("insight_deliveries").update({
        status: "failed",
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        error_message: err.message,
      }).eq("id", delivery.id);
    }
  }

  // Update insight status if any deliveries were made
  if (clientsMatched > 0) {
    await supabase.from("intelligence_insights").update({
      status: "delivered",
    }).eq("id", insight.id);

    // Also update the source event status
    if (insight.event_id) {
      await supabase.from("intelligence_events").update({
        status: "delivered",
      }).eq("id", insight.event_id);
    }
  }

  return new Response(
    JSON.stringify({ clients_matched: clientsMatched, deliveries_sent: deliveriesSent }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
