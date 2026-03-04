import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Feed definitions — URL + expected content signals
const FEED_URLS: Record<string, { url: string; method: string; keywords: string[] }> = {
  cdph_la:          { url: "https://www.lapublichealth.org/eh/programs/food-safety",            method: "GET", keywords: ["inspection","violation","food safety"] },
  cdph_merced:      { url: "https://www.countyofmerced.com/189/Food-Safety",                    method: "GET", keywords: ["inspection","food"] },
  cdph_fresno:      { url: "https://www.co.fresno.ca.us/departments/public-health-and-safety/environmental-health/food-program", method: "GET", keywords: ["food","inspection"] },
  fda_recalls:      { url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",method: "GET", keywords: ["recall","food","alert"] },
  fda_foodcode:     { url: "https://www.fda.gov/food/fda-food-code/food-code-2022",              method: "GET", keywords: ["food code","2022","adoption"] },
  ca_fire_marshal:  { url: "https://osfm.fire.ca.gov/divisions/fire-engineering-and-investigations", method: "GET", keywords: ["fire","safety","commercial","kitchen"] },
  nfpa96:           { url: "https://www.nfpa.org/codes-and-standards/nfpa-96-standard-for-ventilation-control-and-fire-protection-of-commercial-cooking-operations", method: "GET", keywords: ["NFPA 96","edition","commercial cooking"] },
  osha_ca_kitchen:  { url: "https://www.dir.ca.gov/dosh/dosh1.html",                            method: "GET", keywords: ["restaurant","kitchen","safety"] },
  nps_yosemite:     { url: "https://www.nps.gov/yose/learn/management/foodsafety.htm",           method: "GET", keywords: ["food safety","inspection"] },
  usda_fsis:        { url: "https://www.fsis.usda.gov/recalls",                                  method: "GET", keywords: ["recall","food","alert"] },
  calcode_updates:  { url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=113700.&lawCode=HSC", method: "GET", keywords: ["health","safety","retail food"] },
};

async function hashContent(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.slice(0, 5000));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkFeed(feedId: string, feedDef: { url: string; method: string; keywords: string[] }) {
  const startMs = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(feedDef.url, {
      method: feedDef.method,
      signal: controller.signal,
      headers: { "User-Agent": "EvidLY-CrawlBot/1.0 (compliance monitoring; contact@getevidly.com)" },
    });
    clearTimeout(timeout);

    const responseMs = Date.now() - startMs;

    if (!res.ok) {
      return { status: "error", responseMs, error: `HTTP ${res.status}`, hash: null };
    }

    const text = await res.text();
    const hash = await hashContent(text);

    const lower = text.toLowerCase();
    const isWafBlock = lower.includes("access denied") || lower.includes("403 forbidden") || (lower.includes("cloudflare") && lower.includes("blocked"));
    if (isWafBlock) {
      return { status: "waf_block", responseMs, error: "WAF/CDN block detected", hash };
    }

    return { status: "live", responseMs, error: null, hash };
  } catch (err: any) {
    const responseMs = Date.now() - startMs;
    if (err.name === "AbortError") {
      return { status: "timeout", responseMs: 15000, error: "Request timed out after 15s", hash: null };
    }
    return { status: "error", responseMs, error: err.message, hash: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const runStart = Date.now();
  let feedsLive = 0, feedsFailed = 0, feedsChanged = 0;

  const { data: run } = await supabase
    .from("crawl_runs")
    .insert({ run_type: "scheduled", feeds_total: Object.keys(FEED_URLS).length, triggered_by: "crawl-monitor" })
    .select()
    .single();

  const results: any[] = [];

  for (const [feedId, feedDef] of Object.entries(FEED_URLS)) {
    const { data: prev } = await supabase
      .from("crawl_health")
      .select("content_hash, retry_count")
      .eq("feed_id", feedId)
      .single();

    const result = await checkFeed(feedId, feedDef);

    const isChanged = result.hash && prev?.content_hash && result.hash !== prev.content_hash;
    if (isChanged) feedsChanged++;
    if (result.status === "live") feedsLive++;
    else feedsFailed++;

    const autoRetryAt = (result.status === "timeout" || result.status === "error")
      ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
      : null;

    await supabase.from("crawl_health").upsert({
      feed_id: feedId,
      status: result.status,
      last_checked_at: new Date().toISOString(),
      last_success_at: result.status === "live" ? new Date().toISOString() : undefined,
      response_ms: result.responseMs,
      error_message: result.error,
      retry_count: result.status === "live" ? 0 : ((prev?.retry_count || 0) + 1),
      content_hash: result.hash || prev?.content_hash,
      auto_retry_at: autoRetryAt,
    }, { onConflict: "feed_id" });

    await supabase.from("admin_event_log").insert({
      level: result.status === "live" ? "INFO" : result.status === "waf_block" ? "WARN" : "ERROR",
      category: "crawl",
      message: `${feedId}: ${result.status}${result.error ? ` — ${result.error}` : ""}${isChanged ? " [CONTENT CHANGED]" : ""}`,
      metadata: { feedId, status: result.status, responseMs: result.responseMs, changed: isChanged },
    });

    if (isChanged) {
      await supabase.from("admin_event_log").insert({
        level: "WARN",
        category: "crawl",
        message: `CONTENT CHANGE DETECTED: ${feedId} — hash changed, may require JIE update`,
        metadata: { feedId, prevHash: prev?.content_hash, newHash: result.hash },
      });
    }

    results.push({ feedId, ...result, changed: isChanged });
  }

  await supabase.from("crawl_runs").update({
    completed_at: new Date().toISOString(),
    feeds_live: feedsLive,
    feeds_failed: feedsFailed,
    feeds_changed: feedsChanged,
    duration_ms: Date.now() - runStart,
  }).eq("id", run?.id);

  return new Response(
    JSON.stringify({ success: true, feedsLive, feedsFailed, feedsChanged, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
