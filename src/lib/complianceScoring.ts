// ============================================================
// Compliance Scoring Engine — Single Source of Truth
// ============================================================
// Three-Pillar Model: Food Safety, Fire Safety, Vendor Compliance
// NO letter grades (A/B/C/D/F) anywhere. Status labels only.
// ============================================================

// --------------- Pillar Names & Weights ---------------

export type PillarName = 'foodSafety' | 'fireSafety' | 'vendorCompliance';

export const PILLAR_WEIGHTS: Record<PillarName, number> = {
  foodSafety: 0.45,
  fireSafety: 0.35,
  vendorCompliance: 0.20,
} as const;

export const PILLAR_LABELS: Record<PillarName, string> = {
  foodSafety: 'Food Safety',
  fireSafety: 'Fire Safety',
  vendorCompliance: 'Vendor Compliance',
} as const;

// --------------- Industry Vertical Weights ---------------

export type IndustryVertical =
  | 'RESTAURANT'
  | 'HEALTHCARE'
  | 'SENIOR_LIVING'
  | 'K12_EDUCATION'
  | 'HIGHER_EDUCATION';

export interface PillarWeights {
  foodSafety: number;
  fireSafety: number;
  vendorCompliance: number;
}

export const INDUSTRY_WEIGHTS: Record<IndustryVertical, PillarWeights> = {
  RESTAURANT:       { foodSafety: 0.45, fireSafety: 0.35, vendorCompliance: 0.20 },
  HEALTHCARE:       { foodSafety: 0.45, fireSafety: 0.25, vendorCompliance: 0.30 },
  SENIOR_LIVING:    { foodSafety: 0.45, fireSafety: 0.25, vendorCompliance: 0.30 },
  K12_EDUCATION:    { foodSafety: 0.45, fireSafety: 0.20, vendorCompliance: 0.35 },
  HIGHER_EDUCATION: { foodSafety: 0.45, fireSafety: 0.30, vendorCompliance: 0.25 },
};

export const DEFAULT_WEIGHTS = INDUSTRY_WEIGHTS.RESTAURANT;

// --------------- Unified Scoring Item Interface ---------------

export interface ScoringItem {
  id: string;
  name: string;
  pillar: PillarName;
  status: 'compliant' | 'non_compliant' | 'pending' | 'not_applicable';
  dueDate?: string;
  lastCompleted?: string;
}

export interface PillarScore {
  name: PillarName;
  label: string;
  score: number;        // 0-100
  weight: number;       // 0.35, 0.45, 0.20
  totalItems: number;
  completedItems: number;
  items: ScoringItem[];
}

export interface ComplianceScore {
  overall: number;              // 0-100, weighted
  foodSafety: number;
  fireSafety: number;
  vendorCompliance: number;
  pillars: PillarScore[];
  locationId: string;
  computedAt: string;           // ISO timestamp
}

/**
 * Compute compliance score from a list of scoring items.
 * Groups by pillar, calculates (compliant / applicable) × 100 per pillar,
 * then computes weighted overall.
 */
export function computeComplianceScore(
  items: ScoringItem[],
  locationId: string = '',
  weights: PillarWeights = DEFAULT_WEIGHTS,
): ComplianceScore {
  const pillarNames: PillarName[] = ['foodSafety', 'fireSafety', 'vendorCompliance'];
  const pillars: PillarScore[] = pillarNames.map((name) => {
    const pillarItems = items.filter((i) => i.pillar === name);
    const applicable = pillarItems.filter((i) => i.status !== 'not_applicable');
    const compliant = applicable.filter((i) => i.status === 'compliant').length;
    const total = applicable.length;
    const score = total > 0 ? Math.round((compliant / total) * 100) : 0;
    return {
      name,
      label: PILLAR_LABELS[name],
      score,
      weight: weights[name],
      totalItems: total,
      completedItems: compliant,
      items: pillarItems,
    };
  });

  const pillarMap: Record<PillarName, number> = { foodSafety: 0, fireSafety: 0, vendorCompliance: 0 };
  for (const p of pillars) {
    pillarMap[p.name] = p.score;
  }

  const overall = Math.round(
    pillarMap.foodSafety * weights.foodSafety +
    pillarMap.fireSafety * weights.fireSafety +
    pillarMap.vendorCompliance * weights.vendorCompliance,
  );

  return {
    overall,
    foodSafety: pillarMap.foodSafety,
    fireSafety: pillarMap.fireSafety,
    vendorCompliance: pillarMap.vendorCompliance,
    pillars,
    locationId,
    computedAt: new Date().toISOString(),
  };
}

