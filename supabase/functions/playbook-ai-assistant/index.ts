// ============================================================
// Playbook AI Assistant — Context-aware emergency response guidance
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Receives { activation_id, step_number, question, context }.
//       Fetches activation details and current step info, constructs
//       a system prompt for emergency response guidance.
//       Returns { response, suggestions: string[] }.
//       (Claude API call commented out; returns mock response for demo)
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

interface AssistantRequest {
  activation_id: string;
  step_number: number;
  question: string;
  context?: Record<string, unknown>;
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

    const payload: AssistantRequest = await req.json();

    if (!payload.activation_id || payload.step_number === undefined || !payload.question) {
      return jsonResponse({ error: "Missing required fields: activation_id, step_number, question" }, 400);
    }

    // -- Fetch activation with template --
    const { data: activation, error: activationError } = await supabase
      .from("playbook_activations")
      .select("*, playbook_templates(id, name, slug, severity, steps, regulatory_references)")
      .eq("id", payload.activation_id)
      .single();

    if (activationError || !activation) {
      return jsonResponse({ error: "Activation not found", details: activationError?.message }, 404);
    }

    const template = activation.playbook_templates as Record<string, unknown>;
    const steps = (template?.steps as Array<Record<string, unknown>>) || [];
    const currentStep = steps[payload.step_number];

    if (!currentStep) {
      return jsonResponse({ error: `Step ${payload.step_number} not found in template` }, 404);
    }

    // -- Fetch completed step responses for context --
    const { data: stepResponses } = await supabase
      .from("playbook_step_responses")
      .select("step_number, status, notes, completed_at")
      .eq("activation_id", payload.activation_id)
      .order("step_number", { ascending: true });

    // -- Fetch location info --
    const { data: location } = await supabase
      .from("locations")
      .select("name, address, state")
      .eq("id", activation.location_id)
      .maybeSingle();

    // -- Build system prompt for emergency response AI --
    const regulatoryRefs = (template?.regulatory_references as string[]) || [];
    const completedStepsSummary = (stepResponses || [])
      .filter((sr: Record<string, unknown>) => sr.status === "completed")
      .map((sr: Record<string, unknown>) => `Step ${(sr.step_number as number) + 1}: completed${sr.notes ? ` - ${sr.notes}` : ""}`)
      .join("\n");

    const _systemPrompt = [
      `You are an emergency response assistant for food service operations.`,
      `You are helping with: ${(template?.name as string) || "incident response"}`,
      `Severity: ${(template?.severity as string) || "unknown"}`,
      `Location: ${(location?.name as string) || "Unknown"}, ${(location?.state as string) || ""}`,
      ``,
      `Current Step (${payload.step_number + 1}/${steps.length}): ${(currentStep.title as string) || "Unknown Step"}`,
      `Step Instructions: ${(currentStep.instructions as string) || "No instructions provided"}`,
      ``,
      completedStepsSummary ? `Previously Completed Steps:\n${completedStepsSummary}` : "No previous steps completed.",
      ``,
      regulatoryRefs.length > 0 ? `Applicable Regulations: ${regulatoryRefs.join(", ")}` : "",
      ``,
      `Provide concise, actionable guidance for food safety emergency response.`,
      `Always reference relevant FDA Food Code, state regulations, or HACCP guidelines when applicable.`,
      `Prioritize food safety, employee safety, and regulatory compliance.`,
      `If you are unsure about a specific regulation or code section, say so clearly rather than guessing.`,
      `This is emergency guidance only — not a substitute for professional advice. Always recommend contacting the local health department when in doubt.`,
    ].filter(Boolean).join("\n");

    // -- Claude API call would go here --
    // const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    // const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "x-api-key": anthropicApiKey,
    //     "anthropic-version": "2023-06-01",
    //   },
    //   body: JSON.stringify({
    //     model: "claude-sonnet-4-5-20250929",
    //     max_tokens: 1024,
    //     system: _systemPrompt,
    //     messages: [{ role: "user", content: payload.question }],
    //   }),
    // });
    // const aiData = await aiResponse.json();
    // const responseText = aiData.content[0].text;

    // -- Mock response for demo --
    const stepTitle = (currentStep.title as string) || "this step";
    const templateName = (template?.name as string) || "incident response";
    const mockResponses: Record<string, { response: string; suggestions: string[] }> = {
      default: {
        response: `For "${stepTitle}" during a ${templateName} incident, follow these guidelines:\n\n1. Document the current state with timestamped photos before taking any corrective action.\n2. Ensure all affected food items are isolated and clearly marked as "DO NOT USE" pending evaluation.\n3. Record temperatures of all potentially affected units using a calibrated thermometer.\n4. Notify your supervisor and follow your location's chain of command.\n\nPer FDA Food Code 3-501.16, potentially hazardous foods that have been in the temperature danger zone (41-135F) for more than 4 hours must be discarded.`,
        suggestions: [
          "What temperature thresholds require immediate food disposal?",
          "How do I document this step for regulatory compliance?",
          "Who should I notify about this incident?",
          "What are the HACCP requirements for this situation?",
        ],
      },
    };

    const mock = mockResponses.default;

    // -- Log the AI interaction --
    await supabase.from("playbook_ai_interactions").insert({
      activation_id: payload.activation_id,
      step_number: payload.step_number,
      question: payload.question,
      response: mock.response,
      context: payload.context || {},
      created_at: new Date().toISOString(),
    }).catch(() => { /* table may not exist yet */ });

    return jsonResponse({
      success: true,
      activation_id: payload.activation_id,
      step_number: payload.step_number,
      response: mock.response,
      suggestions: mock.suggestions,
      metadata: {
        template_name: template?.name,
        step_title: currentStep.title,
        is_mock: true,
      },
    });
  } catch (error) {
    console.error("Error in playbook-ai-assistant:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
