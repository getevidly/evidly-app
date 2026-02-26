// ============================================================
// competitor-watch — Monitor competitor compliance events from public records
// Called on-demand or by intelligence-crawl for news/health_dept sources.
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

  const body = await req.json().catch(() => ({}));
  const counties: string[] = body.counties || [
    "fresno", "merced", "stanislaus", "mariposa", "tulare", "kings", "kern", "sacramento",
  ];

  const year = new Date().getFullYear();
  let newEvents = 0;

  const systemPrompt = `You are a competitive intelligence analyst for EvidLY, tracking competitor compliance events in California from public records. Focus on restaurant closures, health inspection failures, and enforcement actions that represent opportunities or warnings for our clients.

Return ONLY a valid JSON array:
[{
  "business_name": string,
  "business_type": "restaurant" | "food_truck" | "catering" | "bakery" | "grocery" | "other",
  "event_type": "violation" | "closure" | "downgrade" | "upgrade" | "award" | "recall" | "complaint",
  "jurisdiction": string (county name, lowercase),
  "description": string (2-3 sentences, factual),
  "severity": "critical" | "high" | "medium" | "low",
  "event_date": string (ISO date),
  "source_url": string
}]

Return [] if no relevant competitor events found. Only include genuine public record events.`;

  for (const county of counties) {
    const query = `${county} county California restaurant closure health inspection violation ${year}`;

    try {
      const { content } = await callClaudeWithSearch(query, systemPrompt);
      const cleaned = content.replace(/```json|```/g, "").trim();
      const findings = JSON.parse(cleaned);

      for (const finding of Array.isArray(findings) ? findings : []) {
        const hash = generateHash(
          finding.business_name + finding.event_type + (finding.event_date || "") + county
        );

        // Check duplicate
        const { data: existing } = await supabase
          .from("intelligence_events")
          .select("id")
          .eq("dedup_hash", hash)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Get news source for linking
        const { data: newsSource } = await supabase
          .from("intelligence_sources")
          .select("id")
          .eq("slug", "central-valley-news")
          .single();

        // Insert event
        let eventId: string | null = null;
        if (newsSource) {
          const { data: event } = await supabase
            .from("intelligence_events")
            .insert({
              source_id: newsSource.id,
              event_type: "competitor_activity",
              title: `${finding.business_name}: ${finding.event_type} in ${county} county`.substring(0, 200),
              summary: finding.description,
              raw_data: finding,
              url: finding.source_url || null,
              severity: finding.severity || "medium",
              status: "analyzed",
              dedup_hash: hash,
              state_code: "CA",
              jurisdiction: `${county}_county`,
            })
            .select()
            .single();

          eventId = event?.id || null;
        }

        // Insert competitor event
        await supabase.from("competitor_events").insert({
          event_id: eventId,
          business_name: finding.business_name,
          business_type: finding.business_type || null,
          event_type: finding.event_type,
          jurisdiction: `${county}_county`,
          description: finding.description,
          severity: finding.severity || "medium",
          source_url: finding.source_url || null,
          event_date: finding.event_date || null,
        });

        newEvents++;
      }
    } catch {
      continue;
    }
  }

  return new Response(
    JSON.stringify({ new_competitor_events: newEvents, counties_checked: counties.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