// --------------- Color Thresholds (4-Tier) ---------------

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

// --------------- Pillar Sub-Component Interfaces ---------------
// Used for detailed scoring when real data is available

export interface FoodSafetyData {
  tempCheckCompletionRate: number;       // 0-100 %
  checklistCompletionRate: number;       // 0-100 %
  incidentResolutionAvgHours: number;    // hours, or -1 if unresolved
  haccpMonitoringRate: number;           // 0-100 %
}

export interface FireSafetyItem {
  name: string;
  weight: number;          // fraction of pillar (e.g. 0.30)
  daysUntilDue: number;    // for graduated items; Infinity if not date-based
  conditionScore?: number; // 0-100 for condition-based items
}

export interface VendorComplianceItem {
  name: string;
  weight: number;          // fraction of pillar
  daysUntilExpiry: number; // for graduated items
  count?: number;          // number of sub-items (e.g. staff certs, vendor certs)
  expiredCount?: number;   // how many are expired
}

// --------------- Food Safety Pillar Score ---------------

function incidentResolutionScore(avgHours: number): number {
  if (avgHours < 0) return 0;         // unresolved
  if (avgHours <= 2) return 100;
  if (avgHours <= 12) return 80;
  if (avgHours <= 24) return 60;
  if (avgHours <= 48) return 40;
  return 20;                           // over 48hrs
}

export function calculateFoodSafetyScore(data: FoodSafetyData): number {
  const tempScore = data.tempCheckCompletionRate * 0.35;
  const checklistScore = data.checklistCompletionRate * 0.30;
  const incidentScore = incidentResolutionScore(data.incidentResolutionAvgHours) * 0.20;
  const haccpScore = data.haccpMonitoringRate * 0.15;
  return Math.round(tempScore + checklistScore + incidentScore + haccpScore);
}

// --------------- Fire Safety Pillar Score ---------------

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

/**
 * Build FireSafetyItem[] from checklist completion data + equipment service records.
 *
 * Fire Safety sub-components (weights sum to 1.0):
 *   - Hood cleaning cert current:        0.30  (NFPA 96, semi-annual)
 *   - Ansul/suppression system service:  0.25  (ANSI/UL 300, annual)
 *   - Fire extinguisher annual inspect:  0.15  (NFPA 10, annual)
 *   - Daily fire safety checks:          0.15  (completion rate → condition)
 *   - Weekly/monthly fire checks:        0.10  (completion rate → condition)
 *   - Grease trap service:               0.05  (CalFire, quarterly)
 */
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

/**
 * Build demo FireSafetyItem[] for a location.
 * Uses realistic demo values matching locationScores in demoData.
 */
export function buildFireSafetyItemsFromDemoData(locationId: string): FireSafetyItem[] {
  const DEMO: Record<string, FireSafetyInputs> = {
    downtown: {
      hoodCleaningDaysUntilDue: 45,   // Excellent — well within window
      ansulServiceDaysUntilDue: 90,
      extinguisherDaysUntilDue: 120,
      dailyCheckCompletionRate: 95,
      weeklyMonthlyCompletionRate: 90,
      greaseTrapDaysUntilDue: 30,
    },
    airport: {
      hoodCleaningDaysUntilDue: 20,   // Good — approaching
      ansulServiceDaysUntilDue: 40,
      extinguisherDaysUntilDue: 60,
      dailyCheckCompletionRate: 82,
      weeklyMonthlyCompletionRate: 75,
      greaseTrapDaysUntilDue: 10,
    },
    university: {
      hoodCleaningDaysUntilDue: 5,    // Critical — nearly overdue
      ansulServiceDaysUntilDue: 12,
      extinguisherDaysUntilDue: 25,
      dailyCheckCompletionRate: 60,
      weeklyMonthlyCompletionRate: 50,
      greaseTrapDaysUntilDue: -3,     // Overdue
    },
  };
  return buildFireSafetyItems(DEMO[locationId] || DEMO.downtown);
}

// --------------- Vendor Compliance Pillar Score ---------------

