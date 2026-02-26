// ============================================================
// inspector-pattern — Analyze health dept inspector behavior patterns
// Triggered on-demand or after crawl finds inspection data.
// TODO: Full implementation in INTEL-03
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClaude, corsHeaders } from "../_shared/claude.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json();
  const { jurisdiction, source_id } = body;

  if (!jurisdiction) {
    return new Response(
      JSON.stringify({ error: "jurisdiction required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get recent events for this jurisdiction that might contain inspection data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from("intelligence_events")
    .select("*")
    .eq("jurisdiction", jurisdiction)
    .gte("crawled_at", thirtyDaysAgo)
    .in("event_type", ["enforcement_action", "inspector_pattern", "enforcement_surge"])
    .order("crawled_at", { ascending: false })
    .limit(30);

  if (!events || events.length === 0) {
    return new Response(
      JSON.stringify({ message: "No inspection events found for analysis", jurisdiction }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Analyze patterns with Claude
  const systemPrompt = `You are a health inspection pattern analyst. Analyze inspection enforcement data to identify inspector behavior patterns, focus areas, seasonal trends, and enforcement intensity changes. Your analysis helps restaurant operators prepare for inspections.`;

  const userPrompt = `Analyze these ${events.length} inspection-related events for ${jurisdiction} and identify patterns. Return ONLY valid JSON array of patterns:
[{
  "pattern_type": "focus_area" | "seasonal" | "frequency" | "severity_trend" | "new_emphasis",
  "description": string (2-3 sentences),
  "focus_areas": string[] (e.g. ["temperature_control", "handwashing", "pest_control"]),
  "confidence": number (0-1),
  "recommendation": string (what operators should do)
}]

Events data:
${events.map((e: any) => `- ${e.title}: ${e.summary || JSON.stringify(e.raw_data).substring(0, 200)}`).join("\n")}`;

  try {
    const { content } = await callClaude(
      [{ role: "user", content: userPrompt }],
      { maxTokens: 2000, systemPrompt }
    );

    const cleaned = content.replace(/```json|```/g, "").trim();
    const patterns = JSON.parse(cleaned);
    let inserted = 0;

    for (const pattern of Array.isArray(patterns) ? patterns : []) {
      await supabase.from("inspector_patterns").insert({
        source_id: source_id || null,
        jurisdiction,
        pattern_type: pattern.pattern_type || "focus_area",
        description: pattern.description || "",
        focus_areas: pattern.focus_areas || [],
        confidence: pattern.confidence || 0.5,
        date_range_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        date_range_end: new Date().toISOString().split("T")[0],
        inspection_count: events.length,
        metadata: { recommendation: pattern.recommendation },
      });
      inserted++;
    }

    return new Response(
      JSON.stringify({ patterns_found: inserted, events_analyzed: events.length, jurisdiction }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Pattern analysis failed", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
