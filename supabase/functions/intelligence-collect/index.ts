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
  type: "json_api" | "web_page";
  category: string;
  defaultSeverity: string;
  defaultScope: string;
  pillar: string[];
  promptContext?: string;
}

const INTELLIGENCE_SOURCES: IntelligenceSource[] = [
  // ══════ FOOD SAFETY (9 sources) ══════
  { id: "openfda_enforcement", name: "openFDA Food Enforcement (Recalls)", url: "https://api.fda.gov/food/enforcement.json",
    params: { search: 'status:"Ongoing"', limit: 5, sort: "report_date:desc" },
    type: "json_api", category: "recall_alert", defaultSeverity: "critical", defaultScope: "national", pillar: ["food_safety"] },
  { id: "openfda_class1", name: "openFDA Class I Recalls (Most Dangerous)", url: "https://api.fda.gov/food/enforcement.json",
    params: { search: 'classification:"Class I" AND status:"Ongoing"', limit: 5, sort: "report_date:desc" },
    type: "json_api", category: "recall_alert", defaultSeverity: "critical", defaultScope: "national", pillar: ["food_safety"] },
  { id: "openfda_adverse_events", name: "openFDA Food Adverse Events", url: "https://api.fda.gov/food/event.json",
    params: { limit: 5, sort: "date_started:desc" },
    type: "json_api", category: "outbreak_alert", defaultSeverity: "high", defaultScope: "national", pillar: ["food_safety"] },
  { id: "usda_fsis_recalls", name: "USDA FSIS Meat & Poultry Recalls", url: "https://www.fsis.usda.gov/recalls",
    type: "web_page", category: "recall_alert", defaultSeverity: "critical", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "Focus on USDA FSIS meat, poultry, and egg product recalls. Identify products commonly used in California commercial kitchens." },
  { id: "cdc_foodborne", name: "CDC Foodborne Illness Outbreak Reports",
    url: "https://tools.cdc.gov/api/v2/resources/media?topic=food+safety&language=english&max=5&sort=-datepublished",
    type: "json_api", category: "outbreak_alert", defaultSeverity: "high", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "Focus on foodborne illness outbreaks. Identify pathogen, food vehicle, and prevention measures for commercial kitchens." },
  { id: "cdph_outbreaks", name: "California Dept of Public Health Outbreak Investigations",
    url: "https://www.cdph.ca.gov/Programs/CID/DCDC/Pages/Outbreaks.aspx",
    type: "web_page", category: "outbreak_alert", defaultSeverity: "high", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California-specific outbreak investigations. Focus on outbreaks affecting food service operations." },
  { id: "cdfa_recalls", name: "California Dept of Food & Agriculture Recalls", url: "https://www.cdfa.ca.gov/ahfss/",
    type: "web_page", category: "recall_alert", defaultSeverity: "high", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California agricultural product recalls and safety alerts for commercial kitchen ingredients." },
  { id: "foodsafetygov_alerts", name: "FoodSafety.gov Consolidated Alerts", url: "https://www.foodsafety.gov/recalls-and-outbreaks",
    type: "web_page", category: "recall_alert", defaultSeverity: "high", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "Consolidated federal food safety recalls and outbreak alerts. Cross-reference with California distribution." },
  { id: "ca_retail_food_code", name: "California Retail Food Code Enforcement", url: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx",
    type: "web_page", category: "enforcement_surge", defaultSeverity: "medium", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "CalCode enforcement actions and updates. Focus on common violations in commercial kitchens." },
  // ══════ FACILITY SAFETY (5 sources) ══════
  { id: "ca_fire_marshal", name: "California State Fire Marshal Bulletins", url: "https://osfm.fire.ca.gov/divisions/fire-engineering-and-investigations/",
    type: "web_page", category: "nfpa_update", defaultSeverity: "high", defaultScope: "regional", pillar: ["facility_safety"],
    promptContext: "CA State Fire Marshal bulletins on commercial kitchen facility safety, hood/duct systems, NFPA 96 compliance, and suppression systems." },
  { id: "nfpa_updates", name: "NFPA Alerts & Code Updates", url: "https://www.nfpa.org/news-blogs-and-articles/nfpa-journal",
    type: "web_page", category: "nfpa_update", defaultSeverity: "medium", defaultScope: "national", pillar: ["facility_safety"],
    promptContext: "NFPA code updates. Focus on NFPA 96 (commercial kitchen hoods/ducts), NFPA 17A (wet chemical suppression), NFPA 1 (Fire Code)." },
  { id: "calfire_incidents", name: "Cal Fire Incidents Affecting Commercial Structures", url: "https://www.fire.ca.gov/incidents",
    type: "web_page", category: "seasonal_risk", defaultSeverity: "medium", defaultScope: "regional", pillar: ["facility_safety"],
    promptContext: "Cal Fire incidents affecting commercial buildings and restaurants. Identify facility safety lessons for kitchen operators." },
  { id: "local_fire_citations", name: "Local Fire Dept Inspection Citations — Fresno, Merced, Stanislaus, Sacramento, LA",
    url: "https://data.ca.gov/dataset/fire-incidents",
    type: "web_page", category: "inspection_trend", defaultSeverity: "medium", defaultScope: "local", pillar: ["facility_safety"],
    promptContext: "Fire inspection citations in Fresno, Merced, Stanislaus, Sacramento, and Los Angeles counties. Focus on commercial kitchen violations." },
  { id: "ikeca_bulletins", name: "IKECA Bulletins & Standards Updates", url: "https://www.ikeca.org/page/News",
    type: "web_page", category: "nfpa_update", defaultSeverity: "medium", defaultScope: "national", pillar: ["facility_safety"],
    promptContext: "IKECA kitchen exhaust cleaning standards and bulletins. Focus on cleaning frequency, documentation, and compliance." },
  // ══════ REGULATORY & LEGISLATIVE (7 sources) ══════
  { id: "ca_legislature_food", name: "California Legislature Food Service Bills",
    url: "https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml?session_year=20252026&keyword=food+safety&house=Both",
    type: "web_page", category: "regulatory_change", defaultSeverity: "medium", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California legislative bills affecting food service. Focus on new requirements, compliance deadlines, and financial impact." },
  { id: "cal_osha_citations", name: "Cal/OSHA Food Service Citations", url: "https://www.dir.ca.gov/dosh/citation-search.html",
    type: "web_page", category: "enforcement_surge", defaultSeverity: "high", defaultScope: "regional", pillar: ["food_safety", "facility_safety"],
    promptContext: "Cal/OSHA citations in food service. Focus on kitchen safety violations, burn prevention, slip/fall hazards, chemical exposure." },
  { id: "epa_grease_violations", name: "EPA Grease Trap & Environmental Violations", url: "https://echo.epa.gov/",
    type: "web_page", category: "enforcement_surge", defaultSeverity: "medium", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "EPA environmental violations in food service. Focus on grease trap compliance, FOG discharge, wastewater violations." },
  { id: "abc_license_actions", name: "ABC License Actions Affecting Food Service",
    url: "https://www.abc.ca.gov/licensing/licensing-reports/disciplinary-action/",
    type: "web_page", category: "enforcement_surge", defaultSeverity: "medium", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California ABC license actions. Focus on food service establishments and compliance implications." },
  { id: "ca_dir_wage", name: "CA DIR Wage Violations in Food Service", url: "https://www.dir.ca.gov/dlse/BOFE_LCOlist.htm",
    type: "web_page", category: "enforcement_surge", defaultSeverity: "medium", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California wage and hour violations in food service. Focus on compliance requirements and penalty trends." },
  { id: "nsf_alerts", name: "NSF International Food Safety Alerts", url: "https://www.nsf.org/consumer-resources/food-safety",
    type: "web_page", category: "recall_alert", defaultSeverity: "medium", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "NSF International food safety alerts and equipment certification updates for commercial kitchen equipment." },
  { id: "servsafe_updates", name: "ServSafe & Food Handler Certification Updates", url: "https://www.servsafe.com/",
    type: "web_page", category: "regulatory_change", defaultSeverity: "low", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "ServSafe certification updates. Focus on certification requirements and California-specific food handler rules." },
  // ══════ WEATHER & OPERATIONAL (3 sources) ══════
  { id: "nws_heat_ca", name: "NWS Heat Advisories — Central Valley", url: "https://api.weather.gov/alerts/active?area=CA",
    type: "json_api", category: "seasonal_risk", defaultSeverity: "medium", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "NWS heat advisories for California. Focus on food safety implications: cold chain, equipment strain, worker safety." },
  { id: "usda_commodity", name: "USDA Commodity Price Alerts", url: "https://marketnews.usda.gov/mnp/fv-nav-byCom?type=retail",
    type: "web_page", category: "seasonal_risk", defaultSeverity: "low", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "USDA commodity price alerts. Focus on food cost impacts for California commercial kitchens." },
  { id: "ca_drought", name: "California Drought & Water Restriction Updates", url: "https://drought.ca.gov/",
    type: "web_page", category: "seasonal_risk", defaultSeverity: "medium", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California drought and water restrictions. Focus on commercial kitchen operations: water conservation, sanitation compliance." },
  // ══════ INDUSTRY INTELLIGENCE (5 sources) ══════
  { id: "cra_announcements", name: "California Restaurant Association Announcements", url: "https://www.calrest.org/news",
    type: "web_page", category: "regulatory_change", defaultSeverity: "low", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "CRA news and announcements. Focus on regulatory changes, industry trends for CA restaurant operators." },
  { id: "nra_safety", name: "National Restaurant Association Safety & Compliance",
    url: "https://restaurant.org/research-and-media/media/newsroom/",
    type: "web_page", category: "regulatory_change", defaultSeverity: "low", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "NRA safety and compliance announcements. Focus on industry-wide safety standards and best practices." },
  { id: "cpsc_kitchen_recalls", name: "CPSC Kitchen Equipment Recalls (NSF, ANSI, UL)",
    url: "https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=2025-01-01",
    type: "json_api", category: "recall_alert", defaultSeverity: "high", defaultScope: "national", pillar: ["facility_safety", "food_safety"],
    promptContext: "CPSC product recalls for kitchen equipment. Filter for commercial cooking equipment, appliances, facility safety devices." },
  { id: "kitchen_ventilation", name: "Commercial Kitchen Ventilation & Exhaust Technical Bulletins",
    url: "https://www.ashrae.org/about/news",
    type: "web_page", category: "nfpa_update", defaultSeverity: "low", defaultScope: "national", pillar: ["facility_safety"],
    promptContext: "ASHRAE ventilation/exhaust bulletins. Focus on commercial kitchen hood systems, make-up air, NFPA 96 compliance." },
  { id: "nafem_alerts", name: "Food Equipment Manufacturers Association Product Alerts", url: "https://www.nafem.org/all-news/",
    type: "web_page", category: "recall_alert", defaultSeverity: "medium", defaultScope: "national", pillar: ["food_safety", "facility_safety"],
    promptContext: "NAFEM product alerts. Focus on food equipment recalls, safety updates, and technology changes for commercial kitchens." },
  // ══════ REGULATORY UPDATES (8 sources) — feed Regulatory Updates page ══════
  { id: "federal_register_food", name: "Federal Register Food Safety Final Rules", url: "https://www.federalregister.gov/api/v1/documents?conditions%5Bagencies%5D%5B%5D=food-and-drug-administration&conditions%5Btype%5D%5B%5D=RULE&conditions%5Btopics%5D%5B%5D=food-safety&per_page=5&order=newest",
    type: "json_api", category: "regulatory_updates", defaultSeverity: "high", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "Federal Register final rules from FDA affecting food safety. Focus on new compliance requirements, effective dates, and impact on California commercial kitchens." },
  { id: "federal_register_proposed", name: "Federal Register Proposed Food Safety Rules", url: "https://www.federalregister.gov/api/v1/documents?conditions%5Bagencies%5D%5B%5D=food-and-drug-administration&conditions%5Btype%5D%5B%5D=PRORULE&conditions%5Btopics%5D%5B%5D=food-safety&per_page=5&order=newest",
    type: "json_api", category: "regulatory_updates", defaultSeverity: "medium", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "Federal Register proposed rules from FDA affecting food safety. Focus on upcoming regulatory changes operators should prepare for." },
  { id: "fda_import_alerts", name: "FDA Import Alerts for Food Products", url: "https://api.fda.gov/food/enforcement.json",
    params: { search: 'status:"Ongoing" AND distribution_pattern:"nationwide"', limit: 3, sort: "report_date:desc" },
    type: "json_api", category: "regulatory_updates", defaultSeverity: "medium", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "FDA import alerts and enforcement actions for food products. Focus on imported ingredients commonly used in California commercial kitchens." },
  { id: "ca_oal_food", name: "California Office of Administrative Law — Food Safety Regulations", url: "https://oal.ca.gov/rulemaking/",
    type: "web_page", category: "regulatory_updates", defaultSeverity: "high", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California OAL rulemaking actions affecting food safety, health and safety code, and restaurant operations. Focus on new regulatory requirements and compliance deadlines." },
  { id: "ca_hsc_amendments", name: "California Health & Safety Code Amendments", url: "https://leginfo.legislature.ca.gov/faces/codes.xhtml?codes=hsc&division=104&part=7",
    type: "web_page", category: "regulatory_updates", defaultSeverity: "high", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California Health & Safety Code Part 7 (California Retail Food Code) amendments. Focus on changes to food facility requirements, inspection standards, and compliance obligations." },
  { id: "ca_water_board_fog", name: "State Water Board FOG Regulations", url: "https://www.waterboards.ca.gov/water_issues/programs/",
    type: "web_page", category: "regulatory_updates", defaultSeverity: "medium", defaultScope: "regional", pillar: ["food_safety"],
    promptContext: "California State Water Resources Control Board regulations on Fats, Oils, and Grease (FOG). Focus on grease trap requirements, FOG management plans, and wastewater discharge compliance for commercial kitchens." },
  { id: "ca_fire_code_adoption", name: "California Fire Code Adoption Updates", url: "https://osfm.fire.ca.gov/what-we-do/code-development-and-analysis/",
    type: "web_page", category: "regulatory_updates", defaultSeverity: "high", defaultScope: "regional", pillar: ["facility_safety"],
    promptContext: "California State Fire Marshal code adoption updates. Focus on California Fire Code Title 24 Part 9, NFPA 96 adoption timeline, and new facility safety requirements for commercial kitchens." },
  { id: "fda_food_code_updates", name: "FDA Model Food Code Updates", url: "https://www.fda.gov/food/retail-food-protection/fda-food-code",
    type: "web_page", category: "regulatory_updates", defaultSeverity: "medium", defaultScope: "national", pillar: ["food_safety"],
    promptContext: "FDA Model Food Code updates and supplements. Focus on changes that California and local jurisdictions are likely to adopt, and new best practices for food safety in commercial kitchens." },
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

function buildUserPrompt(rawData: any, source: IntelligenceSource): string {
  const ctx = source.promptContext ? `\nSource-specific context: ${source.promptContext}` : "";
  const pillarHint = source.pillar.includes("facility_safety")
    ? "\nThis is a FACILITY SAFETY source — reference NFPA 96, CalCode Title 19, and fire suppression systems."
    : "\nThis is a FOOD SAFETY source — reference CalCode, FDA Food Code, and HACCP principles.";
  const rawJson = JSON.stringify(rawData, null, 2).slice(0, 3000);
  return `Transform this raw ${source.name} alert into an EvidLY intelligence insight for California \
commercial kitchen operators.${ctx}${pillarHint}

Raw data:
${rawJson}

Return a JSON object with these exact fields:
{
  "title": "string — clear, specific, newsworthy headline (max 100 chars)",
  "summary": "string — 2-3 sentence executive summary of what happened and why it matters",
  "category": "recall_alert|outbreak_alert|enforcement_surge|regulatory_change|regulatory_updates|inspection_trend|nfpa_update|seasonal_risk",
  "severity": "critical|high|medium|low|info",
  "scope": "local|regional|national",
  "affected_counties": ["array of California county names in lowercase, e.g. 'fresno', 'los_angeles'"],
  "full_analysis": "string — 3-5 paragraphs of detailed analysis for operators",
  "key_findings": ["array of 3-5 specific findings"],
  "action_items": ["array of 5-8 specific actions operators should take"],
  "pillars": ${JSON.stringify(source.pillar)},
  "estimated_cost_low": number (dollars),
  "estimated_cost_high": number (dollars),
  "cost_basis": "string — e.g. 'per affected location'",
  "tags": ["array of relevant tags"],
  "source_name": "${source.name}",
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

// ── Shared Fetch Headers ──────────────────────────────────────

const FETCH_HEADERS = {
  "User-Agent": "EvidLY-Intelligence/1.0 (compliance-monitoring; contact@getevidly.com)",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Web Page Fetcher (generic) ────────────────────────────────

async function fetchWebContent(source: IntelligenceSource): Promise<{ items: any[]; raw: any }> {
  const res = await fetch(source.url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`${source.name} HTTP ${res.status}`);
  const html = await res.text();
  const text = stripHtml(html).slice(0, 4000);
  const today = new Date().toISOString().slice(0, 10);
  return {
    items: [{
      title: `${source.name} — Daily Intelligence Scan`,
      description: text.slice(0, 500),
      content: text,
      source_url: `web:${source.id}:${today}`,
    }],
    raw: { url: source.url, textLength: text.length },
  };
}

// ── CDC Content API Fetcher ───────────────────────────────────

async function fetchCdcContent(source: IntelligenceSource): Promise<{ items: any[]; raw: any }> {
  const res = await fetch(source.url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CDC API HTTP ${res.status}`);
  const data = await res.json();
  const results = data.results || [];
  const items = results.slice(0, 5).map((r: any) => ({
    title: r.name || r.title || "CDC Alert",
    description: stripHtml(r.description || "").slice(0, 500),
    date: r.datePublished || r.dateModified || "",
    source_url: `cdc:${r.id || ""}:${r.datePublished || ""}`,
  }));
  return { items, raw: data };
}

// ── NWS Alerts API Fetcher ────────────────────────────────────

async function fetchNwsAlerts(source: IntelligenceSource): Promise<{ items: any[]; raw: any }> {
  const res = await fetch(source.url, {
    headers: { ...FETCH_HEADERS, "Accept": "application/geo+json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`NWS API HTTP ${res.status}`);
  const data = await res.json();
  const features = (data.features || [])
    .filter((f: any) => {
      const event = (f.properties?.event || "").toLowerCase();
      return event.includes("heat") || event.includes("fire") || event.includes("wind") || event.includes("red flag");
    })
    .slice(0, 5);
  const items = features.map((f: any) => {
    const p = f.properties || {};
    return {
      title: p.headline || p.event || "Weather Alert",
      description: (p.description || "").slice(0, 800),
      severity: p.severity || "", event: p.event || "",
      areaDesc: p.areaDesc || "",
      effective: p.effective || "", expires: p.expires || "",
      source_url: `nws:${p.id || ""}:${p.effective || ""}`,
    };
  });
  return { items, raw: data };
}

// ── CPSC Recalls API Fetcher ──────────────────────────────────

async function fetchCpscRecalls(source: IntelligenceSource): Promise<{ items: any[]; raw: any }> {
  const res = await fetch(source.url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CPSC API HTTP ${res.status}`);
  const data = await res.json();
  const all = Array.isArray(data) ? data : data.results || [];
  const recalls = all
    .filter((r: any) => {
      const desc = ((r.Description || "") + " " + (r.Title || "")).toLowerCase();
      return desc.includes("kitchen") || desc.includes("cook") || desc.includes("oven") ||
        desc.includes("grill") || desc.includes("fryer") || desc.includes("food") ||
        desc.includes("refrigerat") || desc.includes("freezer") || desc.includes("stove") ||
        desc.includes("range") || desc.includes("dishwash") || desc.includes("ventilat") ||
        desc.includes("hood") || desc.includes("fire extinguish") || desc.includes("suppression");
    })
    .slice(0, 5);
  const items = recalls.map((r: any) => ({
    title: r.Title || (r.Description || "").slice(0, 100) || "Kitchen Equipment Recall",
    description: r.Description || "",
    recallNumber: r.RecallNumber || r.RecallID || "",
    recallDate: r.RecallDate || "",
    source_url: `cpsc:${r.RecallNumber || r.RecallID || ""}`,
  }));
  return { items, raw: data };
}

// ── Federal Register API Fetcher ──────────────────────────────

async function fetchFederalRegister(source: IntelligenceSource): Promise<{ items: any[]; raw: any }> {
  const res = await fetch(source.url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Federal Register API HTTP ${res.status}`);
  const data = await res.json();
  const results = data.results || [];
  const items = results.slice(0, 5).map((r: any) => ({
    title: r.title || "Federal Register Document",
    description: (r.abstract || r.title || "").slice(0, 800),
    document_number: r.document_number || "",
    publication_date: r.publication_date || "",
    type: r.type || "",
    agencies: (r.agencies || []).map((a: any) => a.name).join(", "),
    effective_on: r.effective_on || "",
    source_url: `federal_register:${r.document_number || ""}:${r.publication_date || ""}`,
  }));
  return { items, raw: data };
}

// ── Source Dispatcher ─────────────────────────────────────────

async function fetchSource(source: IntelligenceSource): Promise<{ items: any[]; raw: any }> {
  // Source-specific fetchers for known API formats
  switch (source.id) {
    case "openfda_enforcement":
    case "openfda_class1":
    case "fda_import_alerts":
      return fetchOpenFDAEnforcement(source);
    case "openfda_adverse_events":
      return fetchOpenFDAAdverseEvents(source);
    case "cdc_foodborne":
      return fetchCdcContent(source);
    case "nws_heat_ca":
      return fetchNwsAlerts(source);
    case "cpsc_kitchen_recalls":
      return fetchCpscRecalls(source);
    case "federal_register_food":
    case "federal_register_proposed":
      return fetchFederalRegister(source);
  }
  // Generic fetcher by type
  if (source.type === "web_page") return fetchWebContent(source);
  // Fallback for json_api without a specific fetcher — use generic web fetch
  if (source.type === "json_api") return fetchWebContent({ ...source, type: "web_page" });
  throw new Error(`No fetcher for source: ${source.id} (type: ${source.type})`);
}

// ── Claude Analysis ──────────────────────────────────────────

async function analyzeWithClaude(
  apiKey: string,
  source: IntelligenceSource,
  rawItem: any,
): Promise<{ result: any | null; error?: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(rawItem, source) }],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(
      `[intelligence-collect] Claude API error: HTTP ${res.status} | headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()))}`,
    );
    console.error('[intelligence-collect] Claude API 400 body:', errorBody);
    return { result: null, error: `HTTP ${res.status}: ${errorBody.slice(0, 300)}` };
  }

  const data = await res.json();
  const text = data.content
    ?.filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("") || "";

  try {
    return { result: JSON.parse(text) };
  } catch {
    // Try to extract JSON from response if wrapped in markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return { result: JSON.parse(jsonMatch[0]) };
      } catch {
        return { result: null, error: `JSON parse failed. Raw (first 300): ${text.slice(0, 300)}` };
      }
    }
    return { result: null, error: `No JSON in response. Raw (first 300): ${text.slice(0, 300)}` };
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
    enforcement_surge: "enforcement",
    regulatory_change: "regulatory",
    regulatory_updates: "regulatory",
    inspection_trend: "inspection",
    nfpa_update: "facility_safety",
    seasonal_risk: "weather",
  };
  return map[category] || category;
}

// ── Types for email summary ──────────────────────────────────

interface NewInsightSummary {
  title: string;
  severity: string;
  source: string;
}

// ── Concurrency Limiter ─────────────────────────────────────

/** Run async tasks with a concurrency ceiling. Returns PromiseSettledResult[] in input order. */
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
  );
  return results;
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

  const errors: string[] = [];
  const sourceResults: Record<string, { fetched: number; new: number; skipped: number; error?: string }> = {};
  const newInsights: NewInsightSummary[] = [];

  // ── Phase 1: Parallel fetch ALL sources ────────────────────
  // Each source has its own internal timeout (8-10s) so we can fire them all at once.
  console.log(`[intelligence-collect] Phase 1: fetching ${INTELLIGENCE_SOURCES.length} sources in parallel`);

  type FetchedItem = { source: IntelligenceSource; item: any };
  const allItems: FetchedItem[] = [];

  const fetchSettled = await Promise.allSettled(
    INTELLIGENCE_SOURCES.map((source) =>
      fetchSource(source).then((result) => ({ source, ...result }))
    ),
  );

  for (let i = 0; i < fetchSettled.length; i++) {
    const source = INTELLIGENCE_SOURCES[i];
    const result = fetchSettled[i];
    sourceResults[source.id] = { fetched: 0, new: 0, skipped: 0 };

    if (result.status === "fulfilled") {
      const { items } = result.value;
      sourceResults[source.id].fetched = items.length;
      for (const item of items) {
        if (item.source_url) {
          allItems.push({ source, item });
        } else {
          sourceResults[source.id].skipped++;
        }
      }
    } else {
      const errMsg = (result.reason as Error).message || "Unknown error";
      sourceResults[source.id].error = errMsg;
      errors.push(`${source.id}: ${errMsg}`);
      console.error(`[intelligence-collect] ${source.id} fetch error:`, errMsg);
    }
  }

  console.log(
    `[intelligence-collect] Phase 1 done: ${allItems.length} items from ${fetchSettled.filter((r) => r.status === "fulfilled").length}/${INTELLIGENCE_SOURCES.length} sources`,
  );

  // ── Phase 2: Batch dedup — one DB round-trip per chunk ─────
  // Query all source_urls at once instead of N individual queries.
  const existingUrls = new Set<string>();

  if (allItems.length > 0) {
    const sourceUrls = allItems.map((fi) => fi.item.source_url);
    const CHUNK = 100; // Supabase .in() safe limit
    const dedupChunks: Promise<void>[] = [];

    for (let i = 0; i < sourceUrls.length; i += CHUNK) {
      const chunk = sourceUrls.slice(i, i + CHUNK);
      dedupChunks.push(
        supabase
          .from("intelligence_insights")
          .select("source_url")
          .in("source_url", chunk)
          .then(({ data }: { data: any[] | null }) => {
            if (data) for (const row of data) existingUrls.add(row.source_url);
          }),
      );
    }
    await Promise.all(dedupChunks);
  }

  // Split items into new vs. already-seen
  const newItems: FetchedItem[] = [];
  for (const fi of allItems) {
    if (existingUrls.has(fi.item.source_url)) {
      sourceResults[fi.source.id].skipped++;
    } else {
      newItems.push(fi);
    }
  }

  console.log(
    `[intelligence-collect] Phase 2 done: ${newItems.length} new, ${allItems.length - newItems.length} deduped`,
  );

  // ── Phase 3: Parallel Claude analysis (concurrency = 5) ────
  // 5 concurrent Claude calls balances throughput vs. rate-limit headroom.
  const CLAUDE_CONCURRENCY = 5;
  type AnalysisResult = { fi: FetchedItem; insight: any; severity: string };
  const analysisResults: AnalysisResult[] = [];

  if (newItems.length > 0 && !isTimedOut()) {
    const analysisTasks = newItems.map((fi) => async (): Promise<AnalysisResult | null> => {
      if (isTimedOut()) return null;
      const { result: insight, error: claudeErr } = await analyzeWithClaude(anthropicKey, fi.source, fi.item);
      if (!insight) {
        sourceResults[fi.source.id].skipped++;
        errors.push(`${fi.source.id}: ${claudeErr || "Claude returned null"} — "${(fi.item.title || "").slice(0, 60)}"`);
        return null;
      }
      return { fi, insight, severity: insight.severity || fi.source.defaultSeverity };
    });

    console.log(`[intelligence-collect] Phase 3: analyzing ${newItems.length} items (concurrency=${CLAUDE_CONCURRENCY})`);
    const analysisSettled = await parallelLimit(analysisTasks, CLAUDE_CONCURRENCY);

    for (const r of analysisSettled) {
      if (r.status === "fulfilled" && r.value) {
        analysisResults.push(r.value);
      } else if (r.status === "rejected") {
        errors.push(`Claude analysis error: ${(r.reason as Error).message || "Unknown"}`);
      }
    }
  }

  console.log(`[intelligence-collect] Phase 3 done: ${analysisResults.length} insights generated`);

  // ── Phase 4: Batch insert ──────────────────────────────────
  // Single .insert() call for all rows. Falls back to individual inserts on failure.
  if (analysisResults.length > 0) {
    const rows = analysisResults.map(({ fi, insight, severity }) => ({
      source_url: fi.item.source_url,
      status: "pending_review",
      is_demo_eligible: insight.is_demo_eligible ?? false,
      source_type: mapSourceType(insight.category || fi.source.category),
      category: insight.category || fi.source.category,
      severity,
      scope: insight.scope || fi.source.defaultScope,
      title: (insight.title || fi.item.title || "").slice(0, 200),
      summary: insight.summary || "",
      full_analysis: insight.full_analysis || "",
      action_items: insight.action_items || [],
      key_findings: insight.key_findings || [],
      pillars: insight.pillars || ["food_safety"],
      affected_counties: insight.affected_counties || [],
      tags: insight.tags || [],
      estimated_cost_low: insight.estimated_cost_low ?? 0,
      estimated_cost_high: insight.estimated_cost_high ?? 0,
      cost_basis: insight.cost_basis || "",
      source_name: insight.source_name || fi.source.name,
      demo_priority: insight.demo_priority ?? 0,
      published_at: null,
    }));

    const { error: batchErr } = await supabase.from("intelligence_insights").insert(rows);

    if (batchErr) {
      console.warn(`[intelligence-collect] Batch insert failed (${batchErr.message}), falling back to individual inserts`);

      // Fallback: insert one-by-one so partial success is possible
      for (let i = 0; i < rows.length; i++) {
        const { error: singleErr } = await supabase.from("intelligence_insights").insert(rows[i]);
        if (singleErr) {
          errors.push(`${analysisResults[i].fi.source.id}: DB insert failed — ${singleErr.message}`);
        } else {
          sourceResults[analysisResults[i].fi.source.id].new++;
          newInsights.push({
            title: rows[i].title.slice(0, 120),
            severity: rows[i].severity,
            source: analysisResults[i].fi.source.name,
          });
        }
      }
    } else {
      // Batch succeeded — record all
      for (let i = 0; i < rows.length; i++) {
        sourceResults[analysisResults[i].fi.source.id].new++;
        newInsights.push({
          title: rows[i].title.slice(0, 120),
          severity: rows[i].severity,
          source: analysisResults[i].fi.source.name,
        });
      }
    }
  }

  const processed = allItems.length;
  const newCount = newInsights.length;
  const duration_ms = Date.now() - startTime;

  console.log(
    `[intelligence-collect] Phase 4 done: ${newCount} inserted, ${errors.length} errors, ${duration_ms}ms total`,
  );

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
