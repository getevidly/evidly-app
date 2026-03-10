import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * trigger-crawl — Crawl intelligence sources via Firecrawl API
 *
 * Fetches all firecrawl sources from `intelligence_sources`, scrapes each
 * via Firecrawl, and updates last_crawled_at / last_crawl_status / last_crawl_error.
 * Logs to crawl_runs. Returns per-source success/failure summary.
 *
 * FIX [CRAWL-EDGE-FN-FIX-01]: Changed import from esm.sh to npm: for
 * Deno 2 compatibility.
 *
 * FIX [TRIGGER-CRAWL-FIX-01]:
 *   - Status values: "active"→"live", "broken"→"error" (match CHECK constraint)
 *   - Source filter: fetch all firecrawl sources regardless of current status
 *   - Added crawl_runs logging for Crawl Monitor stat cards
 */

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface SourceRow {
  id: string;
  name: string;
  url: string;
  category: string;
  fetch_method: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!FIRECRAWL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
  const startedAt = new Date();

  // Fetch all firecrawl sources regardless of current status
  const { data: sources, error } = await supabase
    .from("intelligence_sources")
    .select("id, name, url, category, fetch_method")
    .not("url", "is", null)
    .eq("fetch_method", "firecrawl");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { id: string; name: string; success: boolean; error?: string }[] = [];

  for (const source of (sources as SourceRow[]) ?? []) {
    if (!source.url) continue;

    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: source.url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      const data = await response.json();
      const success = response.ok && data.success;

      // Update last_crawled_at and crawl status
      await supabase
        .from("intelligence_sources")
        .update({
          last_crawled_at: new Date().toISOString(),
          last_crawl_status: success ? "success" : "error",
          last_crawl_error: success ? null : (data.error ?? `HTTP ${response.status}`),
          // Also update main status column
          status: success ? "live" : "error",
        })
        .eq("id", source.id);

      // Log to event log
      await supabase.from("admin_event_log").insert({
        level: success ? "INFO" : "ERROR",
        category: "crawl",
        message: `[Firecrawl] ${source.name}: ${success ? "success" : "error"}${!success ? ` — ${data.error || "Unknown"}` : ""}`,
        metadata: { sourceId: source.id, sourceName: source.name, success, via: "firecrawl" },
      });

      results.push({ id: source.id, name: source.name, success });
    } catch (err) {
      await supabase
        .from("intelligence_sources")
        .update({
          last_crawled_at: new Date().toISOString(),
          last_crawl_status: "error",
          last_crawl_error: String(err),
          status: "error",
        })
        .eq("id", source.id);

      await supabase.from("admin_event_log").insert({
        level: "ERROR",
        category: "crawl",
        message: `[Firecrawl] ${source.name}: error — ${String(err)}`,
        metadata: { sourceId: source.id, sourceName: source.name, success: false, via: "firecrawl" },
      });

      results.push({ id: source.id, name: source.name, success: false, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  // Log to crawl_runs for Crawl Monitor stat cards
  await supabase.from("crawl_runs").insert({
    run_type: "firecrawl",
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    feeds_total: results.length,
    feeds_live: succeeded,
    feeds_failed: failed,
    feeds_changed: 0,
    duration_ms: Date.now() - startedAt.getTime(),
    triggered_by: "trigger-crawl",
  });

  return new Response(
    JSON.stringify({
      total: results.length,
      succeeded,
      failed,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
