import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// AUDIT-FIX-08 / A-3: Claude Haiku 4.5 pricing (per million tokens)
const INPUT_COST_PER_M = 1.00;
const OUTPUT_COST_PER_M = 5.00;
const MODEL_NAME = "claude-haiku-4-5-20251001";

/**
 * classify-signals — AI risk classification for intelligence signals
 *
 * Proxies Anthropic API calls server-side so the API key is never
 * exposed in the browser. Accepts an array of signals, classifies
 * each via Claude Haiku, returns risk dimension levels.
 *
 * AUDIT-FIX-08 / A-3: Logs token usage + cost to intelligence_classification_log.
 * Checks daily budget threshold and logs alert if exceeded.
 *
 * Auth: Supabase auth token required, must be @getevidly.com admin.
 * [P0-API-KEY-01] — Replaces direct browser fetch to api.anthropic.com.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Auth: verify admin user ──────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing auth token" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Invalid auth token" }, 401);
  }
  if (!user.email?.endsWith("@getevidly.com")) {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  // AUDIT-FIX-08 / A-3: Service role client for logging
  const supabaseAdmin = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Parse request body ───────────────────────────────────
  let body: { signals: Array<{ id: string; title: string; content_summary: string | null; category: string }> };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.signals) || body.signals.length === 0) {
    return jsonResponse({ error: "signals array required" }, 400);
  }

  // Cap at 10 signals per request
  const signals = body.signals.slice(0, 10);

  // ── Anthropic API key ────────────────────────────────────
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  // ── Classify each signal ─────────────────────────────────
  const results: Array<{
    id: string;
    revenue_risk_level: string;
    liability_risk_level: string;
    cost_risk_level: string;
    operational_risk_level: string;
    error?: string;
  }> = [];

  for (const sig of signals) {
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          max_tokens: 256,
          messages: [{
            role: "user",
            content: `You are a compliance risk analyst for California commercial kitchens.

Analyze this signal and return ONLY a JSON object — no explanation, no markdown.

Signal title: ${sig.title}
Signal summary: ${sig.content_summary || ""}
Category: ${sig.category}

Return exactly:
{
  "revenue_risk_level": "critical|high|medium|low|none",
  "liability_risk_level": "critical|high|medium|low|none",
  "cost_risk_level": "critical|high|medium|low|none",
  "operational_risk_level": "critical|high|medium|low|none"
}

Guidelines:
- revenue: risk of closure, lost sales, or revenue interruption
- liability: legal exposure, injury, negligence, allergen, or contamination risk
- cost: direct cost to remediate, replace product, or achieve compliance
- operational: disruption to kitchen operations, staff, or supplier chain
- Use 'critical' only for immediate action required (active recall, closure risk)
- Use 'none' only if the dimension is genuinely not affected`,
          }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        const errMsg = `Anthropic API ${resp.status}: ${errText.slice(0, 200)}`;

        // AUDIT-FIX-08: Log failed classification
        await supabaseAdmin.from("intelligence_classification_log").insert({
          signal_id: sig.id,
          signal_title: sig.title,
          model: MODEL_NAME,
          success: false,
          error_message: errMsg,
          classified_by: user.id,
        }).catch(() => {});

        results.push({
          id: sig.id,
          revenue_risk_level: "none",
          liability_risk_level: "none",
          cost_risk_level: "none",
          operational_risk_level: "none",
          error: errMsg,
        });
        continue;
      }

      const data = await resp.json();
      const text = data.content?.[0]?.text ?? "";
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleaned);
      const valid = ["critical", "high", "medium", "low", "none"];

      const result = {
        id: sig.id,
        revenue_risk_level: valid.includes(parsed.revenue_risk_level) ? parsed.revenue_risk_level : "none",
        liability_risk_level: valid.includes(parsed.liability_risk_level) ? parsed.liability_risk_level : "none",
        cost_risk_level: valid.includes(parsed.cost_risk_level) ? parsed.cost_risk_level : "none",
        operational_risk_level: valid.includes(parsed.operational_risk_level) ? parsed.operational_risk_level : "none",
      };
      results.push(result);

      // AUDIT-FIX-08 / A-3: Log token usage + cost
      const inputTokens = data.usage?.input_tokens || 0;
      const outputTokens = data.usage?.output_tokens || 0;
      const totalTokens = inputTokens + outputTokens;
      const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
      const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
      const totalCost = inputCost + outputCost;

      await supabaseAdmin.from("intelligence_classification_log").insert({
        signal_id: sig.id,
        signal_title: sig.title,
        signal_type: sig.category,
        model: data.model || MODEL_NAME,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        input_cost_usd: inputCost,
        output_cost_usd: outputCost,
        total_cost_usd: totalCost,
        classified_by: user.id,
        classification_result: result,
        success: true,
      }).catch(() => {});

    } catch (err) {
      // AUDIT-FIX-08: Log error classification
      await supabaseAdmin.from("intelligence_classification_log").insert({
        signal_id: sig.id,
        signal_title: sig.title,
        model: MODEL_NAME,
        success: false,
        error_message: (err as Error).message,
        classified_by: user.id,
      }).catch(() => {});

      results.push({
        id: sig.id,
        revenue_risk_level: "none",
        liability_risk_level: "none",
        cost_risk_level: "none",
        operational_risk_level: "none",
        error: (err as Error).message,
      });
    }
  }

  // AUDIT-FIX-08 / A-3: Check daily budget threshold
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: dailyTotal } = await supabaseAdmin
      .from("intelligence_classification_log")
      .select("total_cost_usd")
      .gte("created_at", today)
      .eq("success", true);

    const dailySpend = (dailyTotal || []).reduce(
      (sum: number, r: { total_cost_usd: number }) => sum + (r.total_cost_usd || 0),
      0,
    );

    const { data: budgetConfig } = await supabaseAdmin
      .from("ai_budget_config")
      .select("*")
      .single();

    if (
      budgetConfig &&
      dailySpend >= budgetConfig.daily_budget_usd * (budgetConfig.alert_threshold_pct / 100)
    ) {
      await supabaseAdmin.from("platform_audit_log").insert({
        action: "security.ai_budget_threshold_reached",
        resource_type: "ai_budget",
        success: true,
        metadata: {
          daily_spend: dailySpend,
          daily_budget: budgetConfig.daily_budget_usd,
          threshold_pct: budgetConfig.alert_threshold_pct,
        },
      }).catch(() => {});
    }
  } catch {
    // Budget check is best-effort — never block classification
  }

  return jsonResponse({ results });
});