export function calculateVendorComplianceScore(items: VendorComplianceItem[]): number {
  let totalScore = 0;
  for (const item of items) {
    const maxPoints = item.weight * 100;
    if (item.count !== undefined && item.count > 0) {
      const perItemPenalty = maxPoints / item.count;
      const expiredItems = item.expiredCount || 0;
      const expiredPenalty = expiredItems * perItemPenalty;
      const remainingCount = item.count - expiredItems;
      const remainingPenalty = remainingCount > 0
        ? getGraduatedPenalty(item.daysUntilExpiry, perItemPenalty) * remainingCount
        : 0;
      totalScore += maxPoints - expiredPenalty - remainingPenalty;
    } else {
      const penalty = getGraduatedPenalty(item.daysUntilExpiry, maxPoints);
      totalScore += maxPoints - penalty;
    }
  }
  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

// --------------- Cert Compliance Helper ---------------

/**
 * Build a VendorComplianceItem for employee certifications (food handler, CFPM, etc.)
 * Plugs into the existing vendor-compliance pillar scoring.
 */
export function buildCertComplianceItem(data: {
  totalRequired: number;
  expiredCount: number;
  daysUntilNextExpiry: number;
  weight?: number;
}): VendorComplianceItem {
  return {
    name: 'Employee Certifications',
    weight: data.weight ?? 0.20,
    daysUntilExpiry: data.daysUntilNextExpiry,
    count: data.totalRequired,
    expiredCount: data.expiredCount,
  };
}

// --------------- Temperature Compliance Helper (FS-5) ---------------

export function buildTempComplianceItems(data: {
  totalLogs: number;
  failedLogs: number;
  iotCoverage: number; // 0-1, fraction of equipment with IoT sensors
}): { score: number; weight: number; label: string } {
  const complianceRate = data.totalLogs > 0
    ? (data.totalLogs - data.failedLogs) / data.totalLogs
    : 1;
  // IoT coverage bonus: up to 5 points for full IoT deployment
  const iotBonus = data.iotCoverage * 5;
  const rawScore = Math.round(complianceRate * 95 + iotBonus);
  return {
    score: Math.min(100, Math.max(0, rawScore)),
    weight: 0.30, // 30% of Food Safety pillar
    label: 'Temperature Monitoring',
  };
}

// --------------- Location Score ---------------

export interface LocationScoreResult {
  overall: number;
  foodSafety: number;
  fireSafety: number;
  vendorCompliance: number;
}

export interface LocationData {
  foodSafety: FoodSafetyData;
  fireSafety: FireSafetyItem[];
  vendorCompliance: VendorComplianceItem[];
}

export function calculateLocationScore(
  locationData: LocationData,
  verticalCode: IndustryVertical = 'RESTAURANT',
): LocationScoreResult {
  const weights = INDUSTRY_WEIGHTS[verticalCode] || DEFAULT_WEIGHTS;
  const foodSafety = calculateFoodSafetyScore(locationData.foodSafety);
  const fireSafety = calculateFireSafetyScore(locationData.fireSafety);
  const vendorCompliance = calculateVendorComplianceScore(locationData.vendorCompliance);
  const overall = Math.round(
    foodSafety * weights.foodSafety +
    fireSafety * weights.fireSafety +
    vendorCompliance * weights.vendorCompliance,
  );
  return { overall, foodSafety, fireSafety, vendorCompliance };
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
  scores: { foodSafety: number; fireSafety: number; vendorCompliance: number },
  weights: PillarWeights = DEFAULT_WEIGHTS,
): number {
  return Math.round(
    scores.foodSafety * weights.foodSafety +
    scores.fireSafety * weights.fireSafety +
    scores.vendorCompliance * weights.vendorCompliance,
  );
}

// --------------- Legacy Aliases ---------------
// Keep old type names as aliases during migration

/** @deprecated Use FoodSafetyData */
export type OperationalData = FoodSafetyData;
/** @deprecated Use FireSafetyItem */
export type EquipmentItem = FireSafetyItem;
/** @deprecated Use VendorComplianceItem */
export type DocumentItem = VendorComplianceItem;
/** @deprecated Use calculateFoodSafetyScore */
export const calculateOperationalScore = calculateFoodSafetyScore;
/** @deprecated Use calculateFireSafetyScore */
export const calculateEquipmentScore = calculateFireSafetyScore;
/** @deprecated Use calculateVendorComplianceScore */
export const calculateDocumentationScore = calculateVendorComplianceScore;
