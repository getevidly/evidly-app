// ═══════════════════════════════════════════════════════════
// check-equipment-alerts
// Daily equipment service alert check
//
// Checks all active equipment for:
//   - Ansul system inspection due/overdue (NFPA 96 §12.1)
//   - Fire extinguisher annual inspection due/overdue
//   - Hood cleaning due/overdue (NFPA 96 §11.4)
//   - Missing daily temperature logs for coolers/freezers
//
// Creates alerts in the `alerts` table
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const in30Days = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const in14Days = new Date(
      now.getTime() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    const elevenMonthsAgo = new Date(
      now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const twelveMonthsAgo = new Date(
      now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get all active equipment
    const { data: allEquipment, error: eqError } = await supabase
      .from("equipment")
      .select("*")
      .eq("is_active", true);

    if (eqError) {
      return jsonResponse(
        { error: "Failed to query equipment", details: eqError },
        500
      );
    }

    if (!allEquipment || allEquipment.length === 0) {
      return jsonResponse({
        message: "No active equipment found",
        alerts_created: 0,
      });
    }

    const alertsToCreate: Array<{
      facility_id: string;
      organization_id: string;
      equipment_id: string;
      alert_type: string;
      category: string;
      title: string;
      message: string;
      authority_reference: string | null;
    }> = [];

    for (const eq of allEquipment) {
      const facilityId = eq.location_id;
      const orgId = eq.organization_id;
      const eqId = eq.id;
      const eqName = eq.name;

      // ── Ansul / Suppression system checks ──
      if (eq.equipment_type === "ansul_system" || eq.equipment_type === "suppression") {
        if (eq.suppression_next_inspection) {
          const nextInsp = new Date(eq.suppression_next_inspection);
          if (nextInsp < now) {
            alertsToCreate.push({
              facility_id: facilityId,
              organization_id: orgId,
              equipment_id: eqId,
              alert_type: "critical",
              category: "equipment_service",
              title: `Ansul system inspection OVERDUE — ${eqName}`,
              message: `The fire suppression system "${eqName}" inspection is overdue. NFPA 96 §12.1 requires semi-annual inspection by a certified technician. Schedule immediately.`,
              authority_reference: "NFPA 96 §12.1",
            });
          } else if (nextInsp.toISOString() < in30Days) {
            alertsToCreate.push({
              facility_id: facilityId,
              organization_id: orgId,
              equipment_id: eqId,
              alert_type: "warning",
              category: "equipment_service",
              title: `Ansul system inspection due within 30 days — ${eqName}`,
              message: `The fire suppression system "${eqName}" inspection is due by ${nextInsp.toLocaleDateString()}. Contact your certified technician to schedule.`,
              authority_reference: "NFPA 96 §12.1",
            });
          }
        }
      }

      // ── Fire extinguisher checks ──
      if (eq.equipment_type === "fire_extinguisher") {
        if (eq.extinguisher_last_annual) {
          const lastAnnual = new Date(eq.extinguisher_last_annual);
          if (lastAnnual.toISOString() < twelveMonthsAgo) {
            alertsToCreate.push({
              facility_id: facilityId,
              organization_id: orgId,
              equipment_id: eqId,
              alert_type: "critical",
              category: "equipment_service",
              title: `Fire extinguisher annual inspection OVERDUE — ${eqName}`,
              message: `The fire extinguisher "${eqName}" annual inspection is overdue (last: ${lastAnnual.toLocaleDateString()}). NFPA 10 requires annual inspection by a certified technician.`,
              authority_reference: "NFPA 10 §7.3",
            });
          } else if (lastAnnual.toISOString() < elevenMonthsAgo) {
            alertsToCreate.push({
              facility_id: facilityId,
              organization_id: orgId,
              equipment_id: eqId,
              alert_type: "warning",
              category: "equipment_service",
              title: `Fire extinguisher annual inspection due within 30 days — ${eqName}`,
              message: `The fire extinguisher "${eqName}" annual inspection is due within 30 days (last: ${lastAnnual.toLocaleDateString()}).`,
              authority_reference: "NFPA 10 §7.3",
            });
          }
        }
      }

      // ── Hood system checks ──
      if (eq.equipment_type === "hood_system") {
        if (eq.hood_next_cleaning) {
          const nextClean = new Date(eq.hood_next_cleaning);
          if (nextClean < now) {
            alertsToCreate.push({
              facility_id: facilityId,
              organization_id: orgId,
              equipment_id: eqId,
              alert_type: "critical",
              category: "equipment_service",
              title: `Hood cleaning OVERDUE — ${eqName}`,
              message: `The hood system "${eqName}" cleaning is overdue (was due ${nextClean.toLocaleDateString()}). NFPA 96 §11.4 requires cleaning based on cooking type/volume. Schedule IKECA-certified cleaning immediately.`,
              authority_reference: "NFPA 96 §11.4",
            });
          } else if (nextClean.toISOString() < in14Days) {
            alertsToCreate.push({
              facility_id: facilityId,
              organization_id: orgId,
              equipment_id: eqId,
              alert_type: "warning",
              category: "equipment_service",
              title: `Hood cleaning due within 2 weeks — ${eqName}`,
              message: `The hood system "${eqName}" cleaning is due by ${nextClean.toLocaleDateString()}. Contact your cleaning vendor to schedule.`,
              authority_reference: "NFPA 96 §11.4",
            });
          }
        }
      }

      // ── Temperature equipment — check if logged today ──
      const tempTypes = [
        "walk_in_cooler",
        "walk_in_freezer",
        "reach_in_cooler",
        "reach_in_freezer",
      ];
      if (tempTypes.includes(eq.equipment_type)) {
        // Check if any checklist response with a temperature reading was logged today
        // for this facility (we check by facility, not per equipment, since checklist items
        // are not directly linked to equipment records)
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        const { data: todayResponses } = await supabase
          .from("checklist_responses")
          .select(
            `
            id,
            temperature_reading,
            checklist_template_completions!inner (
              location_id
            )
          `
          )
          .not("temperature_reading", "is", null)
          .gte("responded_at", startOfDay)
          .lte("responded_at", endOfDay)
          .eq(
            "checklist_template_completions.location_id",
            facilityId
          )
          .limit(1);

        if (!todayResponses || todayResponses.length === 0) {
          // Check if we already created this alert today
          const { data: existingAlert } = await supabase
            .from("alerts")
            .select("id")
            .eq("equipment_id", eqId)
            .eq("category", "temperature")
            .gte("created_at", startOfDay)
            .limit(1);

          if (!existingAlert || existingAlert.length === 0) {
            alertsToCreate.push({
              facility_id: facilityId,
              organization_id: orgId,
              equipment_id: eqId,
              alert_type: "warning",
              category: "temperature",
              title: `No temperature reading logged for ${eqName} today`,
              message: `No temperature reading has been logged for "${eqName}" today. Daily temperature monitoring is required per CalCode §113996.`,
              authority_reference: "CalCode §113996",
            });
          }
        }
      }
    }

    // Batch insert all alerts
    let alertsCreated = 0;
    if (alertsToCreate.length > 0) {
      // Deduplicate: don't create alert if same title+equipment already exists unresolved
      const uniqueAlerts: typeof alertsToCreate = [];
      for (const alert of alertsToCreate) {
        const { data: existing } = await supabase
          .from("alerts")
          .select("id")
          .eq("equipment_id", alert.equipment_id)
          .eq("title", alert.title)
          .eq("is_resolved", false)
          .limit(1);

        if (!existing || existing.length === 0) {
          uniqueAlerts.push(alert);
        }
      }

      if (uniqueAlerts.length > 0) {
        const { error: insertError } = await supabase
          .from("alerts")
          .insert(uniqueAlerts);

        if (insertError) {
          return jsonResponse(
            { error: "Failed to insert alerts", details: insertError },
            500
          );
        }
        alertsCreated = uniqueAlerts.length;
      }
    }

    return jsonResponse({
      success: true,
      equipment_checked: allEquipment.length,
      alerts_generated: alertsToCreate.length,
      alerts_created: alertsCreated,
      alerts_deduplicated: alertsToCreate.length - alertsCreated,
      checked_at: now.toISOString(),
    });
  } catch (err) {
    return jsonResponse(
      { error: "Internal server error", details: String(err) },
      500
    );
  }
});
