// ============================================================
// Compliance Scoring Engine — Single Source of Truth
// ============================================================
// NO letter grades (A/B/C/D/F) anywhere. Status labels only.
// ============================================================

// --------------- Industry Pillar Weights ---------------

export type IndustryVertical =
  | 'RESTAURANT'
  | 'HEALTHCARE'
  | 'SENIOR_LIVING'
  | 'K12_EDUCATION'
  | 'HIGHER_EDUCATION';

export interface PillarWeights {
  operational: number;
  equipment: number;
  documentation: number;
}

export const INDUSTRY_WEIGHTS: Record<IndustryVertical, PillarWeights> = {
  RESTAURANT:       { operational: 0.50, equipment: 0.25, documentation: 0.25 },
  HEALTHCARE:       { operational: 0.45, equipment: 0.25, documentation: 0.30 },
  SENIOR_LIVING:    { operational: 0.45, equipment: 0.25, documentation: 0.30 },
  K12_EDUCATION:    { operational: 0.45, equipment: 0.20, documentation: 0.35 },
  HIGHER_EDUCATION: { operational: 0.45, equipment: 0.30, documentation: 0.25 },
};

export const DEFAULT_WEIGHTS = INDUSTRY_WEIGHTS.RESTAURANT;

// --------------- Color Thresholds (4-Tier) ---------------

/** Returns hex color for a 0-100 score (4-tier). */
export function getScoreColor(score: number): '#22c55e' | '#3b82f6' | '#f59e0b' | '#ef4444' {
  if (score >= 90) return '#22c55e';   // Green — Excellent
  if (score >= 75) return '#3b82f6';   // Blue — Good
  if (score >= 60) return '#f59e0b';   // Amber — Needs Attention
  return '#ef4444';                     // Red — Critical
}

// --------------- Status Labels (NO letter grades) ---------------

export type ScoreStatus = 'Excellent' | 'Good' | 'Needs Attention' | 'Critical';

/** Returns status label for a 0-100 score (4-tier). */
export function getScoreStatus(score: number): ScoreStatus {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Needs Attention';
  return 'Critical';
}

/** Returns Tailwind-compatible color name for badge rendering (4-tier). */
export function getScoreBadgeColor(score: number): 'green' | 'blue' | 'amber' | 'red' {
  if (score >= 90) return 'green';
  if (score >= 75) return 'blue';
  if (score >= 60) return 'amber';
  return 'red';
}

/** Returns { label, color, hex } for a score (4-tier). */
export function getScoreInfo(score: number) {
  return {
    label: getScoreStatus(score),
    color: getScoreBadgeColor(score),
    hex: getScoreColor(score),
  };
}

/** Returns full tier info: { label, color, hex, tier } for reuse across components. */
export function getScoreTier(score: number) {
  return {
    label: getScoreStatus(score),
    color: getScoreBadgeColor(score),
    hex: getScoreColor(score),
    tier: score >= 90 ? 4 : score >= 75 ? 3 : score >= 60 ? 2 : 1,
  };
}

// --------------- Graduated Urgency Model ---------------

/**
 * Calculates a graduated penalty based on days until due/expiry.
 *
 * | Days Until Due | Penalty Applied      |
 * |----------------|----------------------|
 * | 30+ days       | 0% of full penalty   |
 * | 15-30 days     | 15% of full penalty  |
 * | 7-14 days      | 30% of full penalty  |
 * | 1-7 days       | 50% of full penalty  |
 * | 0 or less      | 100% full penalty    |
 */
export function getGraduatedPenalty(daysUntilDue: number, fullPenaltyPoints: number): number {
  if (daysUntilDue <= 0) return fullPenaltyPoints;          // Expired / Overdue
  if (daysUntilDue <= 7) return fullPenaltyPoints * 0.50;   // 1-7 days
  if (daysUntilDue <= 14) return fullPenaltyPoints * 0.30;  // 7-14 days
  if (daysUntilDue <= 30) return fullPenaltyPoints * 0.15;  // 15-30 days
  return 0;                                                  // 30+ days
}

// --------------- Pillar Sub-Component Interfaces ---------------

export interface OperationalData {
  tempCheckCompletionRate: number;       // 0-100 %
  checklistCompletionRate: number;       // 0-100 %
  incidentResolutionAvgHours: number;    // hours, or -1 if unresolved
  haccpMonitoringRate: number;           // 0-100 %
}

