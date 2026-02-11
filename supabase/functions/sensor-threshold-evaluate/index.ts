// ============================================================
// Sensor Threshold Evaluate — Real-time threshold evaluation
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Evaluates a reading against threshold config, creates
//       alerts if exceeded, checks for sustained violations.
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

interface ThresholdConfig {
  max_temp_f: number;
  min_temp_f: number;
  warning_buffer_f: number;
  sustained_violation_minutes: number;
}

interface EvaluateRequest {
  device_id: string;
  reading_value: number;
  reading_type: string;
  threshold_config: ThresholdConfig;
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
    const payload: EvaluateRequest = await req.json();

    if (!payload.device_id || payload.reading_value === undefined || !payload.reading_type || !payload.threshold_config) {
      return jsonResponse(
        { error: "Invalid payload. Expected: { device_id: string, reading_value: number, reading_type: string, threshold_config: object }" },
        400
      );
    }

    const { device_id, reading_value, reading_type, threshold_config } = payload;
    const { max_temp_f, min_temp_f, warning_buffer_f, sustained_violation_minutes } = threshold_config;

    // ── Validate threshold config ──
    if (max_temp_f === undefined || min_temp_f === undefined) {
      return jsonResponse({ error: "threshold_config must include max_temp_f and min_temp_f" }, 400);
    }

    const warningBuffer = warning_buffer_f || 2;
    const sustainedMinutes = sustained_violation_minutes || 15;

    // ── Look up the device ──
    const { data: device, error: deviceError } = await supabase
      .from("iot_sensors")
      .select("id, name, location_id, organization_id")
      .eq("id", device_id)
      .single();

    if (deviceError || !device) {
      return jsonResponse({ error: "Device not found", device_id }, 404);
    }

    // ── Evaluate temperature against thresholds ──
    let alertTriggered = false;
    let severity: "info" | "warning" | "critical" = "info";
    let violationType: string | null = null;
    let message: string | null = null;

    if (reading_type === "temperature") {
      // Critical: exceeds max or below min
      if (reading_value > max_temp_f) {
        alertTriggered = true;
        const overage = reading_value - max_temp_f;
        if (overage > warningBuffer) {
          severity = "critical";
          violationType = "critical_high";
          message = `Temperature ${reading_value}°F is critically above maximum threshold ${max_temp_f}°F (by ${overage.toFixed(1)}°F)`;
        } else {
          severity = "warning";
          violationType = "warning_high";
          message = `Temperature ${reading_value}°F exceeds maximum threshold ${max_temp_f}°F (within warning buffer)`;
        }
      } else if (reading_value < min_temp_f) {
        alertTriggered = true;
        const underage = min_temp_f - reading_value;
        if (underage > warningBuffer) {
          severity = "critical";
          violationType = "critical_low";
          message = `Temperature ${reading_value}°F is critically below minimum threshold ${min_temp_f}°F (by ${underage.toFixed(1)}°F)`;
        } else {
          severity = "warning";
          violationType = "warning_low";
          message = `Temperature ${reading_value}°F is below minimum threshold ${min_temp_f}°F (within warning buffer)`;
        }
      }
    }

    // ── Check for sustained violations (reading history in last N minutes) ──
    let sustainedViolation = false;
    let consecutiveViolationCount = 0;

    if (alertTriggered) {
      const cutoffTime = new Date(Date.now() - sustainedMinutes * 60 * 1000).toISOString();

      const { data: recentReadings, error: historyError } = await supabase
        .from("iot_sensor_readings")
        .select("temperature_f, recorded_at")
        .eq("sensor_id", device_id)
        .gte("recorded_at", cutoffTime)
        .order("recorded_at", { ascending: false });

      if (!historyError && recentReadings && recentReadings.length > 0) {
        // Count consecutive readings that also violate thresholds
        for (const reading of recentReadings) {
          const temp = reading.temperature_f as number;
          if (temp > max_temp_f || temp < min_temp_f) {
            consecutiveViolationCount++;
          } else {
            break; // Stop at first in-range reading
          }
        }

        // If all readings in the window are violations, mark as sustained
        if (consecutiveViolationCount >= 3) {
          sustainedViolation = true;
          severity = "critical"; // Escalate to critical for sustained violations
          message = `SUSTAINED VIOLATION: ${message} — ${consecutiveViolationCount} consecutive readings out of range in the last ${sustainedMinutes} minutes`;
        }
      }
    }

    // ── Create alert record if threshold exceeded ──
    let alertId: string | null = null;

    if (alertTriggered) {
      const { data: alertRecord, error: alertError } = await supabase
        .from("iot_sensor_alerts")
        .insert({
          sensor_id: device_id,
          location_id: device.location_id,
          organization_id: device.organization_id,
          alert_type: sustainedViolation ? "sustained_threshold_exceeded" : "threshold_exceeded",
          severity,
          message,
          temperature_f: reading_value,
          acknowledged: false,
          metadata: {
            reading_type,
            violation_type: violationType,
            threshold_max: max_temp_f,
            threshold_min: min_temp_f,
            warning_buffer: warningBuffer,
            sustained_violation: sustainedViolation,
            consecutive_violation_count: consecutiveViolationCount,
          },
        })
        .select("id")
        .single();

      if (alertError) {
        console.error("Error creating alert:", alertError);
        return jsonResponse({ error: "Failed to create alert record", details: alertError.message }, 500);
      }

      alertId = alertRecord?.id || null;
    }

    // ── Return evaluation result ──
    return jsonResponse({
      evaluated: true,
      alert_triggered: alertTriggered,
      severity: alertTriggered ? severity : null,
      details: {
        device_id,
        device_name: device.name,
        reading_value,
        reading_type,
        threshold_max: max_temp_f,
        threshold_min: min_temp_f,
        warning_buffer: warningBuffer,
        violation_type: violationType,
        sustained_violation: sustainedViolation,
        consecutive_violation_count: consecutiveViolationCount,
        alert_id: alertId,
        message: alertTriggered ? message : "Reading is within acceptable thresholds",
      },
    });
  } catch (error) {
    console.error("Error in sensor-threshold-evaluate:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
