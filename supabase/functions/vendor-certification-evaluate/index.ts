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

interface TierCriteria {
  response_time: number;
  on_time_rate: number;
  avg_rating: number;
  doc_upload_rate?: number;
  total_services?: number;
}

const TIER_THRESHOLDS: Record<string, TierCriteria> = {
  preferred: {
    response_time: 4,
    on_time_rate: 95,
    avg_rating: 4.5,
    doc_upload_rate: 95,
    total_services: 50,
  },
  certified: {
    response_time: 8,
    on_time_rate: 90,
    avg_rating: 4.0,
    doc_upload_rate: 85,
    total_services: 10,
  },
  verified: {
    response_time: 24,
    on_time_rate: 80,
    avg_rating: 3.5,
  },
};

function evaluateTier(metrics: {
  response_time_hours: number;
  on_time_rate: number;
  avg_rating: number;
  doc_upload_rate: number;
  total_services: number;
}): { tier: string; criteria_met: Record<string, boolean> } {
  const criteriaMet: Record<string, boolean> = {};

  // Check tiers from highest to lowest
  for (const tier of ["preferred", "certified", "verified"]) {
    const thresholds = TIER_THRESHOLDS[tier];
    const checks: Record<string, boolean> = {
      response_time: metrics.response_time_hours < thresholds.response_time,
      on_time_rate: metrics.on_time_rate > thresholds.on_time_rate,
      avg_rating: metrics.avg_rating > thresholds.avg_rating,
    };

    if (thresholds.doc_upload_rate !== undefined) {
      checks.doc_upload_rate = metrics.doc_upload_rate > thresholds.doc_upload_rate;
    }
    if (thresholds.total_services !== undefined) {
      checks.total_services = metrics.total_services > thresholds.total_services;
    }

    const allMet = Object.values(checks).every(Boolean);
    criteriaMet[tier] = allMet;

    if (allMet) {
      return { tier, criteria_met: checks };
    }
  }

  return { tier: "listed", criteria_met: criteriaMet };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active marketplace vendors with their metrics
    const { data: vendors, error: vendorError } = await supabase
      .from("marketplace_vendors")
      .select("id, vendor_id, company_name, tier, response_time_hours")
      .eq("is_active", true);

    if (vendorError) {
      throw new Error(`Failed to query vendors: ${vendorError.message}`);
    }

    if (!vendors || vendors.length === 0) {
      return jsonResponse({ success: true, vendors_evaluated: 0, tier_changes: [] });
    }

    // Fetch metrics for all vendors in one query
    const vendorIds = vendors.map((v) => v.id);
    const { data: allMetrics, error: metricsError } = await supabase
      .from("marketplace_vendor_metrics")
      .select("*")
      .in("marketplace_vendor_id", vendorIds);

    if (metricsError) {
      throw new Error(`Failed to query metrics: ${metricsError.message}`);
    }

    const metricsMap = new Map(
      (allMetrics || []).map((m) => [m.marketplace_vendor_id, m])
    );

    const tierChanges: { vendor_id: string; company_name: string; old_tier: string; new_tier: string }[] = [];
    const now = new Date().toISOString();
    const nextEval = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const vendor of vendors) {
      const metrics = metricsMap.get(vendor.id);

      const evalInput = {
        response_time_hours: vendor.response_time_hours || 24,
        on_time_rate: metrics?.on_time_rate || 0,
        avg_rating: metrics?.avg_rating || 0,
        doc_upload_rate: metrics?.doc_upload_rate || 0,
        total_services: metrics?.total_services || 0,
      };

      const { tier: newTier, criteria_met } = evaluateTier(evalInput);
      const oldTier = vendor.tier || "listed";

      if (newTier !== oldTier) {
        tierChanges.push({
          vendor_id: vendor.vendor_id,
          company_name: vendor.company_name,
          old_tier: oldTier,
          new_tier: newTier,
        });
      }

      // Upsert certification status (keyed on vendor_id)
      if (vendor.vendor_id) {
        await supabase
          .from("vendor_certification_status")
          .upsert(
            {
              vendor_id: vendor.vendor_id,
              tier: newTier,
              qualified_since: newTier !== oldTier ? now : undefined,
              last_evaluated: now,
              next_evaluation: nextEval,
              criteria_met,
              updated_at: now,
            },
            { onConflict: "vendor_id" }
          );
      }

      // Also update the marketplace_vendors tier column
      if (newTier !== oldTier && (newTier === "verified" || newTier === "certified" || newTier === "preferred")) {
        await supabase
          .from("marketplace_vendors")
          .update({ tier: newTier, updated_at: now })
          .eq("id", vendor.id);
      }
    }

    return jsonResponse({
      success: true,
      vendors_evaluated: vendors.length,
      tier_changes: tierChanges,
    });
  } catch (error) {
    console.error("Error in vendor-certification-evaluate:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
