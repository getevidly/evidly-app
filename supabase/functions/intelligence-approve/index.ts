import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * intelligence-approve — Admin approval workflow for intelligence insights
 *
 * Auth: Bearer token → verify user → check @getevidly.com email domain.
 *
 * Actions (via POST body { action, ... }):
 *
 *   list      { status?: string | string[], limit?: number }
 *             → { insights, count }
 *
 *   publish   { insight_id, is_demo_eligible?, demo_priority? }
 *             → { success, insight_id }
 *
 *   reject    { insight_id, reason? }
 *             → { success, insight_id }
 *
 *   unpublish { insight_id }
 *             → { success, insight_id }
 *
 *   edit      { insight_id, updates: { title?, summary?, action_items? } }
 *             → { success, insight_id }
 *
 *   create    { title, summary, category, impact_level, affected_counties?,
 *              action_items?, is_demo_eligible?, demo_priority?, status? }
 *             → { success, insight_id }
 *
 *   stats     {}
 *             → { pending, published_this_week, total_live, last_pipeline_run }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Auth: verify user is EvidLY admin ──────────────────────
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (!user.email?.endsWith("@getevidly.com")) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    // ── Parse body ────────────────────────────────────────────
    const body = await req.json();
    const { action } = body;

    // ── STATS ─────────────────────────────────────────────────
    if (action === "stats") {
      const weekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [pendingRes, weekRes, liveRes, lastRunRes] = await Promise.all([
        supabase
          .from("intelligence_insights")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_review"),
        supabase
          .from("intelligence_insights")
          .select("id", { count: "exact", head: true })
          .eq("status", "published")
          .gte("published_at", weekAgo),
        supabase
          .from("intelligence_insights")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase
          .from("intelligence_insights")
          .select("created_at")
          .neq("source_name", "EvidLY Admin")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      return jsonResponse({
        pending: pendingRes.count ?? 0,
        published_this_week: weekRes.count ?? 0,
        total_live: liveRes.count ?? 0,
        last_pipeline_run:
          lastRunRes.data?.[0]?.created_at || null,
      });
    }

    // ── LIST ──────────────────────────────────────────────────
    if (action === "list") {
      const statusFilter = body.status || "pending_review";
      const validStatuses = ["pending_review", "published", "rejected"];
      const statuses = Array.isArray(statusFilter)
        ? statusFilter.filter((s: string) => validStatuses.includes(s))
        : validStatuses.includes(statusFilter)
          ? [statusFilter]
          : ["pending_review"];

      const { data, error } = await supabase
        .from("intelligence_insights")
        .select("*")
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(body.limit || 50);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({
        insights: data || [],
        count: data?.length || 0,
      });
    }

    // ── PUBLISH ───────────────────────────────────────────────
    if (action === "publish") {
      const insightId = body.insight_id;
      if (!insightId) {
        return jsonResponse({ error: "insight_id required" }, 400);
      }

      const now = new Date().toISOString();
      const updatePayload: Record<string, unknown> = {
        status: "published",
        published_at: now,
        reviewed_by: "arthur",
        reviewed_at: now,
      };

      if (body.is_demo_eligible !== undefined) {
        updatePayload.is_demo_eligible = body.is_demo_eligible;
      }
      if (body.demo_priority !== undefined) {
        updatePayload.demo_priority = body.demo_priority;
      }

      const { error } = await supabase
        .from("intelligence_insights")
        .update(updatePayload)
        .eq("id", insightId);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, insight_id: insightId });
    }

    // ── REJECT ────────────────────────────────────────────────
    if (action === "reject") {
      const insightId = body.insight_id;
      if (!insightId) {
        return jsonResponse({ error: "insight_id required" }, 400);
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("intelligence_insights")
        .update({
          status: "rejected",
          reviewed_by: "arthur",
          reviewed_at: now,
          rejected_reason: body.reason || "Rejected by admin",
        })
        .eq("id", insightId);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, insight_id: insightId });
    }

    // ── UNPUBLISH ─────────────────────────────────────────────
    if (action === "unpublish") {
      const insightId = body.insight_id;
      if (!insightId) {
        return jsonResponse({ error: "insight_id required" }, 400);
      }

      const { error } = await supabase
        .from("intelligence_insights")
        .update({
          status: "pending_review",
          published_at: null,
        })
        .eq("id", insightId);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, insight_id: insightId });
    }

    // ── EDIT ──────────────────────────────────────────────────
    if (action === "edit") {
      const insightId = body.insight_id;
      const updates = body.updates;
      if (!insightId || !updates) {
        return jsonResponse(
          { error: "insight_id and updates required" },
          400,
        );
      }

      const allowedFields = [
        "title",
        "headline",
        "summary",
        "action_items",
        "is_demo_eligible",
        "demo_priority",
      ];

      const safeUpdates: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          safeUpdates[key] = val;
        }
      }

      if (Object.keys(safeUpdates).length === 0) {
        return jsonResponse({ error: "No valid fields to update" }, 400);
      }

      const { error } = await supabase
        .from("intelligence_insights")
        .update(safeUpdates)
        .eq("id", insightId);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, insight_id: insightId });
    }

    // ── CREATE (manual insight) ───────────────────────────────
    if (action === "create") {
      const {
        title,
        summary,
        category,
        impact_level,
        affected_counties,
        action_items,
        is_demo_eligible,
        demo_priority,
        status: insertStatus,
      } = body;

      if (!title || !summary) {
        return jsonResponse(
          { error: "title and summary are required" },
          400,
        );
      }

      const severityToUrgency: Record<string, string> = {
        critical: "immediate",
        high: "urgent",
        medium: "standard",
        low: "informational",
      };

      const now = new Date().toISOString();
      const finalStatus = insertStatus === "published" ? "published" : "pending_review";

      const { data, error } = await supabase
        .from("intelligence_insights")
        .insert({
          source_id: "manual",
          source_type: "manual",
          category: category || "regulatory_change",
          impact_level: impact_level || "medium",
          urgency: severityToUrgency[impact_level || "medium"] || "standard",
          title,
          headline: title,
          summary,
          action_items: action_items || [],
          affected_pillars: ["food_safety"],
          affected_counties: affected_counties || [],
          tags: [],
          source_name: "EvidLY Admin",
          status: finalStatus,
          is_demo_eligible: is_demo_eligible ?? false,
          demo_priority: demo_priority ?? 0,
          reviewed_by: "arthur",
          reviewed_at: now,
          published_at: finalStatus === "published" ? now : null,
          raw_source_data: { manual: true, created_by: user.email },
        })
        .select("id")
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({
        success: true,
        insight_id: data?.id,
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[intelligence-approve] Error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
