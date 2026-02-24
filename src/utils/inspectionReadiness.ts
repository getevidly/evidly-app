// ============================================================
// Inspection Readiness Scoring Engine
// ============================================================
// Two-Pillar Model: Food Safety + Fire Safety (independent scores)
// Vendor credentials fold into the pillar they serve.
// ============================================================

// --------------- Pillar & Component Weights ---------------

export type InspectionPillar = 'food_safety' | 'fire_safety';

export const COMPONENT_WEIGHTS = {
  operations: 0.50,
  documentation: 0.50,
} as const;

// --------------- Types ---------------

export interface InspectionReadinessScore {
  overall: number | null;     // DEPRECATED — no composite score
  foodSafety: {
    score: number;            // 0-100
    ops: number;              // 0-100
    docs: number;             // 0-100
  };
  fireSafety: {
    score: number;            // 0-100
    ops: number;              // 0-100
    docs: number;             // 0-100
  };
  jurisdiction?: string;      // e.g. "Mariposa County, California"
  calculatedAt: string;       // ISO timestamp
}

// --------------- Score Color Helpers ---------------

export function getReadinessColor(score: number): string {
  if (score >= 90) return '#16a34a';  // Green
  if (score >= 75) return '#d4af37';  // Gold/amber (EvidLY brand)
  return '#dc2626';                    // Red
}

export function getReadinessStatus(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  return 'At Risk';
}

// --------------- Main Calculation ---------------

export function calculateInspectionReadiness(
  foodOps: number,     // 0-100 aggregate food safety operations score
  foodDocs: number,    // 0-100 aggregate food safety documentation score
  fireOps: number,     // 0-100 aggregate fire safety operations score
  fireDocs: number,    // 0-100 aggregate fire safety documentation score
  jurisdiction?: string,
): InspectionReadinessScore {
  const foodScore = (foodOps * COMPONENT_WEIGHTS.operations) + (foodDocs * COMPONENT_WEIGHTS.documentation);
  const fireScore = (fireOps * COMPONENT_WEIGHTS.operations) + (fireDocs * COMPONENT_WEIGHTS.documentation);

  return {
    overall: null, // DEPRECATED — pillars are independent
    foodSafety: { score: Math.round(foodScore), ops: Math.round(foodOps), docs: Math.round(foodDocs) },
    fireSafety: { score: Math.round(fireScore), ops: Math.round(fireOps), docs: Math.round(fireDocs) },
    jurisdiction,
    calculatedAt: new Date().toISOString(),
  };
}

// --------------- Multi-Location Aggregation ---------------

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

export interface LocationReadinessEntry {
  locationId: string;
  locationName: string;
  score: InspectionReadinessScore;
}

export function calculateOrgReadiness(
  locationScores: LocationReadinessEntry[],
): InspectionReadinessScore & { locationScores: LocationReadinessEntry[] } {
  const avgFoodOps = avg(locationScores.map(l => l.score.foodSafety.ops));
  const avgFoodDocs = avg(locationScores.map(l => l.score.foodSafety.docs));
  const avgFireOps = avg(locationScores.map(l => l.score.fireSafety.ops));
  const avgFireDocs = avg(locationScores.map(l => l.score.fireSafety.docs));

  return {
    ...calculateInspectionReadiness(avgFoodOps, avgFoodDocs, avgFireOps, avgFireDocs),
    locationScores,
  };
}

// --------------- Demo Mode Scores ---------------

export const DEMO_LOCATION_SCORES: Record<string, { name: string; foodOps: number; foodDocs: number; fireOps: number; fireDocs: number }> = {
  'downtown':    { name: 'Downtown Kitchen',   foodOps: 97, foodDocs: 94, fireOps: 88, fireDocs: 95 },
  'airport':     { name: 'Airport Cafe',       foodOps: 88, foodDocs: 80, fireOps: 75, fireDocs: 82 },
  'university':  { name: 'University Dining',  foodOps: 74, foodDocs: 69, fireOps: 60, fireDocs: 67 },
};

export function getDemoScores(): LocationReadinessEntry[] {
  return Object.entries(DEMO_LOCATION_SCORES).map(([id, data]) => ({
    locationId: id,
    locationName: data.name,
    score: calculateInspectionReadiness(data.foodOps, data.foodDocs, data.fireOps, data.fireDocs, 'Mariposa County, California'),
  }));
}
