// ============================================================
// IoT Sensor Pull — Cloud-to-cloud API polling for sensor data
// ============================================================
// Authenticated via service role key (Bearer token). Triggered
// by cron job or manual request. Polls external IoT platform
// APIs, normalizes readings, stores data, updates sensor status,
// and triggers threshold-based alerts.
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

interface PullRequest {
  organization_id: string;
  provider_slug: string;
}

interface NormalizedReading {
  mac_address: string;
  temperature_f: number;
  humidity_pct?: number;
  battery_pct?: number;
  recorded_at: string;
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
    const payload: PullRequest = await req.json();
    if (!payload.organization_id || !payload.provider_slug) {
      return jsonResponse(
        { error: "Invalid payload format. Expected: { organization_id: string, provider_slug: string }" },
        400
      );
    }

    // ── Fetch integration config ──
    const { data: config, error: configError } = await supabase
      .from("iot_integration_configs")
      .select("*")
      .eq("organization_id", payload.organization_id)
      .eq("provider_slug", payload.provider_slug)
      .eq("status", "active")
      .single();

    if (configError || !config) {
      return jsonResponse(
        { error: "No active integration configuration found for this organization and provider" },
        404
      );
    }

    const authCreds = config.auth_credentials as Record<string, string>;
    const apiBaseUrl = config.api_base_url;

    if (!apiBaseUrl) {
      return jsonResponse({ error: "API base URL not configured" }, 400);
    }

    // ── Fetch sensor list for organization ──
    const { data: sensors, error: sensorsError } = await supabase
      .from("iot_sensors")
      .select("*")
      .eq("organization_id", payload.organization_id)
      .eq("provider_slug", payload.provider_slug);

    if (sensorsError || !sensors || sensors.length === 0) {
      return jsonResponse({ error: "No sensors found for this organization and provider" }, 404);
    }

    let normalizedReadings: NormalizedReading[] = [];

    // ── Make API call based on provider ──
    try {
      if (payload.provider_slug === "sensorpush") {
        // SensorPush: POST to /api/v1/samples with OAuth token
        const response = await fetch(`${apiBaseUrl}/api/v1/samples`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authCreds.oauth_token}`,
          },
          body: JSON.stringify({
            limit: 100,
            sensors: sensors.map((s: Record<string, unknown>) => s.mac_address),
          }),
        });

        if (!response.ok) {
          throw new Error(`SensorPush API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Normalize SensorPush response
        for (const sensorMac in data.sensors || {}) {
          const readings = data.sensors[sensorMac];
          if (Array.isArray(readings) && readings.length > 0) {
            const latest = readings[0];
            normalizedReadings.push({
              mac_address: sensorMac,
              temperature_f: latest.temperature,
              humidity_pct: latest.humidity,
              battery_pct: latest.battery_voltage ? (latest.battery_voltage / 3.0) * 100 : undefined,
              recorded_at: latest.observed,
            });
          }
        }
      } else if (payload.provider_slug === "tempstick") {
        // TempStick: GET to /readings with API key header
        const response = await fetch(`${apiBaseUrl}/readings`, {
          method: "GET",
          headers: {
            "X-API-Key": authCreds.api_key,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`TempStick API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Normalize TempStick response
        if (Array.isArray(data.readings)) {
          for (const reading of data.readings) {
            normalizedReadings.push({
              mac_address: reading.device_id,
              temperature_f: reading.temp_f,
              humidity_pct: reading.humidity,
              battery_pct: reading.battery_percent,
              recorded_at: reading.timestamp,
            });
          }
        }
      } else {
        // Generic provider: GET to /sensors/data
        const response = await fetch(`${apiBaseUrl}/sensors/data`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${authCreds.api_key || authCreds.oauth_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Generic provider API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Normalize generic response (assume array of sensor readings)
        if (Array.isArray(data)) {
          for (const reading of data) {
            normalizedReadings.push({
              mac_address: reading.mac_address || reading.device_id,
              temperature_f: reading.temperature_f || reading.temperature,
              humidity_pct: reading.humidity_pct || reading.humidity,
              battery_pct: reading.battery_pct || reading.battery_percent,
              recorded_at: reading.recorded_at || reading.timestamp || new Date().toISOString(),
            });
          }
        }
      }
    } catch (apiError) {
      console.error(`API pull error for ${payload.provider_slug}:`, apiError);

      // Log failed ingestion
      await supabase.from("iot_ingestion_log").insert({
        organization_id: payload.organization_id,
        provider_slug: payload.provider_slug,
        ingestion_method: "api_pull",
        readings_count: 0,
        alerts_triggered: 0,
        status: "error",
        error_message: apiError.message,
      });

      return jsonResponse({ error: "Failed to fetch data from external API", details: apiError.message }, 502);
    }

    // ── Process normalized readings ──
    let ingestedCount = 0;
    let alertsTriggeredCount = 0;

    for (const reading of normalizedReadings) {
      if (!reading.mac_address || reading.temperature_f === undefined) {
        continue;
      }

      // Find the sensor by mac_address
      const sensor = sensors.find((s: Record<string, unknown>) => s.mac_address === reading.mac_address);
      if (!sensor) {
        console.warn(`Sensor not found for MAC: ${reading.mac_address}`);
        continue;
      }

      // Insert reading into iot_sensor_readings
      const { error: readingError } = await supabase
        .from("iot_sensor_readings")
        .insert({
          sensor_id: sensor.id,
          temperature_f: reading.temperature_f,
          humidity_pct: reading.humidity_pct || null,
          battery_pct: reading.battery_pct || null,
          recorded_at: reading.recorded_at,
          ingestion_method: "api_pull",
        });

      if (readingError) {
        console.error(`Failed to insert reading for sensor ${sensor.id}:`, readingError);
        continue;
      }

      ingestedCount++;

      // Update sensor status
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

      // Check thresholds and create alerts
      const thresholds = config.alert_thresholds as Record<string, Record<string, number>>;
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
              organization_id: payload.organization_id,
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
              organization_id: payload.organization_id,
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
            organization_id: payload.organization_id,
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

    // ── Log successful ingestion ──
    await supabase.from("iot_ingestion_log").insert({
      organization_id: payload.organization_id,
      provider_slug: payload.provider_slug,
      ingestion_method: "api_pull",
      readings_count: ingestedCount,
      alerts_triggered: alertsTriggeredCount,
      status: "success",
    });

    return jsonResponse({
      success: true,
      provider: payload.provider_slug,
      sensors_polled: sensors.length,
      readings_ingested: ingestedCount,
      alerts_triggered: alertsTriggeredCount,
    });
  } catch (error) {
    console.error("Error in IoT sensor pull:", error);
    return jsonResponse({ error: "Internal server error", details: error.message }, 500);
  }
});
