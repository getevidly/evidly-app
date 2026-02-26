// ============================================================
// weather-correlate — Monitor weather risks affecting food safety
// Called on-demand or by intelligence-crawl when weather source triggers.
// TODO: Full NWS API integration in INTEL-03
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClaudeWithSearch, generateHash, corsHeaders } from "../_shared/claude.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const year = new Date().getFullYear();
  let newEvents = 0;

  const systemPrompt = `You are a weather risk analyst for EvidLY, assessing weather threats to commercial kitchen food safety in California. Focus on events that affect power supply (food temperature), water supply, air quality, and building safety.

Return ONLY a valid JSON array of active weather risks:
[{
  "weather_type": "heat_wave" | "power_outage" | "flood" | "wildfire" | "storm" | "freeze" | "air_quality",
  "severity": "extreme" | "severe" | "moderate" | "minor",
  "affected_area": string (geographic description),
  "affected_states": ["CA"],
  "affected_counties": string[] (lowercase county names),
  "start_time": string (ISO datetime),
  "end_time": string (ISO datetime or ""),
  "food_safety_impact": string (2-3 sentences on kitchen impact),
  "recommended_actions": string[] (3-5 specific actions),
  "nws_alert_id": string (NWS alert ID if available),
  "source_url": string
}]

Return [] if no significant weather risks for California food service operations.`;

  const query = `California weather alert ${year} power outage heat wave wildfire food safety risk`;

  try {
    const { content } = await callClaudeWithSearch(query, systemPrompt);
    const cleaned = content.replace(/```json|```/g, "").trim();
    const findings = JSON.parse(cleaned);

    // Get weather source
    const { data: weatherSource } = await supabase
      .from("intelligence_sources")
      .select("id")
      .eq("slug", "weather-risk-monitor")
      .single();

    const sourceId = weatherSource?.id;

    for (const finding of Array.isArray(findings) ? findings : []) {
      const hash = generateHash(
        finding.weather_type + finding.affected_area + (finding.start_time || "")
      );

      // Check for duplicate
      const { data: existing } = await supabase
        .from("intelligence_events")
        .select("id")
        .eq("dedup_hash", hash)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Insert event
      let eventId: string | null = null;
      if (sourceId) {
        const { data: event } = await supabase
          .from("intelligence_events")
          .insert({
            source_id: sourceId,
            event_type: "weather_risk",
            title: `${finding.weather_type.replace(/_/g, " ")} — ${finding.affected_area}`.substring(0, 200),
            summary: finding.food_safety_impact,
            raw_data: finding,
            url: finding.source_url || null,
            severity: finding.severity === "extreme" ? "critical" : finding.severity === "severe" ? "high" : "medium",
            status: "analyzed",
            dedup_hash: hash,
            state_code: "CA",
          })
          .select()
          .single();

        eventId = event?.id || null;
      }

      // Insert weather risk event
      await supabase.from("weather_risk_events").insert({
        event_id: eventId,
        weather_type: finding.weather_type,
        severity: finding.severity,
        affected_area: finding.affected_area,
        affected_states: finding.affected_states || ["CA"],
        affected_counties: finding.affected_counties || [],
        start_time: finding.start_time || new Date().toISOString(),
        end_time: finding.end_time || null,
        food_safety_impact: finding.food_safety_impact,
        recommended_actions: finding.recommended_actions || [],
        nws_alert_id: finding.nws_alert_id || null,
        source_url: finding.source_url || null,
        status: "active",
      });

      newEvents++;
    }

    return new Response(
      JSON.stringify({ new_weather_events: newEvents }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Weather monitoring failed", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
