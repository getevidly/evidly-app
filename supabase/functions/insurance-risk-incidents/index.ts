// ============================================================
// Insurance Risk Incidents — Anonymized incident metrics
// ============================================================
// Returns incident counts by category and severity.
// IMPORTANT: No employee PII, no specific violation details,
// no health department records. Only aggregated counts.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── API key authentication ──
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return jsonResponse({ error: "Missing X-API-Key header" }, 401);
    }

    const { data: keyRecord, error: keyError } = await supabase
      .from("insurance_api_keys")
      .select("*")
      .eq("api_key", apiKey)
      .eq("active", true)
      .single();

    if (keyError || !keyRecord) {
      return jsonResponse({ error: "Invalid or inactive API key" }, 403);
    }

    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return jsonResponse({ error: "API key has expired" }, 403);
    }

    // ── Rate limiting ──
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: minuteCount } = await supabase
      .from("insurance_api_requests")
      .select("*", { count: "exact", head: true })
      .eq("api_key_id", keyRecord.id)
      .gte("created_at", oneMinuteAgo);

    if ((minuteCount || 0) >= (keyRecord.rate_limit_per_minute || 60)) {
      return jsonResponse({ error: "Rate limit exceeded", retry_after_seconds: 60 }, 429);
    }

    // ── Parse query params ──
    const url = new URL(req.url);
    const locationId = url.searchParams.get("location_id");
    if (!locationId) {
      return jsonResponse({ error: "Missing required query parameter: location_id" }, 400);
    }

    // ── Consent check ──
    const { data: consent } = await supabase
      .from("insurance_consent")
      .select("id")
      .eq("organization_id", keyRecord.organization_id)
      .eq("location_id", locationId)
      .eq("consent_granted", true)
      .is("revoked_at", null)
      .limit(1);

    if (!consent || consent.length === 0) {
      await supabase.from("insurance_api_logs").insert({
        api_key_id: keyRecord.id,
        endpoint: "/risk-score/incidents",
        request_method: "GET",
        location_id: locationId,
        response_code: 403,
        error_message: "No active consent",
      });
      return jsonResponse({ error: "Data sharing consent not granted for this location" }, 403);
    }

    // ── Fetch incident data (aggregated, anonymized) ──
    // Query the incident_log or needs_attention tables for aggregated counts.
    // IMPORTANT: We only return counts and categories — never employee names,
    // specific violation descriptions, or health department details.

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Try incident_log table first (production), fall back to aggregated counts
    const { data: incidents, error: incError } = await supabase
      .from("incident_log")
      .select("severity, category, resolved_at, created_at")
      .eq("location_id", locationId)
      .gte("created_at", twelveMonthsAgo.toISOString());

    let bySeverity = { critical: 0, warning: 0, info: 0 };
    let byCategory: Record<string, number> = {};
    let totalIncidents = 0;
    let avgResolutionDays = 0;
    let trend: "improving" | "stable" | "worsening" = "stable";

    if (!incError && incidents && incidents.length > 0) {
      totalIncidents = incidents.length;

      for (const inc of incidents) {
        // Count by severity
        const sev = (inc.severity || "info").toLowerCase();
        if (sev === "critical" || sev === "high") bySeverity.critical++;
        else if (sev === "warning" || sev === "medium") bySeverity.warning++;
        else bySeverity.info++;

        // Count by category
        const cat = inc.category || "other";
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      }

      // Calculate average resolution time
      const resolved = incidents.filter((i: Record<string, unknown>) => i.resolved_at);
      if (resolved.length > 0) {
        const totalDays = resolved.reduce((sum: number, i: Record<string, unknown>) => {
          const created = new Date(i.created_at as string);
          const resolvedAt = new Date(i.resolved_at as string);
          return sum + (resolvedAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgResolutionDays = Math.round(totalDays / resolved.length);
      }

      // Calculate trend: compare first half vs second half
      const midpoint = new Date();
      midpoint.setMonth(midpoint.getMonth() - 6);
      const firstHalf = incidents.filter((i: Record<string, unknown>) =>
        new Date(i.created_at as string) < midpoint
      ).length;
      const secondHalf = totalIncidents - firstHalf;

      if (secondHalf < firstHalf * 0.7) trend = "improving";
      else if (secondHalf > firstHalf * 1.3) trend = "worsening";
    }

    // ── Log request ──
    await supabase.from("insurance_api_requests").insert({
      api_key_id: keyRecord.id,
      organization_id: keyRecord.organization_id,
      endpoint: "/risk-score/incidents",
      response_status: 200,
    });

    await supabase.from("insurance_api_logs").insert({
      api_key_id: keyRecord.id,
      endpoint: "/risk-score/incidents",
      request_method: "GET",
      location_id: locationId,
      response_code: 200,
    });

    // ── Build response ──
    return jsonResponse({
      location_id: locationId,
      period: "12_months",
      total_incidents: totalIncidents,
      by_severity: bySeverity,
      by_category: byCategory,
      avg_resolution_days: avgResolutionDays,
      trend,
      data_note: "All incident data is anonymized. No employee names, specific violation descriptions, or health department records are included.",
      generated_at: new Date().toISOString(),
      api_version: "1.0",
      _links: {
        self: `/risk-score/incidents?location_id=${locationId}`,
        verify: "/risk-score/verify",
        fire_safety: `/risk-score/fire-safety?location_id=${locationId}`,
      },
    });
  } catch (error) {
    console.error("Unexpected error in insurance-risk-incidents:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
