/**
 * seed-real-intel.ts — Real Intelligence Data Seeder
 *
 * Inserts 15 verified intelligence signals + 6 regulatory changes into production Supabase.
 * All data sourced from USDA FSIS, FDA, CA Legislature, CDPH, NFPA.
 *
 * Usage:
 *   npx tsx scripts/seed-real-intel.ts
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY from .env in project root.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env manually (no dotenv dependency required) ──
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env not found, rely on process.env */ }
}
loadEnv();

const SUPABASE_URL = 'https://irxgmhxhmxtzfwuieblc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in .env or environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Auto-detect table columns ──
async function detectColumns(tableName: string): Promise<Set<string>> {
  const { data } = await supabase.from(tableName).select('*').limit(1);
  if (data && data.length > 0) {
    return new Set(Object.keys(data[0]));
  }
  // Table empty — use known columns from migration DDL
  return KNOWN_COLUMNS[tableName] || new Set();
}

const KNOWN_COLUMNS: Record<string, Set<string>> = {
  intelligence_signals: new Set([
    'title', 'content_summary', 'signal_type', 'source_url', 'source_key',
    'source_name', 'source_id', 'category', 'is_correlated', 'orgs_affected',
    'counties_affected', 'original_url', 'is_published', 'published_at',
    'routing_tier', 'severity_score', 'confidence_score', 'recommended_action',
    'revenue_risk_level', 'liability_risk_level', 'cost_risk_level',
    'operational_risk_level', 'target_counties', 'affected_org_count', 'created_at',
  ]),
  regulatory_changes: new Set([
    'source_id', 'change_type', 'title', 'summary', 'impact_description',
    'impact_level', 'affected_pillars', 'affected_equipment_types', 'affected_states',
    'effective_date', 'source_url', 'raw_input_text', 'ai_generated',
    'reviewed_by', 'reviewed_at', 'published', 'published_at',
    'affected_location_count', 'created_at',
  ]),
};

