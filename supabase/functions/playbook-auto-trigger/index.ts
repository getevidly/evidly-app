// ============================================================
// Playbook Auto-Trigger — Maps sensor alerts to playbook templates
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Receives sensor alert data (sensor_id, alert_type, value,
//       threshold, location_id) and creates a suggested playbook
//       activation with the matching template.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface TriggerRequest {
  sensor_id: string;
  alert_type: string;
  value: number;
  threshold: number;
  location_id: string;
  organization_id?: string;
  metadata?: Record<string, unknown>;
}

// Maps sensor alert types to playbook template slugs
const ALERT_TO_PLAYBOOK: Record<string, string> = {
  temperature_critical: "power-outage",
  equipment_failure: "equipment-failure",
  power_loss: "power-outage",
  water_leak: "water-damage",
  fire_alarm: "fire-emergency",
  contamination: "contamination-response",
  pest_detected: "pest-incident",
  humidity_critical: "equipment-failure",
};

Deno.serve(async (req: Request) => {
  // -- CORS preflight --
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Supported methods: POST" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: TriggerRequest = await req.json();

    if (!payload.sensor_id || !payload.alert_type || !payload.location_id) {
      return jsonResponse({ error: "Missing required fields: sensor_id, alert_type, location_id" }, 400);
    }

    // -- Resolve the playbook template for this alert type --
    const templateSlug = ALERT_TO_PLAYBOOK[payload.alert_type];

    if (!templateSlug) {
      return jsonResponse({
        success: false,
        message: `No playbook template mapped for alert type: ${payload.alert_type}`,
        available_types: Object.keys(ALERT_TO_PLAYBOOK),
      });
    }

    const { data: template, error: templateError } = await supabase
      .from("playbook_templates")
      .select("id, name, slug, severity, steps")
      .eq("slug", templateSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (templateError || !template) {
      return jsonResponse({ error: `Playbook template '${templateSlug}' not found or inactive` }, 404);
    }

    const now = new Date().toISOString();

    // -- Create a suggested playbook activation --
    const { data: activation, error: activationError } = await supabase
      .from("playbook_activations")
      .insert({
        template_id: template.id,
        location_id: payload.location_id,
        organization_id: payload.organization_id || null,
        status: "suggested",
        trigger_type: "sensor_alert",
        trigger_data: {
          sensor_id: payload.sensor_id,
          alert_type: payload.alert_type,
          value: payload.value,
          threshold: payload.threshold,
          metadata: payload.metadata || {},
        },
        suggested_at: now,
        current_step: 0,
      })
      .select("id, status, template_id, suggested_at")
      .single();

    if (activationError) {
      console.error("Error creating activation:", activationError);
      return jsonResponse({ error: "Failed to create playbook activation", details: activationError.message }, 500);
    }

    // -- Notify the location manager --
    const { data: locationManagers } = await supabase
      .from("location_members")
      .select("user_id")
      .eq("location_id", payload.location_id)
      .eq("role", "manager");

    const notificationRecipients = (locationManagers || []).map((m: Record<string, unknown>) => m.user_id);

    if (notificationRecipients.length > 0) {
      const notifications = notificationRecipients.map((userId: string) => ({
        user_id: userId,
        type: "playbook_suggested",
        title: `Emergency Playbook Suggested: ${template.name}`,
        message: `Sensor alert (${payload.alert_type}) triggered a ${template.name} playbook suggestion for your location. Value: ${payload.value}, Threshold: ${payload.threshold}.`,
        metadata: {
          activation_id: activation.id,
          template_slug: templateSlug,
          sensor_id: payload.sensor_id,
          severity: template.severity,
        },
        read: false,
        created_at: now,
      }));

      await supabase.from("notifications").insert(notifications);
    }

    return jsonResponse({
      success: true,
      activation: {
        id: activation.id,
        status: activation.status,
        template_id: activation.template_id,
        template_name: template.name,
        template_slug: templateSlug,
        severity: template.severity,
        suggested_at: activation.suggested_at,
      },
      notifications_sent: notificationRecipients.length,
      trigger: {
        sensor_id: payload.sensor_id,
        alert_type: payload.alert_type,
        value: payload.value,
        threshold: payload.threshold,
      },
    });
  } catch (error) {
    console.error("Error in playbook-auto-trigger:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
