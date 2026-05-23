import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

/**
 * draft-receiving-notes — AI-powered receiving log notes
 *
 * Accepts form data from the Receiving tab and generates a concise
 * notes paragraph summarizing the delivery. Returns { notes: string }.
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
      return jsonResponse(
        { error: "AI service not configured. Add ANTHROPIC_API_KEY to environment." },
        501,
      );
    }

    const {
      vendor_name,
      food_category,
      received_at,
      items,
      received_by,
      target_temp_label,
    } = await req.json();

    if (!vendor_name || !items?.length) {
      return jsonResponse(
        { error: "vendor_name and at least one item are required" },
        400,
      );
    }

    const startTime = Date.now();

    const inputPayload = {
      vendor_name,
      food_category: food_category || "mixed",
      received_at: received_at || new Date().toISOString(),
      items: items.map((item: any) => ({
        description: item.description,
        temperature: item.temperature,
        target_max: item.target_max,
        in_range: item.in_range,
      })),
      received_by: received_by || "staff",
      target_temp_label: target_temp_label || "",
    };

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 200,
        system: `You write concise, professional shift notes for kitchen receiving logs. Generate ONE paragraph (2-4 sentences) summarizing the delivery just logged.

Rules:
- Mention vendor name, time received, and number of items.
- State whether items are in range (with the temp range observed) or call out specific items out of range with their temps.
- Add a brief mention of disposition: "rotated FIFO into walk-in cooler", "expedited to freezer", "refused on receipt", etc., based on the in-range/out-of-range status and food category.
- Mention who received the items.
- Use plain operational language. No marketing tone. No emoji. No bullet points.
- Do not invent details not in the input data.
- Do not include legal or compliance recommendations beyond noting the status of items.
- 60 words max.`,
        messages: [
          {
            role: "user",
            content: `Draft notes for this delivery:\n\n${JSON.stringify(inputPayload, null, 2)}`,
          },
        ],
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[draft-receiving-notes] Claude error:", errText);
      return jsonResponse({ error: "AI service error" }, 500);
    }

    const anthropicData = await anthropicRes.json();
    const notes =
      anthropicData.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("")
        .trim() || "";

    if (!notes) {
      return jsonResponse({ error: "No notes generated" }, 500);
    }

    // Fire-and-forget: log interaction
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("ai_interaction_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        interaction_type: "receiving_notes_draft",
        query: `Draft receiving notes for ${vendor_name} (${items.length} items)`,
        response: notes.slice(0, 1000),
        tokens_used:
          (anthropicData.usage?.input_tokens || 0) +
          (anthropicData.usage?.output_tokens || 0),
        model_used: "claude-sonnet-4-5-20250929",
        latency_ms: latencyMs,
      });
    } catch {
      // Silent fail — never block the response
    }

    return jsonResponse({ notes, latency_ms: latencyMs });
  } catch (error) {
    console.error("Error in draft-receiving-notes:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
