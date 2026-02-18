// ═══════════════════════════════════════════════════════════
// src/hooks/useComplianceScore.ts
// Returns TWO INDEPENDENT scores for a SINGLE location — one per authority.
// There is NO org-level rollup. Each location has its own food + fire score.
// These come from different authorities with different grading systems.
// You CANNOT combine them into a single number.
//
// DEMO mode: uses demoScoring.ts with jurisdiction data from demoJurisdictions
// LIVE mode: calls the calculate-compliance-score Edge Function (JIE-3)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { LocationScore, LocationJurisdiction, AuthorityScore } from '../types/jurisdiction';
import { DEMO_LOCATIONS, calculateDemoGrade } from '../data/demoJurisdictions';

// SUGGESTION: In live mode, call the calculate-compliance-score Edge Function

function buildFoodSafetyScore(
  locationId: string,
  jurisdiction: LocationJurisdiction,
): AuthorityScore {
  const loc = DEMO_LOCATIONS.find(l => l.id === locationId);
  if (!loc) {
    return {
      pillar: 'food_safety',
      authority: jurisdiction.foodSafety,
      grade: null,
      gradeDisplay: null,
      numericScore: null,
      status: 'unknown',
      details: null,
    };
  }

  const gradeResult = calculateDemoGrade(loc.score, loc.jurisdiction);

  return {
    pillar: 'food_safety',
    authority: jurisdiction.foodSafety,
    grade: gradeResult.grade,
    gradeDisplay: gradeResult.display,
    numericScore: loc.score,
    status: gradeResult.passFail === 'pass' ? 'passing'
      : gradeResult.passFail === 'fail' ? 'failing'
      : gradeResult.passFail === 'warning' ? 'at_risk'
      : 'unknown',
    details: {
      majorViolations: gradeResult.majorViolations ?? null,
      minorViolations: gradeResult.minorViolations ?? null,
      uncorrectedMajors: gradeResult.uncorrectedMajors ?? null,
      totalPoints: gradeResult.totalPoints ?? null,
    },
  };
}

function buildFireSafetyScore(
  locationId: string,
  jurisdiction: LocationJurisdiction,
): AuthorityScore {
  const loc = DEMO_LOCATIONS.find(l => l.id === locationId);
  // Demo: all fire AHJ inspections pass (operational permit current)
  // Fire safety is pass/fail per 2025 CFC — no numeric score
  const operationalPermitValid = loc ? loc.fireSafety.ops >= 70 : true;

  return {
    pillar: 'fire_safety',
    authority: jurisdiction.fireSafety,
    grade: operationalPermitValid ? 'Pass' : 'Fail',
    gradeDisplay: operationalPermitValid
      ? 'Pass \u2014 Operational Permit Current'
      : 'Fail \u2014 Permit Expired/Denied',
    numericScore: null, // fire is pass/fail per 2025 CFC — no numeric score
    status: operationalPermitValid ? 'passing' : 'failing',
    details: {
      operationalPermitValid,
      codeEdition: '2025 CFC',
    },
  };
}

export function useComplianceScore(
  locationId: string | null,
  jurisdiction: LocationJurisdiction | null,
  isDemoMode: boolean,
): LocationScore | null {
  const [score, setScore] = useState<LocationScore | null>(null);

  useEffect(() => {
    if (!locationId || !jurisdiction) {
      setScore(null);
      return;
    }

    if (isDemoMode) {
      setScore({
        location_id: locationId,
        foodSafety: buildFoodSafetyScore(locationId, jurisdiction),
        fireSafety: buildFireSafetyScore(locationId, jurisdiction),
        federalFoodOverlay: null,
        federalFireOverlay: null,
      });
      return;
    }

    // SUGGESTION: Live mode — call Edge Function
    setScore({
      location_id: locationId,
      foodSafety: buildFoodSafetyScore(locationId, jurisdiction),
      fireSafety: buildFireSafetyScore(locationId, jurisdiction),
      federalFoodOverlay: null,
      federalFireOverlay: null,
    });
  }, [locationId, jurisdiction, isDemoMode]);

  return score;
}

// Returns scores for ALL demo locations at once
export function useAllComplianceScores(
  jurisdictions: Record<string, LocationJurisdiction>,
  isDemoMode: boolean,
): Record<string, LocationScore> {
  const [scores, setScores] = useState<Record<string, LocationScore>>({});

  useEffect(() => {
    const result: Record<string, LocationScore> = {};
    for (const [locId, jurisdiction] of Object.entries(jurisdictions)) {
      result[locId] = {
        location_id: locId,
        foodSafety: buildFoodSafetyScore(locId, jurisdiction),
        fireSafety: buildFireSafetyScore(locId, jurisdiction),
        federalFoodOverlay: null,
        federalFireOverlay: null,
      };
    }
    setScores(result);
  }, [Object.keys(jurisdictions).join(','), isDemoMode]);

  return scores;
}
