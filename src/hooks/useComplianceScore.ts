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
import { DEMO_LOCATIONS, DEMO_LOCATION_GRADE_OVERRIDES, calculateDemoGrade } from '../data/demoJurisdictions';
import { supabase } from '../lib/supabase';

// ── Demo-only helpers ────────────────────────────────────────────────────────
// These functions are ONLY called when isDemoMode === true.
// They must never be called for authenticated production users.

function buildFoodSafetyScore(
  locationId: string,
  jurisdiction: LocationJurisdiction,
): AuthorityScore {
  const override = DEMO_LOCATION_GRADE_OVERRIDES[locationId];
  if (override) {
    return {
      pillar: 'food_safety',
      authority: jurisdiction.foodSafety,
      grade: override.foodSafety.grade,
      gradeDisplay: override.foodSafety.gradeDisplay,
      numericScore: null,
      status: override.foodSafety.status,
      details: {
        summary: override.foodSafety.summary,
        ...override.foodSafety.details,
      },
    };
  }

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
    numericScore: null,
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

function buildFacilitySafetyScore(
  locationId: string,
  jurisdiction: LocationJurisdiction,
): AuthorityScore {
  const fireConfig = jurisdiction.facilitySafety.fire_jurisdiction_config;
  const ahjName = fireConfig?.fire_ahj_name ?? jurisdiction.facilitySafety.agency_name;
  const codeEdition = fireConfig?.fire_code_edition ?? 'NFPA 96 (2024)';

  const override = DEMO_LOCATION_GRADE_OVERRIDES[locationId];
  if (override) {
    return {
      pillar: 'facility_safety',
      authority: jurisdiction.facilitySafety,
      grade: override.facilitySafety.grade,
      gradeDisplay: override.facilitySafety.gradeDisplay,
      numericScore: null,
      status: override.facilitySafety.status,
      details: {
        summary: override.facilitySafety.summary,
        fireCodeEdition: codeEdition,
        ahjName,
        codeEdition,
        permitStatus: override.facilitySafety.permitStatus,
        hoodStatus: override.facilitySafety.hoodStatus,
        extinguisherStatus: override.facilitySafety.extinguisherStatus,
        ansulStatus: override.facilitySafety.ansulStatus,
        ...(fireConfig?.federal_overlay ? { federalOverlay: fireConfig.federal_overlay } : {}),
        ...(fireConfig?.ahj_split_notes ? { ahjSplitNotes: fireConfig.ahj_split_notes } : {}),
      },
    };
  }

  const loc = DEMO_LOCATIONS.find(l => l.id === locationId);
  const operationalPermitValid = loc ? loc.facilitySafety.ops >= 70 : true;

  return {
    pillar: 'facility_safety',
    authority: jurisdiction.facilitySafety,
    grade: operationalPermitValid ? 'Pass' : 'Fail',
    gradeDisplay: operationalPermitValid
      ? 'Pass \u2014 Operational Permit Current'
      : 'Fail \u2014 Permit Expired/Denied',
    numericScore: null,
    status: operationalPermitValid ? 'passing' : 'failing',
    details: {
      operationalPermitValid,
      fireCodeEdition: codeEdition,
      ahjName,
      codeEdition,
      ...(fireConfig?.federal_overlay ? { federalOverlay: fireConfig.federal_overlay } : {}),
      ...(fireConfig?.ahj_split_notes ? { ahjSplitNotes: fireConfig.ahj_split_notes } : {}),
    },
  };
}

// ── Empty state for live users with no data yet ───────────────────────────────
function buildEmptyScore(
  locationId: string,
  jurisdiction: LocationJurisdiction,
): LocationScore {
  return {
    location_id: locationId,
    foodSafety: {
      pillar: 'food_safety',
      authority: jurisdiction.foodSafety,
      grade: null,
      gradeDisplay: null,
      numericScore: null,
      status: 'unknown',
      details: null,
    },
    facilitySafety: {
      pillar: 'facility_safety',
      authority: jurisdiction.facilitySafety,
      grade: null,
      gradeDisplay: null,
      numericScore: null,
      status: 'unknown',
      details: null,
    },
    federalFoodOverlay: null,
    federalFireOverlay: null,
  };
}

// ── Live mode: call calculate-compliance-score Edge Function ─────────────────
async function fetchLiveScore(
  locationId: string,
  jurisdiction: LocationJurisdiction,
): Promise<LocationScore> {
  const { data, error } = await supabase.functions.invoke('calculate-compliance-score', {
    body: { locationId },
  });

  if (error || !data) {
    console.error('[useComplianceScore] Edge function error:', error);
    // Return empty state — never fall back to demo data for live users
    return buildEmptyScore(locationId, jurisdiction);
  }

  return data as LocationScore;
}

// ── useComplianceScore ────────────────────────────────────────────────────────
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

    // DEMO MODE: use local demo data, no DB calls
    if (isDemoMode) {
      setScore({
        location_id: locationId,
        foodSafety: buildFoodSafetyScore(locationId, jurisdiction),
        facilitySafety: buildFacilitySafetyScore(locationId, jurisdiction),
        federalFoodOverlay: null,
        federalFireOverlay: null,
      });
      return;
    }

    // LIVE MODE: call the Edge Function
    // Never use demo data for authenticated production users
    let cancelled = false;
    fetchLiveScore(locationId, jurisdiction).then(result => {
      if (!cancelled) setScore(result);
    });

    return () => { cancelled = true; };
  }, [locationId, jurisdiction?.foodSafety?.agency_id, isDemoMode]);

  return score;
}

// ── useAllComplianceScores ────────────────────────────────────────────────────
// Returns scores for all locations. Demo mode only — live mode fetches
// per-location via useComplianceScore to avoid bulk edge function calls.
export function useAllComplianceScores(
  jurisdictions: Record<string, LocationJurisdiction>,
  isDemoMode: boolean,
): Record<string, LocationScore> {
  const [scores, setScores] = useState<Record<string, LocationScore>>({});

  useEffect(() => {
    const locationIds = Object.keys(jurisdictions);
    if (locationIds.length === 0) {
      setScores({});
      return;
    }

    if (isDemoMode) {
      // Demo mode: build scores locally from demo data
      const result: Record<string, LocationScore> = {};
      for (const [locId, jurisdiction] of Object.entries(jurisdictions)) {
        result[locId] = {
          location_id: locId,
          foodSafety: buildFoodSafetyScore(locId, jurisdiction),
          facilitySafety: buildFacilitySafetyScore(locId, jurisdiction),
          federalFoodOverlay: null,
          federalFireOverlay: null,
        };
      }
      setScores(result);
      return;
    }

    // LIVE MODE: fetch each location from the Edge Function
    // Never use demo data for authenticated production users
    let cancelled = false;

    Promise.all(
      locationIds.map(locId =>
        fetchLiveScore(locId, jurisdictions[locId]).then(score => ({ locId, score }))
      )
    ).then(results => {
      if (cancelled) return;
      const result: Record<string, LocationScore> = {};
      for (const { locId, score } of results) {
        result[locId] = score;
      }
      setScores(result);
    });

    return () => { cancelled = true; };
  }, [Object.keys(jurisdictions).join(','), isDemoMode]);

  return scores;
}
