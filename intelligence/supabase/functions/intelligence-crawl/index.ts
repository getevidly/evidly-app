// ============================================================
// intelligence-crawl — Daily crawl of all active intelligence sources
// Triggered by pg_cron daily 10:00 UTC (3am Pacific). Also accepts manual POST.
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

  const startTime = Date.now();
  let sourcesChecked = 0, newEvents = 0, duplicates = 0, errors = 0;

  // 1. Get sources due for check
  // Schema: active (bool), last_crawl_at, crawl_frequency, metadata (JSONB with search_queries, priority)
  // Sources are "due" if last_crawl_at is null or older than their crawl_frequency
  const { data: allSources } = await supabase
    .from("intelligence_sources")
    .select("*")
    .eq("active", true)
    .order("error_count", { ascending: true })
    .limit(20);

  // Filter to sources that are due for a check
  const now = new Date();
  const sources = (allSources || []).filter((s: any) => {
    if (!s.last_crawl_at) return true; // never crawled
    const lastCrawl = new Date(s.last_crawl_at);
    const freqMs = frequencyToMs(s.crawl_frequency);
    return now.getTime() - lastCrawl.getTime() >= freqMs;
  });

  // 2. Process each source
  for (const source of sources) {
    const sourceStart = Date.now();
    let sourceNewEvents = 0, sourceDuplicates = 0, sourceError: string | null = null;

    try {
      const today = new Date().toISOString().split("T")[0];
      const lookbackDays = source.crawl_frequency === "daily" ? 7
        : source.crawl_frequency === "weekly" ? 30 : 90;

      // Build search queries from source metadata or generate from source name/type
      const searchQueries: string[] = source.metadata?.search_queries
        ?? buildDefaultQueries(source);

      for (const query of searchQueries) {
        const systemPrompt = `You are an intelligence analyst for EvidLY, a commercial kitchen compliance platform serving California restaurants and food service operations. Your job is to find genuinely relevant compliance intelligence.

Search for the given topic and return ONLY a valid JSON array. No other text. Each finding must include:
{
  "title": string (factual, under 100 chars),
  "summary": string (2-3 sentences, factual only, no speculation),
  "source_url": string (actual URL if found, or ""),
  "published_date": string (ISO date, estimate if not given),
  "relevance": "high" | "medium" | "low",
  "impact_level": "critical" | "high" | "medium" | "low" | "informational",
  "category": one of: enforcement_action, regulatory_change, outbreak_alert, recall_alert, inspector_pattern, competitor_activity, legislative_update, weather_risk, vendor_alert, industry_trend, enforcement_surge, seasonal_risk, market_intelligence, financial_impact, acquisition_signal,
  "affected_pillars": array of "food_safety" and/or "fire_safety",
  "affected_counties": array of county names (lowercase),
  "tags": array of relevant keywords
}

Return [] if nothing genuinely relevant found. Only include findings that would matter to commercial kitchen compliance operators. Do not include generic news or unrelated content.`;

        const userPrompt = `Search for: ${query}
Today is ${today}. Find developments from the last ${lookbackDays} days ONLY.
Prioritize: enforcement actions, restaurant closures, regulatory changes, outbreaks, recalls, inspector pattern changes.
For California health departments: look for inspection reports, closure orders, enforcement actions.
For regulatory sources: look for new requirements, code changes, effective dates.
Return valid JSON array only.`;

        const { content } = await callClaudeWithSearch(userPrompt, systemPrompt);

        // Parse findings
        let findings: any[] = [];
        try {
          const cleaned = content.replace(/```json|```/g, "").trim();
          findings = JSON.parse(cleaned);
          if (!Array.isArray(findings)) findings = [];
        } catch {
          continue;
        }

        // Insert new events (schema: intelligence_events)
        for (const finding of findings) {
          if (finding.relevance === "low") continue;

          const hash = generateHash(source.id + finding.title + (finding.published_date || today));

          // Check for duplicate via dedup_hash
          const { data: existing } = await supabase
            .from("intelligence_events")
            .select("id")
            .eq("dedup_hash", hash)
            .limit(1);

          if (existing && existing.length > 0) {
            sourceDuplicates++;
            duplicates++;
            continue;
          }

          const { error } = await supabase.from("intelligence_events").insert({
            source_id: source.id,
            external_id: null,
            event_type: finding.category || source.source_type,
            title: finding.title,
            summary: finding.summary || null,
            raw_data: finding,
            url: finding.source_url || null,
            published_at: finding.published_date
              ? new Date(finding.published_date).toISOString()
              : null,
            jurisdiction: source.jurisdiction,
            state_code: source.state_code,
            severity: mapImpactToSeverity(finding.impact_level),
            status: "new",
            dedup_hash: hash,
            metadata: {
              affected_pillars: finding.affected_pillars || [],
              affected_counties: finding.affected_counties || [],
              tags: finding.tags || [],
            },
          });

          if (error) {
            // Unique constraint on dedup_hash will catch remaining dupes
            if (error.code === "23505") { sourceDuplicates++; duplicates++; }
            else { console.error("Insert event error:", error.message); }
          } else {
            sourceNewEvents++;
            newEvents++;
          }
        }
      }

      // Update source timestamps
      await supabase.from("intelligence_sources").update({
        last_crawl_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        error_count: 0,
      }).eq("id", source.id);

    } catch (err: any) {
      sourceError = err.message;
      errors++;
      await supabase.from("intelligence_sources").update({
        last_crawl_at: new Date().toISOString(),
        error_count: (source.error_count || 0) + 1,
      }).eq("id", source.id);
    }

    // Log source health (schema: source_health_log)
    await supabase.from("source_health_log").insert({
      source_id: source.id,
      status: sourceError ? "error" : sourceNewEvents > 0 ? "healthy" : "degraded",
      response_time_ms: Date.now() - sourceStart,
      events_found: sourceNewEvents,
      error_message: sourceError,
      metadata: { duplicates: sourceDuplicates },
    });

    sourcesChecked++;
  }

  // Trigger analysis for all unprocessed events (status = 'new')
  const { data: unprocessed } = await supabase
    .from("intelligence_events")
    .select("id")
    .eq("status", "new")
    .limit(50);

  const analyzeUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/intelligence-analyze";
  const authHeader = "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  for (const event of unprocessed || []) {
    fetch(analyzeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": authHeader },
      body: JSON.stringify({ event_id: event.id }),
    }).catch(() => {});
  }

  return new Response(
    JSON.stringify({
      sources_checked: sourcesChecked,
      new_events: newEvents,
      duplicate_events: duplicates,
      errors,
      unprocessed_triggered: unprocessed?.length ?? 0,
      processing_ms: Date.now() - startTime,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// ── Helpers ───────────────────────────────────────────────────

function frequencyToMs(freq: string): number {
  switch (freq) {
    case "hourly": return 60 * 60 * 1000;
    case "daily": return 24 * 60 * 60 * 1000;
    case "weekly": return 7 * 24 * 60 * 60 * 1000;
    case "monthly": return 30 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

function buildDefaultQueries(source: any): string[] {
  const name = source.name || "";
  const type = source.source_type || "";
  const county = source.metadata?.county || "";

  switch (type) {
    case "health_dept":
      return [
        `${county || name} county health department restaurant inspection enforcement 2026`,
        `${county || name} county food facility closure violation 2026`,
      ];
    case "fda_recall":
      return ["FDA food recall 2026 commercial kitchen restaurant ingredient"];
    case "outbreak":
      return [
        "CDC foodborne illness outbreak 2026 restaurant",
        "California food safety outbreak investigation 2026",
      ];
    case "legislative":
      return ["California AB SB bill 2026 food safety restaurant compliance"];
    case "regulatory":
      return [`${name} regulatory update food safety 2026`];
    case "osha":
      return ["CalOSHA restaurant workplace safety enforcement 2026"];
    case "news":
      return [
        "California Central Valley food safety restaurant closure 2026",
        "California restaurant health inspection violation news 2026",
      ];
    case "industry_report":
      return [`${name} food service industry report 2026`];
    case "fire_code":
      return ["NFPA 96 commercial kitchen fire code update 2026"];
    case "weather":
      return ["California weather alert food safety power outage heat wave 2026"];
    default:
      return [`${name} food safety compliance 2026`];
  }
}

function mapImpactToSeverity(impact: string): string | null {
  switch (impact) {
    case "critical": return "critical";
    case "high": return "high";
    case "medium": return "medium";
    case "low": return "low";
    case "informational": return "info";
    default: return "medium";
  }
}
