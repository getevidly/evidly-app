import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * ai-text-assist — Context-aware text generation for form fields
 *
 * POST { fieldLabel: string, context: Record<string, any> }
 * Returns { text: string }
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

    const { fieldLabel, context } = await req.json();

    if (!fieldLabel) {
      return jsonResponse({ error: "fieldLabel is required" }, 400);
    }

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
        max_tokens: 300,
        system: `You are an AI assistant for EvidLY, a commercial kitchen compliance platform.
Generate concise, professional text for the specified form field.
Keep responses brief — 1-3 sentences max for descriptions, 2-4 sentences for action plans.
Use industry-standard food safety and facility safety terminology.
Be specific and actionable. No filler words.
Do NOT use markdown formatting — plain text only.
If context is insufficient, generate a reasonable template the user can customize.
Equipment safety (hoods, fire suppression, grease traps) = Facility Safety (NFPA 96).
Food contact surfaces (ice machines, prep surfaces) = Food Safety (FDA Food Code).`,
        messages: [
          {
            role: "user",
            content: `Generate text for the "${fieldLabel}" field.\nForm context: ${JSON.stringify(context)}\nKeep it concise and professional.`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      return jsonResponse({ error: "AI generation failed" }, 502);
    }

    const result = await anthropicRes.json();
    const text =
      result.content?.[0]?.text?.trim() || "Unable to generate text.";
    const latencyMs = Date.now() - startTime;

    // Fire-and-forget: log interaction
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("ai_interaction_logs").insert({
        interaction_type: "text_assist",
        query: `${fieldLabel}: ${JSON.stringify(context).slice(0, 500)}`,
        response: text.slice(0, 1000),
        model: "claude-sonnet-4-5-20250929",
        tokens_used: result.usage?.input_tokens + result.usage?.output_tokens,
        latency_ms: latencyMs,
      });
    } catch {
      // Silent fail — never block the response
    }

    return jsonResponse({ text });
  } catch (err: any) {
    console.error("ai-text-assist error:", err);
    return jsonResponse(
      { error: err.message || "Internal server error" },
      500,
    );
  }
});
