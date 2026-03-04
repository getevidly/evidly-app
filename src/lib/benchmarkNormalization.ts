// ============================================================
// Benchmark Normalization Engine — Pure Functions
// ============================================================
// Percentile ranking, peer group comparison, jurisdiction
// difficulty adjustment, and lead/lag analysis.
// All functions are pure — no React, no side effects.
// ============================================================

import { mean, median, stdDev, percentile } from './benchmarkEngine';
import { getCountyProfile, type CountyScoringProfile } from './jurisdictionScoring';
import type { PeerPopulation } from '../data/benchmarkDemoData';
import { SUBCATEGORY_BENCHMARKS } from '../data/benchmarkData';

// ── Types ────────────────────────────────────────────────────

export interface PeerGroupComparison {
  peerLabel: string;
  peerMean: number;
  peerMedian: number;
  peerStdDev: number;
  p25: number;
  p75: number;
  p90: number;
  sampleSize: number;
  yourScore: number;
  percentile: number;
  rank: number;
  totalPeers: number;
  gap: number;
  aboveAverage: boolean;
}

export interface NormalizedBenchmark {
  industryComparison: PeerGroupComparison;
  verticalComparison: PeerGroupComparison;
  geoComparison: PeerGroupComparison;
  sizeComparison: PeerGroupComparison;
}

export interface PillarBenchmark {
  pillar: 'Food Safety' | 'Facility Safety';
  yourScore: number;
  peerMean: number;
  percentile: number;
  gap: number;
}

export interface SubcategoryBenchmarkResult {
  key: string;
  label: string;
  pillar: 'Food Safety' | 'Facility Safety';
  yourScore: number;
  peerMean: number;
  percentile: number;
  delta: number;
}

export interface LeadLagResult {
  leads: SubcategoryBenchmarkResult[];
  lags: SubcategoryBenchmarkResult[];
  recommendations: Record<string, string>;
}

export interface JurisdictionDifficultyInfo {
  countySlug: string;
  countyName: string;
  difficultyIndex: number;
  adjustedPercentile: number;
  rawPercentile: number;
  explanation: string;
}

// ── Percentile Computation ───────────────────────────────────

/**
 * Compute rank-based percentile from sorted peer scores.
 * Replaces the naive `50 + (diff * 2.5)` formula.
 */
export function computePercentileRank(
  yourScore: number,
  peerScores: number[],
): { percentile: number; rank: number; total: number } {
  if (peerScores.length === 0) {
    return { percentile: 50, rank: 1, total: 1 };
  }

  // Count how many peers you beat (scores are sorted ascending)
  let beaten = 0;
  for (let i = 0; i < peerScores.length; i++) {
    if (peerScores[i] < yourScore) {
      beaten++;
    } else {
      break;
    }
  }

  const pct = Math.round((beaten / peerScores.length) * 100);
  const rank = peerScores.length - beaten;

  return {
    percentile: Math.max(1, Math.min(99, pct)),
    rank: Math.max(1, rank),
    total: peerScores.length,
  };
}

// ── Peer Group Comparison ────────────────────────────────────

/**
 * Build a full comparison against a peer group.
 */
export function computePeerGroupComparison(
  yourScore: number,
  peerScores: number[],
  label: string,
): PeerGroupComparison {
  const sorted = [...peerScores].sort((a, b) => a - b);
  const { percentile: pct, rank, total } = computePercentileRank(yourScore, sorted);
  const peerMean = mean(sorted);
  const gap = Math.round((yourScore - peerMean) * 10) / 10;

  return {
    peerLabel: label,
    peerMean: Math.round(peerMean * 10) / 10,
    peerMedian: Math.round(median(sorted) * 10) / 10,
    peerStdDev: Math.round(stdDev(sorted) * 10) / 10,
    p25: Math.round(percentile(sorted, 25)),
    p75: Math.round(percentile(sorted, 75)),
    p90: Math.round(percentile(sorted, 90)),
    sampleSize: total,
    yourScore,
    percentile: pct,
    rank,
    totalPeers: total,
    gap,
    aboveAverage: yourScore > peerMean,
  };
}

// ── Normalized Benchmark ─────────────────────────────────────

/**
 * Compute benchmark comparisons against 4 peer groups.
 */
export function computeNormalizedBenchmark(
  yourScore: number,
  populations: {
    industry: PeerPopulation;
    vertical: PeerPopulation;
    geo: PeerPopulation;
    size: PeerPopulation;
  },
): NormalizedBenchmark {
  return {
    industryComparison: computePeerGroupComparison(
      yourScore, populations.industry.overall, populations.industry.metadata.label,
    ),
    verticalComparison: computePeerGroupComparison(
      yourScore, populations.vertical.overall, populations.vertical.metadata.label,
    ),
    geoComparison: computePeerGroupComparison(
      yourScore, populations.geo.overall, populations.geo.metadata.label,
    ),
    sizeComparison: computePeerGroupComparison(
      yourScore, populations.size.overall, populations.size.metadata.label,
    ),
  };
}

// ── Pillar Benchmarks ────────────────────────────────────────

/**
 * Compute per-pillar benchmarks (Food Safety + Facility Safety).
 */
export function computePillarBenchmarks(
  foodSafety: number,
  facilitySafety: number,
  population: PeerPopulation,
): PillarBenchmark[] {
  const fsRank = computePercentileRank(foodSafety, population.foodSafety);
  const facRank = computePercentileRank(facilitySafety, population.facilitySafety);
  const fsMean = mean(population.foodSafety);
  const facMean = mean(population.facilitySafety);

  return [
    {
      pillar: 'Food Safety',
      yourScore: foodSafety,
      peerMean: Math.round(fsMean),
      percentile: fsRank.percentile,
      gap: Math.round(foodSafety - fsMean),
    },
    {
      pillar: 'Facility Safety',
      yourScore: facilitySafety,
      peerMean: Math.round(facMean),
      percentile: facRank.percentile,
      gap: Math.round(facilitySafety - facMean),
    },
  ];
}

