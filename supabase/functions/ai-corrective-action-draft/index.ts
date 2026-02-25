import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * ai-corrective-action-draft — Triggered on violation creation
 *
 * When a violation or failed item is logged, pulls all context
 * around the event, calls Claude API to generate a corrective
 * action draft, saves to ai_corrective_actions as draft,
 * and creates an ai_insights notification.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse({ error: "AI service not configured" }, 503);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { violation_id, location_id, violation_type, violation_title, violation_description, severity } =
      await req.json();

    if (!location_id || !violation_title) {
      return jsonResponse(
        { error: "location_id and violation_title required" },
        400,
      );
    }

    // Get location info
    const { data: location } = await supabase
      .from("locations")
      .select("id, name, organization_id")
      .eq("id", location_id)
      .single();

    if (!location) {
      return jsonResponse({ error: "Location not found" }, 404);
    }

    // Gather context: recent similar violations, temp logs, checklists
    const [recentViolations, recentTemps, recentChecklists] =
      await Promise.all([
        supabase
          .from("violations")
          .select("title, description, corrective_action, created_at")
          .eq("location_id", location_id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("temperature_logs")
          .select("unit_name, temperature, status, recorded_at")
          .eq("location_id", location_id)
          .order("recorded_at", { ascending: false })
          .limit(10),
        supabase
          .from("checklists")
          .select("name, status, completed_at")
          .eq("location_id", location_id)
          .order("completed_at", { ascending: false })
          .limit(5),
      ]);

    // Build context for Claude
    let context = `Location: ${location.name}\n`;
    context += `Violation: ${violation_title}\n`;
    if (violation_description)
      context += `Details: ${violation_description}\n`;
    if (violation_type) context += `Type: ${violation_type}\n`;
    if (severity) context += `Severity: ${severity}\n`;

    if (recentViolations.data?.length) {
      context += `\nRecent violations at this location:\n`;
      for (const v of recentViolations.data) {
        context += `  - ${v.title}: ${v.corrective_action || "No corrective action recorded"}\n`;
      }
    }

    if (recentTemps.data?.length) {
      context += `\nRecent temp readings:\n`;
      for (const t of recentTemps.data) {
        context += `  - ${t.unit_name}: ${t.temperature}°F (${t.status})\n`;
      }
    }

    // Call Claude to generate corrective action draft
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
        max_tokens: 1500,
        system: `You are a food safety and fire safety compliance expert for commercial kitchens. Equipment items (hood cleaning, fire suppression systems, grease traps, fire extinguishers, exhaust systems) are FIRE SAFETY issues under NFPA 96 (2025 Edition) — never categorize them as food/health safety. Ice machines are FOOD SAFETY issues (food contact surfaces per FDA §4-602.11) — never categorize ice machine cleaning as fire safety. Generate a corrective action plan for a commercial kitchen violation. Return a JSON object with these fields:
{
  "root_cause": "Brief root cause analysis",
  "immediate_action": "What should be done right now",
  "preventive_measures": "Steps to prevent recurrence",
  "responsible_person": "Suggested role (e.g., 'Location Manager', 'Kitchen Lead')",
  "follow_up_date": "Suggested follow-up timeline (e.g., '48 hours', '1 week')",
  "training_needed": "Any staff training recommended",
  "documentation": "What should be documented"
}
Return ONLY valid JSON. If you are unsure about a specific regulation or code section, say so clearly in the relevant field rather than guessing. Only cite code sections and regulatory standards you are certain about. This is compliance guidance only — not legal advice.`,
        messages: [
          {
            role: "user",
            content: `Generate a corrective action plan for this violation:\n\n${context}`,
          },
        ],
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[ai-corrective-action-draft] Claude error:", errText);
      return jsonResponse({ error: "AI service error" }, 500);
    }

    const anthropicData = await anthropicRes.json();
    const responseText =
      anthropicData.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

    // Parse the JSON draft
    let draftContent;
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      draftContent = JSON.parse(cleaned);
    } catch {
      console.error(
        "[ai-corrective-action-draft] Failed to parse:",
        responseText,
      );
      draftContent = {
        root_cause: "AI analysis unavailable — manual review required",
        immediate_action: violation_description || violation_title,
        preventive_measures: "Review and update standard operating procedures",
        responsible_person: "Location Manager",
        follow_up_date: "48 hours",
      };
    }

    // Save the corrective action draft
    const { data: caRecord, error: caError } = await supabase
      .from("ai_corrective_actions")
      .insert({
        location_id,
        violation_id: violation_id || null,
        draft_content: draftContent,
        status: "draft",
      })
      .select()
      .single();

    if (caError) {
      console.error("[ai-corrective-action-draft] Insert error:", caError);
    }

    // Phase 3 (V8 fix): write notification to intelligence_insights
    await supabase.from("intelligence_insights").insert({
      organization_id: location.organization_id,
      source_type: "ai_corrective",
      category: "corrective_action_draft",
      impact_level: severity === "critical" ? "high" : severity === "major" ? "medium" : "low",
      urgency: severity === "critical" ? "immediate" : "standard",
      title: `AI Corrective Action Draft: ${violation_title}`,
      headline: `Corrective Action: ${violation_title}`.slice(0, 120),
      summary: `An AI-generated corrective action plan is ready for review. Root cause: ${draftContent.root_cause}`,
      status: "published",
      source_name: "evidly_internal",
      confidence_score: 0.85,
      raw_source_data: {
        corrective_action_id: caRecord?.id,
        violation_id,
        location_id,
        immediate_action: draftContent.immediate_action,
      },
    });

    // Log the interaction
    await supabase.from("ai_interaction_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // system
      location_id,
      interaction_type: "corrective_draft",
      query: `Generate corrective action for: ${violation_title}`,
      response: JSON.stringify(draftContent).slice(0, 5000),
      tokens_used:
        (anthropicData.usage?.input_tokens || 0) +
        (anthropicData.usage?.output_tokens || 0),
      model_used: "claude-sonnet-4-5-20250929",
      latency_ms: latencyMs,
    });

    return jsonResponse({
      success: true,
      corrective_action_id: caRecord?.id,
      draft: draftContent,
      usage: anthropicData.usage,
      latency_ms: latencyMs,
    });
  } catch (error) {
    console.error("Error in ai-corrective-action-draft:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
