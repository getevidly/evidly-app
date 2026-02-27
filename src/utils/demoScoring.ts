// ═══════════════════════════════════════════════════════════
// src/utils/demoScoring.ts
// DEMO MODE ONLY — Local scoring engine
// Mirrors calculate-compliance-score Edge Function
// Zero database calls. Zero API calls.
//
// CREDIBILITY-FIRST: Demo mode shows the same CalCode-based
// determination the inspector would make. Pass/Reinspect/Closed
// for non-grading counties. Letter grades for grading counties.
// ═══════════════════════════════════════════════════════════

import { DEMO_JURISDICTIONS, DEMO_LOCATIONS, calculateDemoGrade, demoLocationJurisdictions } from '../data/demoJurisdictions';
import { DEMO_SCORE_BREAKDOWN } from '../data/demoCalcodeMap';

export interface DemoScoreResult {
  locationId: string;
  locationName: string;
  overallScore: number;
  foodSafety: { score: number; ops: number; docs: number };
  facilitySafety: { score: number; ops: number; docs: number };
  jurisdictionGrade: string;
  gradeDisplay: string;
  passFail: string;
  jurisdictionName: string;
  scoringType: string;
  gradingType: string;
  violations: typeof DEMO_SCORE_BREAKDOWN.violations;
  // Violation counts for pass_reinspect display
  majorViolations: number;
  minorViolations: number;
  uncorrectedMajors: number;
  totalPoints: number; // For three_tier_rating display
}

// Calculate demo score for a location with a specific jurisdiction
export function calculateDemoScore(
  locationId: string,
  jurisdictionId?: string,
): DemoScoreResult {
  const location = DEMO_LOCATIONS.find(l => l.id === locationId) || DEMO_LOCATIONS[0];
  const jurisdiction = jurisdictionId
    ? DEMO_JURISDICTIONS.find(j => j.id === jurisdictionId) || location.jurisdiction
    : location.jurisdiction;

  const gradeResult = calculateDemoGrade(location.score, jurisdiction);

  // Read ops/docs weights from jurisdiction data — no hardcoded weights
  const locJurisdiction = demoLocationJurisdictions[location.id];
  const opsW = locJurisdiction?.ops_weight ?? 0.5;
  const docsW = locJurisdiction?.docs_weight ?? (1 - opsW);

  return {
    locationId: location.id,
    locationName: location.name,
    overallScore: location.score,
    foodSafety: {
      score: Math.round(location.foodSafety.ops * opsW + location.foodSafety.docs * docsW),
      ops: location.foodSafety.ops,
      docs: location.foodSafety.docs,
    },
    facilitySafety: {
      score: Math.round(location.facilitySafety.ops * opsW + location.facilitySafety.docs * docsW),
      ops: location.facilitySafety.ops,
      docs: location.facilitySafety.docs,
    },
    jurisdictionGrade: gradeResult.grade,
    gradeDisplay: gradeResult.display,
    passFail: gradeResult.passFail,
    jurisdictionName: jurisdiction.county,
    scoringType: jurisdiction.scoringType,
    gradingType: jurisdiction.gradingType,
    violations: DEMO_SCORE_BREAKDOWN.violations,
    majorViolations: gradeResult.majorViolations || 0,
    minorViolations: gradeResult.minorViolations || 0,
    uncorrectedMajors: gradeResult.uncorrectedMajors || 0,
    totalPoints: gradeResult.totalPoints || 0,
  };
}

// The 88% Test — calculate the same score across all demo jurisdictions
// Updated to include Central Valley counties
export function calculate88Test(): Array<{
  jurisdiction: string;
  grade: string;
  display: string;
  passFail: string;
  explanation: string;
  scoringType: string;
}> {
  return DEMO_JURISDICTIONS.map(j => {
    const result = calculateDemoGrade(88, j);
    return {
      jurisdiction: j.county,
      grade: result.grade,
      display: result.display,
      passFail: result.passFail,
      explanation: j.gradeExplanation,
      scoringType: j.scoringType,
    };
  });
}

// Calculate score for a personalized demo
export function calculatePersonalizedDemoScore(
  score: number,
  jurisdictionId: string,
): {
  grade: string;
  display: string;
  passFail: string;
  explanation: string;
} {
  const jurisdiction = DEMO_JURISDICTIONS.find(j => j.id === jurisdictionId)
    || DEMO_JURISDICTIONS[0];

  const result = calculateDemoGrade(score, jurisdiction);
  return {
    ...result,
    explanation: jurisdiction.gradeExplanation,
  };
}
