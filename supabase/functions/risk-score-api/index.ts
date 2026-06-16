// ============================================================
// Risk Score API — Carrier-facing endpoint
// ============================================================
// Authenticated via X-API-Key header. Returns structured JSON
// with jurisdiction-native grade, PSE safeguard status, and
// operational facts. Reads and identifies compliance state;
// flags items requiring attention. §1731 compliant.
// Rate limited: 60 requests/minute, 1000 requests/day per key.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

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

    // ── Fetch locations ──
    let locQuery = supabase
      .from("locations")
      .select("id, name, city, state")
      .eq("organization_id", orgId)
      .eq("active", true);

    if (locationId) {
      locQuery = locQuery.eq("id", locationId);
    }

    const { data: locations, error: locError } = await locQuery.limit(locationId ? 1 : 50);

    if (locError) {
      console.error("Error fetching locations:", locError);
      return jsonResponse({ error: "Failed to retrieve locations" }, 500);
    }

    // ── For each location, read jurisdiction grade, PSE status, and operational facts ──
    const locationResults = [];

    for (const loc of locations || []) {
      // Read jurisdiction grade from compliance_score_snapshots
      const { data: gradeSnapshot } = await supabase
        .from("compliance_score_snapshots")
        .select("jurisdiction_grade, score_date, model_version")
        .eq("location_id", loc.id)
        .eq("organization_id", orgId)
        .order("score_date", { ascending: false })
        .limit(1)
        .single();

      // Read PSE safeguard status from vendor_service_records
      const { data: serviceRecords } = await supabase
        .from("vendor_service_records")
        .select("safeguard_type, next_due_date")
        .eq("organization_id", orgId);

      const pseSafeguards: Record<string, { status: string; next_due_date: string | null }> = {};
      const safeguardTypes = ["hood_cleaning", "fire_suppression", "fire_alarm", "sprinklers"];
      for (const sType of safeguardTypes) {
        const records = (serviceRecords || []).filter((r: any) => r.safeguard_type === sType);
        if (records.length === 0) {
          pseSafeguards[sType] = { status: "missing", next_due_date: null };
        } else {
          const latest = records.sort((a: any, b: any) => b.next_due_date?.localeCompare(a.next_due_date || "") || 0)[0];
          const isOverdue = latest.next_due_date && new Date(latest.next_due_date) < new Date();
          pseSafeguards[sType] = {
            status: isOverdue ? "overdue" : "current",
            next_due_date: latest.next_due_date,
          };
        }
      }

      // Read operational facts from readiness_snapshots
      const { data: readinessSnapshot } = await supabase
        .from("readiness_snapshots")
        .select("open_violations, pending_corrective_actions, overdue_temp_checks, expired_documents, snapshot_date")
        .eq("org_id", orgId)
        .eq("location_id", loc.id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .single();

      // Identify flagged items
      const flaggedItems: string[] = [];
      if (readinessSnapshot) {
        if (readinessSnapshot.open_violations > 0) flaggedItems.push(`${readinessSnapshot.open_violations} open violation(s)`);
        if (readinessSnapshot.pending_corrective_actions > 0) flaggedItems.push(`${readinessSnapshot.pending_corrective_actions} pending corrective action(s)`);
        if (readinessSnapshot.overdue_temp_checks > 0) flaggedItems.push(`${readinessSnapshot.overdue_temp_checks} overdue temp check(s)`);
        if (readinessSnapshot.expired_documents > 0) flaggedItems.push(`${readinessSnapshot.expired_documents} expired document(s)`);
      }

      const missingPSE = safeguardTypes.filter(s => pseSafeguards[s].status === "missing");
      const overduePSE = safeguardTypes.filter(s => pseSafeguards[s].status === "overdue");
      if (missingPSE.length > 0) flaggedItems.push(`${missingPSE.length} PSE safeguard(s) missing records`);
      if (overduePSE.length > 0) flaggedItems.push(`${overduePSE.length} PSE safeguard(s) overdue`);

      locationResults.push({
        location_id: loc.id,
        location_name: loc.name,
        jurisdiction_grade: gradeSnapshot?.jurisdiction_grade ?? null,
        grade_date: gradeSnapshot?.score_date ?? null,
        pse_safeguards: pseSafeguards,
        operational_facts: readinessSnapshot ? {
          open_violations: readinessSnapshot.open_violations,
          pending_corrective_actions: readinessSnapshot.pending_corrective_actions,
          overdue_temp_checks: readinessSnapshot.overdue_temp_checks,
          expired_documents: readinessSnapshot.expired_documents,
          snapshot_date: readinessSnapshot.snapshot_date,
        } : null,
        flagged_items: flaggedItems,
      });
    }

    // ── Build response ──
    return jsonResponse({
      organization_id: orgId,
      carrier_name: keyRecord.carrier_name,
      locations: locationResults,
      total_locations: locationResults.length,
      generated_at: new Date().toISOString(),
      api_version: "2.0",
      _links: {
        self: `/risk-score${locationId ? `?location_id=${locationId}` : ""}`,
        documentation: "https://docs.getevidly.com/api/risk-score",
      },
    });
  } catch (error) {
    console.error("Unexpected error in risk-score-api:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
