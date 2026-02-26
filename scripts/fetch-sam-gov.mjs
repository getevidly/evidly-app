#!/usr/bin/env node
/**
 * fetch-sam-gov.mjs — Fetches real RFP data from SAM.gov API
 * and writes it into src/data/rfpDemoData.ts for the RFP Intelligence Monitor.
 *
 * Usage:
 *   SAM_GOV_API_KEY=your-key node scripts/fetch-sam-gov.mjs
 *   node scripts/fetch-sam-gov.mjs --key=your-key
 *
 * Get a free API key at: https://api.sam.gov/api-key
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'rfpDemoData.ts');

// ── Config ──────────────────────────────────────────────

const API_BASE = 'https://api.sam.gov/opportunities/v2/search';

const NAICS_CODES = ['722310', '722511', '722513', '722514', '561720', '541512', '511210', '611710', '621999'];

const NAICS_LABELS = {
  '722310': 'Food Service Contractors',
  '722511': 'Full-Service Restaurants',
  '722513': 'Limited-Service Restaurants',
  '722514': 'Cafeterias/Buffets',
  '561720': 'Janitorial Services',
  '541512': 'Computer Systems Design',
  '511210': 'Software Publishers',
  '541990': 'Environmental Consulting',
  '611710': 'Educational Support Services',
  '621999': 'Health Services',
};

const KEYWORDS = [
  'food service', 'food safety', 'kitchen compliance', 'HACCP',
  'school nutrition', 'dietary', 'cafeteria', 'dining facility',
  'hood cleaning', 'kitchen exhaust', 'NFPA 96', 'fire suppression',
  'food production', 'meal', 'nutrition program', 'food recovery',
  'compliance software', 'inspection', 'temperature monitoring',
];

// Module keyword mapping
const MODULE_KEYWORDS = {
  food_safety: ['food safety', 'food code', 'health inspection', 'health department', 'foodborne', 'sanitation', 'food handling', 'FDA'],
  fire_safety: ['hood cleaning', 'kitchen exhaust', 'NFPA', 'fire suppression', 'grease', 'fire safety', 'fire inspection'],
  k12_production: ['school nutrition', 'school meal', 'NSLP', 'child nutrition', 'school food', 'USDA', 'student meal', 'school lunch'],
  temp_monitoring: ['temperature', 'cold storage', 'refrigeration', 'freezer', 'thermometer', 'temp log'],
  haccp: ['HACCP', 'hazard analysis', 'critical control', 'food production record'],
  compliance_intelligence: ['compliance', 'regulatory', 'inspection tracking', 'audit', 'compliance management'],
  vendor_management: ['vendor', 'supplier', 'contractor management', 'subcontractor'],
  document_management: ['document', 'record keeping', 'records management', 'certification tracking'],
  sb1383: ['SB 1383', 'food recovery', 'organic waste', 'edible food', 'food waste', 'food donation'],
  insurance_risk: ['insurance', 'risk assessment', 'liability', 'risk management'],
  training: ['training', 'certification', 'food handler', 'ServSafe'],
};

// ── Helpers ──────────────────────────────────────────────

function getApiKey() {
  // Check CLI arg --key=xxx
  const keyArg = process.argv.find(a => a.startsWith('--key='));
  if (keyArg) return keyArg.split('=')[1];

  // Check env var
  if (process.env.SAM_GOV_API_KEY) return process.env.SAM_GOV_API_KEY;

  console.error('ERROR: No SAM.gov API key provided.');
  console.error('Usage: SAM_GOV_API_KEY=your-key node scripts/fetch-sam-gov.mjs');
  console.error('   or: node scripts/fetch-sam-gov.mjs --key=your-key');
  console.error('');
  console.error('Get a free key at: https://api.sam.gov/api-key');
  process.exit(1);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function mapSetAside(sa) {
  if (!sa) return null;
  const lower = sa.toLowerCase();
  if (lower.includes('sdvosb') || lower.includes('service-disabled')) return 'sdvosb';
  if (lower.includes('veteran')) return 'veteran';
  if (lower.includes('8(a)') || lower.includes('8a')) return '8a';
  if (lower.includes('hubzone')) return 'hubzone';
  if (lower.includes('wosb') || lower.includes('women')) return 'wosb';
  if (lower.includes('small business') || lower.includes('sba') || lower.includes('total small')) return 'small_business';
  return null;
}

function mapEntityType(opp) {
  const dept = (opp.fullParentPathName || opp.departmentName || '').toLowerCase();
  if (dept.includes('defense') || dept.includes('army') || dept.includes('navy') || dept.includes('air force') || dept.includes('marine')) return 'federal';
  if (dept.includes('education') || dept.includes('school')) return 'school_district';
  if (dept.includes('health') || dept.includes('hospital') || dept.includes('medical') || dept.includes('veterans')) return 'healthcare_system';
  return 'federal';
}

function scoreRfp(title, description, naicsCode, setAside) {
  const text = `${title} ${description || ''}`.toLowerCase();
  let score = 0;
  const matchedModules = new Set();
  const matchedKeywords = [];

  // NAICS match
  if (naicsCode && NAICS_CODES.includes(naicsCode)) {
    score += 20;
  }

  // Keyword matches
  for (const kw of KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      score += 5;
      matchedKeywords.push(kw);
    }
  }

  // Module detection
  for (const [mod, kws] of Object.entries(MODULE_KEYWORDS)) {
    for (const kw of kws) {
      if (text.includes(kw.toLowerCase())) {
        matchedModules.add(mod);
        break;
      }
    }
  }

  // Veteran set-aside bonus
  if (setAside === 'veteran' || setAside === 'sdvosb') {
    score += 10;
  }

  // Small business bonus (minor)
  if (setAside === 'small_business' || setAside === '8a' || setAside === 'hubzone') {
    score += 5;
  }

  // Cap at 100
  score = Math.min(100, Math.max(0, score));

  const tier = score >= 75 ? 'high' : score >= 50 ? 'medium' : score >= 25 ? 'low' : 'irrelevant';
  const action = score >= 75 ? 'pursue' : score >= 50 ? 'monitor' : 'skip';

  return {
    score,
    tier,
    action,
    matchedModules: [...matchedModules],
    matchedKeywords: [...new Set(matchedKeywords)],
  };
}

function escapeStr(s) {
  if (s == null) return 'null';
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '') + "'";
}

function escapeStrOrNull(s) {
  if (s == null || s === '') return 'null';
  return escapeStr(s);
}

// ── Fetch from SAM.gov ──────────────────────────────────

async function fetchOpportunities(apiKey) {
  const allOpps = [];

  // Fetch by NAICS codes (primary filter)
  for (const naics of NAICS_CODES.slice(0, 5)) { // Top 5 most relevant codes
    const params = new URLSearchParams({
      api_key: apiKey,
      postedFrom: daysAgo(60),
      postedTo: today(),
      ncode: naics,
      limit: '25',
      offset: '0',
      ptype: 'o,p,k', // opportunities, presolicitations, combined
    });

    console.log(`  Fetching NAICS ${naics} (${NAICS_LABELS[naics] || naics})...`);

    try {
      const resp = await fetch(`${API_BASE}?${params}`, {
        headers: { Accept: 'application/json' },
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`    ERROR ${resp.status}: ${text.slice(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      const opps = data.opportunitiesData || data.opportunities || [];
      console.log(`    Found ${opps.length} opportunities`);
      allOpps.push(...opps.map(o => ({ ...o, _naicsFilter: naics })));

      // Rate limit: 500ms between requests
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
    }
  }

  // Also fetch by keywords for broader coverage
  const kwParams = new URLSearchParams({
    api_key: apiKey,
    postedFrom: daysAgo(60),
    postedTo: today(),
    q: 'food service compliance kitchen',
    limit: '25',
    offset: '0',
    ptype: 'o,p,k',
  });

  console.log(`  Fetching keyword search "food service compliance kitchen"...`);
  try {
    const resp = await fetch(`${API_BASE}?${kwParams}`, {
      headers: { Accept: 'application/json' },
    });
    if (resp.ok) {
      const data = await resp.json();
      const opps = data.opportunitiesData || data.opportunities || [];
      console.log(`    Found ${opps.length} opportunities`);
      allOpps.push(...opps.map(o => ({ ...o, _naicsFilter: null })));
    }
  } catch (err) {
    console.error(`    ERROR: ${err.message}`);
  }

  // Deduplicate by noticeId
  const seen = new Set();
  const unique = [];
  for (const opp of allOpps) {
    const id = opp.noticeId || opp.opportunityId || opp.title;
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(opp);
    }
  }

  console.log(`\n  Total unique opportunities: ${unique.length}`);
  return unique;
}

// ── Generate TypeScript ─────────────────────────────────

function generateDemoData(opportunities) {
  const sources = [{
    id: 'src-sam-gov',
    name: 'SAM.gov',
    url: 'https://sam.gov',
    source_type: 'government',
    coverage: 'national',
    states_covered: null,
    crawl_frequency: 'daily',
    last_crawled_at: new Date().toISOString(),
    status: 'active',
  }];

  const listings = [];
  const classifications = [];
  const actions = [];

  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];
    const id = `rfp-${String(i + 1).padStart(3, '0')}`;
    const clsId = `cls-${String(i + 1).padStart(3, '0')}`;

    const title = opp.title || 'Untitled Opportunity';
    const description = opp.description || opp.additionalInfoDescription || null;
    const entity = opp.fullParentPathName || opp.departmentName || 'Federal Agency';
    const entityType = mapEntityType(opp);
    const state = opp.officeAddress?.state || opp.placeOfPerformance?.state?.code || null;
    const city = opp.officeAddress?.city || opp.placeOfPerformance?.city?.name || null;
    const naicsCode = opp.naicsCode || opp._naicsFilter || null;
    const setAside = mapSetAside(opp.typeOfSetAside || opp.typeOfSetAsideDescription);
    const postedDate = opp.postedDate || null;
    const dueDate = opp.responseDeadLine || opp.archiveDate || null;
    const noticeId = opp.noticeId || opp.opportunityId || '';
    const url = noticeId ? `https://sam.gov/opp/${noticeId}/view` : 'https://sam.gov';

    // Score it
    const scoring = scoreRfp(title, description, naicsCode, setAside);

    // Skip truly irrelevant ones (score < 10)
    if (scoring.score < 10) continue;

    listings.push({
      id, source_id: 'src-sam-gov', title, description,
      issuing_entity: entity, entity_type: entityType,
      state, county: null, city, region: null,
      url, document_urls: [], posted_date: postedDate, due_date: dueDate,
      estimated_value: null, naics_code: naicsCode,
      set_aside_type: setAside, status: 'open',
      raw_content: null, created_at: new Date().toISOString(),
    });

    // Build reasoning
    const reasonParts = [];
    if (scoring.matchedModules.length > 0) {
      reasonParts.push(`Matches EvidLY modules: ${scoring.matchedModules.join(', ')}.`);
    }
    if (scoring.matchedKeywords.length > 0) {
      reasonParts.push(`Key terms found: ${scoring.matchedKeywords.slice(0, 5).join(', ')}.`);
    }
    if (setAside === 'veteran' || setAside === 'sdvosb') {
      reasonParts.push('Veteran/SDVOSB set-aside — EvidLY qualifies as a service-disabled veteran-owned small business.');
    }
    if (naicsCode && NAICS_CODES.includes(naicsCode)) {
      reasonParts.push(`NAICS ${naicsCode} (${NAICS_LABELS[naicsCode] || 'related'}) directly aligns with EvidLY target market.`);
    }
    if (reasonParts.length === 0) {
      reasonParts.push('Tangentially related to food service or compliance sector.');
    }

    classifications.push({
      id: clsId, rfp_id: id,
      relevance_score: scoring.score,
      relevance_tier: scoring.tier,
      matched_modules: scoring.matchedModules,
      matched_keywords: scoring.matchedKeywords,
      competition_notes: `Federal procurement — typical competitors include established GovTech vendors and incumbent contractors.`,
      recommended_action: scoring.action,
      ai_reasoning: reasonParts.join(' '),
      classification_model_version: 'keyword-match-v1',
      tokens_used: 0, classification_cost: 0,
      classified_at: new Date().toISOString(),
    });
  }

  // Sort by relevance score descending
  const sortOrder = new Map(classifications.map(c => [c.rfp_id, c.relevance_score]));
  listings.sort((a, b) => (sortOrder.get(b.id) || 0) - (sortOrder.get(a.id) || 0));
  classifications.sort((a, b) => (b.relevance_score) - (a.relevance_score));

  // Compute stats
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const stats = {
    total_active: listings.filter(l => l.status === 'open').length,
    high_relevance: classifications.filter(c => c.relevance_tier === 'high').length,
    pursuing: 0,
    due_this_week: listings.filter(l => l.due_date && new Date(l.due_date).getTime() >= now && new Date(l.due_date).getTime() <= now + weekMs).length,
    won_count: 0,
    lost_count: 0,
    veteran_set_asides: listings.filter(l => l.set_aside_type === 'veteran' || l.set_aside_type === 'sdvosb').length,
    classifications_this_month: classifications.length,
    tokens_this_month: 0,
    estimated_cost_this_month: 0,
    budget_remaining: 100,
  };

  return { sources, listings, classifications, actions, stats };
}

function toTypeScript(data) {
  const { sources, listings, classifications, actions, stats } = data;

  function arrToStr(arr) {
    if (!arr || arr.length === 0) return '[]';
    return `[${arr.map(s => escapeStr(s)).join(', ')}]`;
  }

  function sourceToTs(s) {
    return `  {
    id: ${escapeStr(s.id)},
    name: ${escapeStr(s.name)},
    url: ${escapeStr(s.url)},
    source_type: ${escapeStr(s.source_type)},
    coverage: ${escapeStr(s.coverage)},
    states_covered: ${s.states_covered ? arrToStr(s.states_covered) : 'null'},
    crawl_frequency: ${escapeStr(s.crawl_frequency)},
    last_crawled_at: ${escapeStrOrNull(s.last_crawled_at)},
    status: ${escapeStr(s.status)},
    config_json: {},
    created_at: ${escapeStr(s.created_at || new Date().toISOString())},
  }`;
  }

  function listingToTs(l) {
    return `  {
    id: ${escapeStr(l.id)},
    source_id: ${escapeStr(l.source_id)},
    title: ${escapeStr(l.title)},
    description: ${escapeStrOrNull(l.description ? l.description.slice(0, 500) : null)},
    issuing_entity: ${escapeStr(l.issuing_entity)},
    entity_type: ${escapeStr(l.entity_type)},
    state: ${escapeStrOrNull(l.state)},
    county: null,
    city: ${escapeStrOrNull(l.city)},
    region: null,
    url: ${escapeStrOrNull(l.url)},
    document_urls: [],
    posted_date: ${escapeStrOrNull(l.posted_date)},
    due_date: ${escapeStrOrNull(l.due_date)},
    estimated_value: ${l.estimated_value ?? 'null'},
    naics_code: ${escapeStrOrNull(l.naics_code)},
    set_aside_type: ${escapeStrOrNull(l.set_aside_type)},
    status: ${escapeStr(l.status)},
    raw_content: null,
    created_at: ${escapeStr(l.created_at)},
  }`;
  }

  function classificationToTs(c) {
    return `  {
    id: ${escapeStr(c.id)},
    rfp_id: ${escapeStr(c.rfp_id)},
    relevance_score: ${c.relevance_score},
    relevance_tier: ${escapeStr(c.relevance_tier)},
    matched_modules: ${arrToStr(c.matched_modules)},
    matched_keywords: ${arrToStr(c.matched_keywords)},
    competition_notes: ${escapeStrOrNull(c.competition_notes)},
    recommended_action: ${escapeStr(c.recommended_action)},
    ai_reasoning: ${escapeStr(c.ai_reasoning)},
    classification_model_version: ${escapeStr(c.classification_model_version)},
    tokens_used: ${c.tokens_used},
    classification_cost: ${c.classification_cost},
    classified_at: ${escapeStr(c.classified_at)},
  }`;
  }

  return `/**
 * RFP Intelligence Monitor — Demo data populated from SAM.gov
 * Generated: ${new Date().toISOString()}
 * Source: api.sam.gov/opportunities/v2/search
 *
 * Re-generate: SAM_GOV_API_KEY=your-key node scripts/fetch-sam-gov.mjs
 */
