// ============================================================
// Insurance Scoring Profiles — Configurable weight schemes
// ============================================================
// Supports different weighting for different carriers/use cases.
// Built-in profiles cover common underwriting priorities.
// ============================================================

// ── Types ────────────────────────────────────────────────────

export interface CategoryWeight {
  key: string;       // 'fire' | 'foodSafety' | 'documentation' | 'operational'
  name: string;
  weight: number;    // 0-1, all must sum to 1.0
}

export interface TrendAdjustmentConfig {
  enabled: boolean;
  maxBonus: number;           // max pts added for improving trend
  maxPenalty: number;         // max pts subtracted for declining trend
  volatilityPenalty: number;  // pts per unit volatility above 2.0 threshold
}

export interface ScoringProfile {
  id: string;
  name: string;
  description: string;
  categoryWeights: CategoryWeight[];
  trendAdjustment: TrendAdjustmentConfig;
  isDefault: boolean;
}

// ── Default Trend Adjustment ─────────────────────────────────

const DEFAULT_TREND_ADJUSTMENT: TrendAdjustmentConfig = {
  enabled: true,
  maxBonus: 3,
  maxPenalty: 5,
  volatilityPenalty: 0.5,
};

// ── Built-in Profiles ────────────────────────────────────────

export const BUILT_IN_PROFILES: ScoringProfile[] = [
  {
    id: 'evidly-standard',
    name: 'EvidLY Standard',
    description: 'Balanced weighting aligned with commercial kitchen underwriting priorities',
    categoryWeights: [
      { key: 'fire', name: 'Fire Risk', weight: 0.40 },
      { key: 'foodSafety', name: 'Food Safety', weight: 0.30 },
      { key: 'documentation', name: 'Documentation', weight: 0.20 },
      { key: 'operational', name: 'Operational', weight: 0.10 },
    ],
    trendAdjustment: DEFAULT_TREND_ADJUSTMENT,
    isDefault: true,
  },
  {
    id: 'property-focused',
    name: 'Property-Focused',
    description: 'Higher fire/property weighting for property insurance carriers',
    categoryWeights: [
      { key: 'fire', name: 'Fire Risk', weight: 0.55 },
      { key: 'foodSafety', name: 'Food Safety', weight: 0.20 },
      { key: 'documentation', name: 'Documentation', weight: 0.15 },
      { key: 'operational', name: 'Operational', weight: 0.10 },
    ],
    trendAdjustment: DEFAULT_TREND_ADJUSTMENT,
    isDefault: false,
  },
  {
    id: 'food-safety-focused',
    name: 'Food Safety-Focused',
    description: 'Higher food safety weighting for general liability carriers',
    categoryWeights: [
      { key: 'fire', name: 'Fire Risk', weight: 0.25 },
      { key: 'foodSafety', name: 'Food Safety', weight: 0.45 },
      { key: 'documentation', name: 'Documentation', weight: 0.20 },
      { key: 'operational', name: 'Operational', weight: 0.10 },
    ],
    trendAdjustment: DEFAULT_TREND_ADJUSTMENT,
    isDefault: false,
  },
];

export const DEFAULT_PROFILE = BUILT_IN_PROFILES[0];

// ── Accessors ────────────────────────────────────────────────

export function getProfile(id: string): ScoringProfile {
  return BUILT_IN_PROFILES.find(p => p.id === id) || DEFAULT_PROFILE;
}

export function getCategoryWeight(profile: ScoringProfile, categoryKey: string): number {
  return profile.categoryWeights.find(w => w.key === categoryKey)?.weight ?? 0;
}

// ── Validation ───────────────────────────────────────────────

export function validateProfile(profile: ScoringProfile): { valid: boolean; error?: string } {
  const sum = profile.categoryWeights.reduce((s, w) => s + w.weight, 0);
  if (Math.abs(sum - 1.0) > 0.001) {
    return { valid: false, error: `Category weights sum to ${sum.toFixed(3)}, must equal 1.0` };
  }
  for (const w of profile.categoryWeights) {
    if (w.weight < 0 || w.weight > 1) {
      return { valid: false, error: `Weight for ${w.key} is ${w.weight}, must be between 0 and 1` };
    }
  }
  return { valid: true };
}
