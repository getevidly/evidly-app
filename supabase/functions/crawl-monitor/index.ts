import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Feed definitions — URL + expected content signals + DB metadata
interface FeedDef {
  url: string;
  method: string;
  keywords: string[];
  feed_name: string;
  pillar: "food_safety" | "fire_safety";
}

const FEED_URLS: Record<string, FeedDef> = {
  cdph_la:          { url: "https://ehservices.publichealth.lacounty.gov/servlet/guest",         method: "GET", keywords: ["inspection","violation","food safety"],   feed_name: "CDPH — Los Angeles",    pillar: "food_safety" },
  cdph_merced:      { url: "https://www.countyofmerced.com/189/Food-Safety",                    method: "GET", keywords: ["inspection","food"],                      feed_name: "CDPH — Merced",         pillar: "food_safety" },
  cdph_fresno:      { url: "https://www.fresnocountyca.gov/departments/public-health/environmental-health/food-program", method: "GET", keywords: ["food","inspection"], feed_name: "CDPH — Fresno",         pillar: "food_safety" },
  fda_recalls:      { url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",method: "GET", keywords: ["recall","food","alert"],                 feed_name: "FDA Recalls",           pillar: "food_safety" },
  fda_foodcode:     { url: "https://www.fda.gov/food/fda-food-code/food-code-2022",              method: "GET", keywords: ["food code","2022","adoption"],            feed_name: "FDA Food Code Updates", pillar: "food_safety" },
  ca_fire_marshal:  { url: "https://osfm.fire.ca.gov/divisions/fire-prevention",                method: "GET", keywords: ["fire","safety","commercial","kitchen"],   feed_name: "CA State Fire Marshal",  pillar: "fire_safety" },
  nfpa96:           { url: "https://www.nfpa.org/codes-and-standards/96",                        method: "GET", keywords: ["NFPA 96","edition","commercial cooking"], feed_name: "NFPA 96 Updates",       pillar: "fire_safety" },
  osha_ca_kitchen:  { url: "https://www.dir.ca.gov/dosh/dosh1.html",                            method: "GET", keywords: ["restaurant","kitchen","safety"],          feed_name: "OSHA CA Kitchen",       pillar: "fire_safety" },
  nps_yosemite:     { url: "https://www.nps.gov/yose/planyourvisit/food.htm",                    method: "GET", keywords: ["food safety","inspection"],               feed_name: "NPS / Yosemite",        pillar: "fire_safety" },
  usda_fsis:        { url: "https://www.fsis.usda.gov/recalls-alerts",                            method: "GET", keywords: ["recall","food","alert"],                 feed_name: "USDA FSIS Alerts",      pillar: "food_safety" },
  calcode_updates:  { url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=113700.&lawCode=HSC", method: "GET", keywords: ["health","safety","retail food"], feed_name: "CalCode Amendments", pillar: "food_safety" },
};

async function hashContent(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.slice(0, 5000));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkFeed(feedId: string, feedDef: FeedDef) {
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

    const upsertRow: Record<string, unknown> = {
      feed_id: feedId,
      feed_name: feedDef.feed_name,
      pillar: feedDef.pillar,
      status: result.status,
      last_checked_at: new Date().toISOString(),
      response_ms: result.responseMs,
      error_message: result.error,
      retry_count: result.status === "live" ? 0 : ((prev?.retry_count || 0) + 1),
      content_hash: result.hash || prev?.content_hash || null,
      auto_retry_at: autoRetryAt,
    };
    if (result.status === "live") {
      upsertRow.last_success_at = new Date().toISOString();
    }

    await supabase.from("crawl_health").upsert(upsertRow, { onConflict: "feed_id" });

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
