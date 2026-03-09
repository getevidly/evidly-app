import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * crawl-monitor — Crawl intelligence sources and update status
 *
 * Reads crawlable sources from `intelligence_sources` (url IS NOT NULL,
 * crawl_method != 'manual'). Crawls demo-critical sources first, then
 * remaining if time allows. Updates intelligence_sources.status and
 * last_crawled_at. Logs to crawl_runs.
 *
 * Always returns 200 with partial results — never fails entirely.
 *
 * FIX [CRAWL-EDGE-FN-FIX-01]: Changed import from esm.sh to npm: for
 * Deno 2 compatibility. esm.sh import caused startup crash → non-2xx.
 */

const CONCURRENCY = 5;
const TIMEOUT_MS = 12000;
// Supabase edge functions have ~150s limit. Budget 120s for crawling.
const MAX_CRAWL_MS = 120_000;

interface SourceRow {
  id: string;
  source_key: string;
  url: string | null;
  fetch_method: string | null;
  is_demo_critical: boolean;
  status: string;
}

type CrawlStatus = "active" | "broken" | "waf_blocked";

async function hashContent(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.slice(0, 5000));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkSource(
  url: string
): Promise<{ status: CrawlStatus; responseMs: number; error: string | null; hash: string | null }> {
  const startMs = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "EvidLY-CrawlBot/1.0 (compliance monitoring; contact@getevidly.com)",
      },
    });
    clearTimeout(timeout);

    const responseMs = Date.now() - startMs;

    if (!res.ok) {
      return { status: "broken", responseMs, error: `HTTP ${res.status}`, hash: null };
    }

    const text = await res.text();
    const hash = await hashContent(text);

    const lower = text.toLowerCase();
    const isWaf =
      lower.includes("access denied") ||
      lower.includes("403 forbidden") ||
      (lower.includes("cloudflare") && lower.includes("blocked"));
    if (isWaf) {
      return { status: "waf_blocked", responseMs, error: "WAF/CDN block detected", hash };
    }

    return { status: "active", responseMs, error: null, hash };
  } catch (err: any) {
    const responseMs = Date.now() - startMs;
    if (err.name === "AbortError") {
      return { status: "broken", responseMs: TIMEOUT_MS, error: `Timeout after ${TIMEOUT_MS / 1000}s`, hash: null };
    }
    return { status: "broken", responseMs, error: err.message, hash: null };
  }
}

/** Process sources in batches with concurrency limit */
async function crawlBatch(
  sources: SourceRow[],
  supabase: any,
  deadline: number
): Promise<{ live: number; failed: number; changed: number; processed: number }> {
  let live = 0,
    failed = 0,
    changed = 0,
    processed = 0;

  for (let i = 0; i < sources.length; i += CONCURRENCY) {
    // Stop if we're past the time budget
    if (Date.now() > deadline) break;

    const batch = sources.slice(i, i + CONCURRENCY).filter((s) => s.url);
    const results = await Promise.all(
      batch.map(async (src) => {
        const result = await checkSource(src.url!);
        return { src, result };
      })
    );

    for (const { src, result } of results) {
      processed++;

      // Check for content change via crawl_health (if exists)
      const { data: prev } = await supabase
        .from("crawl_health")
        .select("content_hash")
        .eq("feed_id", src.source_key)
        .maybeSingle();

      const isChanged = result.hash && prev?.content_hash && result.hash !== prev.content_hash;
      if (isChanged) changed++;
      if (result.status === "active") live++;
      else failed++;

      // Update intelligence_sources status + last_crawled_at
      await supabase
        .from("intelligence_sources")
        .update({
          status: result.status,
          last_crawled_at: new Date().toISOString(),
        })
        .eq("id", src.id);

      // Also upsert into crawl_health for operational details
      const pillar = src.source_key.includes("fire") || src.source_key.includes("nfpa") || src.source_key.includes("osfm") || src.source_key.includes("calfire")
        ? "fire_safety"
        : "food_safety";
      const crawlStatus = result.status === "active" ? "live"
        : result.status === "waf_blocked" ? "waf_block"
        : "error";
      await supabase.from("crawl_health").upsert(
        {
          feed_id: src.source_key,
          feed_name: src.source_key,
          pillar,
          status: crawlStatus,
          last_checked_at: new Date().toISOString(),
          response_ms: result.responseMs,
          error_message: result.error,
          content_hash: result.hash || prev?.content_hash || null,
          retry_count: result.status === "active" ? 0 : 1,
          ...(result.status === "active" ? { last_success_at: new Date().toISOString() } : {}),
        },
        { onConflict: "feed_id" }
      );

      // Log to event log
      await supabase.from("admin_event_log").insert({
        level: result.status === "active" ? "INFO" : result.status === "waf_blocked" ? "WARN" : "ERROR",
        category: "crawl",
        message: `${src.source_key}: ${result.status}${result.error ? ` — ${result.error}` : ""}${isChanged ? " [CONTENT CHANGED]" : ""}`,
        metadata: { sourceKey: src.source_key, status: result.status, responseMs: result.responseMs, changed: !!isChanged },
      });
    }
  }

  return { live, failed, changed, processed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL");
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!sbUrl || !sbKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MISSING_ENV",
          message: `Required environment variable ${!sbUrl ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY"} is not set.`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(sbUrl, sbKey);

    const deadline = Date.now() + MAX_CRAWL_MS;

    // Fetch direct-fetch sources only (not firecrawl — those need Firecrawl API)
    const { data: allSources, error: srcErr } = await supabase
      .from("intelligence_sources")
      .select("id, source_key, url, fetch_method, is_demo_critical, status")
      .not("url", "is", null)
      .eq("fetch_method", "fetch")
      .order("is_demo_critical", { ascending: false })
      .order("source_key");

    if (srcErr || !allSources) {
      return new Response(
        JSON.stringify({ success: false, error: srcErr?.message || "No sources found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create run log
    const { data: run } = await supabase
      .from("crawl_runs")
      .insert({
        run_type: "manual",
        feeds_total: allSources.length,
        triggered_by: "crawl-monitor",
      })
      .select()
      .single();

    // Crawl: demo-critical first (sorted by query above)
    const { live, failed, changed, processed } = await crawlBatch(
      allSources,
      supabase,
      deadline
    );

    // Update run log
    if (run?.id) {
      await supabase
        .from("crawl_runs")
        .update({
          completed_at: new Date().toISOString(),
          feeds_live: live,
          feeds_failed: failed,
          feeds_changed: changed,
          duration_ms: Date.now() - (deadline - MAX_CRAWL_MS),
        })
        .eq("id", run.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        total: allSources.length,
        feedsLive: live,
        feedsFailed: failed,
        feedsChanged: changed,
        timedOut: processed < allSources.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    // Always return 200 with error details — never a raw 500
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
