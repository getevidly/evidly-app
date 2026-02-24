import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

/**
 * intelligence-collect — Cron-triggered intelligence data collection
 *
 * Cron: runs daily at 6am PT
 * Trigger: supabase/functions/intelligence-collect/config.toml
 * [functions.intelligence-collect]
 * verify_jwt = false
 * cron = "0 14 * * *"  (6am PT = 14:00 UTC)
 *
 * Fetches from 4 external INTELLIGENCE_SOURCES (openFDA, USDA FSIS, CDPH, FoodSafety.gov),
 * calls Claude to transform raw data into IntelligenceInsight objects,
 * and saves to intelligence_insights with status='pending_review'.
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var (for manual triggers).
 */

// ── Source Configuration ─────────────────────────────────────

interface IntelligenceSource {
  id: string;
  name: string;
  url: string;
  params?: Record<string, string | number>;
  type?: string;
  rssUrl?: string;
  category: string;
  defaultSeverity: string;
  defaultScope: string;
}

const INTELLIGENCE_SOURCES: IntelligenceSource[] = [
  {
    id: "openfda_enforcement",
    name: "openFDA Food Enforcement (Recalls)",
    url: "https://api.fda.gov/food/enforcement.json",
    params: {
      search: 'status:"Ongoing"',
      limit: 10,
      sort: "report_date:desc",
    },
    category: "recall_alert",
    defaultSeverity: "critical",
    defaultScope: "national",
  },
  {
    id: "openfda_class1",
    name: "openFDA Class I Recalls (Most Dangerous)",
    url: "https://api.fda.gov/food/enforcement.json",
    params: {
      search: 'classification:"Class I" AND status:"Ongoing"',
      limit: 10,
      sort: "report_date:desc",
    },
    category: "recall_alert",
    defaultSeverity: "critical",
    defaultScope: "national",
  },
  {
    id: "openfda_adverse_events",
    name: "openFDA Food Adverse Events",
    url: "https://api.fda.gov/food/event.json",
    params: {
      limit: 10,
      sort: "date_started:desc",
    },
    category: "outbreak_alert",
    defaultSeverity: "high",
    defaultScope: "national",
  },
];

// ── CORS / Helpers ───────────────────────────────────────────

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

// ── Claude Prompts ───────────────────────────────────────────

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

function buildUserPrompt(rawData: any, source: string): string {
  return `Transform this raw ${source} alert into an EvidLY intelligence insight for California \
commercial kitchen operators.

Raw data:
${JSON.stringify(rawData, null, 2)}

Return a JSON object with these exact fields:
{
  "title": "string — clear, specific, newsworthy headline (max 100 chars)",
  "summary": "string — 2-3 sentence executive summary of what happened and why it matters",
  "category": "recall_alert|outbreak_alert|enforcement_surge|regulatory_change|inspection_trend|nfpa_update|seasonal_risk",
  "severity": "critical|high|medium|low|info",
  "scope": "local|regional|national",
  "affected_counties": ["array of California county names in lowercase, e.g. 'fresno', 'los_angeles'"],
  "full_analysis": "string — 3-5 paragraphs of detailed analysis for operators",
  "key_findings": ["array of 3-5 specific findings"],
  "action_items": ["array of 5-8 specific actions operators should take"],
  "pillars": ["food_safety" and/or "fire_safety"],
  "estimated_cost_low": number (dollars),
  "estimated_cost_high": number (dollars),
  "cost_basis": "string — e.g. 'per affected location'",
  "tags": ["array of relevant tags"],
  "source_name": "string — name of the data source",
  "is_demo_eligible": boolean — true if this is a good representative example for demos,
  "demo_priority": number 0-10 — how compelling this is for demos (10 = most compelling)
}`;
}

// ── Source Fetchers ───────────────────────────────────────────

async function fetchOpenFDAEnforcement(
  source: IntelligenceSource,
): Promise<{ items: any[]; raw: any }> {
  const params = new URLSearchParams();
  if (source.params) {
    for (const [k, v] of Object.entries(source.params)) {
      params.set(k, String(v));
    }
  }

  const res = await fetch(`${source.url}?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`openFDA enforcement HTTP ${res.status}`);
  const data = await res.json();
  const items = (data.results || []).map((r: any) => ({
    title: `${r.classification || "Recall"}: ${(r.product_description || "").slice(0, 100)}`,
    description: r.reason_for_recall || r.product_description || "",
    classification: r.classification || "Unknown",
    distribution: r.distribution_pattern || "",
    report_date: r.report_date || "",
    product: r.product_description || "",
    recalling_firm: r.recalling_firm || "",
    status: r.status || "",
    state: r.state || "",
    city: r.city || "",
    source_url: `openfda:${r.recall_number || ""}:${(r.product_description || "").slice(0, 60)}:${r.report_date || ""}`,
  }));
  return { items, raw: data };
}

async function fetchOpenFDAAdverseEvents(
  source: IntelligenceSource,
): Promise<{ items: any[]; raw: any }> {
  const params = new URLSearchParams();
  if (source.params) {
    for (const [k, v] of Object.entries(source.params)) {
      params.set(k, String(v));
    }
  }

  const res = await fetch(`${source.url}?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`openFDA adverse events HTTP ${res.status}`);
  const data = await res.json();
  const items = (data.results || []).map((r: any) => {
    const products = (r.products || []).map((p: any) => p.name_brand || p.industry_name || "Unknown").join(", ");
    const reactions = (r.reactions || []).join(", ");
    const outcomes = (r.outcomes || []).join(", ");
    return {
      title: `Adverse Event: ${products || "Food Product"} — ${(reactions || "").slice(0, 80)}`,
      description: `Outcomes: ${outcomes}. Reactions: ${reactions}. Products: ${products}.`,
      report_number: r.report_number || "",
      date_started: r.date_started || r.date_created || "",
      reactions,
      outcomes,
      products,
      source_url: `openfda_event:${r.report_number || ""}:${r.date_created || ""}`,
    };
  });
  return { items, raw: data };
}

