// ============================================================
// Insurance Risk Verify — POST endpoint for carrier verification
// ============================================================
// Carriers submit location_id + API key to get current risk score.
// Requires active operator consent. No PII in responses.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── API key authentication ──
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return jsonResponse(
        { error: "Missing X-API-Key header", docs: "Include your carrier API key in the X-API-Key request header" },
        401
      );
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

    // ── Parse request body ──
    let body: { location_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body. Expected: { location_id: string }" }, 400);
    }

    const locationId = body.location_id;
    if (!locationId) {
      return jsonResponse({ error: "Missing required field: location_id" }, 400);
    }

    // ── Consent check ──
    const { data: consent } = await supabase
      .from("insurance_consent")
      .select("*")
      .eq("organization_id", keyRecord.organization_id)
      .eq("location_id", locationId)
      .eq("consent_granted", true)
      .is("revoked_at", null)
      .limit(1);

    if (!consent || consent.length === 0) {
      // Log denied request
      await supabase.from("insurance_api_logs").insert({
        api_key_id: keyRecord.id,
        endpoint: "/risk-score/verify",
        request_method: "POST",
        location_id: locationId,
        response_code: 403,
        error_message: "No active consent for this location",
      });

      return jsonResponse({
        error: "Data sharing consent not granted for this location",
        detail: "The operator has not authorized sharing risk score data for this location. Contact the operator to request access.",
      }, 403);
    }

    // ── Fetch latest score ──
    const { data: scores, error: scoresError } = await supabase
      .from("insurance_risk_scores")
      .select("*")
      .eq("organization_id", keyRecord.organization_id)
      .eq("location_id", locationId)
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (scoresError || !scores || scores.length === 0) {
      return jsonResponse({ error: "No risk score data available for this location" }, 404);
    }

    const score = scores[0];

    // ── Log successful request ──
    await supabase.from("insurance_api_requests").insert({
      api_key_id: keyRecord.id,
      organization_id: keyRecord.organization_id,
      endpoint: "/risk-score/verify",
      response_status: 200,
    });

    await supabase.from("insurance_api_logs").insert({
      api_key_id: keyRecord.id,
      endpoint: "/risk-score/verify",
      request_method: "POST",
      location_id: locationId,
      response_code: 200,
    });

    // Update last_used_at
    await supabase
      .from("insurance_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);

    // ── Build response ──
    return jsonResponse({
      location_id: locationId,
      overall_score: score.overall_score,
      tier: score.tier,
      categories: {
        fire_risk: score.fire_risk_score,
        food_safety: score.food_safety_score,
        documentation: score.documentation_score,
        operational: score.operational_score,
      },
      factors_evaluated: score.factors_count,
      last_updated: score.calculated_at,
      consent_status: "active",
      generated_at: new Date().toISOString(),
      api_version: "1.0",
      _links: {
        summary: `/risk-score?location_id=${locationId}`,
        history: `/risk-score/history?location_id=${locationId}`,
        fire_safety: `/risk-score/fire-safety?location_id=${locationId}`,
        incidents: `/risk-score/incidents?location_id=${locationId}`,
      },
    });
  } catch (error) {
    console.error("Unexpected error in insurance-risk-verify:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
