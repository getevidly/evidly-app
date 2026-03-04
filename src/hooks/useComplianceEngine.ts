// ============================================================
// useComplianceEngine — React hook for compliance scoring
// ============================================================
// Wraps the compliance data collector + engine for React
// components. Returns per-location scores, violations, and
// trend data.
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
  collectComplianceData,
  collectAllDemoData,
  type ComplianceDataSnapshot,
} from '../lib/complianceDataCollector';
import {
  computeComplianceSnapshot,
  computeAllSnapshots,
  computeOrgScores,
  type ComplianceEngineResult,
} from '../lib/complianceEngine';
import {
  ENGINE_TREND_DATA,
  LOCATION_TRENDS,
  getScoresThirtyDaysAgo,
  type TrendDataPoint,
} from '../data/complianceEngineDemoData';

// ── Hook Return Type ─────────────────────────────────────────

export interface ComplianceEngineState {
  /** Per-location engine results */
  results: Record<string, ComplianceEngineResult>;
  /** Org-level aggregated scores */
  orgScores: { overall: number | null; foodSafety: number; facilitySafety: number };
  /** 30-day org-level trend */
  trendData: TrendDataPoint[];
  /** Per-location 30-day trends */
  locationTrends: Record<string, TrendDataPoint[]>;
  /** 30-day-ago scores per location */
  scoresThirtyDaysAgo: Record<string, { foodSafety: number; facilitySafety: number }>;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
}

// ── Cache ────────────────────────────────────────────────────
// Engine results are deterministic for static demo data.
// Cache to avoid recomputation on every render.

let _cachedDemoResults: Record<string, ComplianceEngineResult> | null = null;

function getDemoResults(): Record<string, ComplianceEngineResult> {
  if (_cachedDemoResults) return _cachedDemoResults;
  const snapshots = collectAllDemoData();
  _cachedDemoResults = computeAllSnapshots(snapshots);
  return _cachedDemoResults;
}

// ── Hook ─────────────────────────────────────────────────────

/**
 * React hook that runs the compliance engine for the given locations.
 *
 * In demo mode, returns cached results from static demo data.
 * In live mode, collects data from Supabase and computes scores.
 */
export function useComplianceEngine(
  locationIds: string[],
  isDemoMode: boolean,
): ComplianceEngineState {
  const [results, setResults] = useState<Record<string, ComplianceEngineResult>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      const demoResults = getDemoResults();
      // Filter to requested locations (or return all if empty)
      const filtered = locationIds.length > 0
        ? Object.fromEntries(
            Object.entries(demoResults).filter(([id]) => locationIds.includes(id)),
          )
        : demoResults;
      setResults(filtered);
      setLoading(false);
      setError(null);
      return;
    }

    // Live mode
    setLoading(true);
    setError(null);

    try {
      const computed: Record<string, ComplianceEngineResult> = {};
      for (const locId of locationIds) {
        const snapshot = collectComplianceData(locId, { isDemoMode: false });
        computed[locId] = computeComplianceSnapshot(locId, snapshot, snapshot.countySlug);
      }
      setResults(computed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute compliance scores');
    } finally {
      setLoading(false);
    }
  }, [locationIds.join(','), isDemoMode]);

  const orgScores = useMemo(() => computeOrgScores(results), [results]);

  return {
    results,
    orgScores,
    trendData: isDemoMode ? ENGINE_TREND_DATA : [],
    locationTrends: isDemoMode ? LOCATION_TRENDS : {},
    scoresThirtyDaysAgo: isDemoMode ? getScoresThirtyDaysAgo() : {},
    loading,
    error,
  };
}

/**
 * Convenience hook — runs engine for all 3 demo locations.
 */
export function useAllComplianceEngineResults(isDemoMode: boolean): ComplianceEngineState {
  return useComplianceEngine(['downtown', 'airport', 'university'], isDemoMode);
}
