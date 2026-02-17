// ═══════════════════════════════════════════════════════════
// generate-haccp-from-checklists
// Auto-generates HACCP plan + CCPs from checklist template items
//
// Runs when:
//   - Facility first activates
//   - Manager regenerates manually
//   - Nightly documentation freshness check
//
// Input: { facility_id: string }
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Default CCP definitions
const DEFAULT_CCPS: Record<
  string,
  {
    name: string;
    hazard: string;
    critical_limit: string;
    monitoring_procedure: string;
    corrective_action: string;
    verification: string;
  }
> = {
  "CCP-01": {
    name: "Cold Storage Monitoring",
    hazard: "Biological — pathogen growth due to temperature abuse",
    critical_limit: "≤41°F for cold storage, ≤0°F for frozen",
    monitoring_procedure:
      "Check walk-in cooler, walk-in freezer, and reach-in cooler temperatures every shift using calibrated thermometer",
    corrective_action:
      "If above 41°F for <4 hours: move product to working unit. If >4 hours: discard all TCS food. Document disposition.",
    verification:
      "Manager reviews daily temperature logs weekly via EvidLY dashboard",
  },
  "CCP-02": {
    name: "Hot Holding Verification",
    hazard: "Biological — pathogen growth due to inadequate hot holding",
    critical_limit: "≥135°F for all hot held TCS food",
    monitoring_procedure:
      "Check internal temperature of all hot held items every 2 hours using calibrated thermometer",
    corrective_action:
      "If below 135°F for <2 hours: reheat to 165°F within 1 hour. If >2 hours: discard. Document disposition.",
    verification:
      "Manager reviews daily hot holding logs weekly via EvidLY dashboard",
  },
  "CCP-03": {
    name: "Cooling Process Control",
    hazard:
      "Biological — pathogen growth during cooling (danger zone 135°F-41°F)",
    critical_limit: "135°F → 70°F within 2 hours, 70°F → 41°F within 4 hours",
    monitoring_procedure:
      "Monitor items in cooling process at 2-hour and 6-hour marks. Log temperature at each check.",
    corrective_action:
      "If not at 70°F within 2 hours: reheat to 165°F and restart cooling. If not at 41°F within 6 hours total: discard.",
    verification:
      "Manager reviews cooling logs weekly. Verify ice bath or blast chiller used.",
  },
  "CCP-04": {
    name: "Receiving Temperature Verification",
    hazard:
      "Biological — TCS food received at improper temperature may harbor pathogens",
    critical_limit:
      "≤41°F for refrigerated TCS food, ≤0°F for frozen food on delivery",
    monitoring_procedure:
      "Check internal temperature of all TCS deliveries upon receipt. Verify packaging integrity.",
    corrective_action:
      "Reject any TCS food above 41°F (refrigerated) or showing signs of thawing (frozen). Document rejection and notify supplier.",
    verification:
      "Manager reviews receiving logs weekly. Verify supplier corrective action if repeated violations.",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { facility_id } = await req.json();
    if (!facility_id) {
      return jsonResponse({ error: "facility_id is required" }, 400);
    }

    // Get facility info
    const { data: facility, error: facilityError } = await supabase
      .from("locations")
      .select("id, name, organization_id")
      .eq("id", facility_id)
      .single();

    if (facilityError || !facility) {
      return jsonResponse(
        { error: "Facility not found", details: facilityError },
        404
      );
    }

    // Step 1: Query all checklist items with HACCP CCP mapping for this facility's org
    const { data: ccpItems, error: itemsError } = await supabase
      .from("checklist_template_items")
      .select(
        `
        id,
        title,
        item_text,
        haccp_ccp,
        haccp_hazard,
        haccp_critical_limit,
        requires_corrective_action,
        template_id,
        checklist_templates!inner (
          id,
          organization_id,
          facility_id,
          frequency
        )
      `
      )
      .not("haccp_ccp", "is", null)
      .or(
        `facility_id.eq.${facility_id},facility_id.is.null`,
        { referencedTable: "checklist_templates" }
      );

    if (itemsError) {
      return jsonResponse(
        { error: "Failed to query checklist items", details: itemsError },
        500
      );
    }

    if (!ccpItems || ccpItems.length === 0) {
      return jsonResponse({
        message: "No HACCP-mapped checklist items found for this facility",
        plan_id: null,
        ccps_created: 0,
      });
    }

    // Step 2: Group items by CCP number
    const ccpGroups: Record<
      string,
      { items: typeof ccpItems; frequency: string }
    > = {};
    for (const item of ccpItems) {
      const ccpNum = item.haccp_ccp!;
      if (!ccpGroups[ccpNum]) {
        ccpGroups[ccpNum] = { items: [], frequency: "daily" };
      }
      ccpGroups[ccpNum].items.push(item);
      // Use the most frequent monitoring frequency
      const template = item.checklist_templates as unknown as {
        frequency: string;
      };
      if (template?.frequency === "per_shift") {
        ccpGroups[ccpNum].frequency = "Every shift";
      } else if (
        template?.frequency === "daily" &&
        ccpGroups[ccpNum].frequency !== "Every shift"
      ) {
        ccpGroups[ccpNum].frequency = "Daily";
      }
    }

    // Step 3: Create or update HACCP plan
    const planName = `HACCP Plan — ${facility.name}`;

    const { data: existingPlan } = await supabase
      .from("haccp_plans")
      .select("id, version")
      .eq("facility_id", facility_id)
      .eq("status", "active")
      .limit(1)
      .single();

    let planId: string;

    if (existingPlan) {
      // Update existing plan
      const { data: updated, error: updateError } = await supabase
        .from("haccp_plans")
        .update({
          name: planName,
          version: (existingPlan.version || 1) + 1,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPlan.id)
        .select("id")
        .single();

      if (updateError) {
        return jsonResponse(
          { error: "Failed to update HACCP plan", details: updateError },
          500
        );
      }
      planId = updated!.id;
    } else {
      // Create new plan
      const { data: newPlan, error: createError } = await supabase
        .from("haccp_plans")
        .insert({
          organization_id: facility.organization_id,
          facility_id: facility_id,
          name: planName,
          status: "active",
          version: 1,
          generated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) {
        return jsonResponse(
          { error: "Failed to create HACCP plan", details: createError },
          500
        );
      }
      planId = newPlan!.id;
    }

    // Step 4: Create/update CCPs
    let ccpsCreated = 0;
    const ccpResults: Array<{
      ccp_number: string;
      name: string;
      items_linked: number;
    }> = [];

    for (const [ccpNumber, group] of Object.entries(ccpGroups)) {
      const defaults = DEFAULT_CCPS[ccpNumber];
      if (!defaults) continue;

      const linkedItemIds = group.items.map((i) => i.id);

      // Use hazard/critical_limit from first item if available, otherwise defaults
      const firstItem = group.items[0];
      const hazard = firstItem.haccp_hazard || defaults.hazard;
      const criticalLimit =
        firstItem.haccp_critical_limit || defaults.critical_limit;

      // Check if CCP already exists for this plan
      const { data: existingCcp } = await supabase
        .from("haccp_critical_control_points")
        .select("id")
        .eq("plan_id", planId)
        .eq("ccp_number", ccpNumber)
        .limit(1)
        .single();

      if (existingCcp) {
        await supabase
          .from("haccp_critical_control_points")
          .update({
            ccp_name: defaults.name,
            hazard,
            critical_limit: criticalLimit,
            monitoring_procedure: defaults.monitoring_procedure,
            monitoring_frequency: group.frequency,
            corrective_action: defaults.corrective_action,
            verification: defaults.verification,
            record_keeping: "Auto-logged from daily checklists in EvidLY",
            linked_item_ids: linkedItemIds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCcp.id);
      } else {
        await supabase.from("haccp_critical_control_points").insert({
          plan_id: planId,
          ccp_number: ccpNumber,
          ccp_name: defaults.name,
          hazard,
          critical_limit: criticalLimit,
          monitoring_procedure: defaults.monitoring_procedure,
          monitoring_frequency: group.frequency,
          corrective_action: defaults.corrective_action,
          verification: defaults.verification,
          source: "checklist",
          record_keeping: "Auto-logged from daily checklists in EvidLY",
          linked_item_ids: linkedItemIds,
          location_id: facility_id,
        });
      }

      ccpsCreated++;
      ccpResults.push({
        ccp_number: ccpNumber,
        name: defaults.name,
        items_linked: linkedItemIds.length,
      });
    }

    return jsonResponse({
      success: true,
      plan_id: planId,
      plan_name: planName,
      ccps_created: ccpsCreated,
      ccps: ccpResults,
      total_items_mapped: ccpItems.length,
    });
  } catch (err) {
    return jsonResponse(
      { error: "Internal server error", details: String(err) },
      500
    );
  }
});
