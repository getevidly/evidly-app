// ============================================================
// Insurance Risk Fire Safety — Property insurance underwriting data
// ============================================================
// Returns fire safety compliance details: hood cleaning dates,
// suppression inspection dates, extinguisher status, NFPA compliance.
// Critical for property insurance underwriting decisions.
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
        endpoint: "/risk-score/fire-safety",
        request_method: "GET",
        location_id: locationId,
        response_code: 403,
        error_message: "No active consent",
      });
      return jsonResponse({ error: "Data sharing consent not granted for this location" }, 403);
    }

    // ── Fetch fire safety factors ──
    const { data: latestScore } = await supabase
      .from("insurance_risk_scores")
      .select("id, fire_risk_score, calculated_at")
      .eq("organization_id", keyRecord.organization_id)
      .eq("location_id", locationId)
      .order("calculated_at", { ascending: false })
      .limit(1);

    const scoreId = latestScore?.[0]?.id;
    let factors: Record<string, unknown>[] = [];

    if (scoreId) {
      const { data: factorData } = await supabase
        .from("insurance_risk_factors")
        .select("*")
        .eq("risk_score_id", scoreId)
        .eq("factor_category", "fire")
        .order("weight", { ascending: false });

      factors = factorData || [];
    }

    // ── Derive NFPA compliance from factors ──
    function getNfpaStatus(refStandard: string): string {
      const factor = factors.find((f: Record<string, unknown>) =>
        (f.reference_standard as string || "").includes(refStandard)
      );
      if (!factor) return "not_evaluated";
      const score = factor.current_value as number;
      if (score >= 90) return "compliant";
      if (score >= 60) return "needs_attention";
      return "non_compliant";
    }

    // ── Log request ──
    await supabase.from("insurance_api_requests").insert({
      api_key_id: keyRecord.id,
      organization_id: keyRecord.organization_id,
      endpoint: "/risk-score/fire-safety",
      response_status: 200,
    });

    await supabase.from("insurance_api_logs").insert({
      api_key_id: keyRecord.id,
      endpoint: "/risk-score/fire-safety",
      request_method: "GET",
      location_id: locationId,
      response_code: 200,
    });

    // ── Build response ──
    return jsonResponse({
      location_id: locationId,
      fire_risk_score: latestScore?.[0]?.fire_risk_score || null,
      last_calculated: latestScore?.[0]?.calculated_at || null,
      systems: factors.map((f: Record<string, unknown>) => ({
        system_type: f.factor_name,
        score: f.current_value,
        max_score: f.max_value,
        weight: f.weight,
        status: f.status,
        compliance_ref: f.reference_standard,
        detail: f.impact_description,
        improvement_action: f.improvement_action,
      })),
      nfpa_compliance: {
        nfpa_96_hood_duct: getNfpaStatus("NFPA 96"),
        nfpa_17a_suppression: getNfpaStatus("NFPA 17A"),
        nfpa_10_extinguisher: getNfpaStatus("NFPA 10"),
        nfpa_72_alarm: getNfpaStatus("NFPA 72"),
      },
      factors_evaluated: factors.length,
      note: "Fire risk is weighted at 40% of the overall risk score — the #1 underwriting concern for commercial kitchens.",
      generated_at: new Date().toISOString(),
      api_version: "1.0",
      _links: {
        self: `/risk-score/fire-safety?location_id=${locationId}`,
        verify: "/risk-score/verify",
        history: `/risk-score/history?location_id=${locationId}`,
      },
    });
  } catch (error) {
    console.error("Unexpected error in insurance-risk-fire-safety:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
