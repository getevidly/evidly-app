// ============================================================
// get-jurisdictions — Public API for California jurisdiction data
// ============================================================
// GET /get-jurisdictions         → all 62 rows (summary fields)
// GET /get-jurisdictions?slug=X  → single row with full JSONB
// No auth required. CORS: getevidly.com, localhost.
// Cache-Control: public, max-age=3600
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://getevidly.com",
  "https://www.getevidly.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Allow any localhost port for dev
  if (origin.startsWith("http://localhost:")) return origin;
  return ALLOWED_ORIGINS[0];
}

function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": getCorsOrigin(req),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Cache-Control": "public, max-age=3600",
  };
}

function jsonResponse(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

// Summary fields returned for the list endpoint
const SUMMARY_FIELDS = [
  "id",
  "slug",
  "state",
  "county",
  "city",
  "agency_name",
  "agency_type",
  "jurisdiction_type",
  "scoring_type",
  "grading_type",
  "pass_threshold",
  "fire_ahj_name",
  "fire_ahj_type",
  "hood_cleaning_default",
  "facility_count",
  "population_rank",
  "is_active",
  "confidence_score",
  "last_verified",
  "updated_at",
].join(",");

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "GET") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (slug) {
      // ── Single jurisdiction by slug ──
      const { data, error } = await supabase
        .from("jurisdictions")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        return jsonResponse(req, {
          error: "Jurisdiction not found",
          slug,
          hint: "Use GET /get-jurisdictions to see all available slugs",
        }, 404);
      }

      return jsonResponse(req, {
        jurisdiction: data,
        _meta: {
          endpoint: `/get-jurisdictions?slug=${slug}`,
          cached_until: new Date(Date.now() + 3600_000).toISOString(),
        },
      });
    }

    // ── All jurisdictions (summary) ──
    const { data, error } = await supabase
      .from("jurisdictions")
      .select(SUMMARY_FIELDS)
      .eq("is_active", true)
      .order("county")
      .order("city", { nullsFirst: true });

    if (error) {
      console.error("Error fetching jurisdictions:", error);
      return jsonResponse(req, { error: "Failed to fetch jurisdictions" }, 500);
    }

    return jsonResponse(req, {
      jurisdictions: data,
      count: data?.length || 0,
      _meta: {
        endpoint: "/get-jurisdictions",
        cached_until: new Date(Date.now() + 3600_000).toISOString(),
        detail_endpoint: "/get-jurisdictions?slug={slug}",
      },
    });
  } catch (error) {
    console.error("Unexpected error in get-jurisdictions:", error);
    return jsonResponse(req, { error: "Internal server error" }, 500);
  }
});
