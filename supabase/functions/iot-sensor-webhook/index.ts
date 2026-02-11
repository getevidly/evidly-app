// ============================================================
// IoT Sensor Webhook — Receives real-time sensor data pushes
// ============================================================
// Authenticated via X-API-Key header. Accepts sensor readings
// from external IoT platforms via webhook POST. Validates
// readings, stores them, updates sensor status, and triggers
// threshold-based alerts.
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

interface SensorReading {
  mac_address: string;
  temperature_f: number;
  humidity_pct?: number;
  battery_pct?: number;
  recorded_at: string;
}

interface WebhookPayload {
  provider: string;
  sensors: SensorReading[];
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Only POST ──
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── API key authentication ──
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return jsonResponse(
        { error: "Missing X-API-Key header", docs: "Include your integration API key in the X-API-Key request header" },
        401
      );
    }

    // Validate key against iot_integration_configs
    const { data: configRecord, error: configError } = await supabase
      .from("iot_integration_configs")
      .select("*")
      .eq("status", "active")
      .single();

    if (configError || !configRecord) {
      return jsonResponse({ error: "No active integration configuration found" }, 403);
    }

    // Validate API key from auth_credentials
    const authCreds = configRecord.auth_credentials as Record<string, string>;
    if (!authCreds || authCreds.api_key !== apiKey) {
      return jsonResponse({ error: "Invalid API key" }, 403);
    }

    // ── Parse request body ──
    const payload: WebhookPayload = await req.json();
    if (!payload.provider || !payload.sensors || !Array.isArray(payload.sensors)) {
      return jsonResponse(
        { error: "Invalid payload format. Expected: { provider: string, sensors: Array }" },
        400
      );
    }

    let ingestedCount = 0;
    let alertsTriggeredCount = 0;

    // ── Process each sensor reading ──
    for (const reading of payload.sensors) {
      if (!reading.mac_address || reading.temperature_f === undefined || !reading.recorded_at) {
        console.warn("Skipping invalid reading:", reading);
        continue;
      }

      // 1. Find the sensor by mac_address
      const { data: sensor, error: sensorError } = await supabase
        .from("iot_sensors")
        .select("*")
        .eq("mac_address", reading.mac_address)
        .eq("organization_id", configRecord.organization_id)
        .single();

      if (sensorError || !sensor) {
        console.warn(`Sensor not found for MAC: ${reading.mac_address}`);
        continue;
      }

      // 2. Insert reading into iot_sensor_readings
      const { error: readingError } = await supabase
        .from("iot_sensor_readings")
        .insert({
          sensor_id: sensor.id,
          temperature_f: reading.temperature_f,
          humidity_pct: reading.humidity_pct || null,
          battery_pct: reading.battery_pct || null,
          recorded_at: reading.recorded_at,
          ingestion_method: "webhook",
        });

      if (readingError) {
        console.error(`Failed to insert reading for sensor ${sensor.id}:`, readingError);
        continue;
      }

      ingestedCount++;

      // 3. Update sensor's last_seen_at, battery_pct, status
      const updateData: Record<string, unknown> = {
        last_seen_at: new Date().toISOString(),
        status: "online",
      };

      if (reading.battery_pct !== undefined) {
        updateData.battery_pct = reading.battery_pct;
      }

      await supabase
        .from("iot_sensors")
        .update(updateData)
        .eq("id", sensor.id);

      // 4. Check thresholds and create alerts if exceeded
      const thresholds = configRecord.alert_thresholds as Record<string, Record<string, number>>;
      if (thresholds && thresholds.temperature) {
        const tempMin = thresholds.temperature.min;
        const tempMax = thresholds.temperature.max;
        const temp = reading.temperature_f;

        if ((tempMin !== undefined && temp < tempMin) || (tempMax !== undefined && temp > tempMax)) {
          const severity = (tempMin !== undefined && temp < tempMin - 5) || (tempMax !== undefined && temp > tempMax + 5)
            ? "critical"
            : "warning";

          const message = temp < tempMin
            ? `Temperature ${temp}°F is below minimum threshold ${tempMin}°F`
            : `Temperature ${temp}°F exceeds maximum threshold ${tempMax}°F`;

          const { error: alertError } = await supabase
            .from("iot_sensor_alerts")
            .insert({
              sensor_id: sensor.id,
              location_id: sensor.location_id,
              organization_id: configRecord.organization_id,
              alert_type: "threshold_exceeded",
              severity,
              message,
              temperature_f: temp,
              humidity_pct: reading.humidity_pct || null,
              acknowledged: false,
            });

          if (!alertError) {
            alertsTriggeredCount++;
          }
        }
      }

      // Check humidity thresholds
      if (reading.humidity_pct !== undefined && thresholds && thresholds.humidity) {
        const humMin = thresholds.humidity.min;
        const humMax = thresholds.humidity.max;
        const hum = reading.humidity_pct;

        if ((humMin !== undefined && hum < humMin) || (humMax !== undefined && hum > humMax)) {
          const severity = (humMin !== undefined && hum < humMin - 10) || (humMax !== undefined && hum > humMax + 10)
            ? "critical"
            : "warning";

          const message = hum < humMin
            ? `Humidity ${hum}% is below minimum threshold ${humMin}%`
            : `Humidity ${hum}% exceeds maximum threshold ${humMax}%`;

          const { error: alertError } = await supabase
            .from("iot_sensor_alerts")
            .insert({
              sensor_id: sensor.id,
              location_id: sensor.location_id,
              organization_id: configRecord.organization_id,
              alert_type: "threshold_exceeded",
              severity,
              message,
              temperature_f: reading.temperature_f,
              humidity_pct: hum,
              acknowledged: false,
            });

          if (!alertError) {
            alertsTriggeredCount++;
          }
        }
      }

      // Check battery level
      if (reading.battery_pct !== undefined && reading.battery_pct < 20) {
        const severity = reading.battery_pct < 10 ? "critical" : "warning";
        const message = `Low battery: ${reading.battery_pct}%`;

        const { error: alertError } = await supabase
          .from("iot_sensor_alerts")
          .insert({
            sensor_id: sensor.id,
            location_id: sensor.location_id,
            organization_id: configRecord.organization_id,
            alert_type: "low_battery",
            severity,
            message,
            temperature_f: reading.temperature_f,
            humidity_pct: reading.humidity_pct || null,
            acknowledged: false,
          });

        if (!alertError) {
          alertsTriggeredCount++;
        }
      }
    }

    // ── Log ingestion ──
    await supabase.from("iot_ingestion_log").insert({
      organization_id: configRecord.organization_id,
      provider_slug: payload.provider,
      ingestion_method: "webhook",
      readings_count: ingestedCount,
      alerts_triggered: alertsTriggeredCount,
      status: "success",
    });

    return jsonResponse({
      success: true,
      ingested: ingestedCount,
      alerts_triggered: alertsTriggeredCount,
      provider: payload.provider,
    });
  } catch (error) {
    console.error("Error processing IoT sensor webhook:", error);
    return jsonResponse({ error: "Internal server error", details: error.message }, 500);
  }
});
