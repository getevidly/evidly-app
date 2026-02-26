// ============================================================
// intelligence-bridge-receive — Accepts POST from live EvidLY app
// Auth via x-evidly-bridge-secret header.
// Events: org_sync, compliance_update, org_deactivated
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateWebhookSecret, corsHeaders } from "../_shared/claude.ts";

// Default source types every new client subscribes to
const DEFAULT_SOURCE_TYPES = [
  "health_dept", "fda_recall", "outbreak", "legislative", "weather",
];

const DEFAULT_SEVERITY_FILTER = ["critical", "high", "medium"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate webhook secret
  if (!validateWebhookSecret(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const payload = await req.json();
  const { event, live_org_id, org_name, subscription_tier, jurisdiction_ids,
    location_counties, location_names, compliance_snapshot } = payload;

  if (!event || !live_org_id) {
    return new Response(
      JSON.stringify({ error: "event and live_org_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── org_sync ──────────────────────────────────────────────
  if (event === "org_sync") {
    // UPSERT intelligence_clients ON CONFLICT (app_org_id)
    const { data: existing } = await supabase
      .from("intelligence_clients")
      .select("id")
      .eq("app_org_id", live_org_id)
      .limit(1);

    let clientId: string;

    if (existing && existing.length > 0) {
      // UPDATE existing client
      clientId = existing[0].id;
      await supabase.from("intelligence_clients").update({
        name: org_name || undefined,
        plan_tier: subscription_tier || undefined,
        jurisdictions: location_counties || jurisdiction_ids || undefined,
        active: true,
        metadata: {
          location_names: location_names || [],
          jurisdiction_ids: jurisdiction_ids || [],
          last_sync: new Date().toISOString(),
        },
      }).eq("id", clientId);
    } else {
      // INSERT new client
      const { data: newClient, error: insertErr } = await supabase
        .from("intelligence_clients")
        .insert({
          app_org_id: live_org_id,
          name: org_name || "Unknown Organization",
          plan_tier: subscription_tier || "founder",
          jurisdictions: location_counties || jurisdiction_ids || [],
          active: true,
          metadata: {
            location_names: location_names || [],
            jurisdiction_ids: jurisdiction_ids || [],
            registered_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (insertErr) {
        return new Response(
          JSON.stringify({ error: "Failed to create client", detail: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      clientId = newClient.id;

      // Create default subscriptions for new clients
      const subscriptions = DEFAULT_SOURCE_TYPES.map((sourceType) => ({
        client_id: clientId,
        source_type: sourceType,
        jurisdictions: location_counties || [],
        severity_filter: DEFAULT_SEVERITY_FILTER,
        active: true,
        delivery_method: "webhook" as const,
      }));

      await supabase.from("client_subscriptions").insert(subscriptions);

      console.log(`New client registered: ${org_name || live_org_id}`);
    }

    return new Response(
      JSON.stringify({ success: true, client_id: clientId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── compliance_update ─────────────────────────────────────
  if (event === "compliance_update") {
    const { data: client } = await supabase
      .from("intelligence_clients")
      .select("id")
      .eq("app_org_id", live_org_id)
      .single();

    if (!client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("intelligence_clients").update({
      metadata: {
        compliance_snapshot: compliance_snapshot,
        last_compliance_update: new Date().toISOString(),
      },
    }).eq("id", client.id);

    return new Response(
      JSON.stringify({ success: true, client_id: client.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── org_deactivated ───────────────────────────────────────
  if (event === "org_deactivated") {
    await supabase.from("intelligence_clients").update({
      active: false,
    }).eq("app_org_id", live_org_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: `Unknown event: ${event}` }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
