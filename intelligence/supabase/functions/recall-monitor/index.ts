// ============================================================
// recall-monitor — Daily FDA/USDA recall monitoring
// Triggered by pg_cron daily 13:00 UTC (6am Pacific).
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

  const today = new Date().toISOString().split("T")[0];
  let newRecalls = 0, existingRecalls = 0;

  // Search queries for recalls
  const queries = [
    `FDA food recall announcement ${new Date().getFullYear()} commercial kitchen restaurant ingredient`,
    `USDA FSIS meat poultry recall ${new Date().getFullYear()} food service restaurant`,
  ];

  const systemPrompt = `You are a food safety recall analyst for EvidLY. Search for the most recent FDA and USDA food recalls relevant to commercial kitchens and restaurants.

Return ONLY a valid JSON array. Each recall must include:
{
  "recall_number": string (FDA/USDA recall number if available, or ""),
  "recalling_firm": string,
  "product_desc": string,
  "reason": string,
  "classification": "Class I" | "Class II" | "Class III",
  "source_agency": "FDA" | "USDA",
  "distribution": string (geographic distribution),
  "quantity": string (amount recalled),
  "initiated_date": string (ISO date),
  "affected_states": string[] (state abbreviations),
  "product_codes": string[] (UPC codes if available),
  "source_url": string
}

Return [] if no new recalls found. Only include genuine FDA/USDA recalls, not news articles about old recalls.`;

  const allFindings: any[] = [];

  for (const query of queries) {
    try {
      const { content } = await callClaudeWithSearch(query, systemPrompt);
      const cleaned = content.replace(/```json|```/g, "").trim();
      const findings = JSON.parse(cleaned);
      if (Array.isArray(findings)) {
        allFindings.push(...findings);
      }
    } catch {
      continue;
    }
  }

  // Get recall source for linking
  const { data: recallSource } = await supabase
    .from("intelligence_sources")
    .select("id")
    .eq("slug", "fda-recalls")
    .single();

  const sourceId = recallSource?.id;

  for (const recall of allFindings) {
    // Check if recall already exists via recall_number
    if (recall.recall_number) {
      const { data: existing } = await supabase
        .from("recall_alerts")
        .select("id")
        .eq("recall_number", recall.recall_number)
        .limit(1);

      if (existing && existing.length > 0) {
        existingRecalls++;
        continue;
      }
    }

    // Deduplicate by content hash
    const hash = generateHash(
      (recall.recall_number || "") + recall.recalling_firm + recall.product_desc
    );
    const { data: existingByHash } = await supabase
      .from("intelligence_events")
      .select("id")
      .eq("dedup_hash", hash)
      .limit(1);

    if (existingByHash && existingByHash.length > 0) {
      existingRecalls++;
      continue;
    }

    // Insert intelligence event
    let eventId: string | null = null;
    if (sourceId) {
      const { data: event } = await supabase
        .from("intelligence_events")
        .insert({
          source_id: sourceId,
          external_id: recall.recall_number || null,
          event_type: "recall_alert",
          title: `${recall.source_agency} Recall: ${recall.product_desc}`.substring(0, 200),
          summary: `${recall.recalling_firm} — ${recall.reason}`,
          raw_data: recall,
          url: recall.source_url || null,
          published_at: recall.initiated_date ? new Date(recall.initiated_date).toISOString() : null,
          severity: recall.classification === "Class I" ? "critical" : "high",
          status: "analyzed",
          dedup_hash: hash,
          metadata: { affected_states: recall.affected_states || [] },
        })
        .select()
        .single();

      eventId = event?.id || null;
    }

    // Insert recall alert
    const severity = recall.classification === "Class I" ? "critical"
      : recall.classification === "Class II" ? "high" : "medium";

    await supabase.from("recall_alerts").insert({
      event_id: eventId,
      recall_number: recall.recall_number || null,
      recalling_firm: recall.recalling_firm,
      product_desc: recall.product_desc,
      reason: recall.reason,
      classification: recall.classification || "Class II",
      status: "ongoing",
      distribution: recall.distribution || null,
      quantity: recall.quantity || null,
      initiated_date: recall.initiated_date || null,
      source_agency: recall.source_agency || "FDA",
      affected_states: recall.affected_states || [],
      product_codes: recall.product_codes || [],
      severity,
      metadata: { source_url: recall.source_url },
    });

    // Insert intelligence insight
    if (sourceId) {
      const { data: insight } = await supabase
        .from("intelligence_insights")
        .insert({
          event_id: eventId,
          source_id: sourceId,
          insight_type: "risk_alert",
          title: `${recall.source_agency} ${recall.classification} Recall: ${recall.product_desc}`.substring(0, 200),
          body: `${recall.recalling_firm} has issued a ${recall.classification} recall for ${recall.product_desc}. Reason: ${recall.reason}. Distribution: ${recall.distribution || "Nationwide"}.`,
          relevance_score: recall.classification === "Class I" ? 95 : 75,
          confidence: 0.95,
          impact_level: severity === "critical" ? "critical" : "high",
          affected_pillars: ["food_safety"],
          jurisdictions: [],
          recommended_actions: [
            "Check inventory immediately for recalled products",
            "Remove any affected items from storage and service",
            "Document disposal with photos and lot numbers",
            "Notify suppliers and request replacement products",
            "Brief kitchen staff on the recall details",
          ],
          status: "active",
          metadata: {
            headline: `Check inventory: ${recall.recalling_firm} ${recall.classification} recall on ${recall.product_desc}`,
            urgency: recall.classification === "Class I" ? "immediate" : "urgent",
            category: "recall_alert",
          },
        })
        .select()
        .single();

      // Trigger matching for all clients (recalls are universal)
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

    newRecalls++;
  }

  return new Response(
    JSON.stringify({ new_recalls: newRecalls, existing_recalls: existingRecalls }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
