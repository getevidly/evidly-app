// ============================================================
// Insurance Risk History — 12-month score trend for carriers
// ============================================================
// Returns monthly risk scores with trend direction.
// Shows consistency and improvement over time.
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

function getTier(score: number): string {
  if (score >= 90) return "Preferred Risk";
  if (score >= 75) return "Standard Risk";
  if (score >= 60) return "Elevated Risk";
  return "High Risk";
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
        endpoint: "/risk-score/history",
        request_method: "GET",
        location_id: locationId,
        response_code: 403,
        error_message: "No active consent",
      });
      return jsonResponse({ error: "Data sharing consent not granted for this location" }, 403);
    }

    // ── Fetch 12-month history ──
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: history, error: histError } = await supabase
      .from("insurance_score_history")
      .select("*")
      .eq("location_id", locationId)
      .gte("score_date", twelveMonthsAgo.toISOString().split("T")[0])
      .order("score_date", { ascending: true });

    if (histError) {
      console.error("Error fetching history:", histError);
      return jsonResponse({ error: "Failed to retrieve score history" }, 500);
    }

    // ── Calculate trend ──
    const records = history || [];
    let trendDirection: "improving" | "stable" | "declining" = "stable";
    let changePercentage = 0;

    if (records.length >= 2) {
      const oldest = records[0].overall_score;
      const newest = records[records.length - 1].overall_score;
      changePercentage = Math.round(((newest - oldest) / oldest) * 100);
      if (changePercentage > 3) trendDirection = "improving";
      else if (changePercentage < -3) trendDirection = "declining";
    }

    // ── Log request ──
    await supabase.from("insurance_api_requests").insert({
      api_key_id: keyRecord.id,
      organization_id: keyRecord.organization_id,
      endpoint: "/risk-score/history",
      response_status: 200,
    });

    await supabase.from("insurance_api_logs").insert({
      api_key_id: keyRecord.id,
      endpoint: "/risk-score/history",
      request_method: "GET",
      location_id: locationId,
      response_code: 200,
    });

    // ── Build response ──
    return jsonResponse({
      location_id: locationId,
      period: "12_months",
      monthly_scores: records.map((r: Record<string, unknown>) => ({
        month: r.score_date,
        overall_score: r.overall_score,
        tier: getTier(r.overall_score as number),
        fire_risk: r.fire_score,
        food_safety: r.food_safety_score,
        documentation: r.documentation_score,
        operational: r.operations_score,
      })),
      data_points: records.length,
      trend_direction: trendDirection,
      change_percentage: changePercentage,
      generated_at: new Date().toISOString(),
      api_version: "1.0",
      _links: {
        self: `/risk-score/history?location_id=${locationId}`,
        verify: "/risk-score/verify",
      },
    });
  } catch (error) {
    console.error("Unexpected error in insurance-risk-history:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
