/**
 * intelligence-backfill-enrich
 *
 * One-time backfill: enrich the ~611 existing intelligence_signals rows
 * that have content_summary populated but all AI columns NULL.
 *
 * RESUMABLE: filters on ai_urgency IS NULL, so re-running skips already-
 * enriched rows. Safe to invoke multiple times.
 *
 * Batch size: 25 rows per batch, 5 concurrent Claude calls per batch.
 *   - 25 × ~1.2s per Claude call ÷ 5 concurrency ≈ 6s per batch
 *   - 611 rows ÷ 25 = 25 batches ≈ 150s total Claude time
 *   - Well within Supabase edge function 300s (5 min) wall-clock limit
 *   - If it times out, re-invoke — it resumes from where it left off
 *
 * Estimated cost: 611 rows × ~800 input + ~400 output tokens
 *   = ~490K input + ~245K output on claude-haiku-4-5
 *   ≈ $0.12 input + $0.31 output ≈ $0.43 total
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Config ──────────────────────────────────────────────────────
const BATCH_SIZE = 25;          // rows per DB fetch
const CLAUDE_CONCURRENCY = 5;   // parallel Claude calls per batch
const FUNCTION_TIMEOUT = 280_000; // 280s safety margin (edge fn limit = 300s)

const SYSTEM_PROMPT = `You are a compliance intelligence analyst specializing in California \
commercial kitchen regulations. You transform raw regulatory alerts, recalls, and enforcement \
data into structured intelligence insights for restaurant operators.

Your analysis must:
- Be specific to California commercial kitchen operators
- Reference NFPA 96, CalCode, and relevant California regulations where applicable
- Identify which California counties are most affected (be specific)
- Estimate realistic financial impact for a mid-size commercial kitchen operation
- Provide 3-5 concrete, actionable items operators can do TODAY
- Assign severity: critical (immediate action), high (action within 7 days), \
medium (action within 30 days), low (monitor)
- Always output valid JSON matching the IntelligenceInsight schema exactly

Output ONLY valid JSON. No preamble. No markdown. No explanation outside the JSON.`;

function buildBackfillPrompt(row: {
  title: string;
  content_summary: string;
  category: string;
  source_name: string;
}): string {
  return `Analyze this existing EvidLY intelligence signal and produce enrichment data \
for California commercial kitchen operators.

Signal data:
Title: ${row.title}
Category: ${row.category}
Source: ${row.source_name}
Summary: ${row.content_summary}

Return a JSON object with these exact fields:
{
  "severity": "critical|high|medium|low|info",
  "revenue_risk": "critical|high|moderate|low|none — risk to operator revenue streams",
  "liability_risk": "critical|high|moderate|low|none — legal or regulatory liability exposure",
  "cost_risk": "critical|high|moderate|low|none — unexpected cost or financial burden",
  "operational_risk": "critical|high|moderate|low|none — disruption to daily kitchen operations",
  "impact_score": number 0-100 — overall impact severity for a mid-size CA commercial kitchen,
  "confidence": number 0-100 — your confidence in this analysis given the source data quality,
  "action_deadline": "YYYY-MM-DD or null — date by which operators must act, only if the text states a specific deadline"
}`;
}

// ── Claude call ─────────────────────────────────────────────────
async function callClaude(
  apiKey: string,
  prompt: string,
): Promise<{ result: any | null; error?: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { result: null, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
  }

  const data = await res.json();
  const text = data.content
    ?.filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("") || "";

  try {
    return { result: JSON.parse(text) };
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return { result: JSON.parse(m[0]) }; } catch { /* fall through */ }
    }
    return { result: null, error: `JSON parse failed: ${text.slice(0, 200)}` };
  }
}

