// ============================================================
// Sensor Defrost Detect — Auto-detect defrost cycles
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Runs hourly, analyzes temperature patterns to detect
//       defrost cycles. Marks matching readings, triggers
//       alerts for failed recoveries.
// Pattern: temp rises 5-15°F above normal, holds 15-30 min,
//          then returns to baseline.
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

interface DefrostDetectRequest {
  organization_id?: string;
}

interface ReadingRecord {
  id: string;
  sensor_id: string;
  temperature_f: number;
  recorded_at: string;
  is_defrost_cycle: boolean;
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
    const payload: DefrostDetectRequest = await req.json();
    const organizationId = payload.organization_id || null;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Defrost detection thresholds
    const DEFROST_RISE_MIN_F = 5;   // Minimum temp rise to consider a defrost
    const DEFROST_RISE_MAX_F = 15;  // Maximum temp rise (beyond this is abnormal)
    const DEFROST_HOLD_MIN_MIN = 15; // Minimum hold duration in minutes
    const DEFROST_HOLD_MAX_MIN = 30; // Maximum hold duration in minutes
    const RECOVERY_MAX_MIN = 45;     // Max minutes to return to baseline after defrost

    // ── Fetch devices with auto_detect enabled ──
    let deviceQuery = supabase
      .from("iot_sensors")
      .select("id, name, organization_id, location_id, defrost_schedule");

    if (organizationId) {
      deviceQuery = deviceQuery.eq("organization_id", organizationId);
    }

    const { data: devices, error: devicesError } = await deviceQuery;

    if (devicesError) {
      console.error("Error fetching devices:", devicesError);
      return jsonResponse({ error: "Failed to fetch devices", details: devicesError.message }, 500);
    }

    if (!devices || devices.length === 0) {
      return jsonResponse({
        analyzed: 0,
        defrost_cycles_detected: 0,
        failed_recoveries: 0,
        message: "No devices found",
      });
    }

    // Filter to devices with auto_detect enabled in defrost_schedule
    const autoDetectDevices = devices.filter((d: Record<string, unknown>) => {
      const schedule = d.defrost_schedule as Record<string, unknown> | null;
      return schedule && schedule.auto_detect === true;
    });

    let analyzedCount = 0;
    let defrostCyclesDetected = 0;
    let failedRecoveries = 0;