async function fetchSource(
  source: IntelligenceSource,
): Promise<{ items: any[]; raw: any }> {
  switch (source.id) {
    case "openfda_enforcement":
    case "openfda_class1":
      return fetchOpenFDAEnforcement(source);
    case "openfda_adverse_events":
      return fetchOpenFDAAdverseEvents(source);
    default:
      throw new Error(`Unknown source: ${source.id}`);
  }
}

// ── Claude Analysis ──────────────────────────────────────────

async function analyzeWithClaude(
  apiKey: string,
  source: IntelligenceSource,
  rawItem: any,
): Promise<any | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(rawItem, source.name) }],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(
      `[intelligence-collect] Claude API error: HTTP ${res.status} | headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()))} | body: ${errorBody}`,
    );
    return null;
  }

  const data = await res.json();
  const text = data.content
    ?.filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("") || "";

  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from response if wrapped in markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        console.error("[intelligence-collect] Failed to parse Claude JSON response");
        return null;
      }
    }
    return null;
  }
}

// ── Field Mapping Helpers ────────────────────────────────────

/** Map Claude severity → DB impact_level */
function mapSeverity(severity: string): string {
  const map: Record<string, string> = {
    critical: "critical",
    high: "high",
    medium: "medium",
    low: "low",
    info: "low",
  };
  return map[severity] || "medium";
}

/** Map Claude severity → DB urgency */
function mapUrgency(severity: string): string {
  const map: Record<string, string> = {
    critical: "immediate",
    high: "urgent",
    medium: "standard",
    low: "informational",
    info: "informational",
  };
  return map[severity] || "standard";
}

/** Map Claude scope → DB market_signal_strength */
function mapScope(scope: string): string {
  const map: Record<string, string> = {
    local: "weak",
    regional: "moderate",
    national: "strong",
  };
  return map[scope] || "moderate";
}

/** Map source.category → DB source_type */
function mapSourceType(category: string): string {
  const map: Record<string, string> = {
    recall_alert: "fda_recall",
    outbreak_alert: "outbreak",
  };
  return map[category] || category;
}

// ── Types for email summary ──────────────────────────────────

interface NewInsightSummary {
  title: string;
  severity: string;
  source: string;
}

