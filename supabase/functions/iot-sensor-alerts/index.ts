// ============================================================
// IoT Sensor Alerts — Query and acknowledge sensor alerts
// ============================================================
// Authenticated via service role key (Bearer token).
// GET: Fetch alerts with filtering by organization, severity, acknowledged status
// POST: Acknowledge alerts by ID
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

interface AcknowledgeRequest {
  alert_ids: string[];
  acknowledged_by: string;
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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

    // ── GET: Fetch alerts ──
    if (req.method === "GET") {
      const url = new URL(req.url);
      const organizationId = url.searchParams.get("organization_id");
      const severity = url.searchParams.get("severity");
      const acknowledgedParam = url.searchParams.get("acknowledged");

      if (!organizationId) {
        return jsonResponse({ error: "Missing required parameter: organization_id" }, 400);
      }

      // Build query
      let query = supabase
        .from("iot_sensor_alerts")
        .select(`
          *,
          iot_sensors (
            id,
            name,
            location_id,
            mac_address,
            locations (
              id,
              name
            )
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      // Apply filters
      if (severity) {
        query = query.eq("severity", severity);
      }

      if (acknowledgedParam !== null) {
        const acknowledged = acknowledgedParam === "true";
        query = query.eq("acknowledged", acknowledged);
      }

      const { data: alerts, error: alertsError, count } = await query;

      if (alertsError) {
        console.error("Error fetching alerts:", alertsError);
        return jsonResponse({ error: "Failed to fetch alerts", details: alertsError.message }, 500);
      }

      // Format response
      const formattedAlerts = (alerts || []).map((alert: Record<string, unknown>) => {
        const sensor = alert.iot_sensors as Record<string, unknown>;
        const location = sensor?.locations as Record<string, unknown>;

        return {
          id: alert.id,
          sensor_id: alert.sensor_id,
          sensor_name: sensor?.name || "Unknown Sensor",
          sensor_mac: sensor?.mac_address,
          location_id: alert.location_id,
          location_name: location?.name || "Unknown Location",
          alert_type: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          temperature_f: alert.temperature_f,
          humidity_pct: alert.humidity_pct,
          acknowledged: alert.acknowledged,
          acknowledged_by: alert.acknowledged_by,
          acknowledged_at: alert.acknowledged_at,
          created_at: alert.created_at,
        };
      });

      return jsonResponse({
        alerts: formattedAlerts,
        total_count: formattedAlerts.length,
        filters: {
          organization_id: organizationId,
          severity: severity || "all",
          acknowledged: acknowledgedParam !== null ? acknowledgedParam === "true" : "all",
        },
      });
    }

    // ── POST: Acknowledge alerts ──
    if (req.method === "POST") {
      const payload: AcknowledgeRequest = await req.json();

      if (!payload.alert_ids || !Array.isArray(payload.alert_ids) || payload.alert_ids.length === 0) {
        return jsonResponse(
          { error: "Invalid payload. Expected: { alert_ids: string[], acknowledged_by: string }" },
          400
        );
      }

      if (!payload.acknowledged_by) {
        return jsonResponse({ error: "Missing required field: acknowledged_by" }, 400);
      }

      // Update alerts
      const { data: updatedAlerts, error: updateError } = await supabase
        .from("iot_sensor_alerts")
        .update({
          acknowledged: true,
          acknowledged_by: payload.acknowledged_by,
          acknowledged_at: new Date().toISOString(),
        })
        .in("id", payload.alert_ids)
        .select();

      if (updateError) {
        console.error("Error acknowledging alerts:", updateError);
        return jsonResponse({ error: "Failed to acknowledge alerts", details: updateError.message }, 500);
      }

      return jsonResponse({
        success: true,
        acknowledged_count: (updatedAlerts || []).length,
        acknowledged_ids: (updatedAlerts || []).map((a: Record<string, unknown>) => a.id),
        acknowledged_by: payload.acknowledged_by,
        acknowledged_at: new Date().toISOString(),
      });
    }

    // ── Unsupported method ──
    return jsonResponse({ error: "Method not allowed. Supported methods: GET, POST" }, 405);
  } catch (error) {
    console.error("Error in IoT sensor alerts endpoint:", error);
    return jsonResponse({ error: "Internal server error", details: error.message }, 500);
  }
});
