// ============================================================
// Risk Score API — Carrier-facing endpoint for insurance data
// ============================================================
// Authenticated via X-API-Key header. Returns structured JSON
// with overall risk score, category breakdown, and factor details.
// Rate limited: 60 requests/minute, 1000 requests/day per key.
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
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Only GET ──
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
      return jsonResponse(
        { error: "Missing X-API-Key header", docs: "Include your carrier API key in the X-API-Key request header" },
        401
      );
    }

    // Validate key
    const { data: keyRecord, error: keyError } = await supabase
      .from("insurance_api_keys")
      .select("*")
      .eq("api_key", apiKey)
      .eq("active", true)
      .single();

    if (keyError || !keyRecord) {
      return jsonResponse({ error: "Invalid or inactive API key" }, 403);
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return jsonResponse({ error: "API key has expired" }, 403);
    }

    // ── Rate limiting (per-minute) ──
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: minuteCount } = await supabase
      .from("insurance_api_requests")
      .select("*", { count: "exact", head: true })
      .eq("api_key_id", keyRecord.id)
      .gte("created_at", oneMinuteAgo);

    const rateLimit = keyRecord.rate_limit_per_minute || 60;
    if ((minuteCount || 0) >= rateLimit) {
      return jsonResponse(
        { error: "Rate limit exceeded", limit: `${rateLimit} requests per minute`, retry_after_seconds: 60 },
        429
      );
    }

    // ── Rate limiting (per-day) ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: dayCount } = await supabase
      .from("insurance_api_requests")
      .select("*", { count: "exact", head: true })
      .eq("api_key_id", keyRecord.id)
      .gte("created_at", todayStart.toISOString());

    const dailyLimit = keyRecord.rate_limit_per_day || 1000;
    if ((dayCount || 0) >= dailyLimit) {
      return jsonResponse(
        { error: "Daily rate limit exceeded", limit: `${dailyLimit} requests per day` },
        429
      );
    }

    // ── Log request ──
    await supabase.from("insurance_api_requests").insert({
      api_key_id: keyRecord.id,
      organization_id: keyRecord.organization_id,
      endpoint: "/risk-score",
      response_status: 200,
    });

    // Update last_used_at
    await supabase
      .from("insurance_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);

    // ── Parse query params ──
    const url = new URL(req.url);
    const locationId = url.searchParams.get("location_id");
    const orgId = keyRecord.organization_id;

    // ── Fetch latest scores ──
    let query = supabase
      .from("insurance_risk_scores")
      .select("*")
      .eq("organization_id", orgId)
      .order("calculated_at", { ascending: false });

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data: scores, error: scoresError } = await query.limit(locationId ? 1 : 50);

    if (scoresError) {
      console.error("Error fetching scores:", scoresError);
      return jsonResponse({ error: "Failed to retrieve scores" }, 500);
    }

    // ── Build response ──
    return jsonResponse({
      organization_id: orgId,
      carrier_name: keyRecord.carrier_name,
      scores: (scores || []).map((s: Record<string, unknown>) => ({
        location_id: s.location_id,
        overall_score: s.overall_score,
        tier: s.tier,
        categories: {
          fire_risk: s.fire_risk_score,
          food_safety: s.food_safety_score,
          documentation: s.documentation_score,
          operational: s.operational_score,
        },
        factor_details: s.category_breakdown,
        factors_evaluated: s.factors_count,
        data_freshness: s.calculated_at,
      })),
      total_locations: (scores || []).length,
      generated_at: new Date().toISOString(),
      api_version: "1.0",
      _links: {
        self: `/risk-score${locationId ? `?location_id=${locationId}` : ""}`,
        documentation: "https://docs.evidly.com/api/risk-score",
      },
    });
  } catch (error) {
    console.error("Unexpected error in risk-score-api:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
