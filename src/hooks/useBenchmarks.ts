// ============================================================
// useBenchmarks — Composition hook for benchmark normalization
// ============================================================
// Composes useComplianceEngine + useTrendAnalytics + normalization
// engine into a single hook for the Benchmarks page.
// ============================================================

import { useState, useMemo } from 'react';
import { useAllComplianceEngineResults } from './useComplianceEngine';
import { useTrendAnalytics } from './useTrendAnalytics';
import {
  computeNormalizedBenchmark,
  computePillarBenchmarks,
  computeSubcategoryBenchmarks,
  computeLeadLag,
  computeJurisdictionDifficulty,
  type NormalizedBenchmark,
  type PillarBenchmark,
  type SubcategoryBenchmarkResult,
  type LeadLagResult,
  type JurisdictionDifficultyInfo,
} from '../lib/benchmarkNormalization';
import {
  PEER_POPULATIONS,
  getPeerPopulation,
  DEMO_LOCATION_CONTEXT,
  LOCATION_SUBCATEGORY_SCORES,
  MONTHLY_TRENDS,
  BADGE_QUALIFICATIONS,
  VERTICAL_BENCHMARKS,
  GEO_BENCHMARKS,
  SIZE_BENCHMARKS,
  type MonthlyTrend,
} from '../data/benchmarkDemoData';
import type { BadgeQualification } from '../data/benchmarkData';

// ── Types ────────────────────────────────────────────────────

export interface BenchmarkFilters {
  vertical: string;
  county: string;
  size: string;
}

export interface LocationRanking {
  locationId: string;
  name: string;
  foodSafety: number;
  facilitySafety: number;
  industryPercentile: number;
  jurisdictionGrade: string;
  badgeTier: string | null;
}

export interface BenchmarkState {
  benchmark: NormalizedBenchmark;
  pillarBenchmarks: PillarBenchmark[];
  subcategoryBenchmarks: SubcategoryBenchmarkResult[];
  leadLag: LeadLagResult;
  jurisdictionDifficulty: JurisdictionDifficultyInfo;
  trendData: MonthlyTrend[];
  locationRankings: LocationRanking[];
  badgeQualifications: Record<string, BadgeQualification>;
  filters: BenchmarkFilters;
  setFilters: (f: Partial<BenchmarkFilters>) => void;
  peerGroupLabel: string;
  loading: boolean;
}

// ── Default Filters ──────────────────────────────────────────

const DEFAULT_FILTERS: BenchmarkFilters = {
  vertical: 'Restaurant',
  county: 'Fresno County',
  size: '2-10',
};

// ── Location Names ───────────────────────────────────────────

const LOCATION_NAMES: Record<string, string> = {
  downtown: 'Location 1',
  airport: 'Location 2',
  university: 'Location 3',
};

// ── Empty Benchmark ──────────────────────────────────────────

const EMPTY_COMPARISON = {
  peerLabel: '', peerMean: 0, peerMedian: 0, peerStdDev: 0,
  p25: 0, p75: 0, p90: 0, sampleSize: 0, yourScore: 0,
  percentile: 50, rank: 1, totalPeers: 1, gap: 0, aboveAverage: false,
};

const EMPTY_BENCHMARK: NormalizedBenchmark = {
  industryComparison: EMPTY_COMPARISON,
  verticalComparison: EMPTY_COMPARISON,
  geoComparison: EMPTY_COMPARISON,
  sizeComparison: EMPTY_COMPARISON,
};

// ── Hook ─────────────────────────────────────────────────────

