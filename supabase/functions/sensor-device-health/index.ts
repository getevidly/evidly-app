// ============================================================
// Sensor Device Health — Monitors device status and health
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Runs every 15 min, checks for offline devices,
//       battery warnings, and signal strength issues.
//       Updates device status fields accordingly.
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

interface DeviceHealthRequest {
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
    const payload: DeviceHealthRequest = await req.json();
    const organizationId = payload.organization_id || null;

    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    // ── Fetch all sensor devices ──
    let query = supabase
      .from("iot_sensors")
      .select("id, name, organization_id, location_id, status, last_seen_at, battery_pct, signal_strength_dbm");

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: devices, error: devicesError } = await query;

    if (devicesError) {
      console.error("Error fetching devices:", devicesError);
      return jsonResponse({ error: "Failed to fetch devices", details: devicesError.message }, 500);
    }

    if (!devices || devices.length === 0) {
      return jsonResponse({
        devices_checked: 0,
        offline: 0,
        battery_warnings: 0,
        signal_warnings: 0,
        message: "No devices found",
      });
    }

    let offlineCount = 0;
    let batteryWarnings = 0;
    let signalWarnings = 0;
    const healthIssues: Array<{ device_id: string; device_name: string; issue: string }> = [];

    for (const device of devices) {
      const updates: Record<string, unknown> = {};
      const lastSeenAt = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0;

      // ── Check if device is offline (last_reading_at > 30 min ago) ──
      if (!device.last_seen_at || lastSeenAt < new Date(thirtyMinAgo).getTime()) {
        if (device.status !== "offline") {
          updates.status = "offline";
          offlineCount++;
          healthIssues.push({
            device_id: device.id,
            device_name: device.name,
            issue: `Device offline — last seen ${device.last_seen_at ? new Date(device.last_seen_at).toISOString() : "never"}`,
          });

          // Create offline alert if not already active
          const { data: existingOfflineAlert } = await supabase
            .from("iot_sensor_alerts")
            .select("id")
            .eq("sensor_id", device.id)
            .eq("alert_type", "device_offline")
            .is("resolved_at", null)
            .limit(1);

          if (!existingOfflineAlert || existingOfflineAlert.length === 0) {
            await supabase.from("iot_sensor_alerts").insert({
              sensor_id: device.id,
              location_id: device.location_id,
              organization_id: device.organization_id,
              alert_type: "device_offline",
              severity: "warning",
              message: `Device "${device.name}" has not reported in over 30 minutes`,
              acknowledged: false,
              metadata: {
                last_seen_at: device.last_seen_at,
                detected_at: now.toISOString(),
              },
            });
          }
        }
      } else if (device.status === "offline") {
        // Device was offline but is now reporting — mark as online
        updates.status = "online";
      }

      // ── Check battery level < 20% ──
      if (device.battery_pct !== null && device.battery_pct !== undefined && device.battery_pct < 20) {
        batteryWarnings++;
        const batterySeverity = device.battery_pct < 10 ? "critical" : "warning";

        healthIssues.push({
          device_id: device.id,
          device_name: device.name,
          issue: `Low battery: ${device.battery_pct}% (${batterySeverity})`,
        });

        // Create battery_low alert if not already active
        const { data: existingBatteryAlert } = await supabase
          .from("iot_sensor_alerts")
          .select("id")
          .eq("sensor_id", device.id)
          .eq("alert_type", "battery_low")
          .is("resolved_at", null)
          .limit(1);

        if (!existingBatteryAlert || existingBatteryAlert.length === 0) {
          await supabase.from("iot_sensor_alerts").insert({
            sensor_id: device.id,
            location_id: device.location_id,
            organization_id: device.organization_id,
            alert_type: "battery_low",
            severity: batterySeverity,
            message: `Low battery on "${device.name}": ${device.battery_pct}%`,
            acknowledged: false,
            metadata: {
              battery_pct: device.battery_pct,
              detected_at: now.toISOString(),
            },
          });
        }
      }

      // ── Check signal strength < -70 dBm ──
      if (device.signal_strength_dbm !== null && device.signal_strength_dbm !== undefined && device.signal_strength_dbm < -70) {
        signalWarnings++;
        const signalSeverity = device.signal_strength_dbm < -85 ? "critical" : "warning";

        healthIssues.push({
          device_id: device.id,
          device_name: device.name,
          issue: `Weak signal: ${device.signal_strength_dbm} dBm (${signalSeverity})`,
        });

        // Create signal_weak alert if not already active
        const { data: existingSignalAlert } = await supabase
          .from("iot_sensor_alerts")
          .select("id")
          .eq("sensor_id", device.id)
          .eq("alert_type", "signal_weak")
          .is("resolved_at", null)
          .limit(1);

        if (!existingSignalAlert || existingSignalAlert.length === 0) {
          await supabase.from("iot_sensor_alerts").insert({
            sensor_id: device.id,
            location_id: device.location_id,
            organization_id: device.organization_id,
            alert_type: "signal_weak",
            severity: signalSeverity,
            message: `Weak signal on "${device.name}": ${device.signal_strength_dbm} dBm`,
            acknowledged: false,
            metadata: {
              signal_strength_dbm: device.signal_strength_dbm,
              detected_at: now.toISOString(),
            },
          });
        }
      }

      // ── Apply status updates if any ──
      if (Object.keys(updates).length > 0) {
        updates.updated_at = now.toISOString();
        const { error: updateError } = await supabase
          .from("iot_sensors")
          .update(updates)
          .eq("id", device.id);

        if (updateError) {
          console.error(`Error updating device ${device.id}:`, updateError);
        }
      }
    }

    return jsonResponse({
      devices_checked: devices.length,
      offline: offlineCount,
      battery_warnings: batteryWarnings,
      signal_warnings: signalWarnings,
      health_issues: healthIssues,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in sensor-device-health:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
