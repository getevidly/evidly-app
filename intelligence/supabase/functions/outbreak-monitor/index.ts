// ============================================================
// outbreak-monitor — Daily CDC/CDPH outbreak monitoring
// Triggered by pg_cron daily 13:30 UTC (6:30am Pacific).
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
  let newOutbreaks = 0;
  const activeOutbreakIds: string[] = [];

  // Search queries
  const queries = [
    `CDC foodborne illness outbreak ${year} restaurant`,
    `CDPH outbreak investigation California ${year}`,
    `California county outbreak investigation food safety ${year}`,
  ];

  const systemPrompt = `You are a foodborne illness outbreak analyst for EvidLY. Search for active and recent CDC and California CDPH outbreak investigations relevant to restaurants and food service.

Return ONLY a valid JSON array. Each outbreak must include:
{
  "outbreak_id": string (CDC outbreak ID if available, or generate unique slug),
  "pathogen": string (e.g. "Salmonella", "E. coli O157:H7", "Listeria monocytogenes"),
  "pathogen_category": "bacteria" | "virus" | "parasite" | "toxin" | "unknown",
  "vehicle": string (implicated food item, or "" if unknown),
  "case_count": number,
  "hospitalized": number,
  "deaths": number,
  "affected_states": string[] (state abbreviations),
  "affected_counties": string[] (county names, lowercase, California-specific if applicable),
  "status": "active" | "resolved" | "monitoring",
  "cdc_investigation": boolean,
  "source_url": string,
  "first_illness": string (ISO date or ""),
  "last_illness": string (ISO date or "")
}

Return [] if no outbreaks found. Only include genuine CDC/CDPH outbreaks, not general news.`;

  const allFindings: any[] = [];

  for (const query of queries) {
    try {
      const { content } = await callClaudeWithSearch(query, systemPrompt);
      const cleaned = content.replace(/```json|```/g, "").trim();
      const findings = JSON.parse(cleaned);
      if (Array.isArray(findings)) allFindings.push(...findings);
    } catch {
      continue;
    }
  }

  // Deduplicate by outbreak_id
  const seen = new Set<string>();
  const uniqueFindings = allFindings.filter((f) => {
    const key = f.outbreak_id || `${f.pathogen}-${f.vehicle}-${f.case_count}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Get outbreak source
  const { data: outbreakSource } = await supabase
    .from("intelligence_sources")
    .select("id")
    .eq("slug", "cdc-foodnet")
    .single();

  const sourceId = outbreakSource?.id;

  for (const outbreak of uniqueFindings) {
    // Check if outbreak already exists
    if (outbreak.outbreak_id) {
      const { data: existing } = await supabase
        .from("outbreak_alerts")
        .select("id, case_count, status")
        .eq("outbreak_id", outbreak.outbreak_id)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update case count if changed
        if (outbreak.case_count > existing[0].case_count || existing[0].status !== outbreak.status) {
          await supabase.from("outbreak_alerts").update({
            case_count: Math.max(outbreak.case_count, existing[0].case_count),
            hospitalized: outbreak.hospitalized,
            deaths: outbreak.deaths,
            status: outbreak.status,
            last_illness: outbreak.last_illness || null,
            affected_states: outbreak.affected_states || [],
          }).eq("id", existing[0].id);
        }
        activeOutbreakIds.push(existing[0].id);
        continue;
      }
    }

    // Dedup by hash
    const hash = generateHash(
      (outbreak.outbreak_id || "") + outbreak.pathogen + (outbreak.vehicle || "") + outbreak.case_count
    );

    // Insert intelligence event
    let eventId: string | null = null;
    if (sourceId) {
      const { data: event } = await supabase
        .from("intelligence_events")
        .insert({
          source_id: sourceId,
          external_id: outbreak.outbreak_id || null,
          event_type: "outbreak_alert",
          title: `${outbreak.pathogen} Outbreak${outbreak.vehicle ? `: ${outbreak.vehicle}` : ""} — ${outbreak.case_count} cases`,
          summary: `${outbreak.pathogen} outbreak with ${outbreak.case_count} cases, ${outbreak.hospitalized} hospitalized. ${outbreak.status === "active" ? "Investigation ongoing." : ""}`,
          raw_data: outbreak,
          url: outbreak.source_url || null,
          severity: outbreak.deaths > 0 ? "critical" : outbreak.hospitalized > 5 ? "high" : "medium",
          status: "analyzed",
          dedup_hash: hash,
          state_code: outbreak.affected_states?.includes("CA") ? "CA" : null,
          metadata: {
            affected_counties: outbreak.affected_counties || [],
            pathogen_category: outbreak.pathogen_category,
          },
        })
        .select()
        .single();

      eventId = event?.id || null;
    }

    // Determine severity
    const severity = outbreak.deaths > 0 ? "critical"
      : outbreak.hospitalized > 5 || outbreak.case_count > 20 ? "high"
      : "medium";

    // Insert outbreak alert
    const { data: alert } = await supabase
      .from("outbreak_alerts")
      .insert({
        event_id: eventId,
        outbreak_id: outbreak.outbreak_id || null,
        pathogen: outbreak.pathogen,
        pathogen_category: outbreak.pathogen_category || "unknown",
        vehicle: outbreak.vehicle || null,
        case_count: outbreak.case_count || 0,
        hospitalized: outbreak.hospitalized || 0,
        deaths: outbreak.deaths || 0,
        affected_states: outbreak.affected_states || [],
        status: outbreak.status || "active",
        cdc_investigation: outbreak.cdc_investigation || false,
        source_url: outbreak.source_url || null,
        first_illness: outbreak.first_illness || null,
        last_illness: outbreak.last_illness || null,
        severity,
      })
      .select()
      .single();

    if (alert) activeOutbreakIds.push(alert.id);

    // Insert intelligence insight
    if (sourceId) {
      const isActive = outbreak.status === "active";
      const affectedCounties: string[] = outbreak.affected_counties || [];

      const { data: insight } = await supabase
        .from("intelligence_insights")
        .insert({
          event_id: eventId,
          source_id: sourceId,
          insight_type: "risk_alert",
          title: `${outbreak.pathogen} Outbreak${outbreak.vehicle ? ` (${outbreak.vehicle})` : ""}: ${outbreak.case_count} cases`,
          body: `A ${outbreak.pathogen} outbreak has been reported with ${outbreak.case_count} cases and ${outbreak.hospitalized} hospitalizations${outbreak.deaths > 0 ? ` and ${outbreak.deaths} deaths` : ""}. ${outbreak.vehicle ? `The implicated food is ${outbreak.vehicle}.` : "The food source is under investigation."} ${isActive ? "The investigation is ongoing — monitor daily." : ""}`,
          relevance_score: severity === "critical" ? 98 : severity === "high" ? 85 : 70,
          confidence: 0.90,
          impact_level: severity === "critical" ? "critical" : "high",
          affected_pillars: ["food_safety"],
          jurisdictions: affectedCounties,
          recommended_actions: [
            outbreak.vehicle ? `Remove ${outbreak.vehicle} from menu until further notice` : "Monitor CDC updates for implicated food item",
            "Review supplier sources for any connection to outbreak region",
            "Reinforce handwashing and cross-contamination prevention protocols",
            "Brief kitchen staff on outbreak details and symptoms to watch for",
            "Document all food sourcing for the next 30 days for traceability",
          ],
          status: "active",
          metadata: {
            headline: `${isActive ? "Active" : "Monitoring"}: ${outbreak.pathogen} outbreak — ${outbreak.case_count} cases${outbreak.vehicle ? `, linked to ${outbreak.vehicle}` : ""}`,
            urgency: isActive ? "immediate" : "urgent",
            category: "outbreak_alert",
          },
        })
        .select()
        .single();

      // Match only to clients in affected counties (or all if national)
      if (insight) {
        const matchUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/intelligence-match";
        fetch(matchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
          },
          body: JSON.stringify({ insight_id: insight.id }),
        }).catch(() => {});
      }
    }

    newOutbreaks++;
  }

  return new Response(
    JSON.stringify({
      active_outbreaks: activeOutbreakIds.length,
      new_outbreaks: newOutbreaks,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
