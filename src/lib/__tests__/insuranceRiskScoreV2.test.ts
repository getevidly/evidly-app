import { describe, it, expect } from 'vitest';
import {
  calculateInsuranceRiskScoreV2,
  calculateOrgInsuranceRiskScoreV2,
  calculateFireRiskV2,
  calculateFoodSafetyV2,
  calculateDocComplianceV2,
  calculateOperationalRiskV2,
  applyTrendAdjustment,
  type InsuranceRiskInput,
} from '../insuranceRiskScoreV2';
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE,
  getProfile,
  validateProfile,
  type ScoringProfile,
} from '../insuranceScoringProfiles';
import { collectComplianceData } from '../complianceDataCollector';
import type { TrendAnalysis } from '../trendAnalytics';

// ── Test Helpers ─────────────────────────────────────────────

function makeInput(locationId: string, profileId = 'evidly-standard'): InsuranceRiskInput {
  const snapshot = collectComplianceData(locationId, { isDemoMode: true });
  return {
    locationId,
    snapshot,
    complianceScores: {
      foodSafety: locationId === 'downtown' ? 96 : locationId === 'airport' ? 84 : 72,
      facilitySafety: locationId === 'downtown' ? 92 : locationId === 'airport' ? 79 : 64,
    },
    profile: getProfile(profileId),
  };
}

function makeTrend(direction: TrendAnalysis['direction'], rate: number, vol = 1.0): TrendAnalysis {
  return {
    direction,
    rateOfChange: rate,
    volatility: vol,
    currentValue: 80,
    periodStartValue: 80 - rate,
    periodDelta: rate,
    periodDeltaPct: rate / (80 - rate) * 100,
    minValue: 75,
    maxValue: 85,
    avgValue: 80,
  };
}

// ── Scoring Profiles ─────────────────────────────────────────

describe('insuranceScoringProfiles', () => {
  it('all built-in profiles have weights summing to 1.0', () => {
    for (const profile of BUILT_IN_PROFILES) {
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    }
  });

  it('validateProfile rejects profiles where weights do not sum to 1.0', () => {
    const bad: ScoringProfile = {
      ...DEFAULT_PROFILE,
      categoryWeights: [
        { key: 'fire', name: 'Fire', weight: 0.50 },
        { key: 'foodSafety', name: 'Food', weight: 0.30 },
        { key: 'documentation', name: 'Docs', weight: 0.30 },
        { key: 'operational', name: 'Ops', weight: 0.10 },
      ],
    };
    const result = validateProfile(bad);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1.2');
  });

  it('getProfile returns correct profile by ID', () => {
    expect(getProfile('evidly-standard').name).toBe('EvidLY Standard');
    expect(getProfile('property-focused').name).toBe('Property-Focused');
    expect(getProfile('food-safety-focused').name).toBe('Food Safety-Focused');
  });

  it('getProfile returns default for unknown ID', () => {
    expect(getProfile('nonexistent').id).toBe('evidly-standard');
  });

  it('DEFAULT_PROFILE is evidly-standard', () => {
    expect(DEFAULT_PROFILE.id).toBe('evidly-standard');
    expect(DEFAULT_PROFILE.isDefault).toBe(true);
  });
});

// ── Category Score Calculators ───────────────────────────────

describe('category calculators', () => {
  it('fire risk: downtown scores high (good fire safety data)', () => {
    const snapshot = collectComplianceData('downtown', { isDemoMode: true });
    const result = calculateFireRiskV2(snapshot, { facilitySafety: 92 });
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factors).toHaveLength(9);
  });

  it('fire risk: university scores lower (overdue services)', () => {
    const snapshot = collectComplianceData('university', { isDemoMode: true });
    const result = calculateFireRiskV2(snapshot, { facilitySafety: 64 });
    expect(result.score).toBeLessThan(70);
    expect(result.factors).toHaveLength(9);
  });

  it('food safety: downtown has high temp compliance', () => {
    const snapshot = collectComplianceData('downtown', { isDemoMode: true });
    const result = calculateFoodSafetyV2(snapshot, { foodSafety: 96 });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.factors).toHaveLength(9);
  });

  it('food safety: university penalized for critical violations', () => {
    const snapshot = collectComplianceData('university', { isDemoMode: true });
    const result = calculateFoodSafetyV2(snapshot, { foodSafety: 72 });
    // University has 18 critical violations → -15 penalty on temp
    const tempFactor = result.factors.find(f => f.name.includes('Temperature'));
    expect(tempFactor!.score).toBeLessThanOrEqual(55); // 65 - 15 = 50
  });

  it('documentation: downtown has all vendor docs current', () => {
    const snapshot = collectComplianceData('downtown', { isDemoMode: true });
    const result = calculateDocComplianceV2(snapshot, { foodSafety: 96 });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.factors).toHaveLength(7);
  });

  it('operational: university penalized for overdue vendors', () => {
    const snapshot = collectComplianceData('university', { isDemoMode: true });
    const result = calculateOperationalRiskV2(snapshot);
    const vendorFactor = result.factors.find(f => f.name.includes('Vendor service'));
    expect(vendorFactor!.score).toBeLessThan(80); // 2 of 6 overdue
    expect(result.factors).toHaveLength(5);
  });
});

