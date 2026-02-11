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
    const { template_id, filters } = body;

    if (!template_id) {
      return jsonResponse({ error: "template_id is required" }, 400);
    }

    const hierarchyNodeId = filters?.hierarchy_node_id;
    const dateRange = filters?.date_range; // { start: string, end: string }

    // Fetch the report template
    const { data: template, error: templateErr } = await supabase
      .from("enterprise_report_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateErr || !template) {
      return jsonResponse({ error: "Report template not found" }, 404);
    }

    // Build query for rollup scores
    let scoresQuery = supabase
      .from("enterprise_rollup_scores")
      .select("*")
      .eq("tenant_id", template.tenant_id);

    if (hierarchyNodeId) {
      scoresQuery = scoresQuery.eq("node_id", hierarchyNodeId);
    }

    if (dateRange?.start) {
      scoresQuery = scoresQuery.gte("period_date", dateRange.start);
    }
    if (dateRange?.end) {
      scoresQuery = scoresQuery.lte("period_date", dateRange.end);
    }

    const { data: scores, error: scoresErr } = await scoresQuery.order("period_date", { ascending: false });

    if (scoresErr) {
      console.error("[ReportGen] Failed to fetch scores:", scoresErr);
      return jsonResponse({ error: "Failed to fetch rollup scores" }, 500);
    }

    // Build report sections from template config
    const sections = (template.sections || []).map((section: Record<string, unknown>) => ({
      name: section.name,
      type: section.type,
      description: section.description || null,
    }));

    const report = {
      template_name: template.name,
      generated_at: new Date().toISOString(),
      sections,
      data: {
        scores: scores || [],
        total_records: scores?.length || 0,
        filters_applied: { hierarchy_node_id: hierarchyNodeId, date_range: dateRange },
      },
    };

    // Audit log
    await supabase.from("enterprise_audit_log").insert({
      tenant_id: template.tenant_id,
      action: "report_generated",
      actor_email: "system",
      details: { template_id, template_name: template.name, filters },
    });

    return jsonResponse({ success: true, report });
  } catch (err) {
    console.error("[ReportGen] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