import type {
  RfpSource, RfpListing, RfpClassification, RfpAction,
  RfpListingWithDetails, RfpDashboardStats,
} from '../types/rfp';

// ── Sources ─────────────────────────────────────────────

export const DEMO_SOURCES: RfpSource[] = [
${sources.map(sourceToTs).join(',\n')}
];

// ── Listings (${listings.length} real SAM.gov opportunities) ───────

export const DEMO_LISTINGS: RfpListing[] = [
${listings.map(listingToTs).join(',\n')}
];

// ── Classifications ─────────────────────────────────────

export const DEMO_CLASSIFICATIONS: RfpClassification[] = [
${classifications.map(classificationToTs).join(',\n')}
];

// ── Actions ─────────────────────────────────────────────

export const DEMO_ACTIONS: RfpAction[] = [];

// ── Stats ───────────────────────────────────────────────

export const DEMO_RFP_STATS: RfpDashboardStats = {
  total_active: ${stats.total_active},
  high_relevance: ${stats.high_relevance},
  pursuing: ${stats.pursuing},
  due_this_week: ${stats.due_this_week},
  won_count: ${stats.won_count},
  lost_count: ${stats.lost_count},
  veteran_set_asides: ${stats.veteran_set_asides},
  classifications_this_month: ${stats.classifications_this_month},
  tokens_this_month: ${stats.tokens_this_month},
  estimated_cost_this_month: ${stats.estimated_cost_this_month},
  budget_remaining: ${stats.budget_remaining},
};

