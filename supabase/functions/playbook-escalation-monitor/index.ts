// ============================================================
// Playbook Escalation Monitor — Checks active playbooks for overdue steps
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Designed for cron invocation. Accepts empty body or
//       { check_interval_minutes: number }. Queries all active
//       playbook_activations, checks if current step is overdue,
//       creates escalation notifications, and flags overdue steps.
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

interface MonitorRequest {
  check_interval_minutes?: number;
  organization_id?: string;
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

    // -- Parse body (may be empty for cron) --
    let payload: MonitorRequest = {};
    try {
      payload = await req.json();
    } catch {
      // Empty body is fine for cron invocation
    }

    const now = new Date();
    let escalationsCreated = 0;
    let activationsChecked = 0;

    // -- Fetch all active playbook activations --
    let query = supabase
      .from("playbook_activations")
      .select("id, template_id, location_id, organization_id, current_step, activated_at, step_started_at, playbook_templates(id, name, steps)")
      .eq("status", "active")
      .order("activated_at", { ascending: true });

    if (payload.organization_id) {
      query = query.eq("organization_id", payload.organization_id);
    }

    const { data: activations, error: activationsError } = await query;

    if (activationsError) {
      console.error("Error fetching activations:", activationsError);
      return jsonResponse({ error: "Failed to fetch active activations", details: activationsError.message }, 500);
    }

    if (!activations || activations.length === 0) {
      return jsonResponse({
        escalations_created: 0,
        activations_checked: 0,
        message: "No active playbook activations found",
        timestamp: now.toISOString(),
      });
    }

    for (const activation of activations) {
      activationsChecked++;
      const template = activation.playbook_templates as Record<string, unknown>;
      const steps = (template?.steps as Array<Record<string, unknown>>) || [];
      const currentStepIndex = (activation.current_step as number) || 0;
      const currentStep = steps[currentStepIndex];

      if (!currentStep) continue;

      const timeLimitMinutes = (currentStep.time_limit_minutes as number) || 30;
      const stepStartedAt = activation.step_started_at
        ? new Date(activation.step_started_at as string)
        : new Date(activation.activated_at as string);
      const elapsedMinutes = (now.getTime() - stepStartedAt.getTime()) / (60 * 1000);

      // -- Check if current step is overdue --
      if (elapsedMinutes > timeLimitMinutes) {
        // Check if we already flagged this step as overdue
        const { data: existingResponse } = await supabase
          .from("playbook_step_responses")
          .select("id, metadata")
          .eq("activation_id", activation.id)
          .eq("step_number", currentStepIndex)
          .maybeSingle();

        const existingMeta = (existingResponse?.metadata as Record<string, unknown>) || {};

        if (existingMeta.overdue) continue; // Already flagged

        // -- Update or create step response with overdue flag --
        if (existingResponse) {
          await supabase
            .from("playbook_step_responses")
            .update({
              metadata: {
                ...existingMeta,
                overdue: true,
                overdue_at: now.toISOString(),
                overdue_by_minutes: Math.round(elapsedMinutes - timeLimitMinutes),
              },
            })
            .eq("id", existingResponse.id);
        } else {
          await supabase
            .from("playbook_step_responses")
            .insert({
              activation_id: activation.id,
              step_number: currentStepIndex,
              status: "overdue",
              metadata: {
                overdue: true,
                overdue_at: now.toISOString(),
                overdue_by_minutes: Math.round(elapsedMinutes - timeLimitMinutes),
                time_limit_minutes: timeLimitMinutes,
              },
            });
        }

        // -- Create escalation notification --
        const { data: locationManagers } = await supabase
          .from("location_members")
          .select("user_id")
          .eq("location_id", activation.location_id)
          .in("role", ["manager", "owner"]);

        const recipients = (locationManagers || []).map((m: Record<string, unknown>) => m.user_id);

        if (recipients.length > 0) {
          const notifications = recipients.map((userId: string) => ({
            user_id: userId,
            type: "playbook_escalation",
            title: `Overdue Step: ${(currentStep.title as string) || `Step ${currentStepIndex + 1}`}`,
            message: `Playbook "${(template?.name as string) || "Unknown"}" step ${currentStepIndex + 1} is overdue by ${Math.round(elapsedMinutes - timeLimitMinutes)} minutes. Time limit was ${timeLimitMinutes} min.`,
            metadata: {
              activation_id: activation.id,
              step_number: currentStepIndex,
              step_title: currentStep.title,
              elapsed_minutes: Math.round(elapsedMinutes),
              time_limit_minutes: timeLimitMinutes,
              severity: "warning",
            },
            read: false,
            created_at: now.toISOString(),
          }));

          await supabase.from("notifications").insert(notifications);
        }

        escalationsCreated++;
      }
    }

    return jsonResponse({
      escalations_created: escalationsCreated,
      activations_checked: activationsChecked,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in playbook-escalation-monitor:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
