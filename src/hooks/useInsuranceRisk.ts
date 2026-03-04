// ============================================================
// useInsuranceRisk — Composition hook for insurance risk scoring
// ============================================================
// Composes useComplianceEngine + useTrendAnalytics + scoring
// profiles into a single hook for the InsuranceRisk page.
// ============================================================

import { useState, useMemo } from 'react';
import { useAllComplianceEngineResults } from './useComplianceEngine';
import { useTrendAnalytics } from './useTrendAnalytics';
import {
  calculateInsuranceRiskScoreV2,
  calculateOrgInsuranceRiskScoreV2,
  applyTrendAdjustment,
  type InsuranceRiskInput,
} from '../lib/insuranceRiskScoreV2';
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE,
  getProfile,
  type ScoringProfile,
} from '../lib/insuranceScoringProfiles';
import type { InsuranceRiskResult } from '../lib/insuranceRiskScore';

// ── Hook Return Type ─────────────────────────────────────────

export interface InsuranceRiskState {
  result: InsuranceRiskResult;
  locationResults: Record<string, InsuranceRiskResult>;
  profile: ScoringProfile;
  setProfileId: (id: string) => void;
  availableProfiles: ScoringProfile[];
  trendModifier: number;
  loading: boolean;
}

// ── Empty Result ─────────────────────────────────────────────

const EMPTY_RESULT: InsuranceRiskResult = {
  overall: 0,
  tier: 'High Risk',
  tierColor: '#ef4444',
  categories: [],
  actionItems: [],
  lastCalculated: new Date().toISOString(),
  factorsEvaluated: 0,
};

// ── Hook ─────────────────────────────────────────────────────

export function useInsuranceRisk(
  locationId: string | 'all',
  isDemoMode: boolean,
): InsuranceRiskState {
  const [profileId, setProfileId] = useState('evidly-standard');

  const compliance = useAllComplianceEngineResults(isDemoMode);
  const trends = useTrendAnalytics(isDemoMode);

  const profile = useMemo(() => getProfile(profileId), [profileId]);

  // Build per-location inputs
  const locationInputs = useMemo(() => {
    const inputs: Record<string, InsuranceRiskInput> = {};
    for (const [locId, engineResult] of Object.entries(compliance.results)) {
      const locTrend = trends.locationTrends[locId];
      inputs[locId] = {
        locationId: locId,
        snapshot: engineResult.dataSnapshot,
        complianceScores: {
          foodSafety: engineResult.foodSafetyScore,
          facilitySafety: engineResult.facilitySafetyScore,
        },
        trendAnalysis: locTrend || undefined,
        profile,
      };
    }
    return inputs;
  }, [compliance.results, trends.locationTrends, profile]);

  // Per-location results
  const locationResults = useMemo(() => {
    const results: Record<string, InsuranceRiskResult> = {};
    for (const [locId, input] of Object.entries(locationInputs)) {
      results[locId] = calculateInsuranceRiskScoreV2(input);
    }
    return results;
  }, [locationInputs]);

  // Org-level result
  const orgResult = useMemo(() => {
    const inputs = Object.values(locationInputs);
    if (inputs.length === 0) return EMPTY_RESULT;
    return calculateOrgInsuranceRiskScoreV2(inputs);
  }, [locationInputs]);

  // Selected result
  const result = locationId === 'all' ? orgResult : (locationResults[locationId] ?? EMPTY_RESULT);

  // Trend modifier for the selected view
  const trendModifier = useMemo(() => {
    if (locationId === 'all') {
      const orgTrend = trends.orgTrend?.overall;
      const { trendModifier: mod } = applyTrendAdjustment(
        result.overall,
        orgTrend,
        profile.trendAdjustment,
      );
      return mod;
    }
    const locTrend = trends.locationTrends[locationId]?.overall;
    const { trendModifier: mod } = applyTrendAdjustment(
      result.overall,
      locTrend,
      profile.trendAdjustment,
    );
    return mod;
  }, [locationId, result.overall, trends, profile]);

  return {
    result,
    locationResults,
    profile,
    setProfileId,
    availableProfiles: BUILT_IN_PROFILES,
    trendModifier,
    loading: compliance.loading,
  };
}
