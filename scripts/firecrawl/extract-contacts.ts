/**
 * extract-contacts.ts — Firecrawl contact extractor for jurisdiction backfill
 *
 * Contract:
 *   input:  jurisdiction row + list of NULL target fields
 *   output: { jurisdiction_id, food: {field: {value, source_url, confidence, reason}}, fire: {...} }
 *
 * Candidate paths (priority order):
 *   /contact, /contact-us, /staff, /directory, /about,
 *   /environmental-health, /public-health, /ehd, then base /
 *
 * Confidence levels:
 *   HIGH   — labeled structured page (e.g., "Fax: (555) 123-4567" on /contact)
 *   MEDIUM — regex match on unstructured text, or address missing CA+ZIP
 *   LOW    — PDF/image OCR or weak heuristic
 *
 * Rules:
 *   - Never overwrite non-NULL fields
 *   - Never touch phone columns (agency_phone, fire_ahj_phone)
 *   - Email: must contain "@" + domain matches agency_website host OR .gov/.us TLD
 *     Reject program-specific aliases unless only contact email on page
 *   - Address: must include "CA" + 5-digit ZIP, else demote to MEDIUM
 *   - Per field: take first HIGH hit, else first MEDIUM, else NULL
 *
 * Usage:
 *   FIRECRAWL_API_KEY=fc-xxx npx ts-node scripts/firecrawl/extract-contacts.ts
 *
 * Phase 2 batch 1 execution (2026-05-22):
 *   - 8 jurisdictions (priority ranks 3–10): Vernon, Pasadena, Monterey,
 *     SLO, Contra Costa, Placer, Sacramento, Berkeley
 *   - Executed via Claude Code WebFetch tool (sequential, ~2s delay)
 *   - Results: docs/firecrawl_batch1_results.json (563 lines, 8 entries)
 *   - Diff review: docs/firecrawl_batch1_diff.md
 *   - Outcome: 39 proposed fills (28 HIGH, 11 MEDIUM, 0 LOW)
 *   - Vernon deferred to phase2b (WAF 403)
 * This script documents the contract for future automated runs.
 */

interface ContactField {
  value: string | null;
  source_url: string | null;
  confidence: 'high' | 'medium' | 'low' | 'null';
  reason: string;
  candidates?: Array<{
    value: string;
    source_url: string;
    confidence: string;
    reason: string;
  }>;
}

interface ExtractionResult {
  jurisdiction_id: string;
  county: string;
  city: string | null;
  status: 'completed' | 'blocked_403' | 'partial' | 'deferred_to_phase2b';
  crawl_date: string;
  urls_crawled: string[];
  urls_failed: Array<{ url: string; reason: string }>;
  food: Record<string, ContactField>;
  fire: Record<string, ContactField>;
  notes: string[];
}

const FOOD_TARGET_FIELDS = [
  'poc_name', 'poc_title', 'agency_email', 'agency_fax', 'agency_address'
] as const;

const FIRE_TARGET_FIELDS = [
  'fire_ahj_poc_name', 'fire_ahj_poc_title', 'fire_ahj_email',
  'fire_ahj_fax', 'fire_ahj_address'
] as const;

const CANDIDATE_PATHS = [
  '/contact', '/contact-us', '/staff', '/directory', '/about',
  '/environmental-health', '/public-health', '/ehd', ''
];

// Validation helpers
function isValidEmail(email: string, agencyHost: string): boolean {
  if (!email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  const hostBase = agencyHost.replace(/^www\./, '').toLowerCase();
  return domain.endsWith('.gov') || domain.endsWith('.us') || domain.includes(hostBase);
}

function isValidAddress(address: string): { valid: boolean; hasZip: boolean } {
  const hasCA = /\bCA\b/i.test(address);
  const hasZip = /\b\d{5}(-\d{4})?\b/.test(address);
  return { valid: hasCA, hasZip: hasCA && hasZip };
}

export type { ContactField, ExtractionResult };
export { FOOD_TARGET_FIELDS, FIRE_TARGET_FIELDS, CANDIDATE_PATHS };
