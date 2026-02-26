// ============================================================
// executive-correlate — Cross-source correlation engine
// Called with POST { client_id, snapshot_type?, period_start?, period_end? }
// Also triggered weekly by intelligence-digest.
// Core differentiator: correlates everything into one executive picture.
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
  const { client_id, snapshot_type, period_start, period_end } = body;

  if (!client_id) {
    return new Response(
      JSON.stringify({ error: "client_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 1. Read client
  const { data: client, error: clientErr } = await supabase
    .from("intelligence_clients")
    .select("*")
    .eq("id", client_id)
    .single();

  if (clientErr || !client) {
    return new Response(
      JSON.stringify({ error: "Client not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const clientCounties: string[] = client.jurisdictions || [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 2-8. Query all data sources in parallel
  const [
    insightsResult,
    inspectorResult,
    legislativeResult,
    competitorResult,
    weatherResult,
    recallResult,
    outbreakResult,
  ] = await Promise.all([
    // Top 50 most impactful insights from last 30 days matching client counties/pillars
    supabase
      .from("intelligence_insights")
      .select("*")
      .gte("created_at", thirtyDaysAgo)
      .order("relevance_score", { ascending: false })
      .limit(50),

    // Inspector patterns for client's jurisdictions
    supabase
      .from("inspector_patterns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),

    // Legislative items not failed/vetoed, ordered by compliance_impact
    supabase
      .from("legislative_items")
      .select("*")
      .not("status", "in", '("dead","vetoed")')
      .order("created_at", { ascending: false })
      .limit(10),

    // Competitor events in client's counties from last 30 days
    supabase
      .from("competitor_events")
      .select("*")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20),

    // Active weather risks overlapping client counties
    supabase
      .from("weather_risk_events")
      .select("*")
      .in("status", ["active", "monitoring"])
      .order("created_at", { ascending: false })
      .limit(10),

    // Active recall alerts
    supabase
      .from("recall_alerts")
      .select("*")
      .eq("status", "ongoing")
      .order("created_at", { ascending: false })
      .limit(15),

    // Active/monitoring outbreak alerts
    supabase
      .from("outbreak_alerts")
      .select("*")
      .in("status", ["active", "monitoring"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const insights = insightsResult.data || [];
  const inspectorPatterns = inspectorResult.data || [];
  const legislative = legislativeResult.data || [];
  const competitors = competitorResult.data || [];
  const weatherRisks = weatherResult.data || [];
  const recalls = recallResult.data || [];
  const outbreaks = outbreakResult.data || [];

  // Filter insights to those relevant to client counties (or national scope)
  const relevantInsights = insights.filter((i: any) => {
    const counties: string[] = i.jurisdictions || [];
    if (counties.length === 0) return true; // national scope
    return clientCounties.length === 0 || counties.some((c: string) => clientCounties.includes(c));
  });

  // Filter competitors to client counties
  const relevantCompetitors = competitors.filter((c: any) => {
    if (clientCounties.length === 0) return true;
    return clientCounties.some((j: string) =>
      c.jurisdiction?.toLowerCase().includes(j.toLowerCase())
    );
  });

  // Filter weather to client counties
  const relevantWeather = weatherRisks.filter((w: any) => {
    const wCounties: string[] = w.affected_counties || [];
    if (wCounties.length === 0 || clientCounties.length === 0) return true;
    return wCounties.some((c: string) => clientCounties.includes(c));
  });

  // Filter inspectors to client jurisdictions
  const relevantInspectors = inspectorPatterns.filter((p: any) => {
    if (clientCounties.length === 0) return true;
    return clientCounties.some((j: string) =>
      p.jurisdiction?.toLowerCase().includes(j.toLowerCase())
    );
  });

  // 9. Build context and call Claude
  const systemPrompt = `You are the Chief Intelligence Officer at EvidLY preparing a board-quality executive intelligence brief. Synthesize external market intelligence with internal compliance performance. Write for C-suite executives and board members. Be specific with numbers. Identify correlations. Provide strategic recommendations with estimated financial impact. This document may be used in board meetings and investor presentations.`;

  const contextStr = `
Client: ${client.name} (Tier: ${client.plan_tier})
Jurisdictions: ${clientCounties.join(", ") || "National"}

--- TOP INSIGHTS (last 30 days, ${relevantInsights.length} total) ---
${relevantInsights.slice(0, 20).map((i: any) => `- [${i.impact_level}] ${i.title}: ${i.body}`).join("\n")}

--- COMPETITOR EVENTS (${relevantCompetitors.length} events) ---
${relevantCompetitors.slice(0, 10).map((c: any) => `- ${c.business_name}: ${c.event_type} — ${c.description}`).join("\n") || "None"}

--- LEGISLATIVE PIPELINE (${legislative.length} bills) ---
${legislative.map((l: any) => `- ${l.bill_number}: ${l.title} [${l.status}] Impact: ${l.compliance_impact || "unknown"}`).join("\n") || "None"}

--- INSPECTOR PATTERNS (${relevantInspectors.length} patterns) ---
${relevantInspectors.slice(0, 10).map((p: any) => `- ${p.jurisdiction}: ${p.pattern_type} — ${p.description} (Focus: ${(p.focus_areas || []).join(", ")})`).join("\n") || "None"}

--- WEATHER RISKS (${relevantWeather.length} active) ---
${relevantWeather.map((w: any) => `- ${w.weather_type} [${w.severity}]: ${w.affected_area} — ${w.food_safety_impact}`).join("\n") || "None"}

--- ACTIVE RECALLS (${recalls.length}) ---
${recalls.slice(0, 10).map((r: any) => `- ${r.recalling_firm}: ${r.product_desc} [${r.classification}] — ${r.reason}`).join("\n") || "None"}

--- ACTIVE OUTBREAKS (${outbreaks.length}) ---
${outbreaks.map((o: any) => `- ${o.pathogen}${o.vehicle ? ` (${o.vehicle})` : ""}: ${o.case_count} cases, ${o.hospitalized} hospitalized [${o.status}]`).join("\n") || "None"}
`.trim();

  const userPrompt = `Generate a complete executive intelligence correlation report as JSON with these exact fields:
{
  "title": string,
  "one_liner": string (single sentence, overall health in plain language),
  "executive_summary": string (400-500 words, board-ready prose, covers all major themes),
  "internal_compliance_summary": {
    "trend": "improving" | "stable" | "declining",
    "keyStrengths": string[],
    "keyRisks": string[],
    "openItems": number
  },
  "external_intelligence_summary": {
    "totalInsights": number,
    "criticalCount": number,
    "highCount": number,
    "topThreats": string[] (top 3, one sentence each),
    "topOpportunities": string[] (top 3, one sentence each)
  },
  "correlation_analysis": {
    "findings": [{
      "externalEvent": string,
      "internalImpact": string,
      "correlationStrength": "strong" | "moderate" | "weak",
      "implication": string,
      "recommendedAction": string
    }]
  },
  "competitor_landscape": {
    "nearbyClosures30Days": number,
    "nearbyFailedInspections30Days": number,
    "competitivePosition": "leading" | "competitive" | "at_risk",
    "insight": string (2-3 sentences),
    "opportunities": string[]
  },
  "regulatory_forecast": {
    "upcomingChanges": [{
      "item": string,
      "probability": number,
      "deadline": string,
      "estimatedCostPerLocation": string,
      "action": string
    }]
  },
  "financial_impact_analysis": {
    "totalRiskExposure": { "low": number, "high": number },
    "estimatedComplianceSavings": number,
    "roiOfCompliance": string,
    "costOfInactionSummary": string,
    "topCostDrivers": string[]
  },
  "inspector_intelligence": {
    "countyPatterns": [{
      "county": string,
      "recentFocusAreas": string[],
      "enforcementTrend": "increasing" | "stable" | "decreasing",
      "strictnessPercentile": number,
      "recommendation": string
    }]
  },
  "weather_risks": [{
    "event": string,
    "affectedCounties": string[],
    "kitchenImpact": string,
    "recommendation": string
  }],
  "risk_heatmap": {
    "dimensions": [{
      "name": string,
      "score": number (1-10),
      "trend": "improving" | "stable" | "worsening",
      "topFactor": string
    }]
  },
  "strategic_recommendations": [{
    "priority": 1 | 2 | 3 | 4 | 5,
    "recommendation": string,
    "rationale": string,
    "estimatedImpact": string,
    "timeframe": "immediate" | "30_days" | "90_days" | "6_months"
  }],
  "key_metrics": [{
    "label": string,
    "value": string,
    "trend": "up" | "down" | "stable",
    "benchmark": string,
    "status": "good" | "warning" | "critical"
  }],
  "narrative": string (800-1000 words of flowing prose, board presentation quality)
}

Client context:
${contextStr}`;

  let analysis: any;
  try {
    const { content } = await callClaude(
      [{ role: "user", content: userPrompt }],
      { maxTokens: 8000, systemPrompt }
    );
    const cleaned = content.replace(/```json|```/g, "").trim();
    analysis = JSON.parse(cleaned);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Executive analysis failed", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 10. Count stats for schema fields
  const criticalCount = relevantInsights.filter((i: any) => i.impact_level === "critical").length;
  const highCount = relevantInsights.filter((i: any) => i.impact_level === "high").length;
  const closureCount = relevantCompetitors.filter((c: any) => c.event_type === "closure").length;

  // 11. INSERT into executive_snapshots
  // Schema: client_id, snapshot_date, period, summary, key_risks, key_opportunities,
  //   regulatory_changes, recall_summary, outbreak_summary, weather_risks, action_items, ai_confidence, metadata
  const shareToken = crypto.randomUUID();

  const { data: snapshot, error: snapErr } = await supabase
    .from("executive_snapshots")
    .insert({
      client_id: client.id,
      snapshot_date: new Date().toISOString().split("T")[0],
      period: snapshot_type === "monthly" ? "monthly" : snapshot_type === "quarterly" ? "quarterly" : "weekly",
      summary: analysis.executive_summary || analysis.one_liner || "",
      key_risks: (analysis.external_intelligence_summary?.topThreats || []).map((t: string) => ({
        title: t.substring(0, 80),
        severity: "high",
        description: t,
      })),
      key_opportunities: (analysis.external_intelligence_summary?.topOpportunities || []).map((o: string) => ({
        title: o.substring(0, 80),
        impact: "high",
        description: o,
      })),
      regulatory_changes: (analysis.regulatory_forecast?.upcomingChanges || []).map((c: any) => ({
        bill: c.item,
        status: `${Math.round((c.probability || 0) * 100)}% probability`,
        impact: c.estimatedCostPerLocation || "TBD",
      })),
      recall_summary: {
        active_count: recalls.length,
        new_this_period: recalls.filter((r: any) =>
          new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        critical_count: recalls.filter((r: any) => r.classification === "Class I").length,
      },
      outbreak_summary: {
        active_count: outbreaks.filter((o: any) => o.status === "active").length,
        nearby: outbreaks.filter((o: any) => {
          const states: string[] = o.affected_states || [];
          return states.includes("CA");
        }).length,
        pathogen_list: [...new Set(outbreaks.map((o: any) => o.pathogen))],
      },
      weather_risks: (analysis.weather_risks || []).map((w: any) => ({
        event: w.event,
        counties: w.affectedCounties,
        impact: w.kitchenImpact,
        action: w.recommendation,
      })),
      action_items: (analysis.strategic_recommendations || []).slice(0, 5).map((r: any) => ({
        priority: r.priority,
        action: r.recommendation,
        deadline: r.timeframe,
      })),
      ai_confidence: 0.75,
      metadata: {
        share_token: shareToken,
        full_analysis: analysis,
        insight_count: relevantInsights.length,
        critical_count: criticalCount,
        high_count: highCount,
        competitor_closures: closureCount,
      },
    })
    .select()
    .single();

  if (snapErr) {
    return new Response(
      JSON.stringify({ error: "Failed to save snapshot", detail: snapErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 12. POST to live app webhook
  const webhookUrl = Deno.env.get("LIVE_APP_WEBHOOK_URL");
  const webhookSecret = Deno.env.get("LIVE_APP_WEBHOOK_SECRET");

  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-evidly-intelligence-secret": webhookSecret || "",
      },
      body: JSON.stringify({
        event: "executive_snapshot_ready",
        client_live_org_id: client.app_org_id,
        snapshot_id: snapshot.id,
        share_token: shareToken,
        title: analysis.title || "Weekly Intelligence Brief",
      }),
    }).catch(() => {});
  }

  return new Response(
    JSON.stringify({
      snapshot_id: snapshot.id,
      share_token: shareToken,
      title: analysis.title || "Weekly Intelligence Brief",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
