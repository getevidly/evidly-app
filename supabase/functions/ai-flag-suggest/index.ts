import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

// ── FEATURE-FLAGS-01: AI message suggestion for feature flags ──
// Generates a professional disabled-message title + body
// based on the feature name, trigger type, and criteria.

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY not set" }, 500);
  }

  const { flag_name, trigger_type, date_config, criteria } = await req.json();
  if (!flag_name) {
    return jsonResponse({ error: "flag_name required" }, 400);
  }

  const prompt = `Generate a short, professional message to show an operator when this EvidLY feature is unavailable.

Feature: ${flag_name}
Reason it is off: ${trigger_type || "disabled"}
${date_config ? `Config: ${JSON.stringify(date_config)}` : ""}
${criteria?.length ? `Criteria needed: ${JSON.stringify(criteria)}` : ""}

Rules:
- 2-3 sentences max
- Professional and reassuring, not alarming
- Tell them what they need to do or when it will be available
- Never say "compliance score" or "EvidLY score"
- PSE language is always advisory ("potential PSE gap", "consult your carrier")
- Return JSON: { "title": "...", "message": "..." }
- Return only valid JSON, no other text`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[ai-flag-suggest] Claude API error:", errText);
    return jsonResponse({ error: "AI service error" }, 500);
  }

  const result = await res.json();
  const text = result?.content?.[0]?.text ?? "";

  // Parse JSON from response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return jsonResponse({ title: parsed.title || "", message: parsed.message || "" });
    }
  } catch {
    // Fall through
  }

  return jsonResponse({ title: "", message: text });
});
