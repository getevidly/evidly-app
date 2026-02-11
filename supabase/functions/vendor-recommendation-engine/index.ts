import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TIER_WEIGHTS: Record<string, number> = {
  preferred: 30,
  certified: 20,
  verified: 10,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const { location_id, service_types, max_results = 5 } = await req.json();

    if (!location_id || !service_types || !Array.isArray(service_types) || service_types.length === 0) {
      return jsonResponse({ error: "Missing required fields: location_id, service_types (array)" }, 400);
    }

    // Fetch the location to get area info for service_area matching
    const { data: location } = await supabase
      .from("locations")
      .select("id, name, address, city, state")
      .eq("id", location_id)
      .single();

    const locationArea = location ? `${location.city || ""} ${location.state || ""}`.trim().toLowerCase() : "";

    // Fetch active marketplace vendors with their services and metrics
    const { data: vendors, error: vendorError } = await supabase
      .from("marketplace_vendors")
      .select("id, vendor_id, company_name, tier, service_area, response_time_hours, logo_url")
      .eq("is_active", true);

    if (vendorError) {
      throw new Error(`Failed to query vendors: ${vendorError.message}`);
    }

    if (!vendors || vendors.length === 0) {
      return jsonResponse({ success: true, recommendations: [] });
    }

    // Fetch all active services for these vendors
    const vendorIds = vendors.map((v) => v.id);
    const { data: services } = await supabase
      .from("marketplace_services")
      .select("marketplace_vendor_id, category, subcategory, name")
      .eq("is_active", true)
      .in("marketplace_vendor_id", vendorIds);

    // Fetch metrics for all vendors
    const { data: metrics } = await supabase
      .from("marketplace_vendor_metrics")
      .select("marketplace_vendor_id, avg_rating, total_services, on_time_rate")
      .in("marketplace_vendor_id", vendorIds);

    // Build lookup maps
    const servicesMap = new Map<string, typeof services>();
    for (const svc of services || []) {
      const existing = servicesMap.get(svc.marketplace_vendor_id) || [];
      existing.push(svc);
      servicesMap.set(svc.marketplace_vendor_id, existing);
    }

    const metricsMap = new Map(
      (metrics || []).map((m) => [m.marketplace_vendor_id, m])
    );

    // Score each vendor
    const scored = vendors.map((vendor) => {
      const vendorServices = servicesMap.get(vendor.id) || [];
      const vendorMetrics = metricsMap.get(vendor.id);

      // 1. Subcategory match score (40%)
      const matchingServices = vendorServices.filter((s) =>
        service_types.some(
          (st: string) =>
            s.category?.toLowerCase() === st.toLowerCase() ||
            s.subcategory?.toLowerCase() === st.toLowerCase()
        )
      );
      const subcategoryScore = vendorServices.length > 0
        ? (matchingServices.length / service_types.length) * 40
        : 0;

      // 2. Tier weight score (20%)
      const tierScore = ((TIER_WEIGHTS[vendor.tier] || 0) / 30) * 20;

      // 3. Average rating score (20%)
      const avgRating = vendorMetrics?.avg_rating || 0;
      const ratingScore = (avgRating / 5) * 20;

      // 4. Response time inverse score (10%) - lower is better, max 48hrs baseline
      const responseHours = vendor.response_time_hours || 48;
      const responseScore = Math.max(0, (1 - responseHours / 48)) * 10;

      // 5. Service area match score (10%)
      let areaScore = 0;
      if (locationArea && Array.isArray(vendor.service_area)) {
        const areaMatch = vendor.service_area.some(
          (area: string) => locationArea.includes(area.toLowerCase())
        );
        areaScore = areaMatch ? 10 : 0;
      } else {
        areaScore = 5; // neutral if no area data
      }

      const totalScore = subcategoryScore + tierScore + ratingScore + responseScore + areaScore;

      return {
        vendor_id: vendor.vendor_id,
        marketplace_vendor_id: vendor.id,
        company_name: vendor.company_name,
        logo_url: vendor.logo_url,
        tier: vendor.tier,
        avg_rating: avgRating,
        response_time_hours: vendor.response_time_hours,
        matching_services: matchingServices.map((s) => s.name),
        total_services: vendorMetrics?.total_services || 0,
        score: Math.round(totalScore * 100) / 100,
        score_breakdown: {
          subcategory_match: Math.round(subcategoryScore * 100) / 100,
          tier_weight: Math.round(tierScore * 100) / 100,
          rating: Math.round(ratingScore * 100) / 100,
          response_time: Math.round(responseScore * 100) / 100,
          area_match: Math.round(areaScore * 100) / 100,
        },
      };
    });

    // Sort by score descending and return top N
    scored.sort((a, b) => b.score - a.score);
    const recommendations = scored.slice(0, max_results);

    return jsonResponse({
      success: true,
      location_id,
      service_types,
      recommendations,
    });
  } catch (error) {
    console.error("Error in vendor-recommendation-engine:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
