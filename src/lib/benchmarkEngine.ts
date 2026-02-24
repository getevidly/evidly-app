// TODO: Replace .overall with independent pillar scores (FIX-WEIGHTS)
// ============================================================
// Benchmark Engine — Percentile Computation & Comparison
// ============================================================
// Calculates percentile rankings, industry comparisons,
// and identifies strengths/improvement areas.
//
// Demo mode: returns static data from benchmarkData.ts
// Production: queries benchmark_aggregates table
// ============================================================

import {
  VERTICAL_BENCHMARKS,
  GEO_BENCHMARKS,
  PERCENTILE_DATA,
  LOCATION_SUBCATEGORY_SCORES,
  SUBCATEGORY_BENCHMARKS,
  MONTHLY_TRENDS,
  LEAD_LAG_DATA,
  type PercentileData,
  type MonthlyTrend,
  type LeadLagItem,
} from '../data/benchmarkData';
import { locationScores, complianceScores } from '../data/demoData';

// ── Types ──────────────────────────────────────────────────

export interface BenchmarkResult {
  locationScore: number;
  percentile: number;
  rank: string;
  comparedTo: string;
  aboveAverage: boolean;
  gap: number;
  pillarComparison: {
    pillar: string;
    yourScore: number;
    industryAvg: number;
    percentile: number;
  }[];
  operationalComparison: {
    metric: string;
    yourValue: number;
    industryAvg: number;
    unit: string;
    better: boolean;
  }[];
}

export interface QuarterlyReport {
  quarter: number;
  year: number;
  reportId: string;
  locationName: string;
  organizationName: string;
  industrySegment: string;
  jurisdiction: string;
  overallScore: number;
  percentile: number;
  comparedTo: string;
  pillarComparison: BenchmarkResult['pillarComparison'];
  operationalComparison: BenchmarkResult['operationalComparison'];
  trendData: MonthlyTrend[];
  strengths: LeadLagItem[];
  improvements: LeadLagItem[];
  generatedAt: string;
}

// ── Statistical Helpers ──────────────────────────────────────

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

export function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const avg = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length);
}

/**
 * Estimate percentile from a score using benchmark distribution.
 * Uses a simplified normal approximation based on mean and std deviation.
 */
export function estimatePercentile(score: number, avg: number, sd?: number): number {
  const effectiveSD = sd || 12; // Default SD for compliance scores
  const zScore = (score - avg) / effectiveSD;
  // Approximate CDF using logistic function
  const pctile = 100 / (1 + Math.exp(-1.7 * zScore));
  return Math.max(1, Math.min(99, Math.round(pctile)));
}

// ── Demo Benchmark Computation ──────────────────────────────

/**
 * Get benchmark result for a demo location.
 * In production, this would query benchmark_aggregates.
 */
export function getDemoBenchmark(
  locationUrlId: string,
  segment: string = 'Restaurant',
  stateCode: string = 'CA',
): BenchmarkResult {
  const locScores = locationScores[locationUrlId];
  if (!locScores) {
    return getDefaultBenchmark();
  }

  const vertBench = VERTICAL_BENCHMARKS.find(v => v.vertical === segment)
    || VERTICAL_BENCHMARKS[0];
  const geoBench = GEO_BENCHMARKS.find(g => g.name === `${stateCode === 'CA' ? 'California' : stateCode}`)
    || GEO_BENCHMARKS[0];

  const pctData = PERCENTILE_DATA[locationUrlId] || PERCENTILE_DATA['all'];

  const pctile = pctData.percentile;
  const gap = Math.round((locScores.overall - vertBench.avgScore) * 10) / 10;

  return {
    locationScore: locScores.overall,
    percentile: pctile,
    rank: `Top ${100 - pctile}%`,
    comparedTo: `${vertBench.peerCount.toLocaleString()} ${segment.toLowerCase()} locations${stateCode ? ` in ${stateCode}` : ' nationally'}`,
    aboveAverage: locScores.overall > vertBench.avgScore,
    gap,
    pillarComparison: [
      { pillar: 'Food Safety', yourScore: locScores.foodSafety, industryAvg: vertBench.avgFoodSafety, percentile: estimatePercentile(locScores.foodSafety, vertBench.avgFoodSafety) },
      { pillar: 'Fire Safety', yourScore: locScores.fireSafety, industryAvg: vertBench.avgFireSafety, percentile: estimatePercentile(locScores.fireSafety, vertBench.avgFireSafety) },
    ],
    operationalComparison: [
      { metric: 'Temp Compliance', yourValue: (LOCATION_SUBCATEGORY_SCORES[locationUrlId]?.temp_compliance ?? 80), industryAvg: 82, unit: '%', better: (LOCATION_SUBCATEGORY_SCORES[locationUrlId]?.temp_compliance ?? 80) > 82 },
      { metric: 'Checklist Completion', yourValue: (LOCATION_SUBCATEGORY_SCORES[locationUrlId]?.checklist_completion ?? 70), industryAvg: 76, unit: '%', better: (LOCATION_SUBCATEGORY_SCORES[locationUrlId]?.checklist_completion ?? 70) > 76 },
      { metric: 'Incident Resolution', yourValue: locationUrlId === 'downtown' ? 4.2 : locationUrlId === 'airport' ? 8.5 : 12.1, industryAvg: 8.7, unit: 'hrs', better: (locationUrlId === 'downtown') },
      { metric: 'Photo Evidence/Day', yourValue: locationUrlId === 'downtown' ? 8 : locationUrlId === 'airport' ? 3 : 1, industryAvg: 4.2, unit: '', better: locationUrlId === 'downtown' },
    ],
  };
}