// ── Subcategory Benchmarks ───────────────────────────────────

/**
 * Compute per-subcategory benchmarks for all 8 operational metrics.
 */
export function computeSubcategoryBenchmarks(
  locationScores: Record<string, number>,
  population: PeerPopulation,
): SubcategoryBenchmarkResult[] {
  return SUBCATEGORY_BENCHMARKS.map(sub => {
    const yours = locationScores[sub.key] ?? 0;
    const peerScores = population.subcategories[sub.key] ?? [];
    const peerAvg = peerScores.length > 0 ? Math.round(mean(peerScores)) : sub.industryAvg;
    const { percentile: pct } = peerScores.length > 0
      ? computePercentileRank(yours, peerScores)
      : { percentile: 50 };

    return {
      key: sub.key,
      label: sub.label,
      pillar: sub.pillar,
      yourScore: yours,
      peerMean: peerAvg,
      percentile: pct,
      delta: yours - peerAvg,
    };
  });
}

// ── Lead/Lag Analysis ────────────────────────────────────────

const RECOMMENDATIONS: Record<string, (score: number, peerMean: number) => string> = {
  temp_compliance: (s, p) => s < p
    ? 'Increase temperature monitoring frequency and address critical violations promptly.'
    : 'Strong temperature compliance. Maintain current monitoring cadence.',
  checklist_completion: (s, p) => s < p
    ? 'Assign checklist ownership per shift to close completion gaps.'
    : 'Excellent checklist discipline. Consider sharing your process as a best practice.',
  cooling_log: (s, p) => s < p
    ? 'Implement two-stage cooling verification and log cooling times consistently.'
    : 'Cooling log compliance is a strength. Keep documenting thoroughly.',
  hood_cleaning: (s, p) => s < p
    ? 'Schedule vendor service immediately to bring hood cleaning current.'
    : 'Hood cleaning is on track. Consider increasing cleaning frequency for added safety.',
  fire_suppression: (s, p) => s < p
    ? 'Verify ANSUL system inspection is current and schedule if overdue.'
    : 'Fire suppression systems are well maintained.',
  food_handler_cert: (s, p) => s < p
    ? 'Send renewal reminders to team members with expiring food handler certifications.'
    : 'All food handler certifications are current — great team compliance.',
  vendor_coi: (s, p) => s < p
    ? 'Request updated certificates of insurance from vendors with expired COIs.'
    : 'Vendor documentation is comprehensive. Maintain the vendor portal workflow.',
  corrective_action: (s, p) => s < p
    ? 'Assign a dedicated corrective action owner per shift to reduce response lag.'
    : 'Corrective action response time is a competitive advantage.',
};

/**
 * Identify top 3 strengths and bottom 3 improvement areas.
 */
export function computeLeadLag(
  subcategoryResults: SubcategoryBenchmarkResult[],
): LeadLagResult {
  const sorted = [...subcategoryResults].sort((a, b) => b.delta - a.delta);

  const leads = sorted.slice(0, 3);
  const lags = sorted.slice(-3).reverse(); // worst first

  const recommendations: Record<string, string> = {};
  for (const item of subcategoryResults) {
    const genRec = RECOMMENDATIONS[item.key];
    if (genRec) {
      recommendations[item.key] = genRec(item.yourScore, item.peerMean);
    }
  }

  return { leads, lags, recommendations };
}

// ── Jurisdiction Difficulty ──────────────────────────────────

// Baseline: Generic CalCode (critical=3, major=3, minor=1 → sum=7)
const BASELINE_DEDUCTION_SUM = 7;
const DIFFICULTY_WEIGHT = 5; // max ±5 percentile points

/**
 * Compute jurisdiction difficulty index and adjusted percentile.
 */
export function computeJurisdictionDifficulty(
  countySlug: string,
  rawPercentile: number,
): JurisdictionDifficultyInfo {
  const profile = getCountyProfile(countySlug);

  // Special case: Orange County pass/fail (critical=100)
  let difficultyIndex: number;
  let explanation: string;

  if (profile.deductions.critical >= 100) {
    difficultyIndex = 1.0;
    explanation = `${profile.countyName} uses a pass/fail system — any critical violation is an automatic failure, the strictest standard.`;
  } else {
    const deductionSum = profile.deductions.critical + profile.deductions.major + profile.deductions.minor;
    difficultyIndex = Math.min(1.0, deductionSum / (BASELINE_DEDUCTION_SUM * 2));
    const ratio = Math.round((deductionSum / BASELINE_DEDUCTION_SUM) * 100);
    if (ratio > 110) {
      explanation = `${profile.countyName} deductions are ${ratio - 100}% higher than the California baseline.`;
    } else if (ratio < 90) {
      explanation = `${profile.countyName} deductions are ${100 - ratio}% lower than the California baseline.`;
    } else {
      explanation = `${profile.countyName} deductions are in line with the California baseline.`;
    }
  }

  // Average difficulty across all known counties for comparison
  const avgDifficulty = 0.5; // approximate midpoint
  const bonus = Math.round((difficultyIndex - avgDifficulty) * DIFFICULTY_WEIGHT * 2);
  const adjustedPercentile = Math.max(1, Math.min(99, rawPercentile + bonus));

  return {
    countySlug,
    countyName: profile.countyName,
    difficultyIndex: Math.round(difficultyIndex * 100) / 100,
    adjustedPercentile,
    rawPercentile,
    explanation,
  };
}
