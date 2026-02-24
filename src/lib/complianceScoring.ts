// ============================================================
// Compliance Model — Jurisdiction-Status Based (Two Pillars)
// ============================================================
// Food Safety + Fire Safety only. NO Vendor Compliance pillar.
// NO aggregate numeric scores. Status labels only.
// ============================================================

// --------------- Jurisdiction-Based Status Types ---------------

export type FoodSafetyStatus = 'Compliant' | 'Good' | 'Satisfactory' | 'Action Required' | 'Unsatisfactory';
export type FireSafetyVerdict = 'Pass' | 'Fail';

export interface LocationCompliance {
  foodSafety: {
    jurisdiction: string;
    methodology: 'violation_based' | 'three_tier_points';
    status: FoodSafetyStatus;
    detail: string;
    note?: string;
  };
  fireSafety: {
    reference: 'NFPA 96 (2024)';
    ahj: string;
    verdict: FireSafetyVerdict;
    bars: { label: 'Permit' | 'Hood' | 'Ext' | 'Ansul'; status: 'pass' | 'fail' }[];
  };
  openItems: number;
}

// --------------- Industry Vertical (retained for benchmark engine) ---------------

export type IndustryVertical =
  | 'RESTAURANT'
  | 'HEALTHCARE'
  | 'SENIOR_LIVING'
  | 'K12_EDUCATION'
  | 'HIGHER_EDUCATION';

// --------------- Color Thresholds (4-Tier) ---------------
// Retained for UI components that need color-coding

/** Returns hex color for a 0-100 score (4-tier). */
export function getScoreColor(score: number): '#22c55e' | '#eab308' | '#f59e0b' | '#ef4444' {
  if (score >= 90) return '#22c55e';   // Green — Excellent
  if (score >= 75) return '#eab308';   // Yellow — Good
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
export function getScoreBadgeColor(score: number): 'green' | 'yellow' | 'amber' | 'red' {
  if (score >= 90) return 'green';
  if (score >= 75) return 'yellow';
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

// --------------- Fire Safety Item Interfaces ---------------

export interface FireSafetyItem {
  name: string;
  weight: number;          // fraction of pillar (e.g. 0.30)
  daysUntilDue: number;    // for graduated items; Infinity if not date-based
  conditionScore?: number; // 0-100 for condition-based items
}

export function calculateFireSafetyScore(items: FireSafetyItem[]): number {
  let totalScore = 0;
  for (const item of items) {
    const maxPoints = item.weight * 100;
    if (item.conditionScore !== undefined) {
      totalScore += (item.conditionScore / 100) * maxPoints;
    } else {
      const penalty = getGraduatedPenalty(item.daysUntilDue, maxPoints);
      totalScore += maxPoints - penalty;
    }
  }
  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

// --------------- Fire Safety Item Builders ---------------

export interface FireSafetyInputs {
  hoodCleaningDaysUntilDue: number;
  ansulServiceDaysUntilDue: number;
  extinguisherDaysUntilDue: number;
  dailyCheckCompletionRate: number;    // 0-100
  weeklyMonthlyCompletionRate: number; // 0-100
  greaseTrapDaysUntilDue: number;
}

export function buildFireSafetyItems(inputs: FireSafetyInputs): FireSafetyItem[] {
  return [
    { name: 'Hood Cleaning Certification', weight: 0.30, daysUntilDue: inputs.hoodCleaningDaysUntilDue },
    { name: 'Ansul / Suppression Service', weight: 0.25, daysUntilDue: inputs.ansulServiceDaysUntilDue },
    { name: 'Fire Extinguisher Inspection', weight: 0.15, daysUntilDue: inputs.extinguisherDaysUntilDue },
    { name: 'Daily Fire Safety Checks', weight: 0.15, daysUntilDue: Infinity, conditionScore: inputs.dailyCheckCompletionRate },
    { name: 'Weekly/Monthly Fire Checks', weight: 0.10, daysUntilDue: Infinity, conditionScore: inputs.weeklyMonthlyCompletionRate },
    { name: 'Grease Trap Service', weight: 0.05, daysUntilDue: inputs.greaseTrapDaysUntilDue },
  ];
}

export function buildFireSafetyItemsFromDemoData(locationId: string): FireSafetyItem[] {
  const DEMO: Record<string, FireSafetyInputs> = {
    downtown: {
      hoodCleaningDaysUntilDue: 45,
      ansulServiceDaysUntilDue: 90,
      extinguisherDaysUntilDue: 120,
      dailyCheckCompletionRate: 95,
      weeklyMonthlyCompletionRate: 90,
      greaseTrapDaysUntilDue: 30,
    },
    airport: {
      hoodCleaningDaysUntilDue: 20,
      ansulServiceDaysUntilDue: 40,
      extinguisherDaysUntilDue: 60,
      dailyCheckCompletionRate: 82,
      weeklyMonthlyCompletionRate: 75,
      greaseTrapDaysUntilDue: 10,
    },
    university: {
      hoodCleaningDaysUntilDue: 5,
      ansulServiceDaysUntilDue: 12,
      extinguisherDaysUntilDue: 25,
      dailyCheckCompletionRate: 60,
      weeklyMonthlyCompletionRate: 50,
      greaseTrapDaysUntilDue: -3,
    },
  };
  return buildFireSafetyItems(DEMO[locationId] || DEMO.downtown);
}

// --------------- Food Safety Data Interface ---------------

export interface FoodSafetyData {
  tempCheckCompletionRate: number;       // 0-100 %
  checklistCompletionRate: number;       // 0-100 %
  incidentResolutionAvgHours: number;    // hours, or -1 if unresolved
  haccpMonitoringRate: number;           // 0-100 %
}

// --------------- Temperature Compliance Helper ---------------

export function buildTempComplianceItems(data: {
  totalLogs: number;
  failedLogs: number;
  iotCoverage: number;
}): { score: number; weight: number; label: string } {
  const complianceRate = data.totalLogs > 0
    ? (data.totalLogs - data.failedLogs) / data.totalLogs
    : 1;
  const iotBonus = data.iotCoverage * 5;
  const rawScore = Math.round(complianceRate * 95 + iotBonus);
  return {
    score: Math.min(100, Math.max(0, rawScore)),
    weight: 0.30,
    label: 'Temperature Monitoring',
  };
}