// ── Exports ─────────────────────────────────────────────

export function getDemoRfpListings(): RfpListingWithDetails[] {
  return DEMO_LISTINGS.map(listing => {
    const classification = DEMO_CLASSIFICATIONS.find(c => c.rfp_id === listing.id) ?? null;
    const source = DEMO_SOURCES.find(s => s.id === listing.source_id) ?? null;
    const actions = DEMO_ACTIONS.filter(a => a.rfp_id === listing.id);
    return { ...listing, classification, source, actions };
  }).sort((a, b) => {
    const scoreA = a.classification?.relevance_score ?? 0;
    const scoreB = b.classification?.relevance_score ?? 0;
    return scoreB - scoreA;
  });
}

export function getDemoRfpStats(): RfpDashboardStats {
  return DEMO_RFP_STATS;
}

export function getDemoRfpSources(): RfpSource[] {
  return DEMO_SOURCES;
}
`;
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('=== SAM.gov RFP Data Fetcher ===');
  console.log('');

  const apiKey = getApiKey();
  console.log(`API Key: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
  console.log('');

  console.log('Fetching opportunities from SAM.gov...');
  const opps = await fetchOpportunities(apiKey);

  if (opps.length === 0) {
    console.error('\nNo opportunities found. Check your API key and try again.');
    process.exit(1);
  }

  console.log('\nProcessing and scoring...');
  const data = generateDemoData(opps);

  // Print summary
  console.log('\n=== Summary ===');
  console.log(`  Total RFPs:    ${data.listings.length}`);

  const tierCounts = { high: 0, medium: 0, low: 0, irrelevant: 0 };
  for (const c of data.classifications) tierCounts[c.relevance_tier]++;
  console.log(`  High:          ${tierCounts.high}`);
  console.log(`  Medium:        ${tierCounts.medium}`);
  console.log(`  Low:           ${tierCounts.low}`);
  console.log(`  Irrelevant:    ${tierCounts.irrelevant}`);

  // By state
  const stateCounts = {};
  for (const l of data.listings) {
    const st = l.state || 'Unknown';
    stateCounts[st] = (stateCounts[st] || 0) + 1;
  }
  const topStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`\n  Top states:`);
  for (const [state, count] of topStates) {
    console.log(`    ${state}: ${count}`);
  }

  // Veteran set-asides
  const vetCount = data.listings.filter(l => l.set_aside_type === 'veteran' || l.set_aside_type === 'sdvosb').length;
  console.log(`\n  Veteran set-asides: ${vetCount}`);

  // By NAICS
  const naicsCounts = {};
  for (const l of data.listings) {
    if (l.naics_code) naicsCounts[l.naics_code] = (naicsCounts[l.naics_code] || 0) + 1;
  }
  console.log(`\n  By NAICS code:`);
  for (const [code, count] of Object.entries(naicsCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code} (${NAICS_LABELS[code] || '?'}): ${count}`);
  }

  // Write file
  console.log(`\nWriting to ${OUTPUT_PATH}...`);
  const ts = toTypeScript(data);
  writeFileSync(OUTPUT_PATH, ts, 'utf8');
  console.log(`Done! ${data.listings.length} RFPs written to rfpDemoData.ts`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. npm run dev');
  console.log('  2. Navigate to /admin/rfp-intelligence');
  console.log('  3. Switch to Platform Admin role');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
