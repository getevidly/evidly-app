// ═══════════════════════════════════════════════════════════
// src/utils/demoScoring.ts
// DEMO MODE ONLY — Local scoring engine
// Mirrors calculate-compliance-score Edge Function
// Zero database calls. Zero API calls.
// ═══════════════════════════════════════════════════════════

import { DEMO_JURISDICTIONS, DEMO_LOCATIONS, calculateDemoGrade } from '../data/demoJurisdictions';
import { DEMO_SCORE_BREAKDOWN } from '../data/demoCalcodeMap';

export interface DemoScoreResult {
  locationId: string;
  locationName: string;
  overallScore: number;
  foodSafety: { score: number; ops: number; docs: number };
  fireSafety: { score: number; ops: number; docs: number };
  jurisdictionGrade: string;
  gradeDisplay: string;
  passFail: string;
  jurisdictionName: string;
  scoringType: string;
  gradingType: string;
  violations: typeof DEMO_SCORE_BREAKDOWN.violations;
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

  return {
    locationId: location.id,
    locationName: location.name,
    overallScore: location.score,
    foodSafety: {
      score: Math.round((location.foodSafety.ops * 0.6) + (location.foodSafety.docs * 0.4)),
      ops: location.foodSafety.ops,
      docs: location.foodSafety.docs,
    },
    fireSafety: {
      score: Math.round((location.fireSafety.ops * 0.6) + (location.fireSafety.docs * 0.4)),
      ops: location.fireSafety.ops,
      docs: location.fireSafety.docs,
    },
    jurisdictionGrade: gradeResult.grade,
    gradeDisplay: gradeResult.display,
    passFail: gradeResult.passFail,
    jurisdictionName: jurisdiction.county,
    scoringType: jurisdiction.scoringType,
    gradingType: jurisdiction.gradingType,
    violations: DEMO_SCORE_BREAKDOWN.violations,
  };
}

// The 88% Test — calculate the same score across all 7 demo jurisdictions
export function calculate88Test(): Array<{
  jurisdiction: string;
  grade: string;
  passFail: string;
  explanation: string;
}> {
  return DEMO_JURISDICTIONS.map(j => {
    const result = calculateDemoGrade(88, j);
    return {
      jurisdiction: j.county,
      grade: result.grade,
      passFail: result.passFail,
      explanation: j.gradeExplanation,
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
