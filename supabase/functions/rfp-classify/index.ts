import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, x-cron-secret",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Classification prompt ─────────────────────────────────

const SYSTEM_PROMPT = `You are an RFP analyst for EvidLY, a nationwide commercial kitchen compliance intelligence platform. EvidLY covers:

- Food safety compliance (state-specific health codes, FDA Food Code)
- Facility safety (NFPA 96, hood cleaning, suppression systems)
- SB 1383 edible food recovery recordkeeping (California, with expansion to similar state laws)
- USDA K-12 school nutrition production records
- Vendor management
- Jurisdiction intelligence
- Compliance scoring
- Insurance risk assessment
- AI-powered compliance advisory
- Temperature monitoring and HACCP

EvidLY targets commercial kitchens in restaurants, hotels, hospitals, schools, government facilities, military installations, correctional institutions, and national parks. The company is veteran-owned (SDVOSB eligible) and holds IKECA certification for commercial kitchen exhaust cleaning.

Analyze this RFP and return JSON only (no markdown, no code fences):
{
  "relevance_score": <0-100>,
  "relevance_tier": "<high|medium|low|irrelevant>",
  "matched_modules": [],
  "matched_keywords": [],
  "set_aside_advantage": "<string or null>",
  "competition_notes": "<string>",
  "recommended_action": "<pursue|monitor|skip>",
  "reasoning": "<string>"
}

Score thresholds: 75+ = high, 50-74 = medium, 25-49 = low, <25 = irrelevant.
If the RFP mentions veteran/SDVOSB/service-disabled set-aside, note that EvidLY qualifies.`;

// ── Sonnet pricing (per token) ────────────────────────────
const INPUT_COST_PER_TOKEN = 3.0 / 1_000_000;   // $3/MTok
const OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;  // $15/MTok
const MONTHLY_BUDGET_DEFAULT = 100.0; // $100/month
const MAX_PER_RUN = 10;
const DELAY_MS = 1000; // 1s between classifications

