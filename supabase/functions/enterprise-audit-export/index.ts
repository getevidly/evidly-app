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

  if (req.method !== "GET") {
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
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const actionFilter = url.searchParams.get("action");

    if (!tenantId || !startDate || !endDate) {
      return jsonResponse({ error: "tenant_id, start_date, and end_date query params are required" }, 400);
    }

    // Build query for audit log entries
    let query = supabase
      .from("enterprise_audit_log")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    // Apply optional action filter
    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    const { data: entries, error: queryErr } = await query;

    if (queryErr) {
      console.error("[AuditExport] Failed to query audit log:", queryErr);
      return jsonResponse({ error: "Failed to query audit log" }, 500);
    }

    return jsonResponse({
      success: true,
      export: {
        tenant_id: tenantId,
        period: { start_date: startDate, end_date: endDate },
        entries: entries || [],
        total_count: entries?.length || 0,
      },
    });
  } catch (err) {
    console.error("[AuditExport] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
