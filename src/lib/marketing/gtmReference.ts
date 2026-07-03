/**
 * GTM Reference Data — Jurisdictions, Segments, ICP scoring
 *
 * Ported verbatim from docs/marketing-mockups/target-intelligence.jsx.
 * Pure functions — no UI, no Supabase.
 *
 * NOTE: This is GTM reference data for prospecting, NOT the operational
 * JIE `jurisdictions` table. Keep them separate.
 */

// ── Jurisdictions (county -> food/fire scoring) ──────────────────
export interface JurisdictionEntry {
  foodTier: 'A' | 'B' | 'C';
  foodPts: number;
  fireLevel: 'high' | 'medium' | 'low';
  firePts: number;
}

export const JURISDICTIONS: Record<string, JurisdictionEntry> = {
  'Los Angeles':      { foodTier: 'A', foodPts: 30, fireLevel: 'high',   firePts: 25 },
  'San Bernardino':   { foodTier: 'A', foodPts: 30, fireLevel: 'high',   firePts: 25 },
  'Orange':           { foodTier: 'A', foodPts: 30, fireLevel: 'medium', firePts: 15 },
  'Riverside':        { foodTier: 'A', foodPts: 30, fireLevel: 'high',   firePts: 25 },
  'San Diego':        { foodTier: 'A', foodPts: 30, fireLevel: 'medium', firePts: 15 },
  'Sacramento':       { foodTier: 'B', foodPts: 20, fireLevel: 'medium', firePts: 15 },
  'Alameda':          { foodTier: 'B', foodPts: 20, fireLevel: 'low',    firePts: 5 },
  'Santa Clara':      { foodTier: 'B', foodPts: 20, fireLevel: 'low',    firePts: 5 },
  'San Francisco':    { foodTier: 'B', foodPts: 20, fireLevel: 'low',    firePts: 5 },
  'Contra Costa':     { foodTier: 'B', foodPts: 20, fireLevel: 'medium', firePts: 15 },
  'Fresno':           { foodTier: 'B', foodPts: 20, fireLevel: 'medium', firePts: 15 },
  'Kern':             { foodTier: 'B', foodPts: 20, fireLevel: 'high',   firePts: 25 },
  'Ventura':          { foodTier: 'B', foodPts: 20, fireLevel: 'high',   firePts: 25 },
  'San Mateo':        { foodTier: 'C', foodPts: 10, fireLevel: 'low',    firePts: 5 },
  'Stanislaus':       { foodTier: 'C', foodPts: 10, fireLevel: 'medium', firePts: 15 },
  'Merced':           { foodTier: 'C', foodPts: 10, fireLevel: 'medium', firePts: 15 },
  'Tulare':           { foodTier: 'C', foodPts: 10, fireLevel: 'medium', firePts: 15 },
  'Sonoma':           { foodTier: 'C', foodPts: 10, fireLevel: 'high',   firePts: 25 },
  'Marin':            { foodTier: 'C', foodPts: 10, fireLevel: 'low',    firePts: 5 },
  'Santa Barbara':    { foodTier: 'C', foodPts: 10, fireLevel: 'high',   firePts: 25 },
};

// ── Segments ─────────────────────────────────────────────────────
export interface SegmentEntry {
  category: 'owner' | 'institution';
  fit: number;        // 0–20
  rate: string;       // display label
  buyer: string;      // typical buyer title
}

export const SEGMENTS: Record<string, SegmentEntry> = {
  'Full-Service Restaurant':    { category: 'owner',       fit: 20, rate: 'High',   buyer: 'Owner / GM' },
  'Multi-Location / Franchisee':{ category: 'owner',       fit: 18, rate: 'High',   buyer: 'Area Director' },
  'QSR':                        { category: 'owner',       fit: 15, rate: 'Medium', buyer: 'Franchise Owner' },
  'Ghost / Cloud Kitchen':      { category: 'owner',       fit: 12, rate: 'Medium', buyer: 'Operator' },
  'Hotel F&B':                  { category: 'institution', fit: 18, rate: 'High',   buyer: 'F&B Director' },
  'Senior Living':              { category: 'institution', fit: 16, rate: 'High',   buyer: 'Dining Director' },
  'Hospital':                   { category: 'institution', fit: 14, rate: 'Medium', buyer: 'Nutrition Mgr' },
  'K-12 / University':          { category: 'institution', fit: 14, rate: 'Medium', buyer: 'Food Service Dir' },
  'Corporate Cafeteria':        { category: 'institution', fit: 12, rate: 'Medium', buyer: 'Facilities Mgr' },
  'Grocery Prepared':           { category: 'institution', fit: 10, rate: 'Low',    buyer: 'Deli Manager' },
  'Corrections':                { category: 'institution', fit: 8,  rate: 'Low',    buyer: 'Procurement' },
};

// ── Stages (13-superset matching DB check constraint) ────────────
export const STAGES = [
  'prospect',
  'researching',
  'broker_introduced',
  'policy_lens_sent',
  'tour_scheduled',
  'tour_completed',
  'proposal_sent',
  'negotiating',
  'won',
  'lost',
  'churned',
  'nurture',
] as const;

export type Stage = typeof STAGES[number];

export const STAGE_LABELS: Record<Stage, string> = {
  prospect:           'Prospect',
  researching:        'Researching',
  broker_introduced:  'Broker Introduced',
  policy_lens_sent:   'Policy Lens Sent',
  tour_scheduled:     'Tour Scheduled',
  tour_completed:     'Tour Completed',
  proposal_sent:      'Proposal Sent',
  negotiating:        'Negotiating',
  won:                'Won',
  lost:               'Lost',
  churned:            'Churned',
  nurture:            'Nurture',
};

// ── Derived buyer type ───────────────────────────────────────────
export function buyerTypeFromSegment(segmentName: string): 'owner' | 'institution' {
  const entry = SEGMENTS[segmentName];
  return entry?.category ?? 'owner';
}

// ── ICP scoring (0–100) ──────────────────────────────────────────
// Same math as target-intelligence.jsx:
//   food pts (0–30)  + fire pts (0–25) + segment fit (0–20) + location bonus (0–15) + insurer bonus (0–10)
export interface ICPInput {
  county?: string | null;
  segment?: string | null;
  location_count?: number | null;
  insurer?: string | null;
}

export function deriveICP(account: ICPInput): number {
  let score = 0;

  // Food + fire from jurisdiction
  const jur = account.county ? JURISDICTIONS[account.county] : null;
  if (jur) {
    score += jur.foodPts;  // 0–30
    score += jur.firePts;  // 0–25
  }

  // Segment fit
  const seg = account.segment ? SEGMENTS[account.segment] : null;
  if (seg) {
    score += seg.fit;      // 0–20
  }

  // Location bonus: 1=0, 2–5=5, 6–15=10, 16+=15
  const locs = account.location_count ?? 1;
  if (locs >= 16) score += 15;
  else if (locs >= 6) score += 10;
  else if (locs >= 2) score += 5;

  // Insurer bonus (has a named insurer = +10)
  if (account.insurer && account.insurer.trim().length > 0) {
    score += 10;
  }

  return Math.min(score, 100);
}

// ── Priority band ────────────────────────────────────────────────
export function priorityBand(score: number): 'hot' | 'warm' | 'nurture' {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'nurture';
}
