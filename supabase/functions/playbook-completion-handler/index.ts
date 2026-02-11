// ============================================================
// Playbook Completion Handler — Finalizes a playbook activation
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Receives { activation_id }. Fetches the full activation
//       with step responses, photos, and food disposition.
//       Calculates total food loss, generates a compliance
//       narrative, and marks the activation as completed.
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

interface CompletionRequest {
  activation_id: string;
  completed_by?: string;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

    const payload: CompletionRequest = await req.json();

    if (!payload.activation_id) {
      return jsonResponse({ error: "Missing required field: activation_id" }, 400);
    }

    // -- Fetch the full activation with template --
    const { data: activation, error: activationError } = await supabase
      .from("playbook_activations")
      .select("*, playbook_templates(id, name, slug, severity, steps, regulatory_references)")
      .eq("id", payload.activation_id)
      .single();

    if (activationError || !activation) {
      return jsonResponse({ error: "Activation not found", details: activationError?.message }, 404);
    }

    if (activation.status === "completed") {
      return jsonResponse({ error: "Activation is already completed" }, 400);
    }

    // -- Fetch all step responses --
    const { data: stepResponses } = await supabase
      .from("playbook_step_responses")
      .select("*")
      .eq("activation_id", payload.activation_id)
      .order("step_number", { ascending: true });

    // -- Fetch photos/evidence --
    const { data: photos } = await supabase
      .from("playbook_evidence_photos")
      .select("id, step_number, photo_url, caption, taken_at")
      .eq("activation_id", payload.activation_id)
      .order("taken_at", { ascending: true });

    // -- Fetch food disposition entries --
    const { data: foodDisposition } = await supabase
      .from("playbook_food_disposition")
      .select("*")
      .eq("activation_id", payload.activation_id);

    // -- Calculate total food loss --
    let totalFoodLoss = 0;
    let totalItemsAffected = 0;
    let discardedItems = 0;
    const lossByCategory: Record<string, number> = {};

    for (const item of (foodDisposition || [])) {
      totalItemsAffected++;
      const itemLoss = (item.estimated_value_cents as number) || 0;

      if (item.disposition === "discard" || item.disposition === "destroy") {
        discardedItems++;
        totalFoodLoss += itemLoss;
        const category = (item.category as string) || "uncategorized";
        lossByCategory[category] = (lossByCategory[category] || 0) + itemLoss;
      }
    }

    // -- Generate compliance narrative --
    const template = activation.playbook_templates as Record<string, unknown>;
    const templateSteps = (template?.steps as Array<Record<string, unknown>>) || [];
    const stepsCompleted = (stepResponses || []).filter(
      (sr: Record<string, unknown>) => sr.status === "completed"
    ).length;
    const totalSteps = templateSteps.length;
    const overdueSteps = (stepResponses || []).filter(
      (sr: Record<string, unknown>) => {
        const meta = (sr.metadata as Record<string, unknown>) || {};
        return meta.overdue === true;
      }
    ).length;

    const now = new Date();
    const activatedAt = new Date(activation.activated_at as string);
    const totalDuration = now.getTime() - activatedAt.getTime();

    const locationQuery = await supabase
      .from("locations")
      .select("name, address")
      .eq("id", activation.location_id)
      .maybeSingle();
    const locationName = (locationQuery.data?.name as string) || "Unknown Location";
    const locationAddress = (locationQuery.data?.address as string) || "";

    const regulatoryRefs = (template?.regulatory_references as string[]) || [];

    const complianceNarrative = [
      `INCIDENT RESPONSE COMPLETION REPORT`,
      `Playbook: ${(template?.name as string) || "Unknown"}`,
      `Location: ${locationName}${locationAddress ? ` (${locationAddress})` : ""}`,
      `Activated: ${activatedAt.toISOString()}`,
      `Completed: ${now.toISOString()}`,
      `Total Duration: ${formatDuration(totalDuration)}`,
      ``,
      `STEP SUMMARY: ${stepsCompleted} of ${totalSteps} steps completed.${overdueSteps > 0 ? ` ${overdueSteps} step(s) exceeded time limits.` : ""}`,
      `EVIDENCE: ${(photos || []).length} photo(s) documented.`,
      `FOOD DISPOSITION: ${totalItemsAffected} item(s) assessed, ${discardedItems} discarded.`,
      `TOTAL FOOD LOSS: $${(totalFoodLoss / 100).toFixed(2)}`,
      regulatoryRefs.length > 0
        ? `REGULATORY REFERENCES: ${regulatoryRefs.join(", ")}`
        : "",
      ``,
      `This report was generated automatically upon playbook completion and constitutes a record of the incident response actions taken. All step responses, timestamps, and evidence photos are preserved for regulatory review.`,
    ].filter(Boolean).join("\n");

    // -- Update activation to completed --
    const { error: updateError } = await supabase
      .from("playbook_activations")
      .update({
        status: "completed",
        completed_at: now.toISOString(),
        completed_by: payload.completed_by || null,
        report_generated: true,
        compliance_narrative: complianceNarrative,
        total_food_loss_cents: totalFoodLoss,
        total_duration_minutes: Math.round(totalDuration / 60000),
      })
      .eq("id", payload.activation_id);

    if (updateError) {
      console.error("Error updating activation:", updateError);
      return jsonResponse({ error: "Failed to complete activation", details: updateError.message }, 500);
    }

    return jsonResponse({
      success: true,
      activation_id: payload.activation_id,
      status: "completed",
      summary: {
        template_name: template?.name,
        location: locationName,
        activated_at: activatedAt.toISOString(),
        completed_at: now.toISOString(),
        total_duration: formatDuration(totalDuration),
        steps_completed: stepsCompleted,
        total_steps: totalSteps,
        overdue_steps: overdueSteps,
        evidence_photos: (photos || []).length,
        food_items_assessed: totalItemsAffected,
        food_items_discarded: discardedItems,
        total_food_loss_cents: totalFoodLoss,
        total_food_loss_formatted: `$${(totalFoodLoss / 100).toFixed(2)}`,
        loss_by_category: lossByCategory,
        report_generated: true,
      },
      compliance_narrative: complianceNarrative,
    });
  } catch (error) {
    console.error("Error in playbook-completion-handler:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
