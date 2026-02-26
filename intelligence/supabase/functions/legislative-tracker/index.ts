// ============================================================
// legislative-tracker — Weekly California legislation monitoring
// Triggered by pg_cron weekly Monday 15:00 UTC (8am Pacific).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClaude, callClaudeWithSearch, generateHash, corsHeaders } from "../_shared/claude.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const year = new Date().getFullYear();
  let billsTracked = 0, newBills = 0, statusChanges = 0;

  // Search queries
  const queries = [
    `California AB SB bill ${year} food safety restaurant fire code compliance`,
    `California legislature ${year} restaurant regulation food handler`,
  ];

  const searchSystemPrompt = `You are a legislative analyst tracking California food safety and restaurant compliance legislation. Search for current and pending California state bills.

Return ONLY a valid JSON array. Each bill must include:
{
  "bill_number": string (e.g. "AB-1234" or "SB-567"),
  "title": string (official short title),
  "summary": string (2-3 sentences explaining what the bill does),
  "body_name": "California State Legislature",
  "status": "introduced" | "in_committee" | "passed_committee" | "passed_chamber" | "passed_both" | "enrolled" | "signed" | "vetoed" | "chaptered" | "dead",
  "impact_areas": string[] (e.g. ["food_safety", "labeling", "allergens", "fire_safety", "worker_safety"]),
  "effective_date": string (ISO date or ""),
  "last_action": string (most recent legislative action),
  "last_action_date": string (ISO date),
  "sponsor": string (author/sponsor name),
  "source_url": string
}

Return [] if no relevant bills found. Only include genuine California state legislation, not federal bills or news articles.`;

  const allFindings: any[] = [];

  for (const query of queries) {
    try {
      const { content } = await callClaudeWithSearch(query, searchSystemPrompt);
      const cleaned = content.replace(/```json|```/g, "").trim();
      const findings = JSON.parse(cleaned);
      if (Array.isArray(findings)) allFindings.push(...findings);
    } catch {
      continue;
    }
  }

  // Deduplicate by bill_number
  const seen = new Set<string>();
  const uniqueBills = allFindings.filter((b) => {
    const key = b.bill_number?.toUpperCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Get legislative source
  const { data: legSource } = await supabase
    .from("intelligence_sources")
    .select("id")
    .eq("slug", "ca-legislative-tracker")
    .single();

  const sourceId = legSource?.id;

  for (const bill of uniqueBills) {
    // Check if bill already tracked
    const { data: existing } = await supabase
      .from("legislative_items")
      .select("id, status, last_action_date")
      .eq("bill_number", bill.bill_number)
      .limit(1);

    if (existing && existing.length > 0) {
      // Check for status change
      if (existing[0].status !== bill.status) {
        await supabase.from("legislative_items").update({
          status: bill.status,
          last_action: bill.last_action || null,
          last_action_date: bill.last_action_date || null,
          effective_date: bill.effective_date || null,
        }).eq("id", existing[0].id);
        statusChanges++;
      }
      billsTracked++;
      continue;
    }

    // Use Claude to estimate passage probability and compliance cost
    let analysis: any = {};
    try {
      const analysisPrompt = `Analyze this California bill for restaurant/food service compliance impact:

Bill: ${bill.bill_number} — ${bill.title}
Status: ${bill.status}
Summary: ${bill.summary}

Return ONLY valid JSON:
{
  "passage_probability": number (0-1, based on current status, committee, political context),
  "compliance_impact": "high" | "medium" | "low" | "none",
  "estimated_cost_per_location": string (e.g. "$500-$2,000" or "Minimal"),
  "key_requirements": string[] (specific new requirements for restaurants),
  "preparation_actions": string[] (what operators should do now)
}`;

      const { content } = await callClaude(
        [{ role: "user", content: analysisPrompt }],
        {
          maxTokens: 1000,
          systemPrompt: "You are a California legislative analyst specializing in food safety and restaurant compliance law. Be precise about costs and requirements.",
        }
      );
      const cleaned = content.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        passage_probability: 0.3,
        compliance_impact: "medium",
        estimated_cost_per_location: "Unknown",
        key_requirements: [],
        preparation_actions: [],
      };
    }

    // Insert intelligence event
    let eventId: string | null = null;
    if (sourceId) {
      const hash = generateHash(bill.bill_number + bill.status);
      const { data: event } = await supabase
        .from("intelligence_events")
        .insert({
          source_id: sourceId,
          external_id: bill.bill_number,
          event_type: "legislative_update",
          title: `${bill.bill_number}: ${bill.title}`.substring(0, 200),
          summary: bill.summary,
          raw_data: { ...bill, analysis },
          url: bill.source_url || null,
          severity: analysis.compliance_impact === "high" ? "high" : "medium",
          status: "analyzed",
          dedup_hash: hash,
          state_code: "CA",
          jurisdiction: "california_state",
        })
        .select()
        .single();

      eventId = event?.id || null;
    }

    // Insert legislative item
    await supabase.from("legislative_items").insert({
      event_id: eventId,
      bill_number: bill.bill_number,
      title: bill.title,
      summary: bill.summary,
      body_name: bill.body_name || "California State Legislature",
      jurisdiction: "california_state",
      state_code: "CA",
      status: bill.status,
      impact_areas: bill.impact_areas || [],
      effective_date: bill.effective_date || null,
      last_action: bill.last_action || null,
      last_action_date: bill.last_action_date || null,
      sponsor: bill.sponsor || null,
      compliance_impact: analysis.compliance_impact || "medium",
      source_url: bill.source_url || null,
      metadata: {
        passage_probability: analysis.passage_probability,
        estimated_cost_per_location: analysis.estimated_cost_per_location,
        key_requirements: analysis.key_requirements,
        preparation_actions: analysis.preparation_actions,
      },
    });

    // For high-probability bills, create an insight
    if ((analysis.passage_probability || 0) > 0.6 && sourceId) {
      const { data: insight } = await supabase
        .from("intelligence_insights")
        .insert({
          event_id: eventId,
          source_id: sourceId,
          insight_type: "regulatory_change",
          title: `${bill.bill_number}: ${bill.title}`.substring(0, 200),
          body: `${bill.summary} This bill has a ${Math.round(analysis.passage_probability * 100)}% probability of passage. Estimated cost per location: ${analysis.estimated_cost_per_location || "TBD"}.${bill.effective_date ? ` Effective date: ${bill.effective_date}.` : ""}`,
          relevance_score: Math.round(analysis.passage_probability * 100),
          confidence: 0.70,
          impact_level: analysis.compliance_impact === "high" ? "high" : "medium",
          affected_pillars: bill.impact_areas?.includes("fire_safety")
            ? ["food_safety", "fire_safety"]
            : ["food_safety"],
          jurisdictions: [],
          recommended_actions: analysis.preparation_actions || [
            "Review current compliance posture against proposed requirements",
            "Budget for potential compliance costs",
            "Monitor bill progress through committee hearings",
          ],
          status: "active",
          metadata: {
            headline: `Prepare for ${bill.bill_number}: ${Math.round(analysis.passage_probability * 100)}% likely to pass — ${analysis.estimated_cost_per_location || "cost TBD"} per location`,
            urgency: analysis.passage_probability > 0.8 ? "urgent" : "standard",
            category: "legislative_update",
            bill_number: bill.bill_number,
          },
        })
        .select()
        .single();

      // Match to all CA clients
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

    newBills++;
    billsTracked++;
  }

  return new Response(
    JSON.stringify({ bills_tracked: billsTracked, new_bills: newBills, status_changes: statusChanges }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
