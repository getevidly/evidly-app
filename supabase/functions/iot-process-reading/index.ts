// ============================================================
// IoT Process Reading — Unified temperature log from sensor data
// ============================================================
// Receives a validated IoT sensor reading, creates a temperature_log
// entry with input_method='iot_sensor', maps to HACCP CCPs when
// applicable, and triggers alerts for out-of-range readings with
// a 15-minute delay to prevent false alarms from door opens.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// HACCP CCP mapping: equipment type → CCP number
const CCP_MAP: Record<string, string> = {
  cooler: "CCP-01",      // Cold storage
  freezer: "CCP-01",     // Cold storage
  cold_holding: "CCP-02", // Hot/cold holding
  hot_holding: "CCP-02",  // Hot/cold holding
  hot_hold: "CCP-02",
};

// Default alert delay (minutes) — prevents false alarms from door opens
const ALERT_DELAY_MINUTES = 15;

interface ProcessReadingRequest {
  sensor_id: string;
  temperature_f: number;
  humidity_pct?: number;
  reading_at?: string; // ISO timestamp, defaults to now
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ProcessReadingRequest = await req.json();

    if (!body.sensor_id || body.temperature_f === undefined) {
      return jsonResponse({ error: "sensor_id and temperature_f are required" }, 400);
    }

    // 1. Look up sensor and linked equipment
    const { data: sensor, error: sensorErr } = await supabase
      .from("iot_sensors")
      .select("id, name, mac_address, equipment_link_id, location_id, organization_id")
      .eq("id", body.sensor_id)
      .single();

    if (sensorErr || !sensor) {
      return jsonResponse({ error: "Sensor not found", details: sensorErr?.message }, 404);
    }

    // 2. Look up equipment for threshold and type info
    let equipmentType: string | null = null;
    let equipmentName: string | null = null;
    let minTemp: number | null = null;
    let maxTemp: number | null = null;

    if (sensor.equipment_link_id) {
      const { data: equipment } = await supabase
        .from("temperature_equipment")
        .select("id, name, equipment_type, min_temp, max_temp")
        .eq("id", sensor.equipment_link_id)
        .single();

      if (equipment) {
        equipmentType = equipment.equipment_type;
        equipmentName = equipment.name;
        minTemp = equipment.min_temp;
        maxTemp = equipment.max_temp;
      }
    }

    const tempF = body.temperature_f;
    const isWithinRange = minTemp !== null && maxTemp !== null
      ? tempF >= minTemp && tempF <= maxTemp
      : true; // No thresholds = assume OK

    // 3. Create temperature log entry
    const { data: tempLog, error: logErr } = await supabase
      .from("temp_check_completions")
      .insert({
        organization_id: sensor.organization_id,
        location_id: sensor.location_id,
        equipment_id: sensor.equipment_link_id,
        temperature_value: tempF,
        is_within_range: isWithinRange,
        recorded_by: null, // IoT auto-logged
        input_method: "iot_sensor",
        created_at: body.reading_at || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (logErr) {
      return jsonResponse({ error: "Failed to create temperature log", details: logErr.message }, 500);
    }

    // 4. HACCP CCP mapping
    let ccpMapped = false;
    if (equipmentType && CCP_MAP[equipmentType]) {
      const ccpNumber = CCP_MAP[equipmentType];
      await supabase.from("haccp_monitoring_logs").insert({
        organization_id: sensor.organization_id,
        location_id: sensor.location_id,
        ccp_number: ccpNumber,
        reading_value: tempF,
        reading_unit: "°F",
        is_within_limit: isWithinRange,
        source: "iot_sensor",
        source_id: tempLog.id,
        equipment_name: equipmentName,
        sensor_name: sensor.name,
        monitored_by: "IoT Sensor",
        monitored_at: body.reading_at || new Date().toISOString(),
      });
      ccpMapped = true;
    }

    // 5. Alert triggering (with delay logic)
    let alertTriggered = false;
    if (!isWithinRange) {
      // Check if there's been a continuous out-of-range condition
      // for at least ALERT_DELAY_MINUTES (prevents door-open false alarms)
      const delayThreshold = new Date(
        Date.now() - ALERT_DELAY_MINUTES * 60 * 1000
      ).toISOString();

      const { data: recentReadings } = await supabase
        .from("iot_sensor_readings")
        .select("temperature_f, compliance_status, created_at")
        .eq("sensor_id", body.sensor_id)
        .gte("created_at", delayThreshold)
        .order("created_at", { ascending: false })
        .limit(5);

      // If all recent readings are also out of range → trigger alert
      const allOutOfRange = recentReadings?.length
        ? recentReadings.every(
            (r) => r.compliance_status === "violation" || r.compliance_status === "warning"
          )
        : false;

      if (allOutOfRange) {
        await supabase.from("iot_sensor_alerts").insert({
          sensor_id: body.sensor_id,
          organization_id: sensor.organization_id,
          alert_type: "threshold_violation",
          severity: "critical",
          title: `${equipmentName || sensor.name} temperature out of range: ${tempF}°F`,
          description: `IoT sensor "${sensor.name}" detected temperature at ${tempF}°F, outside acceptable range${minTemp !== null ? ` (${minTemp}–${maxTemp}°F)` : ""}. Condition persistent for >${ALERT_DELAY_MINUTES} minutes.`,
          status: "active",
          created_at: new Date().toISOString(),
        });
        alertTriggered = true;
      }
    }

    return jsonResponse({
      logged: true,
      temp_log_id: tempLog.id,
      temperature_f: tempF,
      is_within_range: isWithinRange,
      ccp_mapped: ccpMapped,
      alert_triggered: alertTriggered,
      equipment_name: equipmentName,
      sensor_name: sensor.name,
    });
  } catch (err) {
    return jsonResponse(
      { error: "Internal error", details: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