function getDefaultBenchmark(): BenchmarkResult {
  return {
    locationScore: complianceScores.overall,
    percentile: 58,
    rank: 'Top 42%',
    comparedTo: '4,200 restaurant locations nationally',
    aboveAverage: true,
    gap: 4,
    pillarComparison: [
      { pillar: 'Food Safety', yourScore: complianceScores.foodSafety, industryAvg: 76, percentile: 65 },
      { pillar: 'Fire Safety', yourScore: complianceScores.fireSafety, industryAvg: 70, percentile: 55 },
    ],
    operationalComparison: [
      { metric: 'Temp Compliance', yourValue: 85, industryAvg: 82, unit: '%', better: true },
      { metric: 'Checklist Completion', yourValue: 78, industryAvg: 76, unit: '%', better: true },
      { metric: 'Incident Resolution', yourValue: 6.5, industryAvg: 8.7, unit: 'hrs', better: true },
      { metric: 'Photo Evidence/Day', yourValue: 4, industryAvg: 4.2, unit: '', better: false },
    ],
  };
}

/**
 * Get demo quarterly report data.
 */
export function getDemoQuarterlyReport(locationUrlId: string = 'downtown'): QuarterlyReport {
  const benchmark = getDemoBenchmark(locationUrlId);
  const trends = MONTHLY_TRENDS[locationUrlId] || MONTHLY_TRENDS['downtown'];
  const leadLag = LEAD_LAG_DATA[locationUrlId] || LEAD_LAG_DATA['downtown'];

  const locationNames: Record<string, string> = {
    downtown: 'Downtown Kitchen',
    airport: 'Airport Cafe',
    university: 'University Dining',
  };

  const counties: Record<string, string> = {
    downtown: 'Fresno County, CA',
    airport: 'Merced County, CA',
    university: 'Stanislaus County, CA',
  };

  return {
    quarter: 1,
    year: 2026,
    reportId: `BNK-2026-Q1-${locationUrlId.toUpperCase().slice(0, 3)}`,
    locationName: locationNames[locationUrlId] || 'Downtown Kitchen',
    organizationName: 'Pacific Coast Dining',
    industrySegment: 'Restaurant — Casual Dining',
    jurisdiction: counties[locationUrlId] || 'Fresno County, CA',
    overallScore: benchmark.locationScore,
    percentile: benchmark.percentile,
    comparedTo: benchmark.comparedTo,
    pillarComparison: benchmark.pillarComparison,
    operationalComparison: benchmark.operationalComparison,
    trendData: trends,
    strengths: leadLag.leads,
    improvements: leadLag.lags,
    generatedAt: new Date().toISOString(),
  };
}

// ── Industry Segments ────────────────────────────────────────

export const INDUSTRY_SEGMENTS = [
  { value: 'casual_dining', label: 'Casual Dining Restaurant' },
  { value: 'quick_service', label: 'Quick Service / Fast Food' },
  { value: 'fine_dining', label: 'Fine Dining' },
  { value: 'hotel', label: 'Hotel / Resort Dining' },
  { value: 'education_k12', label: 'K-12 School Cafeteria' },
  { value: 'education_university', label: 'University Dining' },
  { value: 'healthcare', label: 'Healthcare Facility' },
  { value: 'corporate_dining', label: 'Corporate Dining / Cafeteria' },
  { value: 'catering', label: 'Catering Operation' },
  { value: 'food_truck', label: 'Food Truck / Mobile' },
  { value: 'grocery_deli', label: 'Grocery / Deli' },
  { value: 'convenience', label: 'Convenience Store (prepared food)' },
  { value: 'other', label: 'Other' },
] as const;

export type IndustrySegment = typeof INDUSTRY_SEGMENTS[number]['value'];
