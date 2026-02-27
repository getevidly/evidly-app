import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Service role auth check
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const providedKey = authHeader.replace("Bearer ", "");

  if (providedKey !== serviceRoleKey) {
    return jsonResponse({ error: "Unauthorized - service role key required" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey
  );

  try {
    const body = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return jsonResponse({ error: "tenant_id is required" }, 400);
    }

    // Get the latest period date for this tenant
    const { data: latestScore, error: latestErr } = await supabase
      .from("enterprise_rollup_scores")
      .select("period_date")
      .eq("tenant_id", tenant_id)
      .order("period_date", { ascending: false })
      .limit(1)
      .single();

    if (latestErr || !latestScore) {
      return jsonResponse({ success: true, alerts: [], message: "No rollup scores found for tenant" });
    }

    const latestPeriod = latestScore.period_date;

    // Fetch all scores for the latest period, joined with node names
    const { data: scores, error: scoresErr } = await supabase
      .from("enterprise_rollup_scores")
      .select("*, node:enterprise_hierarchy_nodes(name)")
      .eq("tenant_id", tenant_id)
      .eq("period_date", latestPeriod);

    if (scoresErr) {
      console.error("[AlertRollup] Failed to fetch scores:", scoresErr);
      return jsonResponse({ error: "Failed to fetch rollup scores" }, 500);
    }

    const alerts: { severity: string; node_name: string; message: string; score: number }[] = [];

    for (const entry of scores || []) {
      const nodeName = entry.node?.name || entry.node_id;
      const overallScore = Number(entry.overall_score) || 0;
      const facilitySafetyScore = Number(entry.facility_safety_score) || 0;
      const foodSafetyScore = Number(entry.food_safety_score) || 0;

      // Critical: overall score below 75
      if (overallScore < 75) {
        alerts.push({ severity: "critical", node_name: nodeName, message: `Overall compliance score is critically low at ${overallScore}`, score: overallScore });
      } else if (overallScore < 85) {
        // Warning: overall score below 85
        alerts.push({ severity: "warning", node_name: nodeName, message: `Overall compliance score is below target at ${overallScore}`, score: overallScore });
      }

      // Facility safety score below 70
      if (facilitySafetyScore < 70) {
        alerts.push({ severity: "critical", node_name: nodeName, message: `Facility safety score below threshold - score ${facilitySafetyScore}`, score: facilitySafetyScore });
      }

      // Food safety score below 70
      if (foodSafetyScore < 70) {
        alerts.push({ severity: "critical", node_name: nodeName, message: `Food safety score below threshold - score ${foodSafetyScore}`, score: foodSafetyScore });
      }
    }

    // Audit log
    await supabase.from("enterprise_audit_log").insert({
      tenant_id,
      action: "alert_rollup_processed",
      actor_email: "system",
      details: { period_date: latestPeriod, total_alerts: alerts.length },
    });

    return jsonResponse({ success: true, alerts });
  } catch (err) {
    console.error("[AlertRollup] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