// ── Main Handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Auth: cron secret, Supabase cron header, OR Bearer token from @getevidly.com ──
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const isCronSecret = expectedSecret && cronSecret === expectedSecret;
  const isCronTrigger = !cronSecret && req.headers.get("x-supabase-cron");

  let isAdminUser = false;
  if (!isCronSecret && !isCronTrigger) {
    // Try Bearer token auth — allow @getevidly.com admins to trigger manually
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user } } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user?.email?.endsWith("@getevidly.com")) {
        isAdminUser = true;
      }
    }
    if (!isAdminUser) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!anthropicKey) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 503);
  }

  const startTime = Date.now();
  const TIMEOUT_MS = 50_000; // 50s safety (Edge Function limit ~60s)
  const isTimedOut = () => Date.now() - startTime > TIMEOUT_MS;

  let processed = 0;
  let newCount = 0;
  const errors: string[] = [];
  const sourceResults: Record<string, { fetched: number; new: number; skipped: number; error?: string }> = {};
  const newInsights: NewInsightSummary[] = [];

  for (const source of INTELLIGENCE_SOURCES) {
    if (isTimedOut()) {
      console.warn("[intelligence-collect] Timeout reached, stopping");
      break;
    }

    const srcResult = { fetched: 0, new: 0, skipped: 0, error: undefined as string | undefined };

    try {
      console.log(`[intelligence-collect] Fetching ${source.id}...`);
      const { items } = await fetchSource(source);
      srcResult.fetched = items.length;

      for (const item of items) {
        if (isTimedOut()) break;
        processed++;

        // ── Dedup: check if source_url already exists ──
        const sourceUrl = item.source_url || "";
        if (!sourceUrl) {
          srcResult.skipped++;
          continue;
        }

        const { data: existing } = await supabase
          .from("intelligence_insights")
          .select("id")
          .eq("source_url", sourceUrl)
          .limit(1);

        if (existing && existing.length > 0) {
          srcResult.skipped++;
          continue;
        }

        // ── Claude analysis ──
        const insight = await analyzeWithClaude(anthropicKey, source, item);
        if (!insight) {
          srcResult.skipped++;
          errors.push(`${source.id}: Claude failed to produce valid JSON for "${(item.title || "").slice(0, 60)}"`);
          continue;
        }

        const severity = insight.severity || source.defaultSeverity;

        // ── Insert ──
        const { error: insertErr } = await supabase
          .from("intelligence_insights")
          .insert({
            source_id: source.id,
            source_url: sourceUrl,
            raw_source_data: {
              original: item,
              key_findings: insight.key_findings || [],
              demo_priority: insight.demo_priority ?? 0,
              ai_generated: true,
              source_api: source.id,
              fetched_at: new Date().toISOString(),
            },
            status: "pending_review",
            is_demo_eligible: insight.is_demo_eligible ?? false,
            source_type: mapSourceType(insight.category || source.category),
            category: insight.category || source.category,
            impact_level: mapSeverity(severity),
            urgency: mapUrgency(severity),
            title: (insight.title || item.title || "").slice(0, 200),
            headline: (insight.title || item.title || "").slice(0, 200),
            summary: insight.summary || "",
            full_analysis: insight.full_analysis || "",
            executive_brief: "",
            action_items: insight.action_items || [],
            affected_pillars: insight.pillars || ["food_safety"],
            affected_counties: insight.affected_counties || [],
            confidence_score: 0.50,
            tags: insight.tags || [],
            estimated_cost_impact: {
              low: insight.estimated_cost_low ?? 0,
              high: insight.estimated_cost_high ?? 0,
              currency: "USD",
              methodology: insight.cost_basis || "",
            },
            source_name: insight.source_name || source.name,
            market_signal_strength: mapScope(insight.scope || source.defaultScope),
            published_at: null,
          });

        if (insertErr) {
          console.error(`[intelligence-collect] Insert error for ${source.id}:`, insertErr.message);
          errors.push(`${source.id}: DB insert failed — ${insertErr.message}`);
        } else {
          srcResult.new++;
          newCount++;
          newInsights.push({
            title: (insight.title || item.title || "").slice(0, 120),
            severity: severity,
            source: source.name,
          });
        }
      }
    } catch (err) {
      const errMsg = (err as Error).message || "Unknown error";
      srcResult.error = errMsg;
      errors.push(`${source.id}: ${errMsg}`);
      console.error(`[intelligence-collect] ${source.id} error:`, errMsg);
    }

    sourceResults[source.id] = srcResult;
  }

  const duration_ms = Date.now() - startTime;

  // ── Email Arthur when new insights arrive ──
  if (newInsights.length > 0) {
    try {
      const n = newInsights.length;
      const severityColors: Record<string, string> = {
        critical: "#dc2626",
        high: "#d97706",
        medium: "#1e4d6b",
        low: "#6b7280",
      };

      const insightRows = newInsights
        .map((i) => {
          const color = severityColors[i.severity] || "#6b7280";
          return `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #1e293b;">${i.title}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #fff; background: ${color};">${i.severity}</span>
            </td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #64748b;">${i.source}</td>
          </tr>`;
        })
        .join("");

      const bodyHtml = `
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          The intelligence pipeline just completed. <strong>${n} new insight${n === 1 ? "" : "s"}</strong>
          ${n === 1 ? "is" : "are"} pending your review.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Title</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Severity</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Source</th>
            </tr>
          </thead>
          <tbody>${insightRows}</tbody>
        </table>
        <p style="font-size: 13px; color: #94a3b8;">
          Pipeline processed ${processed} items across ${Object.keys(sourceResults).length} sources in ${duration_ms}ms.${errors.length > 0 ? ` ${errors.length} error${errors.length === 1 ? "" : "s"} encountered.` : ""}
        </p>`;

      const html = buildEmailHtml({
        recipientName: "Arthur",
        bodyHtml,
        ctaText: "Review Insights",
        ctaUrl: "https://evidly-app.vercel.app/admin/intelligence",
        footerNote: "This email was sent automatically by the EvidLY intelligence pipeline.",
      });

      await sendEmail({
        to: "arthur@getevidly.com",
        subject: `EvidLY Intelligence — ${n} new insight${n === 1 ? "" : "s"} pending review`,
        html,
      });
    } catch (notifyErr) {
      // Non-blocking: log but don't fail the pipeline
      console.error("[intelligence-collect] Failed to send notification email:", (notifyErr as Error).message);
    }
  }

  console.log(
    `[intelligence-collect] Done: processed=${processed} new=${newCount} errors=${errors.length} duration=${duration_ms}ms`,
  );

  return jsonResponse({
    processed,
    new: newCount,
    errors,
    duration_ms,
    sources: sourceResults,
  });
});
