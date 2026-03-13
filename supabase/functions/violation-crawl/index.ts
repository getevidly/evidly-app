import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── VIOLATION-OUTREACH-01: Crawl public health inspection databases ──
// Identifies commercial kitchens with recent violations,
// scores relevance to EvidLY/CPP/Filta, inserts into violation_prospects.

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

// Violation keywords that map to offerings
const RELEVANT_KEYWORDS: Record<string, string[]> = {
  evidly: [
    "temperature", "cooling", "holding", "haccp", "food handler",
    "certification", "documentation", "record", "permit", "license",
    "employee health", "handwashing", "contamination", "cross-contamination",
    "time control", "date marking", "consumer advisory",
  ],
  cpp_hood_cleaning: [
    "hood", "grease", "exhaust", "ventilation", "fire suppression",
    "ansul", "suppression system", "fire safety", "fire hazard",
    "nfpa 96", "hood cleaning",
  ],
  filta_fryer: [
    "oil", "fryer", "grease disposal", "cooking oil", "deep fryer",
    "frying", "oil filtration",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: cron secret or service role
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (cronSecret !== expectedSecret && !authHeader.includes(serviceKey)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const targetCounty = body.county ?? null;

  // Get active crawl sources, oldest first
  let query = supabase
    .from("inspection_crawl_sources")
    .select("*")
    .eq("is_active", true)
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .limit(5);

  if (targetCounty) {
    query = query.eq("county", targetCounty);
  }

  const { data: sources } = await query;
  if (!sources?.length) {
    return jsonResponse({ ok: true, message: "No sources to crawl", crawled: 0 });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY not set" }, 500);
  }

  let totalInserted = 0;

  for (const source of sources) {
    try {
      // Fetch the inspection page
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(source.source_url, {
        headers: { "User-Agent": "EvidLY Compliance Research Bot/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${source.source_url}`);
      }

      const html = await response.text();

      // Use Claude Haiku to extract violation data
      const extractionRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `Extract recent food safety inspection violations from this health department page.
Return a JSON array of businesses with violations. For each business include:
- business_name (string)
- address (string)
- city (string)
- inspection_date (YYYY-MM-DD)
- violation_count (integer, total)
- critical_violation_count (integer)
- violation_descriptions (array of strings)
- phone (string or null)

Only include businesses with at least 1 violation in the last 90 days.
Return empty array [] if no violations found or page is a search form / landing page.
Return ONLY the JSON array, no other text.

Page content (truncated):
${html.slice(0, 8000)}`,
          }],
        }),
      });

      const extraction = await extractionRes.json();
      const extractedText = extraction?.content?.[0]?.text ?? "[]";

      let businesses: any[] = [];
      try {
        const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
        businesses = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        businesses = [];
      }

      // Score and insert each business
      for (const biz of businesses) {
        if (!biz.business_name || !biz.violation_count) continue;

        const violationText = (biz.violation_descriptions ?? []).join(" ").toLowerCase();
        const relevantOfferings: string[] = [];

        for (const [offering, keywords] of Object.entries(RELEVANT_KEYWORDS)) {
          if (keywords.some((kw) => violationText.includes(kw))) {
            relevantOfferings.push(offering);
          }
        }

        if (!relevantOfferings.length) continue;

        const relevanceScore = Math.min(
          100,
          (biz.critical_violation_count ?? 0) * 15 +
            (biz.violation_count ?? 0) * 5 +
            relevantOfferings.length * 20,
        );

        // Generate a brief violation summary
        const summaryRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            messages: [{
              role: "user",
              content: `Write a 2-sentence summary of these food safety violations for a sales outreach context. Be factual and professional. Violations: ${(biz.violation_descriptions ?? []).join(", ")}. Return only the summary.`,
            }],
          }),
        });

        const summaryData = await summaryRes.json();
        const violationSummary = summaryData?.content?.[0]?.text ?? "";

        // Determine violation types
        const violationTypes: string[] = [];
        if (/temperature|cooling|holding|time.control/i.test(violationText)) violationTypes.push("temperature_control");
        if (/pest|rodent|insect|vermin/i.test(violationText)) violationTypes.push("pest");
        if (/hood|fire|suppression|extinguisher|ansul/i.test(violationText)) violationTypes.push("fire_safety");
        if (/document|record|permit|license|certif/i.test(violationText)) violationTypes.push("documentation");
        if (/handwash|sanitiz|contaminat/i.test(violationText)) violationTypes.push("hygiene");

        await supabase.from("violation_prospects").upsert(
          {
            business_name: biz.business_name,
            address: biz.address ?? null,
            city: biz.city ?? null,
            county: source.county,
            phone: biz.phone ?? null,
            inspection_date: biz.inspection_date ?? null,
            inspection_source_url: source.source_url,
            violation_count: biz.violation_count,
            critical_violation_count: biz.critical_violation_count ?? 0,
            violation_summary: violationSummary,
            violation_types: violationTypes,
            relevant_offerings: relevantOfferings,
            relevance_score: relevanceScore,
            raw_inspection_data: biz,
          },
          { onConflict: "business_name,address", ignoreDuplicates: true },
        );

        totalInserted++;
      }

      // Update crawl source status
      await supabase
        .from("inspection_crawl_sources")
        .update({
          last_crawled_at: new Date().toISOString(),
          last_error: null,
          records_found_last_crawl: businesses.length,
        })
        .eq("id", source.id);
    } catch (err: any) {
      console.error(`[violation-crawl] Error crawling ${source.county}:`, err.message);
      await supabase
        .from("inspection_crawl_sources")
        .update({ last_error: err.message })
        .eq("id", source.id);
    }
  }

  return jsonResponse({
    ok: true,
    sources_crawled: sources.length,
    prospects_inserted: totalInserted,
  });
});
