// ============================================================
// Playbook Food Loss Calculator — Calculates food loss and insurance comparison
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Receives { activation_id } or { items: FoodItem[] }.
//       If activation_id is provided, fetches food_disposition
//       entries from DB. Calculates total_items, discarded_items,
//       total_loss, items_by_category. Compares to insurance
//       deductible and returns a recommendation.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface FoodItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  estimated_value_cents: number;
  disposition: "discard" | "salvage" | "donate" | "destroy" | "pending";
  reason?: string;
}

interface CalculatorRequest {
  activation_id?: string;
  items?: FoodItem[];
}

Deno.serve(async (req: Request) => {
  // -- CORS preflight --
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Supported methods: POST" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: CalculatorRequest = await req.json();

    if (!payload.activation_id && !payload.items) {
      return jsonResponse({ error: "Missing required field: activation_id or items" }, 400);
    }

    let items: FoodItem[] = [];

    // -- Fetch items from DB if activation_id provided --
    if (payload.activation_id) {
      const { data: dispositionEntries, error: fetchError } = await supabase
        .from("playbook_food_disposition")
        .select("*")
        .eq("activation_id", payload.activation_id);

      if (fetchError) {
        return jsonResponse({ error: "Failed to fetch food disposition entries", details: fetchError.message }, 500);
      }

      items = (dispositionEntries || []).map((entry: Record<string, unknown>) => ({
        name: (entry.name as string) || "Unknown Item",
        category: (entry.category as string) || "uncategorized",
        quantity: (entry.quantity as number) || 1,
        unit: (entry.unit as string) || "each",
        estimated_value_cents: (entry.estimated_value_cents as number) || 0,
        disposition: (entry.disposition as FoodItem["disposition"]) || "pending",
        reason: (entry.reason as string) || undefined,
      }));
    } else if (payload.items) {
      items = payload.items;
    }

    // -- Calculate losses --
    const totalItems = items.length;
    const discardedItems = items.filter(
      (i) => i.disposition === "discard" || i.disposition === "destroy"
    ).length;
    const salvageItems = items.filter((i) => i.disposition === "salvage").length;
    const donateItems = items.filter((i) => i.disposition === "donate").length;
    const pendingItems = items.filter((i) => i.disposition === "pending").length;

    const totalLossCents = items
      .filter((i) => i.disposition === "discard" || i.disposition === "destroy")
      .reduce((sum, i) => sum + i.estimated_value_cents, 0);

    const totalValueCents = items.reduce((sum, i) => sum + i.estimated_value_cents, 0);

    // -- Group by category --
    const itemsByCategory: Record<string, { count: number; loss_cents: number; items: string[] }> = {};
    for (const item of items) {
      const cat = item.category || "uncategorized";
      if (!itemsByCategory[cat]) {
        itemsByCategory[cat] = { count: 0, loss_cents: 0, items: [] };
      }
      itemsByCategory[cat].count++;
      itemsByCategory[cat].items.push(item.name);
      if (item.disposition === "discard" || item.disposition === "destroy") {
        itemsByCategory[cat].loss_cents += item.estimated_value_cents;
      }
    }

    // -- Compare to insurance deductible --
    let deductibleCents = 0;
    let insurancePolicyId: string | null = null;

    if (payload.activation_id) {
      const { data: activation } = await supabase
        .from("playbook_activations")
        .select("organization_id")
        .eq("id", payload.activation_id)
        .maybeSingle();

      if (activation?.organization_id) {
        const { data: insuranceClaim } = await supabase
          .from("playbook_insurance_claims")
          .select("id, deductible_cents, policy_id")
          .eq("organization_id", activation.organization_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (insuranceClaim) {
          deductibleCents = (insuranceClaim.deductible_cents as number) || 50000; // default $500
          insurancePolicyId = (insuranceClaim.policy_id as string) || null;
        }
      }
    }

    // If no insurance record found, use a sensible default
    if (deductibleCents === 0) {
      deductibleCents = 50000; // $500 default deductible
    }

    const exceedsDeductible = totalLossCents > deductibleCents;
    const claimableAmount = exceedsDeductible ? totalLossCents - deductibleCents : 0;

    let recommendation: string;
    if (totalLossCents === 0) {
      recommendation = "No food loss recorded. No insurance claim needed.";
    } else if (!exceedsDeductible) {
      recommendation = `Total loss ($${(totalLossCents / 100).toFixed(2)}) is below the insurance deductible ($${(deductibleCents / 100).toFixed(2)}). Filing a claim is not recommended. Document losses for tax write-off purposes.`;
    } else {
      recommendation = `Total loss ($${(totalLossCents / 100).toFixed(2)}) exceeds the insurance deductible ($${(deductibleCents / 100).toFixed(2)}). Filing an insurance claim is recommended. Estimated claimable amount: $${(claimableAmount / 100).toFixed(2)}. Ensure all photo evidence and disposition records are complete.`;
    }

    return jsonResponse({
      success: true,
      total_items: totalItems,
      discarded_items: discardedItems,
      salvage_items: salvageItems,
      donate_items: donateItems,
      pending_items: pendingItems,
      total_value_cents: totalValueCents,
      total_value_formatted: `$${(totalValueCents / 100).toFixed(2)}`,
      total_loss_cents: totalLossCents,
      total_loss_formatted: `$${(totalLossCents / 100).toFixed(2)}`,
      deductible_cents: deductibleCents,
      deductible_formatted: `$${(deductibleCents / 100).toFixed(2)}`,
      exceeds_deductible: exceedsDeductible,
      claimable_amount_cents: claimableAmount,
      claimable_amount_formatted: `$${(claimableAmount / 100).toFixed(2)}`,
      recommendation,
      breakdown: itemsByCategory,
      insurance_policy_id: insurancePolicyId,
    });
  } catch (error) {
    console.error("Error in playbook-food-loss-calculator:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
