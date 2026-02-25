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

/**
 * rfp-crawl — Scheduled crawl pipeline for RFP Intelligence Monitor
 *
 * Auth: x-cron-secret header OR authenticated admin user.
 * Fetches active rfp_sources, crawls their URLs, and inserts new rfp_listings.
 * Deduplicates on dedup_hash (SHA-256 of title+entity+posted_date).
 *
 * Rate limit: max 5 sources per invocation, 2s delay between fetches.
 * Sources rotate via last_crawled_at ASC ordering (oldest first).
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

  // ── Parse optional body ─────────────────────────────────
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const maxSources = (body.max_sources as number) || 5;

  // ── Fetch active sources ────────────────────────────────
  const { data: sources, error: srcErr } = await supabase
    .from("rfp_sources")
    .select("*")
    .eq("status", "active")
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .limit(maxSources);

  if (srcErr) {
    console.error("[rfp-crawl] Failed to fetch sources:", srcErr);
    return jsonResponse({ error: srcErr.message }, 500);
  }

  if (!sources || sources.length === 0) {
    return jsonResponse({ sources_crawled: 0, new_rfps: 0, errors: 0 });
  }

  // ── Crawl each source ───────────────────────────────────
  let totalNew = 0;
  let totalErrors = 0;

  for (const source of sources) {
    try {
      const candidates = await crawlSource(source);
      let newCount = 0;

      for (const candidate of candidates) {
        // Compute dedup hash
        const hashInput = `${candidate.title}|${candidate.issuing_entity}|${candidate.posted_date ?? ""}`;
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const dedupHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        // Insert with ON CONFLICT skip
        const { error: insertErr } = await supabase
          .from("rfp_listings")
          .insert({
            source_id: source.id,
            title: candidate.title,
            description: candidate.description ?? null,
            issuing_entity: candidate.issuing_entity,
            entity_type: candidate.entity_type ?? source.source_type === "k12" ? "school_district" :
              source.source_type === "healthcare" ? "healthcare_system" :
              source.coverage === "national" ? "federal" : "state",
            state: candidate.state ?? (source.states_covered as string[])?.[0] ?? null,
            county: candidate.county ?? null,
            city: candidate.city ?? null,
            url: candidate.url ?? null,
            document_urls: candidate.document_urls ?? [],
            posted_date: candidate.posted_date ?? null,
            due_date: candidate.due_date ?? null,
            estimated_value: candidate.estimated_value ?? null,
            naics_code: candidate.naics_code ?? null,
            set_aside_type: candidate.set_aside_type ?? null,
            status: "open",
            raw_content: candidate.raw_content ?? null,
            dedup_hash: dedupHash,
          });

        if (insertErr) {
          // Unique constraint violation = duplicate, skip silently
          if (insertErr.code === "23505") continue;
          console.error(`[rfp-crawl] Insert error for "${candidate.title}":`, insertErr);
        } else {
          newCount++;
        }
      }

      // Update source metadata
      await supabase
        .from("rfp_sources")
        .update({
          last_crawled_at: new Date().toISOString(),
          status: "active",
        })
        .eq("id", source.id);

      totalNew += newCount;
      console.log(`[rfp-crawl] ${source.name}: ${candidates.length} found, ${newCount} new`);

      // Rate limit: 2s between sources
      if (sources.indexOf(source) < sources.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      totalErrors++;
      const errMsg = (err as Error).message ?? String(err);
      console.error(`[rfp-crawl] Error crawling ${source.name}:`, errMsg);

      await supabase
        .from("rfp_sources")
        .update({
          last_crawled_at: new Date().toISOString(),
          status: "error",
        })
        .eq("id", source.id);
    }
  }

  return jsonResponse({
    sources_crawled: sources.length,
    new_rfps: totalNew,
    errors: totalErrors,
  });
});

// ── Source-specific crawlers ──────────────────────────────

interface CrawlCandidate {
  title: string;
  description?: string;
  issuing_entity: string;
  entity_type?: string;
  state?: string;
  county?: string;
  city?: string;
  url?: string;
  document_urls?: string[];
  posted_date?: string;
  due_date?: string;
  estimated_value?: number;
  naics_code?: string;
  set_aside_type?: string;
  raw_content?: string;
}

/**
 * Crawl a single source. Dispatches to the appropriate method
 * based on source config (API, RSS, or web scrape).
 */
async function crawlSource(source: Record<string, unknown>): Promise<CrawlCandidate[]> {
  const config = (source.config_json ?? {}) as Record<string, unknown>;
  const apiEndpoint = config.api_endpoint as string | undefined;

  // SAM.gov API
  if (apiEndpoint?.includes("api.sam.gov")) {
    return crawlSamGov(source, config);
  }

  // Generic RSS / Atom feed
  if (config.method === "rss" || (source.url as string)?.includes("/rss")) {
    return crawlRssFeed(source, config);
  }

  // Default: attempt a simple fetch + parse for links
  return crawlGenericHtml(source, config);
}

/**
 * SAM.gov API crawler.
 * Uses the Opportunities API v2 with NAICS and keyword filters.
 */
