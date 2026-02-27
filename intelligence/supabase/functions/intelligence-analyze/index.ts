// ============================================================
// intelligence-analyze — Analyze raw events into structured insights
// Called with POST { event_id: string }
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

  const { event_id } = await req.json();
  if (!event_id) {
    return new Response(
      JSON.stringify({ error: "event_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 1. Read event, track attempts in metadata
  const { data: event, error: fetchErr } = await supabase
    .from("intelligence_events")
    .select("*, intelligence_sources(slug, name, source_type)")
    .eq("id", event_id)
    .single();

  if (fetchErr || !event) {
    return new Response(
      JSON.stringify({ error: "Event not found", detail: fetchErr?.message }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check processing attempts (stored in metadata)
  const attempts = (event.metadata?.processing_attempts || 0) + 1;
  if (attempts > 3) {
    return new Response(
      JSON.stringify({ error: "Max processing attempts reached", event_id }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Increment attempts
  await supabase.from("intelligence_events").update({
    metadata: { ...event.metadata, processing_attempts: attempts },
  }).eq("id", event_id);

  // 2. Parse raw_data
  const rawContent = typeof event.raw_data === "string"
    ? JSON.parse(event.raw_data)
    : event.raw_data;

  // 3. Call Claude for structured analysis
  const systemPrompt = `You are a senior compliance intelligence analyst for EvidLY, a commercial kitchen compliance platform. Your analysis is read by restaurant owners, compliance managers, and C-suite executives. Be precise, actionable, and honest about confidence levels. Always provide specific action items operators can take today.`;

  const userPrompt = `Analyze this intelligence finding for California commercial kitchen operators. Return ONLY valid JSON with exactly these fields:
{
  "title": string (clear and actionable, under 80 chars),
  "headline": string (one sentence for push notification, under 120 chars, starts with action verb),
  "summary": string (3-4 sentences, plain English, what this means for operators right now),
  "full_analysis": string (2-3 paragraphs: what happened, regulatory context, operational impact),
  "executive_brief": string (1 paragraph, C-suite language, business risk and financial framing),
  "action_items": string[] (exactly 3-5 specific things operators should do, starting with immediate actions),
  "impact_level": "critical" | "high" | "medium" | "low" | "informational",
  "urgency": "immediate" | "urgent" | "standard" | "monitor",
  "affected_pillars": ("food_safety" | "facility_safety")[],
  "affected_counties": string[] (lowercase county names),
  "confidence_score": number between 0 and 1 (be honest, 0.5 if uncertain),
  "tags": string[] (5-10 relevant keywords),
  "expires_at": ISO date string or null (null if evergreen, date if time-sensitive),
  "estimated_cost_impact": { "low": number, "high": number, "currency": "USD", "methodology": string } | null,
  "market_signal_strength": "strong" | "moderate" | "weak" | "noise"
}

Finding to analyze:
${JSON.stringify(rawContent, null, 2)}

Source: ${event.intelligence_sources?.name || "Unknown"} (${event.intelligence_sources?.source_type || "unknown"})
Event type: ${event.event_type}
Severity: ${event.severity || "unknown"}
Jurisdiction: ${event.jurisdiction || "national"}`;

  let analysis: any;
  try {
    const { content } = await callClaude(
      [{ role: "user", content: userPrompt }],
      { maxTokens: 4000, systemPrompt }
    );

    const cleaned = content.replace(/```json|```/g, "").trim();
    analysis = JSON.parse(cleaned);
  } catch (err: any) {
    // Mark event with error but don't fail
    await supabase.from("intelligence_events").update({
      metadata: { ...event.metadata, processing_attempts: attempts, analysis_error: err.message },
    }).eq("id", event_id);

    return new Response(
      JSON.stringify({ error: "Analysis failed", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4. Map impact_level for schema (only critical/high/medium/low allowed)
  const schemaImpact = ["critical", "high", "medium", "low"].includes(analysis.impact_level)
    ? analysis.impact_level
    : "medium";

  // 5. INSERT into intelligence_insights
  // Schema columns: event_id, source_id, insight_type, title, body, relevance_score,
  //   confidence, impact_level, affected_pillars, jurisdictions, recommended_actions,
  //   expires_at, status, metadata
  const { data: insight, error: insertErr } = await supabase
    .from("intelligence_insights")
    .insert({
      event_id: event.id,
      source_id: event.source_id,
      insight_type: mapCategoryToInsightType(event.event_type),
      title: analysis.title || event.title,
      body: analysis.summary || "",
      relevance_score: Math.round((analysis.confidence_score || 0.5) * 100),
      confidence: analysis.confidence_score || 0.5,
      impact_level: schemaImpact,
      affected_pillars: analysis.affected_pillars || [],
      jurisdictions: analysis.affected_counties || [],
      recommended_actions: analysis.action_items || [],
      expires_at: analysis.expires_at || null,
      status: "active",
      metadata: {
        headline: analysis.headline,
        full_analysis: analysis.full_analysis,
        executive_brief: analysis.executive_brief,
        urgency: analysis.urgency,
        tags: analysis.tags,
        estimated_cost_impact: analysis.estimated_cost_impact,
        market_signal_strength: analysis.market_signal_strength,
        category: event.event_type,
      },
    })
    .select()
    .single();

  if (insertErr) {
    return new Response(
      JSON.stringify({ error: "Failed to insert insight", detail: insertErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 6. Mark event as analyzed
  await supabase.from("intelligence_events").update({
    status: "analyzed",
    metadata: { ...event.metadata, processing_attempts: attempts, processed_at: new Date().toISOString() },
  }).eq("id", event_id);

  // 7. POST to intelligence-match (fire and forget)
  const matchUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/intelligence-match";
  fetch(matchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    },
    body: JSON.stringify({ insight_id: insight.id }),
  }).catch(() => {});

  return new Response(
    JSON.stringify({
      insight_id: insight.id,
      impact_level: schemaImpact,
      affected_counties: analysis.affected_counties || [],
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// ── Helpers ───────────────────────────────────────────────────

function mapCategoryToInsightType(eventType: string): string {
  const mapping: Record<string, string> = {
    enforcement_action: "risk_alert",
    regulatory_change: "regulatory_change",
    outbreak_alert: "risk_alert",
    recall_alert: "risk_alert",
    inspector_pattern: "trend",
    competitor_activity: "opportunity",
    legislative_update: "regulatory_change",
    weather_risk: "risk_alert",
    vendor_alert: "risk_alert",
    industry_trend: "trend",
    enforcement_surge: "risk_alert",
    seasonal_risk: "trend",
    market_intelligence: "opportunity",
    financial_impact: "risk_alert",
    acquisition_signal: "opportunity",
  };
  return mapping[eventType] || "risk_alert";
}