export interface EquipmentItem {
  name: string;
  weight: number;          // fraction of pillar (e.g. 0.30)
  daysUntilDue: number;    // for graduated items; Infinity if not date-based
  conditionScore?: number; // 0-100 for condition-based items
}

export interface DocumentItem {
  name: string;
  weight: number;          // fraction of pillar
  daysUntilExpiry: number; // for graduated items
  count?: number;          // number of sub-items (e.g. staff certs, vendor certs)
  expiredCount?: number;   // how many are expired
}

// --------------- Operational Pillar Score ---------------

function incidentResolutionScore(avgHours: number): number {
  if (avgHours < 0) return 0;         // unresolved
  if (avgHours <= 2) return 100;
  if (avgHours <= 12) return 80;
  if (avgHours <= 24) return 60;
  if (avgHours <= 48) return 40;
  return 20;                           // over 48hrs
}

export function calculateOperationalScore(data: OperationalData): number {
  const tempScore = data.tempCheckCompletionRate * 0.35;
  const checklistScore = data.checklistCompletionRate * 0.30;
  const incidentScore = incidentResolutionScore(data.incidentResolutionAvgHours) * 0.20;
  const haccpScore = data.haccpMonitoringRate * 0.15;
  return Math.round(tempScore + checklistScore + incidentScore + haccpScore);
}

// --------------- Equipment Pillar Score ---------------

export function calculateEquipmentScore(items: EquipmentItem[]): number {
  let totalScore = 0;
  for (const item of items) {
    const maxPoints = item.weight * 100;
    if (item.conditionScore !== undefined) {
      // Not date-based: straight condition rating
      totalScore += (item.conditionScore / 100) * maxPoints;
    } else {
      // Date-based: apply graduated penalty
      const penalty = getGraduatedPenalty(item.daysUntilDue, maxPoints);
      totalScore += maxPoints - penalty;
    }
  }
  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

// --------------- Documentation Pillar Score ---------------

export function calculateDocumentationScore(items: DocumentItem[]): number {
  let totalScore = 0;
  for (const item of items) {
    const maxPoints = item.weight * 100;
    if (item.count !== undefined && item.count > 0) {
      // Per-item graduated penalty (e.g. food handler certs, vendor certs)
      const perItemPenalty = maxPoints / item.count;
      const expiredItems = item.expiredCount || 0;
      // For expired items: full penalty. For others: graduated based on daysUntilExpiry.
      const expiredPenalty = expiredItems * perItemPenalty;
      const remainingCount = item.count - expiredItems;
      const remainingPenalty = remainingCount > 0
        ? getGraduatedPenalty(item.daysUntilExpiry, perItemPenalty) * remainingCount
        : 0;
      totalScore += maxPoints - expiredPenalty - remainingPenalty;
    } else {
      // Single document: direct graduated penalty
      const penalty = getGraduatedPenalty(item.daysUntilExpiry, maxPoints);
      totalScore += maxPoints - penalty;
    }
  }
  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

// --------------- Location Score ---------------

export interface LocationScoreResult {
  overall: number;
  operational: number;
  equipment: number;
  documentation: number;
}

export interface LocationData {
  operational: OperationalData;
  equipment: EquipmentItem[];
  documentation: DocumentItem[];
}

export function calculateLocationScore(
  locationData: LocationData,
  verticalCode: IndustryVertical = 'RESTAURANT',
): LocationScoreResult {
  const weights = INDUSTRY_WEIGHTS[verticalCode] || DEFAULT_WEIGHTS;
  const operational = calculateOperationalScore(locationData.operational);
  const equipment = calculateEquipmentScore(locationData.equipment);
  const documentation = calculateDocumentationScore(locationData.documentation);
  const overall = Math.round(
    operational * weights.operational +
    equipment * weights.equipment +
    documentation * weights.documentation,
  );
  return { overall, operational, equipment, documentation };
}

// --------------- Organization Score ---------------

export function calculateOrgScore(locationScores: LocationScoreResult[]): number {
  if (locationScores.length === 0) return 0;
  const sum = locationScores.reduce((acc, loc) => acc + loc.overall, 0);
  return Math.round(sum / locationScores.length);
}

// --------------- Weighted Overall (from raw pillar scores) ---------------

/** Compute weighted overall from raw pillar scores (0-100 each). */
export function computeWeightedOverall(
  scores: { operational: number; equipment: number; documentation: number },
  weights: PillarWeights = DEFAULT_WEIGHTS,
): number {
  return Math.round(
    scores.operational * weights.operational +
    scores.equipment * weights.equipment +
    scores.documentation * weights.documentation,
  );
}