export function useBenchmarks(
  locationId: string | 'all',
  isDemoMode: boolean,
): BenchmarkState {
  const compliance = useAllComplianceEngineResults(isDemoMode);
  const _trends = useTrendAnalytics(isDemoMode);

  const [filters, setFiltersRaw] = useState<BenchmarkFilters>(DEFAULT_FILTERS);
  const setFilters = (partial: Partial<BenchmarkFilters>) => {
    setFiltersRaw(prev => ({ ...prev, ...partial }));
  };

  // Determine which location to show (or org average for 'all')
  const activeLocationId = locationId === 'all' ? 'downtown' : locationId;
  const locContext = DEMO_LOCATION_CONTEXT[activeLocationId] ?? DEMO_LOCATION_CONTEXT['downtown'];

  // Get scores from compliance engine
  const scores = useMemo(() => {
    if (locationId === 'all') {
      // Average across all locations
      const results = Object.values(compliance.results);
      if (results.length === 0) return { foodSafety: 0, facilitySafety: 0 };
      const fs = Math.round(results.reduce((s, r) => s + r.foodSafetyScore, 0) / results.length);
      const fac = Math.round(results.reduce((s, r) => s + r.facilitySafetyScore, 0) / results.length);
      return { foodSafety: fs, facilitySafety: fac };
    }
    const r = compliance.results[locationId];
    if (!r) return { foodSafety: 0, facilitySafety: 0 };
    return {
      foodSafety: r.foodSafetyScore,
      facilitySafety: r.facilitySafetyScore,
    };
  }, [compliance.results, locationId]);

  // Build peer populations based on filters
  const populations = useMemo(() => {
    const vertKey = `vertical:${filters.vertical}`;
    const geoKey = `geo:${filters.county.toLowerCase().replace(/\s+county$/i, '').replace(/\s+/g, '-')}`;
    const sizeKey = `size:${filters.size}`;

    return {
      industry: PEER_POPULATIONS['industry'],
      vertical: PEER_POPULATIONS[vertKey] ?? PEER_POPULATIONS['industry'],
      geo: PEER_POPULATIONS[geoKey] ?? PEER_POPULATIONS['industry'],
      size: PEER_POPULATIONS[sizeKey] ?? PEER_POPULATIONS['industry'],
    };
  }, [filters]);

  // Compute normalized benchmark (use foodSafety as primary benchmark score)
  const benchmark = useMemo(() => {
    if (scores.foodSafety === 0) return EMPTY_BENCHMARK;
    return computeNormalizedBenchmark(scores.foodSafety, populations);
  }, [scores.foodSafety, populations]);

  // Pillar benchmarks
  const pillarBenchmarks = useMemo(() => {
    return computePillarBenchmarks(scores.foodSafety, scores.facilitySafety, populations.vertical);
  }, [scores, populations.vertical]);

  // Subcategory benchmarks
  const subcategoryBenchmarks = useMemo(() => {
    const locScores = locationId === 'all'
      ? averageSubcategoryScores()
      : (LOCATION_SUBCATEGORY_SCORES[locationId] ?? {});
    return computeSubcategoryBenchmarks(locScores, populations.vertical);
  }, [locationId, populations.vertical]);

  // Lead/Lag analysis
  const leadLag = useMemo(() => computeLeadLag(subcategoryBenchmarks), [subcategoryBenchmarks]);

  // Jurisdiction difficulty
  const jurisdictionDifficulty = useMemo(() => {
    const countySlug = locContext.county;
    const rawPct = benchmark.industryComparison.percentile;
    return computeJurisdictionDifficulty(countySlug, rawPct);
  }, [locContext.county, benchmark.industryComparison.percentile]);

  // Trend data
  const trendData = useMemo((): MonthlyTrend[] => {
    const locTrends = MONTHLY_TRENDS[activeLocationId] ?? MONTHLY_TRENDS['downtown'];
    // Update vertical/industry averages based on filter selection
    const vertBench = VERTICAL_BENCHMARKS.find(v => v.vertical === filters.vertical);
    const vertAvg = vertBench?.avgScore ?? 74;
    const industryAvg = 73;

    return locTrends.map(t => ({
      ...t,
      verticalAvg: vertAvg + (t.verticalAvg - 74), // shift from Restaurant baseline
      industryAvg: industryAvg + (t.industryAvg - 73),
    }));
  }, [activeLocationId, filters.vertical]);

  // Location rankings
  const locationRankings = useMemo((): LocationRanking[] => {
    const industryPop = PEER_POPULATIONS['industry'];
    return Object.entries(compliance.results)
      .map(([locId, result]) => {
        const { percentile: pct } = computePercentileRankForRanking(result.foodSafetyScore, industryPop.foodSafety);
        const badge = BADGE_QUALIFICATIONS[locId];
        return {
          locationId: locId,
          name: LOCATION_NAMES[locId] ?? locId,
          foodSafety: result.foodSafetyScore,
          facilitySafety: result.facilitySafetyScore,
          industryPercentile: pct,
          jurisdictionGrade: result.jurisdictionResult?.grade?.label ?? 'N/A',
          badgeTier: badge?.tier ?? null,
        };
      })
      .sort((a, b) => b.foodSafety - a.foodSafety);
  }, [compliance.results]);

  // Peer group label
  const peerGroupLabel = useMemo(() => {
    const parts: string[] = [];
    if (filters.vertical) parts.push(filters.vertical);
    if (filters.county) parts.push(filters.county);
    if (filters.size) {
      const sizeBench = SIZE_BENCHMARKS.find(s => s.size === filters.size);
      if (sizeBench) parts.push(sizeBench.label);
    }
    return parts.join(' · ') || 'All EvidLY Customers';
  }, [filters]);

  return {
    benchmark,
    pillarBenchmarks,
    subcategoryBenchmarks,
    leadLag,
    jurisdictionDifficulty,
    trendData,
    locationRankings,
    badgeQualifications: BADGE_QUALIFICATIONS,
    filters,
    setFilters,
    peerGroupLabel,
    loading: compliance.loading,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function averageSubcategoryScores(): Record<string, number> {
  const all = Object.values(LOCATION_SUBCATEGORY_SCORES);
  if (all.length === 0) return {};
  const keys = Object.keys(all[0]);
  const result: Record<string, number> = {};
  for (const key of keys) {
    result[key] = Math.round(all.reduce((s, loc) => s + (loc[key] ?? 0), 0) / all.length);
  }
  return result;
}

// Inline to avoid circular import
function computePercentileRankForRanking(
  yourScore: number,
  peerScores: number[],
): { percentile: number } {
  if (peerScores.length === 0) return { percentile: 50 };
  let beaten = 0;
  for (let i = 0; i < peerScores.length; i++) {
    if (peerScores[i] < yourScore) beaten++;
    else break;
  }
  return { percentile: Math.max(1, Math.min(99, Math.round((beaten / peerScores.length) * 100))) };
}