/**
 * rfp-classify — AI classification for RFP Intelligence Monitor
 *
 * Auth: x-cron-secret header OR authenticated admin user.
 * Fetches unclassified rfp_listings, sends to Claude Sonnet for relevance scoring.
 * Inserts results into rfp_classifications.
 *
 * Budget-aware: checks monthly spend before each classification.
 * Rate limited: 1s delay between API calls, max 10 per invocation.
 *
 * High-relevance RFPs (75+) generate notifications.
 * Veteran set-aside RFPs get +10 score boost and critical-priority notification.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Auth ────────────────────────────────────────────────
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");

  const isCron = expectedSecret && cronSecret === expectedSecret;
  let isAdmin = false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!isCron && authHeader) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (user?.email?.endsWith("@getevidly.com")) {
      isAdmin = true;
    }
  }

  if (!isCron && !isAdmin) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // ── Check budget ────────────────────────────────────────
  const budgetCap = parseFloat(Deno.env.get("RFP_MONTHLY_BUDGET") ?? String(MONTHLY_BUDGET_DEFAULT));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: costRows } = await supabase
    .from("rfp_classifications")
    .select("classification_cost")
    .gte("classified_at", monthStart.toISOString());

  const monthlySpend = (costRows ?? []).reduce(
    (sum: number, r: { classification_cost: number }) => sum + (r.classification_cost ?? 0),
    0,
  );

  if (monthlySpend >= budgetCap) {
    return jsonResponse({
      classified: 0,
      high_relevance: 0,
      tokens_used: 0,
      cost: 0,
      budget_remaining: 0,
      message: "Monthly budget cap reached — classifications paused",
    });
  }

  // ── Fetch unclassified listings ─────────────────────────
  const { data: listings, error: listErr } = await supabase
    .from("rfp_listings")
    .select("id, title, description, issuing_entity, entity_type, state, naics_code, set_aside_type, estimated_value")
    .eq("status", "open")
    .not("id", "in", `(SELECT rfp_id FROM rfp_classifications)`)
    .order("created_at", { ascending: false })
    .limit(MAX_PER_RUN);

  if (listErr) {
    // Fallback: use a LEFT JOIN approach if subquery fails
    console.warn("[rfp-classify] Subquery failed, using alternative:", listErr.message);
  }

  // Alternative query if subquery not supported
  let toClassify = listings ?? [];
  if (toClassify.length === 0 && !listErr) {
    // All listings already classified
    return jsonResponse({
      classified: 0,
      high_relevance: 0,
      tokens_used: 0,
      cost: 0,
      budget_remaining: Math.round((budgetCap - monthlySpend) * 100) / 100,
      message: "No unclassified listings found",
    });
  }

  if (toClassify.length === 0 && listErr) {
    // Fallback: get recent listings and filter client-side
    const { data: allRecent } = await supabase
      .from("rfp_listings")
      .select("id, title, description, issuing_entity, entity_type, state, naics_code, set_aside_type, estimated_value")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: existingClassifications } = await supabase
      .from("rfp_classifications")
      .select("rfp_id");

    const classifiedIds = new Set((existingClassifications ?? []).map((r: { rfp_id: string }) => r.rfp_id));
    toClassify = (allRecent ?? []).filter((l: { id: string }) => !classifiedIds.has(l.id)).slice(0, MAX_PER_RUN);
  }

  if (toClassify.length === 0) {
    return jsonResponse({
      classified: 0,
      high_relevance: 0,
      tokens_used: 0,
      cost: 0,
      budget_remaining: Math.round((budgetCap - monthlySpend) * 100) / 100,
      message: "No unclassified listings found",
    });
  }

  // ── Classify each listing ───────────────────────────────
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  let totalClassified = 0;
  let highRelevance = 0;
  let totalTokens = 0;
  let totalCost = 0;

  for (const listing of toClassify) {
    // Budget check before each call
    if (monthlySpend + totalCost >= budgetCap) {
      console.log("[rfp-classify] Budget cap reached mid-run, stopping");
      break;
    }

    try {
      const result = await classifyRfp(anthropicKey, listing);
      if (!result) continue;

      // Apply veteran boost
      let score = result.relevance_score;
      const setAside = (listing as Record<string, unknown>).set_aside_type as string | null;
      if (setAside === "veteran" || setAside === "sdvosb") {
        score = Math.min(100, score + 10);
      }

      // Determine tier based on (possibly boosted) score
      const tier = score >= 75 ? "high" : score >= 50 ? "medium" : score >= 25 ? "low" : "irrelevant";

      // Only store if score >= 25
      if (score < 25) continue;

      const cost = result.input_tokens * INPUT_COST_PER_TOKEN + result.output_tokens * OUTPUT_COST_PER_TOKEN;

      const { error: clsErr } = await supabase
        .from("rfp_classifications")
        .insert({
          rfp_id: listing.id,
          relevance_score: score,
          relevance_tier: tier,
          matched_modules: result.matched_modules ?? [],
          matched_keywords: result.matched_keywords ?? [],
          competition_notes: result.competition_notes ?? null,
          recommended_action: result.recommended_action ?? "skip",
          ai_reasoning: result.reasoning ?? "",
          classification_model_version: "claude-sonnet-4-5-20250929",
          tokens_used: (result.input_tokens ?? 0) + (result.output_tokens ?? 0),
          classification_cost: Math.round(cost * 1000000) / 1000000,
        });

      if (clsErr) {
        console.error(`[rfp-classify] Insert error for ${listing.id}:`, clsErr);
        continue;
      }

      // Update listing status
      await supabase.from("rfp_listings").update({ status: "classified" }).eq("id", listing.id);

      totalClassified++;
      totalTokens += (result.input_tokens ?? 0) + (result.output_tokens ?? 0);
      totalCost += cost;

      // High-relevance notification
      if (tier === "high") {
        highRelevance++;
        const isVeteranSetAside = setAside === "veteran" || setAside === "sdvosb";

        await supabase.from("notifications").insert({
          organization_id: "00000000-0000-0000-0000-000000000000", // system notification
          type: "rfp_opportunity",
          title: `${isVeteranSetAside ? "🎖️ " : ""}High-Relevance RFP: ${(listing as Record<string, unknown>).title}`,
          body: `${(listing as Record<string, unknown>).issuing_entity} — Score: ${score}/100. ${result.reasoning?.slice(0, 200) ?? ""}`,
          action_url: `/admin/rfp-intelligence?rfp=${listing.id}`,
          priority: isVeteranSetAside ? "critical" : "high",
        });
      }

      // Rate limit: 1s between classifications
      if (toClassify.indexOf(listing) < toClassify.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    } catch (err) {
      console.error(`[rfp-classify] Classification error for ${listing.id}:`, (err as Error).message);
    }
  }

  return jsonResponse({
    classified: totalClassified,
    high_relevance: highRelevance,
    tokens_used: totalTokens,
    cost: Math.round(totalCost * 100) / 100,
    budget_remaining: Math.round((budgetCap - monthlySpend - totalCost) * 100) / 100,
  });
});

// ── Claude API call ───────────────────────────────────────

interface ClassificationResult {
  relevance_score: number;
  relevance_tier: string;
  matched_modules: string[];
  matched_keywords: string[];
  set_aside_advantage: string | null;
  competition_notes: string;
  recommended_action: string;
  reasoning: string;
  input_tokens: number;
  output_tokens: number;
}

async function classifyRfp(
  apiKey: string,
  listing: Record<string, unknown>,
): Promise<ClassificationResult | null> {
  const userMessage = [
    `Title: ${listing.title}`,
    listing.description ? `Description: ${(listing.description as string).slice(0, 3000)}` : "",
    `Issuing Entity: ${listing.issuing_entity}`,
    `Entity Type: ${listing.entity_type}`,
    listing.state ? `State: ${listing.state}` : "",
    listing.naics_code ? `NAICS Code: ${listing.naics_code}` : "",
    listing.set_aside_type ? `Set-Aside: ${listing.set_aside_type}` : "",
    listing.estimated_value ? `Estimated Value: $${listing.estimated_value}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data.content?.[0]?.text ?? "";
  const usage = data.usage ?? {};

  // Parse JSON from response (handle potential markdown fences)
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      relevance_score: Math.max(0, Math.min(100, parsed.relevance_score ?? 0)),
      relevance_tier: parsed.relevance_tier ?? "irrelevant",
      matched_modules: Array.isArray(parsed.matched_modules) ? parsed.matched_modules : [],
      matched_keywords: Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords : [],
      set_aside_advantage: parsed.set_aside_advantage ?? null,
      competition_notes: parsed.competition_notes ?? "",
      recommended_action: parsed.recommended_action ?? "skip",
      reasoning: parsed.reasoning ?? "",
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
    };
  } catch (parseErr) {
    console.error("[rfp-classify] Failed to parse Claude response:", cleaned.slice(0, 200));
    return null;
  }
}
