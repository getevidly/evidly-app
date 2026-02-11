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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate yesterday's date range (UTC)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const yesterdayStart = `${yesterdayStr}T00:00:00.000Z`;
    const yesterdayEnd = `${yesterdayStr}T23:59:59.999Z`;

    // Fetch all active marketplace vendors
    const { data: vendors, error: vendorError } = await supabase
      .from("marketplace_vendors")
      .select("id, vendor_id, company_name")
      .eq("is_active", true);

    if (vendorError) {
      throw new Error(`Failed to query vendors: ${vendorError.message}`);
    }

    if (!vendors || vendors.length === 0) {
      return jsonResponse({ success: true, vendors_processed: 0 });
    }

    // Fetch profile_views from marketplace_vendor_metrics for all vendors
    const vendorIds = vendors.map((v) => v.id);
    const { data: metricsData } = await supabase
      .from("marketplace_vendor_metrics")
      .select("marketplace_vendor_id, profile_views")
      .in("marketplace_vendor_id", vendorIds);

    const metricsMap = new Map(
      (metricsData || []).map((m) => [m.marketplace_vendor_id, m])
    );

    // Fetch quote requests created yesterday (from marketplace_service_requests)
    const { data: quoteRequests } = await supabase
      .from("marketplace_service_requests")
      .select("marketplace_vendor_id")
      .gte("created_at", yesterdayStart)
      .lte("created_at", yesterdayEnd);

    // Count quote requests per marketplace_vendor_id
    const quoteCountMap = new Map<string, number>();
    for (const qr of quoteRequests || []) {
      const count = quoteCountMap.get(qr.marketplace_vendor_id) || 0;
      quoteCountMap.set(qr.marketplace_vendor_id, count + 1);
    }

    // Fetch services completed yesterday (from service_completions)
    const { data: completions } = await supabase
      .from("service_completions")
      .select("vendor_id")
      .eq("status", "completed")
      .gte("completed_at", yesterdayStart)
      .lte("completed_at", yesterdayEnd);

    // Count completions per vendor_id (this references vendors.id, not marketplace_vendors.id)
    const completionCountMap = new Map<string, number>();
    for (const c of completions || []) {
      const count = completionCountMap.get(c.vendor_id) || 0;
      completionCountMap.set(c.vendor_id, count + 1);
    }

    // Upsert analytics row for each vendor
    let processedCount = 0;

    for (const vendor of vendors) {
      if (!vendor.vendor_id) continue;

      const metrics = metricsMap.get(vendor.id);
      const profileViews = metrics?.profile_views || 0;
      const quoteRequests = quoteCountMap.get(vendor.id) || 0;
      const servicesCompleted = completionCountMap.get(vendor.vendor_id) || 0;

      const { error: upsertError } = await supabase
        .from("vendor_analytics")
        .upsert(
          {
            vendor_id: vendor.vendor_id,
            date: yesterdayStr,
            profile_views: profileViews,
            quote_requests: quoteRequests,
            services_completed: servicesCompleted,
          },
          { onConflict: "vendor_id,date" }
        );

      if (!upsertError) processedCount++;
    }

    return jsonResponse({
      success: true,
      date: yesterdayStr,
      vendors_processed: processedCount,
    });
  } catch (error) {
    console.error("Error in vendor-analytics-snapshot:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