    for (const device of autoDetectDevices) {
      analyzedCount++;

      // ── Fetch last 24 hours of readings for this device ──
      const { data: readings, error: readingsError } = await supabase
        .from("iot_sensor_readings")
        .select("id, sensor_id, temperature_f, recorded_at, is_defrost_cycle")
        .eq("sensor_id", device.id)
        .gte("recorded_at", twentyFourHoursAgo)
        .order("recorded_at", { ascending: true });

      if (readingsError || !readings || readings.length < 5) {
        // Not enough data to analyze
        continue;
      }

      const typedReadings = readings as ReadingRecord[];

      // ── Calculate baseline temperature (median of all readings) ──
      const temps = typedReadings.map((r) => r.temperature_f).sort((a, b) => a - b);
      const baseline = temps[Math.floor(temps.length / 2)];

      // ── Scan for defrost cycle patterns ──
      let i = 0;
      while (i < typedReadings.length) {
        const reading = typedReadings[i];
        const rise = reading.temperature_f - baseline;

        // Check if this reading starts a potential defrost cycle
        if (rise >= DEFROST_RISE_MIN_F && rise <= DEFROST_RISE_MAX_F) {
          // Find the extent of the elevated period
          const cycleStartIndex = i;
          const cycleStartTime = new Date(reading.recorded_at).getTime();
          let cycleEndIndex = i;

          // Walk forward through elevated readings
          while (cycleEndIndex < typedReadings.length - 1) {
            const nextReading = typedReadings[cycleEndIndex + 1];
            const nextRise = nextReading.temperature_f - baseline;

            if (nextRise >= DEFROST_RISE_MIN_F * 0.5) {
              // Still elevated (use half threshold to catch trailing edge)
              cycleEndIndex++;
            } else {
              break;
            }
          }

          const cycleEndTime = new Date(typedReadings[cycleEndIndex].recorded_at).getTime();
          const holdDurationMin = (cycleEndTime - cycleStartTime) / (60 * 1000);

          // Check if hold duration matches defrost pattern (15-30 minutes)
          if (holdDurationMin >= DEFROST_HOLD_MIN_MIN && holdDurationMin <= DEFROST_HOLD_MAX_MIN) {
            defrostCyclesDetected++;

            // Mark all readings in this cycle as is_defrost_cycle = true
            const cycleReadingIds = typedReadings
              .slice(cycleStartIndex, cycleEndIndex + 1)
              .map((r) => r.id);

            if (cycleReadingIds.length > 0) {
              await supabase
                .from("iot_sensor_readings")
                .update({ is_defrost_cycle: true })
                .in("id", cycleReadingIds);
            }

            // ── Check recovery: does temp return to baseline within expected time? ──
            let recovered = false;
            let recoveryCheckIndex = cycleEndIndex + 1;

            while (recoveryCheckIndex < typedReadings.length) {
              const recoveryReading = typedReadings[recoveryCheckIndex];
              const timeSinceCycleEnd = (new Date(recoveryReading.recorded_at).getTime() - cycleEndTime) / (60 * 1000);

              if (timeSinceCycleEnd > RECOVERY_MAX_MIN) {
                break; // Exceeded max recovery time
              }

              const recoveryRise = recoveryReading.temperature_f - baseline;
              if (recoveryRise < DEFROST_RISE_MIN_F * 0.25) {
                recovered = true;
                break;
              }

              recoveryCheckIndex++;
            }

            if (!recovered && cycleEndIndex < typedReadings.length - 1) {
              failedRecoveries++;

              // Trigger defrost_recovery_failed alert
              await supabase.from("iot_sensor_alerts").insert({
                sensor_id: device.id,
                location_id: device.location_id,
                organization_id: device.organization_id,
                alert_type: "defrost_recovery_failed",
                severity: "warning",
                message: `Defrost recovery failed on "${device.name}" — temperature did not return to baseline (${baseline.toFixed(1)}°F) within ${RECOVERY_MAX_MIN} minutes after defrost cycle`,
                temperature_f: typedReadings[cycleEndIndex].temperature_f,
                acknowledged: false,
                metadata: {
                  baseline_temp_f: baseline,
                  peak_temp_f: Math.max(...typedReadings.slice(cycleStartIndex, cycleEndIndex + 1).map((r) => r.temperature_f)),
                  cycle_start: typedReadings[cycleStartIndex].recorded_at,
                  cycle_end: typedReadings[cycleEndIndex].recorded_at,
                  hold_duration_min: Math.round(holdDurationMin),
                  expected_recovery_min: RECOVERY_MAX_MIN,
                  detected_at: now.toISOString(),
                },
              });
            }

            // Skip past this cycle
            i = cycleEndIndex + 1;
            continue;
          }
        }

        i++;
      }
    }

    return jsonResponse({
      analyzed: analyzedCount,
      total_devices_with_auto_detect: autoDetectDevices.length,
      defrost_cycles_detected: defrostCyclesDetected,
      failed_recoveries: failedRecoveries,
      analysis_window: {
        from: twentyFourHoursAgo,
        to: now.toISOString(),
      },
      thresholds: {
        rise_range_f: `${DEFROST_RISE_MIN_F}-${DEFROST_RISE_MAX_F}`,
        hold_range_min: `${DEFROST_HOLD_MIN_MIN}-${DEFROST_HOLD_MAX_MIN}`,
        recovery_max_min: RECOVERY_MAX_MIN,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in sensor-defrost-detect:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