// ── Concurrency limiter ─────────────────────────────────────────
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (e) {
        results[i] = { status: "rejected", reason: e };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

// ── Routing logic (identical to Phase 4b in intelligence-collect) ──
function computeRouting(
  sig: { signal_type: string; revenue_risk_level: string; liability_risk_level: string; cost_risk_level: string; operational_risk_level: string },
  routingMode: string,
): { tier: string; severityScore: number; reason: string; reviewDeadline: string | null } {
  const riskScores: Record<string, number> = { critical: 100, high: 75, moderate: 50, low: 25, none: 0 };
  const maxRisk = Math.max(
    riskScores[sig.revenue_risk_level || "none"] ?? 0,
    riskScores[sig.liability_risk_level || "none"] ?? 0,
    riskScores[sig.cost_risk_level || "none"] ?? 0,
    riskScores[sig.operational_risk_level || "none"] ?? 0,
  );

  const dims = [sig.revenue_risk_level, sig.liability_risk_level, sig.cost_risk_level, sig.operational_risk_level];
  const hasCritical = dims.some(r => r === "critical");
  const hasHigh = dims.some(r => r === "high");
  const holdTypes = new Set(["enforcement_action", "outbreak", "legislation"]);

  const now = Date.now();
  let tier: string, reason: string, reviewDeadline: string | null = null;

  if (sig.signal_type && holdTypes.has(sig.signal_type)) {
    tier = "hold"; reason = `Signal type "${sig.signal_type}" requires review`;
    reviewDeadline = new Date(now + 24 * 3600000).toISOString();
  } else if (hasCritical) {
    tier = "hold"; reason = "Critical risk dimension";
    reviewDeadline = new Date(now + 12 * 3600000).toISOString();
  } else if (maxRisk >= 50 || hasHigh) {
    tier = "notify"; reason = `Elevated risk (maxRisk=${maxRisk})`;
    reviewDeadline = new Date(now + 48 * 3600000).toISOString();
  } else {
    tier = routingMode === "autonomous" ? "auto" : "notify";
    reason = `Low risk (maxRisk=${maxRisk})`;
    if (tier === "notify") reason += " [supervised mode]";
  }

  return { tier, severityScore: maxRisk, reason, reviewDeadline };
}

// ── Main handler ────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();
  const isTimedOut = () => Date.now() - startTime > FUNCTION_TIMEOUT;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get routing mode
  const { data: modeSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "intelligence_routing_mode")
    .single();
  const routingMode = (modeSetting?.value as string) || "supervised";

  const severityToUrgency: Record<string, string> = {
    critical: "critical", high: "high", medium: "medium", low: "low",
    informational: "informational", info: "low",
  };
  const severityToScore: Record<string, number> = {
    critical: 95, high: 75, medium: 50, low: 25, informational: 10, info: 10,
  };

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  const failures: string[] = [];
  const tierCounts: Record<string, number> = { auto: 0, notify: 0, hold: 0 };

  // Process in batches until no more unenriched rows or timeout
  while (!isTimedOut()) {
    // Fetch next batch of unenriched rows
    const { data: batch, error: fetchErr } = await supabase
      .from("intelligence_signals")
      .select("id, title, content_summary, category, source_name, signal_type")
      .is("ai_urgency", null)
      .not("content_summary", "is", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) {
      return new Response(JSON.stringify({ error: `DB fetch failed: ${fetchErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!batch || batch.length === 0) {
      console.log("[backfill] No more unenriched rows — done.");
      break;
    }

    console.log(`[backfill] Processing batch of ${batch.length} rows (total so far: ${totalProcessed})`);

    // Call Claude for each row in parallel (limited concurrency)
    const tasks = batch.map((row) => async () => {
      const prompt = buildBackfillPrompt(row);
      const { result, error } = await callClaude(anthropicKey, prompt);
      return { row, result, error };
    });

    const settled = await parallelLimit(tasks, CLAUDE_CONCURRENCY);

    // Process results and update DB
    for (const entry of settled) {
      totalProcessed++;

      if (entry.status === "rejected") {
        totalFailed++;
        failures.push(`${(entry.reason as Error)?.message || "Unknown error"}`);
        continue;
      }

      const { row, result, error } = entry.value;

      if (!result) {
        totalFailed++;
        failures.push(`Row ${row.id}: ${error}`);
        continue;
      }

      const severity = result.severity || "medium";

      // Build enrichment update
      const enrichment = {
        ai_summary: (row.content_summary || "").slice(0, 2000),
        ai_urgency: severityToUrgency[severity] || severity || "medium",
        ai_impact_score: typeof result.impact_score === "number"
          ? Math.min(100, Math.max(0, Math.round(result.impact_score)))
          : (severityToScore[severity] ?? 50),
        ai_confidence: typeof result.confidence === "number"
          ? Math.min(100, Math.max(0, Math.round(result.confidence)))
          : 50,
        severity_score: severityToScore[severity] ?? 50,
        revenue_risk_level: result.revenue_risk || "none",
        liability_risk_level: result.liability_risk || "none",
        cost_risk_level: result.cost_risk || "none",
        operational_risk_level: result.operational_risk || "none",
        action_deadline: result.action_deadline || null,
        status: "analyzed",
      };

      // Compute routing (Phase 4b logic)
      const routing = computeRouting(
        {
          signal_type: row.signal_type,
          revenue_risk_level: enrichment.revenue_risk_level,
          liability_risk_level: enrichment.liability_risk_level,
          cost_risk_level: enrichment.cost_risk_level,
          operational_risk_level: enrichment.operational_risk_level,
        },
        routingMode,
      );

      // Single UPDATE with enrichment + routing
      const { error: updateErr } = await supabase
        .from("intelligence_signals")
        .update({
          ...enrichment,
          routing_tier: routing.tier,
          severity_score: routing.severityScore,
          review_deadline: routing.reviewDeadline,
          routing_reason: `[backfill] ${routing.reason}`,
        })
        .eq("id", row.id);

      if (updateErr) {
        totalFailed++;
        failures.push(`Row ${row.id}: UPDATE failed — ${updateErr.message}`);
      } else {
        totalUpdated++;
        tierCounts[routing.tier] = (tierCounts[routing.tier] || 0) + 1;
      }
    }

    console.log(`[backfill] Batch done: ${totalUpdated} updated, ${totalFailed} failed, ${Date.now() - startTime}ms elapsed`);
  }

  const timedOut = isTimedOut();
  const summary = {
    status: timedOut ? "partial" : "complete",
    rows_processed: totalProcessed,
    rows_updated: totalUpdated,
    rows_failed: totalFailed,
    routing_tiers: tierCounts,
    duration_ms: Date.now() - startTime,
    failures: failures.slice(0, 20), // cap log at 20 entries
    note: timedOut
      ? "Timed out — re-invoke to continue. Resumable via ai_urgency IS NULL filter."
      : "All unenriched rows processed.",
  };

  console.log(`[backfill] DONE: ${JSON.stringify(summary)}`);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
