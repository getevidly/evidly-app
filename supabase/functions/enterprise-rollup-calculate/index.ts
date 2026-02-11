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
    const { tenant_id, period_date } = body;

    if (!tenant_id || !period_date) {
      return jsonResponse({ error: "tenant_id and period_date are required" }, 400);
    }

    // Fetch all hierarchy nodes for the tenant
    const { data: nodes, error: nodesErr } = await supabase
      .from("enterprise_hierarchy_nodes")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("created_at", { ascending: true });

    if (nodesErr) {
      console.error("[RollupCalc] Failed to fetch nodes:", nodesErr);
      return jsonResponse({ error: "Failed to fetch hierarchy nodes" }, 500);
    }

    // Build parent-children map
    const childrenMap: Record<string, string[]> = {};
    const nodeMap: Record<string, Record<string, unknown>> = {};
    for (const node of nodes || []) {
      nodeMap[node.id] = node;
      if (node.parent_id) {
        if (!childrenMap[node.parent_id]) childrenMap[node.parent_id] = [];
        childrenMap[node.parent_id].push(node.id);
      }
    }

    // Identify non-leaf nodes (nodes that have children)
    const nonLeafNodeIds = Object.keys(childrenMap);
    let nodesProcessed = 0;

    for (const parentId of nonLeafNodeIds) {
      const childIds = childrenMap[parentId];

      // Fetch child scores for the given period
      const { data: childScores, error: scoresErr } = await supabase
        .from("enterprise_rollup_scores")
        .select("*")
        .in("node_id", childIds)
        .eq("period_date", period_date);

      if (scoresErr || !childScores || childScores.length === 0) continue;

      // Calculate weighted average (equal weight per child)
      const totalWeight = childScores.length;
      const avgScore = childScores.reduce((sum: number, s: Record<string, unknown>) => sum + (Number(s.overall_score) || 0), 0) / totalWeight;
      const avgEquipment = childScores.reduce((sum: number, s: Record<string, unknown>) => sum + (Number(s.equipment_score) || 0), 0) / totalWeight;
      const avgDocumentation = childScores.reduce((sum: number, s: Record<string, unknown>) => sum + (Number(s.documentation_score) || 0), 0) / totalWeight;

      // Upsert the rollup score for this parent node
      const { error: upsertErr } = await supabase
        .from("enterprise_rollup_scores")
        .upsert({
          node_id: parentId,
          tenant_id,
          period_date,
          overall_score: Math.round(avgScore * 100) / 100,
          equipment_score: Math.round(avgEquipment * 100) / 100,
          documentation_score: Math.round(avgDocumentation * 100) / 100,
          child_count: childIds.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: "node_id,period_date" });

      if (upsertErr) {
        console.error("[RollupCalc] Upsert error for node", parentId, upsertErr);
        continue;
      }

      nodesProcessed++;
    }

    // Audit log
    await supabase.from("enterprise_audit_log").insert({
      tenant_id,
      action: "rollup_calculated",
      actor_email: "system",
      details: { period_date, nodes_processed: nodesProcessed },
    });

    return jsonResponse({ success: true, nodes_processed: nodesProcessed });
  } catch (err) {
    console.error("[RollupCalc] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
