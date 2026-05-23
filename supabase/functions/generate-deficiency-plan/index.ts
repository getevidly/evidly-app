import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

/**
 * generate-deficiency-plan — AI Resolution Plan for Deficiencies
 *
 * Accepts a deficiency_id, fetches the deficiency + recent same-code
 * corrective actions for context, calls Claude to generate a step-by-step
 * correction plan, inserts into deficiency_resolution_plans, and returns
 * the plan.
 *
 * Returns 501 if ANTHROPIC_API_KEY is not set.
 */
Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse({ error: "AI service not configured. Add ANTHROPIC_API_KEY to environment." }, 501);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { deficiency_id } = await req.json();

    if (!deficiency_id) {
      return jsonResponse({ error: "deficiency_id is required" }, 400);
    }

    // Fetch the deficiency
    const { data: deficiency, error: defErr } = await supabase
      .from("deficiencies")
      .select("id, code, title, description, severity, category, status, found_date, found_by, timeline_requirement, required_action, location_id, organization_id, equipment_name, location_description")
      .eq("id", deficiency_id)
      .single();

    if (defErr || !deficiency) {
      return jsonResponse({ error: "Deficiency not found" }, 404);
    }

    // Fetch recent corrective actions with same code for context
    const { data: recentCAs } = await supabase
      .from("corrective_actions")
      .select("title, root_cause, resolution_note, status, created_at")
      .eq("organization_id", deficiency.organization_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch recent deficiencies with same code
    const { data: sameCodeDefs } = await supabase
      .from("deficiencies")
      .select("id, title, status, found_date, resolved_at")
      .eq("code", deficiency.code)
      .eq("organization_id", deficiency.organization_id)
      .neq("id", deficiency_id)
      .order("found_date", { ascending: false })
      .limit(5);

    // Build context
    let context = `Code citation: ${deficiency.code}\n`;
    context += `Title: ${deficiency.title}\n`;
    context += `Description: ${deficiency.description || 'None provided'}\n`;
    context += `Severity: ${deficiency.severity}\n`;
    context += `Category: ${deficiency.category}\n`;
    context += `Timeline requirement: ${deficiency.timeline_requirement}\n`;
    if (deficiency.required_action) context += `Required action: ${deficiency.required_action}\n`;
    if (deficiency.equipment_name) context += `Equipment: ${deficiency.equipment_name}\n`;
    if (deficiency.location_description) context += `Area: ${deficiency.location_description}\n`;

    if (sameCodeDefs?.length) {
      context += `\nPrevious deficiencies with same code:\n`;
      for (const d of sameCodeDefs) {
        context += `  - ${d.title} (${d.status}, found ${d.found_date}${d.resolved_at ? `, resolved ${d.resolved_at}` : ''})\n`;
      }
    }

    if (recentCAs?.length) {
      context += `\nRecent corrective actions at this organization:\n`;
      for (const ca of recentCAs) {
        context += `  - ${ca.title}: ${ca.root_cause || 'No root cause'} (${ca.status})\n`;
      }
    }

    // Call Claude
    const startTime = Date.now();

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        system: `You are a food safety, fire safety, and facility compliance expert for commercial kitchens. Given a deficiency (code violation found during inspection), generate a resolution plan that will satisfy the inspecting authority on re-inspection.

Return ONLY valid JSON with this structure:
{
  "drafted_ca_title": "Short corrective action title",
  "drafted_ca_severity": "critical|major|minor|advisory",
  "drafted_ca_category": "food_safety|fire_safety|facility_services",
  "drafted_ca_due_date": "YYYY-MM-DD or null",
  "steps": [
    {
      "id": "step-1",
      "text": "Step description",
      "meta": "Brief context or regulatory reference",
      "action_type": "log_result|add_temp_log_task|schedule_service|view_packet|generic",
      "action_label": "Button label or null"
    }
  ]
}

Rules:
- Ground every step in the cited code section from the deficiency. Do not invent regulations or invoke code sections not present in the deficiency.
- If you cannot recommend a step with confidence based on the cited code section and the org's recent corrective action history, omit it. A shorter plan with confident steps is better than a longer plan with guesses.
- Do not include steps that require legal or regulatory interpretation beyond what's stated in the cited code section.
- 3-6 steps maximum
- Each step should be a concrete, verifiable action
- action_type determines the UI action button:
  - "log_result": log a measurement or observation
  - "add_temp_log_task": create a recurring temperature check
  - "schedule_service": schedule a vendor service visit
  - "view_packet": view a compliance document
  - "generic": general task (mark done)
- drafted_ca_severity should match or escalate from the deficiency severity
- If the code citation is NFPA, category should be fire_safety
- If the code citation is CalCode or FDA, category should be food_safety
- Only cite code sections and regulatory standards you are certain about
- This is compliance guidance only — not legal advice`,
        messages: [
          {
            role: "user",
            content: `Generate a resolution plan for this deficiency:\n\n${context}`,
          },
        ],
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[generate-deficiency-plan] Claude error:", errText);
      return jsonResponse({ error: "AI service error" }, 500);
    }

    const anthropicData = await anthropicRes.json();
    const responseText =
      anthropicData.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

    // Parse the JSON plan
    let planContent;
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      planContent = JSON.parse(cleaned);
    } catch {
      console.error("[generate-deficiency-plan] Failed to parse:", responseText);
      return jsonResponse({ error: "Failed to parse AI response" }, 500);
    }

    // ── Enum validation ──────────────────────────────────────
    const VALID_SEVERITIES = ['critical', 'major', 'minor', 'advisory'];
    const VALID_CATEGORIES = ['food_safety', 'fire_safety', 'facility_services'];
    const VALID_ACTION_TYPES = ['log_result', 'add_temp_log_task', 'schedule_service', 'view_packet', 'generic'];

    let validatedSeverity = planContent.drafted_ca_severity;
    if (!VALID_SEVERITIES.includes(validatedSeverity)) {
      console.warn(`[generate-deficiency-plan] Invalid drafted_ca_severity from AI: "${validatedSeverity}". Defaulting to deficiency severity "${deficiency.severity}".`);
      validatedSeverity = deficiency.severity;
    }

    let validatedCategory = planContent.drafted_ca_category;
    if (!VALID_CATEGORIES.includes(validatedCategory)) {
      console.warn(`[generate-deficiency-plan] Invalid drafted_ca_category from AI: "${validatedCategory}". Defaulting to "food_safety".`);
      validatedCategory = 'food_safety';
    }

    // Ensure steps have IDs and valid action_types
    const steps = (planContent.steps || []).map((s: any, i: number) => {
      let actionType = s.action_type || 'generic';
      if (!VALID_ACTION_TYPES.includes(actionType)) {
        console.warn(`[generate-deficiency-plan] Invalid action_type from AI in step ${i + 1}: "${actionType}". Defaulting to "generic".`);
        actionType = 'generic';
      }
      return {
        id: s.id || `step-${i + 1}`,
        text: s.text || '',
        meta: s.meta || '',
        action_type: actionType,
        action_label: s.action_label || null,
        completed_at: null,
        completed_by: null,
      };
    });

    // Insert the plan
    const { data: plan, error: insertErr } = await supabase
      .from("deficiency_resolution_plans")
      .insert({
        deficiency_id,
        drafted_ca_title: planContent.drafted_ca_title || deficiency.title,
        drafted_ca_severity: validatedSeverity,
        drafted_ca_category: validatedCategory,
        drafted_ca_due_date: planContent.drafted_ca_due_date || null,
        steps,
        ai_model: "claude-sonnet-4-5-20250929",
        ai_prompt_version: "v1",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[generate-deficiency-plan] Insert error:", insertErr);
      // If unique constraint (plan already exists), fetch existing
      if (insertErr.code === '23505') {
        const { data: existing } = await supabase
          .from("deficiency_resolution_plans")
          .select("*")
          .eq("deficiency_id", deficiency_id)
          .single();
        return jsonResponse({ plan: existing, reused: true });
      }
      return jsonResponse({ error: "Failed to save plan" }, 500);
    }

    // Log the interaction
    await supabase.from("ai_interaction_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      location_id: deficiency.location_id,
      interaction_type: "deficiency_resolution_plan",
      query: `Generate resolution plan for deficiency ${deficiency.code}: ${deficiency.title}`,
      response: JSON.stringify(planContent).slice(0, 5000),
      tokens_used:
        (anthropicData.usage?.input_tokens || 0) +
        (anthropicData.usage?.output_tokens || 0),
      model_used: "claude-sonnet-4-5-20250929",
      latency_ms: latencyMs,
    });

    return jsonResponse({ plan, latency_ms: latencyMs });
  } catch (error) {
    console.error("Error in generate-deficiency-plan:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
