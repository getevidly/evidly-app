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
const BATCH_SIZE = 10;          // rows per DB fetch (small to beat 150s idle timeout)
const CLAUDE_CONCURRENCY = 5;   // parallel Claude calls per batch
const MAX_ROWS_PER_INVOKE = 50; // cap per invocation — finish well within idle timeout
const FUNCTION_TIMEOUT = 130_000; // 130s safety margin (idle timeout = 150s)

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
  "revenue_risk": "critical|high|moderate|low|none — critical: mandatory closure or recall with confirmed CA distribution; high: voluntary recall or service disruption >1 week; moderate: menu changes or supplier switch needed; low: monitoring only; none: no revenue impact",
  "liability_risk": "critical|high|moderate|low|none — critical: active enforcement action targeting CA kitchens OR confirmed outbreak with a traced source in CA (not hypothetical litigation risk); high: new regulation with penalties or class-action risk; moderate: updated compliance requirement or inspection focus area; low: informational, no enforcement; none: no liability exposure. Weather and seasonal advisories are capped at moderate.",
  "cost_risk": "critical|high|moderate|low|none — critical: immediate mandatory equipment replacement or retrofit >$10K; high: required upgrades $2K-$10K within 30 days; moderate: process changes or training costs <$2K; low: minimal direct cost; none: no cost impact",
  "operational_risk": "critical|high|moderate|low|none — critical: forced shutdown or mandatory immediate operational change; high: workflow changes required within 7 days; moderate: process adjustments within 30 days; low: no operational impact; none: not applicable",
  "impact_score": number 0-100 — overall impact severity for a mid-size CA commercial kitchen,
  "confidence": number 0-100 — your confidence in this analysis given the source data quality,
  "action_deadline": "YYYY-MM-DD or null — date by which operators must act, only if the text states a specific deadline"
}

CALIBRATION RULES:
- "critical" on ANY dimension requires California-specific impact. A national recall with no confirmed CA distribution is HIGH, not critical.
- Reserve "critical" for signals demanding action within days. Most signals should be moderate or low. If you are assigning critical to more than 1 in 20 signals, your threshold is wrong.
- Weather/seasonal advisories are capped at MODERATE for liability_risk.
- liability_risk critical = active enforcement targeting CA kitchens OR confirmed outbreak with traced CA source. "Operators could face litigation if..." is NOT critical.

Output ONLY the raw JSON object. No markdown, no code fences, no explanation.`;
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
      max_tokens: 2000,
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

  // Strip markdown code fences (Claude sometimes wraps despite instructions)
  const cleaned = text.replace(/^```(?:json)?\s*\n?/g, "").replace(/\n?```\s*$/g, "").trim();

  // Extract JSON: first '{' to last '}', strip trailing commas
  function extractJson(s: string): any | null {
    // Try direct parse first
    try { return JSON.parse(s); } catch { /* continue */ }
    // Extract from first { to last }
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first === -1 || last <= first) return null;
    let json = s.substring(first, last + 1);
    json = json.replace(/,\s*\}/g, "}");
    try { return JSON.parse(json); } catch { /* continue */ }

    // Fallback: Claude added extra nested fields that got truncated.
    // Extract our 8 fields individually via regex from the partial JSON.
    const str = (v: string | undefined) => v || null;
    const num = (v: string | undefined) => v ? parseInt(v, 10) : null;
    const severity = json.match(/"severity"\s*:\s*"([^"]+)"/)?.[1];
    if (!severity) return null; // need at least severity
    return {
      severity: str(severity),
      revenue_risk: str(json.match(/"revenue_risk"\s*:\s*"([^"]+)"/)?.[1]),
      liability_risk: str(json.match(/"liability_risk"\s*:\s*"([^"]+)"/)?.[1]),
      cost_risk: str(json.match(/"cost_risk"\s*:\s*"([^"]+)"/)?.[1]),
      operational_risk: str(json.match(/"operational_risk"\s*:\s*"([^"]+)"/)?.[1]),
      impact_score: num(json.match(/"impact_score"\s*:\s*(\d+)/)?.[1]),
      confidence: num(json.match(/"confidence"\s*:\s*(\d+)/)?.[1]),
      action_deadline: json.match(/"action_deadline"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1] || null,
    };
  }

  const parsed = extractJson(cleaned);
  if (parsed) return { result: parsed };
  return { result: null, error: `JSON parse failed: ${cleaned.slice(0, 300)}` };
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

  // Process in batches until no more unenriched rows, row cap, or timeout
  while (!isTimedOut() && totalProcessed < MAX_ROWS_PER_INVOKE) {
    // Fetch next batch of rows needing enrichment/recalibration.
    // Mode 1 (initial): ai_urgency IS NULL — row was never enriched.
    // Mode 2 (recalibrate): ai_urgency IS NOT NULL but routing_reason does
    //   not start with '[recalibrated]' — row needs recalibration.
    // Checks mode 1 first; if none remain, falls through to mode 2.
    let query = supabase
      .from("intelligence_signals")
      .select("id, title, content_summary, category, source_name, signal_type")
      .not("content_summary", "is", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    // Try unenriched first (ai_urgency IS NULL)
    const { data: unenriched } = await query.is("ai_urgency", null);
    let useRecalibrate = false;
    if (!unenriched || unenriched.length === 0) {
      // All enriched — switch to recalibration mode
      query = supabase
        .from("intelligence_signals")
        .select("id, title, content_summary, category, source_name, signal_type")
        .not("content_summary", "is", null)
        .not("routing_reason", "like", "[recalibrated]%")
        .order("created_at", { ascending: true })
        .limit(BATCH_SIZE);
      useRecalibrate = true;
    }

    const { data: batch, error: fetchErr } = useRecalibrate
      ? await query
      : { data: unenriched, error: null };

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

    let batchUpdated = 0;

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
          routing_reason: `[${useRecalibrate ? "recalibrated" : "backfill"}] ${routing.reason}`,
        })
        .eq("id", row.id);

      if (updateErr) {
        totalFailed++;
        failures.push(`Row ${row.id}: UPDATE failed — ${updateErr.message}`);
      } else {
        totalUpdated++;
        batchUpdated++;
        tierCounts[routing.tier] = (tierCounts[routing.tier] || 0) + 1;
      }
    }

    console.log(`[backfill] Batch done: ${batchUpdated}/${batch.length} updated this batch, ${totalUpdated} total, ${Date.now() - startTime}ms elapsed`);

    // If an entire batch fails, the same rows will be re-fetched forever — break
    if (batchUpdated === 0) {
      console.warn("[backfill] Entire batch failed — stopping to avoid infinite retry loop.");
      failures.push("Stopped: entire batch failed (would re-fetch same rows).");
      break;
    }
  }

  const timedOut = isTimedOut();
  const hitCap = totalProcessed >= MAX_ROWS_PER_INVOKE;
  const summary = {
    status: (timedOut || hitCap) ? "partial" : "complete",
    rows_processed: totalProcessed,
    rows_updated: totalUpdated,
    rows_failed: totalFailed,
    routing_tiers: tierCounts,
    duration_ms: Date.now() - startTime,
    failures: failures.slice(0, 20),
    note: timedOut
      ? "Timed out — re-invoke to continue."
      : hitCap
        ? `Hit ${MAX_ROWS_PER_INVOKE}-row cap — re-invoke to continue.`
        : "All unenriched rows processed.",
  };

  console.log(`[backfill] DONE: ${JSON.stringify(summary)}`);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