// ── Filter record to only include columns that exist in the table ──
function filterToSchema(record: Record<string, any>, columns: Set<string>): Record<string, any> {
  const filtered: Record<string, any> = {};
  for (const [key, value] of Object.entries(record)) {
    if (columns.has(key) && value !== undefined) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// ── 15 Intelligence Signals ──
// Column mapping: prompt fields → actual DB columns
//   summary → content_summary
//   category → category (NOT NULL, required)
//   revenue_risk_level/liability_risk_level/cost_risk_level/operational_risk_level → same names in DB
const SIGNALS: Record<string, any>[] = [
  // SIGNAL 1 — Ajinomoto Glass Recall (USDA, March 3 2026)
  {
    title: 'USDA Class I Recall: 37M lbs Ajinomoto Frozen Fried Rice, Ramen & Dumplings — Glass Contamination',
    content_summary: 'Ajinomoto Foods North America expanded its Feb 19 recall on March 3, 2026, adding 33.6M additional pounds for a total of ~37M lbs of frozen chicken and pork fried rice, ramen, and shu mai dumpling products under brands Ajinomoto, Kroger, Ling Ling, Tai Pei, and Trader Joe\'s. Glass contamination traced to carrot ingredient. Establishment numbers P-18356, P-18356B, P-47971. Best-by dates Feb 28 2026–Aug 19 2027. Nationwide distribution.',
    category: 'recall',
    signal_type: 'recall',
    source_key: 'USDA FSIS',
    source_name: 'USDA FSIS',
    source_url: 'https://www.fsis.usda.gov/recalls-alerts/ajinomoto-foods-north-america-inc--expands-recall-chicken-and-pork-fried-rice-ramen',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'critical',
    liability_risk_level: 'critical',
    cost_risk_level: 'high',
    operational_risk_level: 'high',
    recommended_action: 'Audit all freezers immediately for Ajinomoto, Kroger, Ling Ling, Tai Pei, and Trader Joe\'s frozen fried rice, ramen, and dumpling products. Check USDA mark of inspection for establishment numbers P-18356, P-18356B, or P-47971. Quarantine and discard or return for full refund. Document disposal. Contact supplier for credit.',
  },
  // SIGNAL 2 — Suzanna's Kitchen Listeria (USDA, Jan 16 2026)
  {
    title: 'USDA Recall: Suzanna\'s Kitchen RTE Grilled Chicken — Listeria monocytogenes',
    content_summary: 'Suzanna\'s Kitchen (Norcross, GA) recalled approximately 13,720 lbs of ready-to-eat grilled chicken breast fillet products adulterated with Listeria monocytogenes on January 16, 2026. Lot code: 60104 P1382 287 5 J14. Product distributed to foodservice and institutional buyers nationwide including California.',
    category: 'recall',
    signal_type: 'recall',
    source_key: 'USDA FSIS',
    source_name: 'USDA FSIS',
    source_url: 'https://www.fsis.usda.gov/recalls',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'critical',
    liability_risk_level: 'critical',
    cost_risk_level: 'high',
    operational_risk_level: 'medium',
    recommended_action: 'Verify grilled chicken breast fillet sourcing. Check lot code 60104 P1382 287 5 J14. If present, quarantine immediately, do not serve, contact distributor. Document and retain disposal records.',
  },
  // SIGNAL 3 — Rosina Meatballs Metal (USDA, Feb 22 2026)
  {
    title: 'USDA Recall: Rosina Food Products Frozen Meatballs — Metal Contamination',
    content_summary: 'Rosina Food Products (West Seneca, NY) recalled ~9,462 lbs of RTE Bremer Family Size Italian Style Meatballs on February 22, 2026 due to possible metal contamination. 32-oz bags with BEST BY 10/30/26, timestamps 17:08–18:20. Distributed to retail and foodservice nationwide.',
    category: 'recall',
    signal_type: 'recall',
    source_key: 'USDA FSIS',
    source_name: 'USDA FSIS',
    source_url: 'https://www.fsis.usda.gov/recalls',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'high',
    liability_risk_level: 'high',
    cost_risk_level: 'medium',
    operational_risk_level: 'low',
    recommended_action: 'Check freezer inventory for Bremer Family Size Italian Style Meatballs 32-oz with BEST BY 10/30/26. If present, do not use. Return to distributor for credit.',
  },
  // SIGNAL 4 — Ambriola Pecorino Romano Listeria (FDA, Jan 6 2026)
  {
    title: 'FDA Class I Recall: Pecorino Romano Cheese — Listeria monocytogenes (20 States incl. CA)',
    content_summary: 'The Ambriola Company issued a Class I recall — FDA\'s highest risk designation — for Pecorino Romano cheese products distributed to 20 states including California between November 3–20, 2025. Includes retail cups and large foodservice bags. Listeria monocytogenes contamination confirmed.',
    category: 'recall',
    signal_type: 'recall',
    source_key: 'FDA',
    source_name: 'FDA',
    source_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'critical',
    liability_risk_level: 'critical',
    cost_risk_level: 'medium',
    operational_risk_level: 'low',
    recommended_action: 'Audit all Pecorino Romano inventory. Check distributor invoices for product received November 3–20, 2025. Pull all suspect product, do not serve. Contact distributor for credit and recall documentation.',
  },
  // SIGNAL 5 — Ventura Foods Plastic Recall (FDA, Feb 12 2026)
  {
    title: 'FDA Class II Recall: Ventura Foods Peanut Butter & PBJ Single-Serve — Blue Plastic Contamination (CA Distributor)',
    content_summary: 'Ventura Foods LLC (Los Angeles, CA) recalled 22,000+ peanut butter packs including single-serve containers and PBJ snack kits due to blue plastic fragments found during maintenance inspection in late 2025. Distributed to schools, childcare centers, hospitals, and institutional buyers across 40+ states. Affects US Foods, DYMA Brands, Gordon Food Service, and Katy\'s Kitchen packs.',
    category: 'recall',
    signal_type: 'recall',
    source_key: 'FDA',
    source_name: 'FDA',
    source_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'high',
    liability_risk_level: 'high',
    cost_risk_level: 'medium',
    operational_risk_level: 'low',
    recommended_action: 'Check all Ventura Foods-sourced peanut butter single-serve and PBJ kits. US Foods, DYMA Brands, Gordon Food Service, and Katy\'s Kitchen packs are affected. Pull and quarantine. Document for K-12 and institutional compliance records.',
  },
  // SIGNAL 6 — Punahele Jerky Undeclared Soy (USDA PHA, March 1 2026)
  {
    title: 'USDA Public Health Alert: Undeclared Soy Allergen — Punahele Jerky Dried Hawaiian Style Beef Crisps',
    content_summary: 'USDA FSIS issued a public health alert March 1, 2026 for Punahele Jerky Company Dried Hawaiian Style Beef Crisps (Original Salt & Pepper, 6-oz) due to undeclared soy lecithin. Misbranding violation. EST. 2625 inside USDA mark of inspection.',
    category: 'allergen_alert',
    signal_type: 'enforcement_action',
    source_key: 'USDA FSIS',
    source_name: 'USDA FSIS',
    source_url: 'https://www.fsis.usda.gov/recalls',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'none',
    liability_risk_level: 'critical',
    cost_risk_level: 'low',
    operational_risk_level: 'low',
    recommended_action: 'If carrying Punahele Jerky Hawaiian Style Beef Crisps (Original S&P, 6-oz, EST. 2625), remove from service immediately. Discard or return to distributor.',
  },
  // SIGNAL 7 — AB 660 Sell-By Ban (CA, July 1 2026 deadline)
  {
    title: 'AB 660: California Bans \'Sell By\' Dates — Mandatory Standardized Labels Effective July 1, 2026',
    content_summary: 'Signed September 28, 2024. Effective July 1, 2026, all food sold in California must use only \'BEST if Used By\' (quality) or \'USE by\' (safety) date labels. \'Sell By\' and all other ambiguous date language banned. Applies to all packaged food sold in CA. Exceptions: infant formula, eggs, beer/malt beverages. Commercial kitchens receiving supplier product with non-compliant labeling are receiving non-conforming product after the deadline.',
    category: 'regulatory_updates',
    signal_type: 'legislative_update',
    source_key: 'CA Legislature',
    source_name: 'CA Legislature',
    source_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB660',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'low',
    liability_risk_level: 'medium',
    cost_risk_level: 'medium',
    operational_risk_level: 'high',
    recommended_action: 'Notify all food suppliers of AB 660 compliance requirement effective July 1, 2026. Update receiving checklists to flag \'Sell By\' labels. Train receiving staff. Confirm with distributors they are updating packaging.',
  },
  // SIGNAL 8 — SB 68 Allergen Disclosure (CA, July 1 2026 deadline)
  {
    title: 'SB 68: Allergen Disclosure for Dining Experiences Act — Written Menu Allergen Disclosure Required July 1, 2026',
    content_summary: 'Signed October 13, 2025. Effective July 1, 2026, any food facility subject to federal menu-nutrient disclosure requirements (chains with 20+ locations offering substantially the same menu) must provide written notification of the 9 major food allergens present in each menu item. Allergens: milk, eggs, fish, crustacean shellfish, tree nuts, wheat, peanuts, soybeans, and sesame.',
    category: 'regulatory_updates',
    signal_type: 'legislative_update',
    source_key: 'CA Legislature',
    source_name: 'CA Legislature',
    source_url: 'https://leginfo.legislature.ca.gov',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'medium',
    liability_risk_level: 'critical',
    cost_risk_level: 'medium',
    operational_risk_level: 'high',
    recommended_action: 'If operating 20+ CA locations with standardized menus, begin allergen disclosure documentation now. Engage food safety counsel to review menu matrix. Train all staff. Deadline: July 1, 2026 — 117 days.',
  },
  // SIGNAL 9 — AB 418 California Food Safety Act (CA, Jan 1 2027)
  {
    title: 'AB 418: California Food Safety Act — BVO, Potassium Bromate, Propylparaben, Red Dye No. 3 Banned Jan 1, 2027',
    content_summary: 'California AB 418 bans manufacture, sale, and distribution of food containing brominated vegetable oil (BVO), potassium bromate, propylparaben, and Red Dye No. 3 effective January 1, 2027. First state-level ban of this kind in the US. Manufacturers must reformulate. Commercial kitchens using pre-packaged or processed ingredients must audit supplier ingredient lists now.',
    category: 'regulatory_updates',
    signal_type: 'legislative_update',
    source_key: 'CA Legislature',
    source_name: 'CA Legislature',
    source_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB418',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'medium',
    liability_risk_level: 'high',
    cost_risk_level: 'medium',
    operational_risk_level: 'medium',
    recommended_action: 'Conduct a full ingredient audit of all pre-packaged and processed items. Flag any containing BVO, potassium bromate, propylparaben, or Red Dye No. 3. Contact distributors for reformulated alternatives. Deadline: January 1, 2027.',
  },
  // SIGNAL 10 — SB 476 Food Handler Card Employer Funding (CA, in effect)
  {
    title: 'SB 476: California Food Handler Card Now Employer-Funded — 30-Day New Hire Requirement',
    content_summary: 'SB 476 requires all California food service employers to fund and coordinate California Food Handler Card training for employees in food-handling positions. New hires must obtain the card within 30 days of start date. Applies to all commercial kitchens, catering, schools, hospitals, and food service operations statewide. Card valid 3 years.',
    category: 'regulatory_updates',
    signal_type: 'legislative_update',
    source_key: 'CA Legislature',
    source_name: 'CA Legislature',
    source_url: 'https://leginfo.legislature.ca.gov',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'low',
    liability_risk_level: 'medium',
    cost_risk_level: 'medium',
    operational_risk_level: 'high',
    recommended_action: 'Audit all food-handling staff for valid California Food Handler Cards. Implement 30-day onboarding tracking for new hires. Fund certifications through any ANAB-accredited provider. Build 3-year renewal tracking into compliance calendar.',
  },
  // SIGNAL 11 — NFPA 96 2024 Edition (Fire Safety)
  {
    title: 'NFPA 96 2024 Edition: Monthly Hood Cleaning for High-Volume Kitchens, UL-300 Mandatory, Digital Docs Required',
    content_summary: 'The 2024 edition of NFPA 96 (Standard for Ventilation Control and Fire Protection of Commercial Cooking Operations) introduces: (1) monthly hood cleaning required for high-volume and 24/7 kitchens per Table 12.4, (2) all fire suppression systems must be UL-300 compliant with no grandfathering of older systems, (3) additional ductwork access panels required for inspection, (4) digital documentation required for all cleaning and inspection activity, (5) updated rooftop grease containment and exhaust fan maintenance standards.',
    category: 'fire_safety',
    signal_type: 'fire_safety_update',
    source_key: 'NFPA',
    source_name: 'NFPA',
    source_url: 'https://www.nfpa.org/codes-and-standards/nfpa-96',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'high',
    liability_risk_level: 'high',
    cost_risk_level: 'high',
    operational_risk_level: 'high',
    recommended_action: 'Review hood cleaning frequency against NFPA 96 Table 12.4 for your equipment type. Verify fire suppression system is UL-300 listed — if not, budget for replacement. Implement digital documentation for all cleaning and inspection records. Confirm your hood cleaning vendor certifies to 2024 edition standards.',
  },
  // SIGNAL 12 — San Diego County APCD Rule 67.26 (Fire/Air, Aug 2025)
  {
    title: 'San Diego County Rule 67.26: Commercial Charbroiler Emissions Compliance — Effective August 14, 2025',
    content_summary: 'San Diego County Air Pollution Control District adopted Rule 67.26 on August 14, 2025, effective immediately. Applies to all chain-driven charbroilers in commercial food establishments in San Diego County. Requires compliance with particulate matter (PM2.5) and VOC emission controls. Estimated to reduce 14 tons of PM2.5 and 4.5 tons of VOCs annually. Non-compliant operators face APCD enforcement action independent of health department inspections.',
    category: 'fire_safety',
    signal_type: 'regulatory_change',
    source_key: 'San Diego County APCD',
    source_name: 'San Diego County APCD',
    source_url: 'https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/whatsnew.html',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'high',
    liability_risk_level: 'medium',
    cost_risk_level: 'high',
    operational_risk_level: 'medium',
    recommended_action: 'If operating in San Diego County with chain-driven charbroilers: contact APCD at (858) 586-2650 to determine compliance requirements under Rule 67.26. Evaluate emission control retrofit options. Rule is currently in effect — no grace period.',
  },
  // SIGNAL 13 — Norovirus Seasonal Advisory (CA, Winter/Spring 2026)
  {
    title: 'CDC/CDPH Seasonal Advisory: Elevated Norovirus Activity — Foodservice Transmission Risk Window',
    content_summary: 'CDC and CA CDPH track elevated norovirus activity across California during winter and spring seasons. Norovirus is the leading cause of foodborne illness outbreaks in food service settings. Transmission primarily occurs via infected food handlers. A single infected food handler can contaminate an entire prep surface. Health departments can order closure during active outbreak investigation.',
    category: 'outbreak_alert',
    signal_type: 'outbreak',
    source_key: 'CDC / CDPH',
    source_name: 'CDC / CDPH',
    source_url: 'https://www.cdc.gov/norovirus/index.html',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'high',
    liability_risk_level: 'critical',
    cost_risk_level: 'medium',
    operational_risk_level: 'high',
    recommended_action: 'Enforce strict sick-staff exclusion now — 48 hours symptom-free before return required by CalCode. Post handwashing signage in all prep areas. Verify glove protocols for RTE food handling. Review temperature logs for cold-holding violations.',
  },
  // SIGNAL 14 — FSMA Food Traceability Rule (Federal, July 2028 enforcement)
  {
    title: 'FDA FSMA Food Traceability Rule: Enhanced Record-Keeping for Listed Foods — Enforcement July 20, 2028',
    content_summary: 'FDA FSMA Section 204 Food Traceability Final Rule (21 CFR Part 1, Subpart S) requires enhanced record-keeping for Foods on the Traceability List including leafy greens, shell eggs, nut butters, finfish, crustaceans, and fresh-cut fruits and vegetables. Original enforcement deadline January 20, 2026 was extended to July 20, 2028. Commercial kitchens receiving FTL foods must maintain traceability Key Data Elements (KDEs) at each Critical Tracking Event (CTE).',
    category: 'regulatory_updates',
    signal_type: 'regulatory_change',
    source_key: 'FDA / FSMA',
    source_name: 'FDA / FSMA',
    source_url: 'https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'low',
    liability_risk_level: 'medium',
    cost_risk_level: 'medium',
    operational_risk_level: 'high',
    recommended_action: 'Identify all Food Traceability List items you receive (leafy greens, shell eggs, nut butters, finfish, crustaceans, fresh-cut produce). Evaluate whether current receiving records capture required key data elements. Begin system design now — July 2028 deadline allows planning window.',
  },
  // SIGNAL 15 — CalCode §114057.1 ROP/Sous-Vide/Cook-Chill HACCP (CA, Jan 1 2025)
  {
    title: 'CalCode \u00A7114057.1 Update: Stricter ROP, Sous-Vide & Cook-Chill HACCP Requirements — Effective January 1, 2025',
    content_summary: 'California Health and Safety Code \u00A7114057.1 was amended by Stats. 2024, Ch. 911 (AB 660), effective January 1, 2025. Any food facility using reduced-oxygen packaging (ROP), sous-vide, or cook-chill processes for potentially hazardous foods must have a CDPH-approved HACCP plan. The 48-hour exemption applies only if: (1) food is labeled with production time and date, (2) held at 41\u00B0F or below, and (3) removed from its package within 48 hours at the facility. Sous-vide and cook-chill operations must also meet FDA Food Code Section 3-502.12(D). Fish vacuum packaging requires a separate Variance from CDPH regardless of hold time. HACCP plans must be submitted to CDPH Food and Drug Branch for review and approval before implementation.',
    category: 'regulatory_updates',
    signal_type: 'legislative_update',
    source_key: 'CA Legislature / CDPH',
    source_name: 'CA Legislature / CDPH',
    source_url: 'https://law.justia.com/codes/california/code-hsc/division-104/part-7/chapter-4/article-6/section-114057-1/',
    is_published: false,
    routing_tier: 'hold',
    revenue_risk_level: 'high',
    liability_risk_level: 'critical',
    cost_risk_level: 'high',
    operational_risk_level: 'high',
    recommended_action: 'If your kitchen uses any ROP method (vacuum packaging, modified atmosphere, cook-chill, sous-vide): (1) Confirm whether you have a current CDPH-approved HACCP plan. (2) If using the 48-hour exemption, verify all three conditions are met: production date/time label, 41\u00B0F hold, package removed within 48 hours at facility. (3) If packaging fish under vacuum, confirm you have a CDPH Variance — not just a HACCP plan. Submit new or updated HACCP plans to CDPH Food and Drug Branch via the Retail Food Program Service Request Application.',
  },
];

// ── 6 Regulatory Changes ──
// change_type CHECK constraint: 'amendment', 'new_edition', 'guidance', 'enforcement_change', 'effective_date'
// impact_level CHECK constraint: 'critical', 'moderate', 'informational'
const REGULATORY_CHANGES: Record<string, any>[] = [
  {
    title: 'AB 660 — Standardized Food Date Labeling (California)',
    summary: 'Effective July 1, 2026, California prohibits \'Sell By\' and all non-standard date language on packaged food. Only \'BEST if Used By\' (quality) or \'USE by\' (safety) permitted. Applies to all packaged food sold in CA. Exceptions: infant formula, eggs, beer. Failure to comply is a violation subject to EH enforcement.',
    impact_description: 'Effective July 1, 2026, California prohibits \'Sell By\' and all non-standard date language on packaged food. Only \'BEST if Used By\' (quality) or \'USE by\' (safety) permitted. Applies to all packaged food sold in CA. Exceptions: infant formula, eggs, beer. Failure to comply is a violation subject to EH enforcement.',
    change_type: 'amendment',
    effective_date: '2026-07-01',
    source_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB660',
    impact_level: 'critical',
    affected_pillars: ['food_safety'],
    affected_states: ['CA'],
    published: false,
    ai_generated: false,
  },
  {
    title: 'SB 68 — Allergen Disclosure for Dining Experiences Act (California)',
    summary: 'Effective July 1, 2026, requires food facilities subject to federal menu-nutrient disclosure requirements (chains with 20+ locations) to provide written notification of the 9 major allergens for each menu item. Allergens: milk, eggs, fish, shellfish, tree nuts, wheat, peanuts, soybeans, sesame.',
    impact_description: 'Effective July 1, 2026, requires food facilities subject to federal menu-nutrient disclosure requirements (chains with 20+ locations) to provide written notification of the 9 major allergens for each menu item. Allergens: milk, eggs, fish, shellfish, tree nuts, wheat, peanuts, soybeans, sesame.',
    change_type: 'amendment',
    effective_date: '2026-07-01',
    source_url: 'https://leginfo.legislature.ca.gov',
    impact_level: 'critical',
    affected_pillars: ['food_safety'],
    affected_states: ['CA'],
    published: false,
    ai_generated: false,
  },
  {
    title: 'AB 418 — California Food Safety Act: Ban on BVO, Potassium Bromate, Propylparaben, Red Dye No. 3',
    summary: 'Effective January 1, 2027, prohibits manufacture, sale, and distribution of food containing brominated vegetable oil, potassium bromate, propylparaben, and Red Dye No. 3 in California. First state-level additive ban of this kind in the US. Manufacturers must reformulate. Operators must audit supplier ingredient lists.',
    impact_description: 'Effective January 1, 2027, prohibits manufacture, sale, and distribution of food containing brominated vegetable oil, potassium bromate, propylparaben, and Red Dye No. 3 in California. First state-level additive ban of this kind in the US. Manufacturers must reformulate. Operators must audit supplier ingredient lists.',
    change_type: 'amendment',
    effective_date: '2027-01-01',
    source_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB418',
    impact_level: 'moderate',
    affected_pillars: ['food_safety'],
    affected_states: ['CA'],
    published: false,
    ai_generated: false,
  },
  {
    title: 'NFPA 96 2024 Edition — Commercial Kitchen Fire Safety Standard Update',
    summary: '2024 edition introduces: monthly cleaning for high-volume/24-7 kitchens per Table 12.4, mandatory UL-300 compliance with no grandfathering, additional ductwork access panel requirements, digital documentation required for all cleaning and inspection records, updated rooftop grease containment standards.',
    impact_description: '2024 edition introduces: monthly cleaning for high-volume/24-7 kitchens per Table 12.4, mandatory UL-300 compliance with no grandfathering, additional ductwork access panel requirements, digital documentation required for all cleaning and inspection records, updated rooftop grease containment standards.',
    change_type: 'new_edition',
    effective_date: '2024-01-01',
    source_url: 'https://www.nfpa.org/codes-and-standards/nfpa-96',
    impact_level: 'critical',
    affected_pillars: ['facility_safety'],
    affected_states: ['CA'],
    published: false,
    ai_generated: false,
  },
  {
    title: 'FSMA Food Traceability Rule (21 CFR Part 1 Subpart S) — Enhanced Record-Keeping',
    summary: 'FDA FSMA Section 204 Final Rule requires enhanced traceability record-keeping for Foods on the Traceability List including leafy greens, shell eggs, nut butters, finfish, crustaceans, and fresh-cut produce. Enforcement deadline extended to July 20, 2028. Commercial kitchens must capture Key Data Elements at each Critical Tracking Event.',
    impact_description: 'FDA FSMA Section 204 Final Rule requires enhanced traceability record-keeping for Foods on the Traceability List including leafy greens, shell eggs, nut butters, finfish, crustaceans, and fresh-cut produce. Enforcement deadline extended to July 20, 2028. Commercial kitchens must capture Key Data Elements at each Critical Tracking Event.',
    change_type: 'enforcement_change',
    effective_date: '2028-07-20',
    source_url: 'https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods',
    impact_level: 'moderate',
    affected_pillars: ['food_safety'],
    affected_states: ['ALL'],
    published: false,
    ai_generated: false,
  },
  {
    title: 'SB 476 — California Food Handler Card: Employer-Funded, 30-Day New Hire Requirement',
    summary: 'Requires all CA food service employers to fund and coordinate California Food Handler Card training. New hires in food-handling positions must obtain card within 30 days. Applies to all restaurant types, catering, institutional kitchens, schools, hospitals. Card valid 3 years. Employer must track renewals.',
    impact_description: 'Requires all CA food service employers to fund and coordinate California Food Handler Card training. New hires in food-handling positions must obtain card within 30 days. Applies to all restaurant types, catering, institutional kitchens, schools, hospitals. Card valid 3 years. Employer must track renewals.',
    change_type: 'amendment',
    effective_date: '2024-01-01',
    source_url: 'https://leginfo.legislature.ca.gov',
    impact_level: 'moderate',
    affected_pillars: ['food_safety'],
    affected_states: ['CA'],
    published: false,
    ai_generated: false,
  },
];

// ── Main ──
async function main() {
  console.log('=== EvidLY Real Intelligence Seeder ===\n');

  // Step 1: Detect columns
  console.log('Detecting table schemas...');
  const signalCols = await detectColumns('intelligence_signals');
  const regCols = await detectColumns('regulatory_changes');
  console.log(`  intelligence_signals: ${signalCols.size} columns (${[...signalCols].join(', ')})`);
  console.log(`  regulatory_changes: ${regCols.size} columns (${[...regCols].join(', ')})\n`);

  let signalSuccess = 0;
  let signalFail = 0;
  let regSuccess = 0;
  let regFail = 0;

  // Step 2: Insert intelligence signals
  console.log(`--- Inserting ${SIGNALS.length} intelligence signals ---\n`);
  for (const signal of SIGNALS) {
    const filtered = filterToSchema(signal, signalCols);
    const { error } = await supabase.from('intelligence_signals').insert(filtered);
    if (error) {
      console.error(`  FAIL: ${signal.title.slice(0, 80)}...`);
      console.error(`        ${error.message}`);
      signalFail++;
    } else {
      console.log(`  OK:   ${signal.title.slice(0, 80)}...`);
      signalSuccess++;
    }
  }

  console.log(`\n--- Inserting ${REGULATORY_CHANGES.length} regulatory changes ---\n`);
  for (const reg of REGULATORY_CHANGES) {
    const filtered = filterToSchema(reg, regCols);
    const { error } = await supabase.from('regulatory_changes').insert(filtered);
    if (error) {
      console.error(`  FAIL: ${reg.title.slice(0, 80)}...`);
      console.error(`        ${error.message}`);
      regFail++;
    } else {
      console.log(`  OK:   ${reg.title.slice(0, 80)}...`);
      regSuccess++;
    }
  }

  // Step 3: Summary
  console.log('\n=== RESULTS ===');
  console.log(`Intelligence signals: ${signalSuccess}/${SIGNALS.length} inserted (${signalFail} failed)`);
  console.log(`Regulatory changes:   ${regSuccess}/${REGULATORY_CHANGES.length} inserted (${regFail} failed)`);
  console.log(`Total:                ${signalSuccess + regSuccess}/${SIGNALS.length + REGULATORY_CHANGES.length} inserted`);

  if (signalFail > 0 || regFail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
