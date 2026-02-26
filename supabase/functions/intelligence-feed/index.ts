import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * intelligence-feed — Public intelligence insights feed
 *
 * No authentication required. Returns intelligence insights
 * from the intelligence_insights table using service_role
 * to bypass RLS restrictions.
 *
 * Query params (GET) or body (POST):
 *   mode:  "demo" | "live" (default: "demo")
 *   limit: number (default: 50)
 *
 * Demo mode: returns all items regardless of status
 * Live mode: returns only published items
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    // Parse params from GET query string or POST body
    let mode = "demo";
    let limit = 50;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        mode = body.mode || "demo";
        limit = body.limit || 50;
      } catch {
        // ignore parse errors, use defaults
      }
    } else {
      const url = new URL(req.url);
      mode = url.searchParams.get("mode") || "demo";
      limit = parseInt(url.searchParams.get("limit") || "50", 10);
    }

    // Build query
    let query = supabase
      .from("intelligence_insights")
      .select("*")
      .neq("category", "regulatory_updates")
      .order("created_at", { ascending: false });

    if (mode === "live") {
      // Live mode: only published items
      query = query.eq("status", "published");
    } else {
      // Demo mode: published + pending_review (all real items)
      query = query.in("status", ["published", "pending_review"]);
    }

    const { data: insights, error } = await query.limit(limit);

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    // Also fetch the most recent updated_at for "last updated" display
    const { data: latestRow } = await supabase
      .from("intelligence_insights")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return jsonResponse({
      insights: insights || [],
      count: insights?.length || 0,
      last_updated: latestRow?.updated_at || null,
    });
  } catch (error) {
    console.error("[intelligence-feed] Error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