// ── Corrective Action Response Time ──────────────────────────

describe('CA response time scoring', () => {
  it('downtown ≤2h response scores 100', () => {
    const snapshot = collectComplianceData('downtown', { isDemoMode: true });
    const result = calculateFoodSafetyV2(snapshot, { foodSafety: 96 });
    const caFactor = result.factors.find(f => f.name.includes('Corrective action'));
    expect(caFactor!.score).toBe(100); // 1.5h → 100
  });

  it('airport 4h response capped at 40 due to criticalOpen', () => {
    const snapshot = collectComplianceData('airport', { isDemoMode: true });
    const result = calculateFoodSafetyV2(snapshot, { foodSafety: 84 });
    const caFactor = result.factors.find(f => f.name.includes('Corrective action'));
    expect(caFactor!.score).toBeLessThanOrEqual(40); // 4h=90 but criticalOpen=1 → cap at 40
  });
});

// ── Repeat Violations ────────────────────────────────────────

describe('repeat violation detection', () => {
  it('downtown (3 incidents, 0 critical) scores high', () => {
    const snapshot = collectComplianceData('downtown', { isDemoMode: true });
    const result = calculateFoodSafetyV2(snapshot, { foodSafety: 96 });
    const repeatFactor = result.factors.find(f => f.name.includes('Repeat violation'));
    expect(repeatFactor!.score).toBe(80); // totalIncidents=3, criticalOpen=0
  });

  it('university (8 incidents, 1 critical) scores low', () => {
    const snapshot = collectComplianceData('university', { isDemoMode: true });
    const result = calculateFoodSafetyV2(snapshot, { foodSafety: 72 });
    const repeatFactor = result.factors.find(f => f.name.includes('Repeat violation'));
    expect(repeatFactor!.score).toBe(40); // totalIncidents=8 > 5
  });
});

// ── Trend Adjustment ─────────────────────────────────────────

describe('applyTrendAdjustment', () => {
  const config = DEFAULT_PROFILE.trendAdjustment;

  it('improving trend adds bonus up to maxBonus', () => {
    const trend = makeTrend('improving', 4, 1.0);
    const { adjustedScore, trendModifier } = applyTrendAdjustment(80, trend, config);
    expect(trendModifier).toBeGreaterThan(0);
    expect(trendModifier).toBeLessThanOrEqual(config.maxBonus);
    expect(adjustedScore).toBeGreaterThan(80);
  });

  it('declining trend applies penalty up to maxPenalty', () => {
    const trend = makeTrend('declining', -6, 1.0);
    const { adjustedScore, trendModifier } = applyTrendAdjustment(80, trend, config);
    expect(trendModifier).toBeLessThan(0);
    expect(Math.abs(trendModifier)).toBeLessThanOrEqual(config.maxPenalty);
    expect(adjustedScore).toBeLessThan(80);
  });

  it('stable trend yields no adjustment', () => {
    const trend = makeTrend('stable', 0.5, 1.0);
    const { trendModifier } = applyTrendAdjustment(80, trend, config);
    expect(trendModifier).toBe(0);
  });

  it('high volatility applies additional penalty', () => {
    const trend = makeTrend('stable', 0.5, 4.0);
    const { adjustedScore } = applyTrendAdjustment(80, trend, config);
    expect(adjustedScore).toBeLessThan(80); // volatility > 2.0 → penalty
  });

  it('trend adjustment disabled when config.enabled=false', () => {
    const disabledConfig = { ...config, enabled: false };
    const trend = makeTrend('declining', -10, 5.0);
    const { adjustedScore, trendModifier } = applyTrendAdjustment(80, trend, disabledConfig);
    expect(adjustedScore).toBe(80);
    expect(trendModifier).toBe(0);
  });

  it('no trend data yields no adjustment', () => {
    const { adjustedScore, trendModifier } = applyTrendAdjustment(80, undefined, config);
    expect(adjustedScore).toBe(80);
    expect(trendModifier).toBe(0);
  });
});

