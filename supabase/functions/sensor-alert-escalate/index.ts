// ============================================================
// Sensor Alert Escalate — Escalates unacknowledged alerts
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Runs every 5 min, checks for unacknowledged alerts
//       and escalates based on age thresholds:
//       > 15 min: mark escalated, log to escalation_history
//       > 30 min: auto-create incident via sensor_incidents
//       > 60 min: flag for SMS notification
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

interface EscalateRequest {
  organization_id?: string;
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Only POST ──
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Supported methods: POST" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Service role authentication ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Missing or invalid Authorization header", docs: "Include 'Bearer <service_role_key>' in Authorization header" },
        401
      );
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== supabaseKey) {
      return jsonResponse({ error: "Invalid service role key" }, 403);
    }

    // ── Parse request body ──
    const payload: EscalateRequest = await req.json();
    const organizationId = payload.organization_id || null;

    const now = new Date();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const sixtyMinAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // ── Fetch unacknowledged, unresolved alerts ──
    let query = supabase
      .from("iot_sensor_alerts")
      .select("*")
      .is("acknowledged_at", null)
      .is("resolved_at", null)
      .order("created_at", { ascending: true });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: alerts, error: alertsError } = await query;

    if (alertsError) {
      console.error("Error fetching alerts:", alertsError);
      return jsonResponse({ error: "Failed to fetch alerts", details: alertsError.message }, 500);
    }

    if (!alerts || alerts.length === 0) {
      return jsonResponse({
        processed: 0,
        escalated: 0,
        incidents_created: 0,
        sms_flagged: 0,
        message: "No unacknowledged alerts found",
      });
    }

    let escalatedCount = 0;
    let incidentsCreated = 0;
    let smsFlagged = 0;

    for (const alert of alerts) {
      const alertCreatedAt = new Date(alert.created_at).getTime();
      const alertAge = now.getTime() - alertCreatedAt;
      const alertAgeMinutes = Math.round(alertAge / (60 * 1000));
      const metadata = (alert.metadata as Record<string, unknown>) || {};

      // ── > 60 min: Flag for SMS notification ──
      if (alertCreatedAt < new Date(sixtyMinAgo).getTime() && !metadata.sms_flagged) {
        const { error: updateError } = await supabase
          .from("iot_sensor_alerts")
          .update({
            metadata: {
              ...metadata,
              sms_flagged: true,
              sms_flagged_at: now.toISOString(),
              escalation_level: 3,
              alert_age_minutes: alertAgeMinutes,
            },
          })
          .eq("id", alert.id);

        if (!updateError) {
          smsFlagged++;

          // Log SMS escalation to escalation_history
          await supabase.from("sensor_escalation_history").insert({
            alert_id: alert.id,
            sensor_id: alert.sensor_id,
            organization_id: alert.organization_id,
            escalation_level: 3,
            escalation_type: "sms_notification",
            message: `Alert unacknowledged for ${alertAgeMinutes} min — flagged for SMS notification`,
            created_at: now.toISOString(),
          });
        }
      }

      // ── > 30 min: Auto-create incident ──
      if (alertCreatedAt < new Date(thirtyMinAgo).getTime() && !metadata.incident_created) {
        // Check if incident already exists for this alert
        const { data: existingIncident } = await supabase
          .from("sensor_incidents")
          .select("id")
          .eq("alert_id", alert.id)
          .single();

        if (!existingIncident) {
          const { data: incident, error: incidentError } = await supabase
            .from("sensor_incidents")
            .insert({
              alert_id: alert.id,
              sensor_id: alert.sensor_id,
              location_id: alert.location_id,
              organization_id: alert.organization_id,
              incident_type: alert.alert_type || "threshold_exceeded",
              severity: alert.severity || "warning",
              status: "open",
              title: `Auto-escalated: ${alert.message || "Unacknowledged sensor alert"}`,
              description: `Alert has been unacknowledged for ${alertAgeMinutes} minutes. Automatically escalated to incident for investigation.`,
              created_at: now.toISOString(),
            })
            .select("id")
            .single();

          if (!incidentError && incident) {
            incidentsCreated++;

            // Mark alert with incident reference
            await supabase
              .from("iot_sensor_alerts")
              .update({
                metadata: {
                  ...metadata,
                  incident_created: true,
                  incident_id: incident.id,
                  incident_created_at: now.toISOString(),
                  escalation_level: 2,
                },
              })
              .eq("id", alert.id);

            // Log incident escalation
            await supabase.from("sensor_escalation_history").insert({
              alert_id: alert.id,
              sensor_id: alert.sensor_id,
              organization_id: alert.organization_id,
              escalation_level: 2,
              escalation_type: "incident_created",
              message: `Alert unacknowledged for ${alertAgeMinutes} min — auto-created incident ${incident.id}`,
              incident_id: incident.id,
              created_at: now.toISOString(),
            });
          }
        }
      }

      // ── > 15 min: Mark escalated, log to escalation_history ──
      if (alertCreatedAt < new Date(fifteenMinAgo).getTime() && !metadata.escalated) {
        const { error: escalateError } = await supabase
          .from("iot_sensor_alerts")
          .update({
            metadata: {
              ...metadata,
              escalated: true,
              escalated_at: now.toISOString(),
              escalation_level: metadata.escalation_level || 1,
              alert_age_minutes: alertAgeMinutes,
            },
          })
          .eq("id", alert.id);

        if (!escalateError) {
          escalatedCount++;

          // Log escalation
          await supabase.from("sensor_escalation_history").insert({
            alert_id: alert.id,
            sensor_id: alert.sensor_id,
            organization_id: alert.organization_id,
            escalation_level: 1,
            escalation_type: "escalated",
            message: `Alert unacknowledged for ${alertAgeMinutes} min — marked as escalated`,
            created_at: now.toISOString(),
          });
        }
      }
    }

    return jsonResponse({
      processed: alerts.length,
      escalated: escalatedCount,
      incidents_created: incidentsCreated,
      sms_flagged: smsFlagged,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in sensor-alert-escalate:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