async function crawlSamGov(
  source: Record<string, unknown>,
  config: Record<string, unknown>,
): Promise<CrawlCandidate[]> {
  const apiKey = Deno.env.get("SAM_GOV_API_KEY") ?? (config.api_key_env as string);
  if (!apiKey) {
    console.warn("[rfp-crawl] SAM.gov API key not configured, skipping");
    return [];
  }

  const naicsFilter = (config.naics_filter as string[]) ?? ["722310", "722511", "722514"];
  const keywords = (config.keywords as string[]) ?? ["food service", "kitchen compliance"];

  const params = new URLSearchParams({
    api_key: apiKey,
    postedFrom: getDateDaysAgo(7),
    postedTo: getToday(),
    ncode: naicsFilter.join(","),
    limit: "50",
    offset: "0",
  });

  if (keywords.length > 0) {
    params.set("q", keywords.join(" OR "));
  }

  const url = `https://api.sam.gov/opportunities/v2/search?${params}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    throw new Error(`SAM.gov API returned ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  const opportunities = (data.opportunitiesData ?? data.opportunities ?? []) as Record<string, unknown>[];

  return opportunities.map(opp => ({
    title: (opp.title as string) ?? "Untitled",
    description: (opp.description as string) ?? (opp.additionalInfoDescription as string) ?? null,
    issuing_entity: (opp.fullParentPathName as string) ?? (opp.departmentName as string) ?? "Federal Agency",
    entity_type: "federal",
    state: (opp.officeAddress as Record<string, string>)?.state ?? null,
    url: `https://sam.gov/opp/${opp.noticeId ?? opp.opportunityId}`,
    posted_date: (opp.postedDate as string) ?? null,
    due_date: (opp.responseDeadLine as string) ?? (opp.archiveDate as string) ?? null,
    naics_code: (opp.naicsCode as string) ?? naicsFilter[0],
    set_aside_type: mapSamSetAside((opp.typeOfSetAside as string) ?? null),
    raw_content: JSON.stringify(opp).slice(0, 5000),
  })) as CrawlCandidate[];
}

function mapSamSetAside(sa: string | null): string | null {
  if (!sa) return null;
  const lower = sa.toLowerCase();
  if (lower.includes("sdvosb") || lower.includes("service-disabled")) return "sdvosb";
  if (lower.includes("veteran")) return "veteran";
  if (lower.includes("8(a)") || lower.includes("8a")) return "8a";
  if (lower.includes("hubzone")) return "hubzone";
  if (lower.includes("wosb") || lower.includes("women")) return "wosb";
  if (lower.includes("small business") || lower.includes("sba")) return "small_business";
  return "unknown";
}

/** RSS/Atom feed crawler */
async function crawlRssFeed(
  source: Record<string, unknown>,
  config: Record<string, unknown>,
): Promise<CrawlCandidate[]> {
  const feedUrl = (config.crawl_url as string) ?? (source.url as string);
  const resp = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);

  const xml = await resp.text();
  const candidates: CrawlCandidate[] = [];

  // Simple XML extraction for <item> or <entry> blocks
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const description = extractTag(block, "description") ?? extractTag(block, "summary");
    const link = extractTag(block, "link") ?? extractAttr(block, "link", "href");
    const pubDate = extractTag(block, "pubDate") ?? extractTag(block, "published");

    if (title) {
      candidates.push({
        title,
        description: description?.replace(/<[^>]+>/g, "").slice(0, 2000),
        issuing_entity: (source.name as string) ?? "Unknown",
        url: link ?? undefined,
        posted_date: pubDate ? new Date(pubDate).toISOString() : undefined,
        state: ((source.states_covered as string[]) ?? [])[0],
        raw_content: block.slice(0, 3000),
      });
    }
  }

  return candidates;
}

/** Generic HTML scraper — extracts links and text from listing pages */
async function crawlGenericHtml(
  source: Record<string, unknown>,
  _config: Record<string, unknown>,
): Promise<CrawlCandidate[]> {
  const pageUrl = (source.url as string);
  const resp = await fetch(pageUrl, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "EvidLY-RFP-Monitor/1.0" },
  });
  if (!resp.ok) throw new Error(`HTML fetch failed: ${resp.status}`);

  const html = await resp.text();
  const candidates: CrawlCandidate[] = [];

  // Extract links that look like RFP/bid listings
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const href = linkMatch[1];
    const text = linkMatch[2].replace(/<[^>]+>/g, "").trim();
    if (text.length > 20 && text.length < 500 && looksLikeRfp(text)) {
      candidates.push({
        title: text.slice(0, 200),
        issuing_entity: (source.name as string) ?? "Unknown",
        url: href.startsWith("http") ? href : `${pageUrl}${href}`,
        state: ((source.states_covered as string[]) ?? [])[0],
      });
    }
  }

  return candidates.slice(0, 25); // Cap to prevent runaway results
}

function looksLikeRfp(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = ["rfp", "rfq", "rfi", "bid", "solicitation", "procurement", "contract", "food service", "kitchen", "compliance"];
  return keywords.some(kw => lower.includes(kw));
}

// ── Utility functions ─────────────────────────────────────

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = regex.exec(xml);
  return m ? (m[1] ?? m[2])?.trim() ?? null : null;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, "i");
  const m = regex.exec(xml);
  return m?.[1] ?? null;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