// ── Full Orchestrator ────────────────────────────────────────

describe('calculateInsuranceRiskScoreV2', () => {
  it('downtown with default profile yields overall > 80', () => {
    const input = makeInput('downtown');
    const result = calculateInsuranceRiskScoreV2(input);
    expect(result.overall).toBeGreaterThanOrEqual(80);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.categories).toHaveLength(4);
    expect(result.factorsEvaluated).toBe(30);
  });

  it('university with default profile yields overall < 70', () => {
    const input = makeInput('university');
    const result = calculateInsuranceRiskScoreV2(input);
    expect(result.overall).toBeLessThan(70);
    expect(result.tier).not.toBe('Preferred Risk');
  });

  it('property-focused profile increases fire weight impact', () => {
    const stdInput = makeInput('downtown', 'evidly-standard');
    const propInput = makeInput('downtown', 'property-focused');
    const stdResult = calculateInsuranceRiskScoreV2(stdInput);
    const propResult = calculateInsuranceRiskScoreV2(propInput);
    // With property-focused, fire weight is 55% vs 40%
    expect(propResult.categories.find(c => c.key === 'fire')!.weight).toBe(0.55);
    expect(stdResult.categories.find(c => c.key === 'fire')!.weight).toBe(0.40);
  });

  it('food-safety-focused profile increases food safety weight', () => {
    const input = makeInput('downtown', 'food-safety-focused');
    const result = calculateInsuranceRiskScoreV2(input);
    expect(result.categories.find(c => c.key === 'foodSafety')!.weight).toBe(0.45);
  });

  it('action items sorted by potential gain descending', () => {
    const input = makeInput('airport');
    const result = calculateInsuranceRiskScoreV2(input);
    for (let i = 1; i < result.actionItems.length; i++) {
      expect(result.actionItems[i].potentialGain).toBeLessThanOrEqual(result.actionItems[i - 1].potentialGain);
    }
  });

  it('trend adjustment modifies overall score', () => {
    const input = makeInput('downtown');
    input.trendAnalysis = {
      foodSafety: makeTrend('improving', 2, 1.0),
      facilitySafety: makeTrend('stable', 0.5, 1.0),
    };
    const withTrend = calculateInsuranceRiskScoreV2(input);
    const withoutInput = makeInput('downtown');
    const withoutTrend = calculateInsuranceRiskScoreV2(withoutInput);
    expect(withTrend.overall).toBeGreaterThanOrEqual(withoutTrend.overall);
  });

  it('result has backward-compatible InsuranceRiskResult shape', () => {
    const input = makeInput('airport');
    const result = calculateInsuranceRiskScoreV2(input);
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('tier');
    expect(result).toHaveProperty('tierColor');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('actionItems');
    expect(result).toHaveProperty('lastCalculated');
    expect(result).toHaveProperty('factorsEvaluated');
    expect(typeof result.overall).toBe('number');
    expect(typeof result.tier).toBe('string');
  });
});

// ── Org-Level Scoring ────────────────────────────────────────

describe('calculateOrgInsuranceRiskScoreV2', () => {
  it('averages across all 3 locations', () => {
    const inputs = ['downtown', 'airport', 'university'].map(id => makeInput(id));
    const result = calculateOrgInsuranceRiskScoreV2(inputs);
    expect(result.overall).toBeGreaterThan(0);
    expect(result.categories).toHaveLength(4);
    expect(result.factorsEvaluated).toBe(30);
  });

  it('empty inputs returns zero score', () => {
    const result = calculateOrgInsuranceRiskScoreV2([]);
    expect(result.overall).toBe(0);
    expect(result.categories).toHaveLength(0);
  });
});
