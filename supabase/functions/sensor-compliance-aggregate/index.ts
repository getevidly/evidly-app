// ============================================================
// Sensor Compliance Aggregate — Updates compliance rates
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Runs every 15 min, calculates temperature compliance
//       rates and data completeness scores for each location.
//       Sensor-equipped locations get bonus to data completeness.
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

interface ComplianceAggregateRequest {
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
    const payload: ComplianceAggregateRequest = await req.json();
    const organizationId = payload.organization_id || null;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Sensor-equipped location bonus for data completeness (percentage points)
    const SENSOR_COMPLETENESS_BONUS = 10;

    // ── Fetch locations ──
    let locationQuery = supabase
      .from("locations")
      .select("id, name, organization_id, active")
      .eq("active", true);

    if (organizationId) {
      locationQuery = locationQuery.eq("organization_id", organizationId);
    }

    const { data: locations, error: locationsError } = await locationQuery;

    if (locationsError) {
      console.error("Error fetching locations:", locationsError);
      return jsonResponse({ error: "Failed to fetch locations", details: locationsError.message }, 500);
    }

    if (!locations || locations.length === 0) {
      return jsonResponse({
        locations_updated: 0,
        avg_compliance: 0,
        message: "No active locations found",
      });
    }

    let locationsUpdated = 0;
    let totalCompliance = 0;
    const locationResults: Array<{
      location_id: string;
      location_name: string;
      temp_compliance_rate: number;
      data_completeness_score: number;
      total_readings: number;
      in_range_readings: number;
      has_sensors: boolean;
    }> = [];

    for (const location of locations) {
      // ── Check if location has active sensors ──
      const { data: sensors } = await supabase
        .from("iot_sensors")
        .select("id")
        .eq("location_id", location.id)
        .eq("status", "online")
        .limit(1);

      const hasSensors = sensors !== null && sensors.length > 0;

      // ── Count readings in last 24 hours for this location ──
      // Get all sensor IDs for this location first
      const { data: locationSensors } = await supabase
        .from("iot_sensors")
        .select("id")
        .eq("location_id", location.id);

      const sensorIds = (locationSensors || []).map((s: Record<string, unknown>) => s.id as string);

      let totalReadings = 0;
      let inRangeReadings = 0;
      let hoursWithReadings = 0;

      if (sensorIds.length > 0) {
        // Fetch readings from the last 24 hours
        const { data: readings, error: readingsError } = await supabase
          .from("iot_sensor_readings")
          .select("id, temperature_f, recorded_at, is_defrost_cycle")
          .in("sensor_id", sensorIds)
          .gte("recorded_at", twentyFourHoursAgo)
          .eq("is_defrost_cycle", false) // Exclude defrost cycle readings from compliance
          .order("recorded_at", { ascending: true });

        if (!readingsError && readings) {
          totalReadings = readings.length;

          // Get threshold config for this location's organization
          const { data: config } = await supabase
            .from("iot_integration_configs")
            .select("alert_thresholds")
            .eq("organization_id", location.organization_id)
            .eq("status", "active")
            .single();

          const thresholds = config?.alert_thresholds as Record<string, Record<string, number>> | null;
          const tempMin = thresholds?.temperature?.min ?? 32;
          const tempMax = thresholds?.temperature?.max ?? 41;

          // Count in-range readings
          for (const reading of readings) {
            const temp = reading.temperature_f as number;
            if (temp >= tempMin && temp <= tempMax) {
              inRangeReadings++;
            }
          }

          // Calculate hours with readings (data completeness)
          const hourBuckets = new Set<number>();
          for (const reading of readings) {
            const readingTime = new Date(reading.recorded_at as string);
            const hourKey = readingTime.getFullYear() * 1000000 +
              (readingTime.getMonth() + 1) * 10000 +
              readingTime.getDate() * 100 +
              readingTime.getHours();
            hourBuckets.add(hourKey);
          }
          hoursWithReadings = hourBuckets.size;
        }
      }

      // Also count manual temperature logs for compliance
      const { data: manualLogs } = await supabase
        .from("temperature_logs")
        .select("id, status")
        .eq("location_id", location.id)
        .gte("recorded_at", twentyFourHoursAgo);

      if (manualLogs && manualLogs.length > 0) {
        const manualInRange = manualLogs.filter((l: Record<string, unknown>) => l.status === "in_range").length;
        totalReadings += manualLogs.length;
        inRangeReadings += manualInRange;

        // Add manual log hours to completeness
        // Each manual log counts as covering 1 hour
        hoursWithReadings = Math.min(24, hoursWithReadings + Math.min(manualLogs.length, 24 - hoursWithReadings));
      }

      // ── Calculate compliance rate ──
      const tempComplianceRate = totalReadings > 0
        ? Math.round((inRangeReadings / totalReadings) * 10000) / 100  // 2 decimal places
        : 0;

      // ── Calculate data completeness score ──
      let dataCompletenessScore = Math.round((hoursWithReadings / 24) * 10000) / 100; // 2 decimal places

      // Sensor-equipped locations get a bonus
      if (hasSensors) {
        dataCompletenessScore = Math.min(100, dataCompletenessScore + SENSOR_COMPLETENESS_BONUS);
      }

      // ── Upsert compliance data for this location ──
      const { error: upsertError } = await supabase
        .from("location_compliance_scores")
        .upsert(
          {
            location_id: location.id,
            organization_id: location.organization_id,
            temp_compliance_rate: tempComplianceRate,
            data_completeness_score: dataCompletenessScore,
            total_readings_24h: totalReadings,
            in_range_readings_24h: inRangeReadings,
            hours_with_data: hoursWithReadings,
            has_active_sensors: hasSensors,
            calculated_at: now.toISOString(),
          },
          { onConflict: "location_id" }
        );

      if (upsertError) {
        console.error(`Error upserting compliance for location ${location.id}:`, upsertError);
      } else {
        locationsUpdated++;
        totalCompliance += tempComplianceRate;
      }

      locationResults.push({
        location_id: location.id,
        location_name: location.name,
        temp_compliance_rate: tempComplianceRate,
        data_completeness_score: dataCompletenessScore,
        total_readings: totalReadings,
        in_range_readings: inRangeReadings,
        has_sensors: hasSensors,
      });
    }

    const avgCompliance = locationsUpdated > 0
      ? Math.round((totalCompliance / locationsUpdated) * 100) / 100
      : 0;

    return jsonResponse({
      locations_updated: locationsUpdated,
      avg_compliance: avgCompliance,
      sensor_completeness_bonus: SENSOR_COMPLETENESS_BONUS,
      analysis_window: {
        from: twentyFourHoursAgo,
        to: now.toISOString(),
      },
      location_details: locationResults,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in sensor-compliance-aggregate:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
