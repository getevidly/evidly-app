// ============================================================
// useTrendAnalytics — React hook for GAP-03 trend analytics
// ============================================================
// Demo mode: uses generated demo data from trendDemoData.ts
// Live mode: queries compliance_score_snapshots from Supabase
// ============================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  analyzeTrend,
  filterByPeriod,
  detectThresholdCrossings,
  type TrendAnalysis,
  type TrendDirection,
  type TimePeriod,
  type ThresholdCrossing,
} from '../lib/trendAnalytics';
import {
  CATEGORY_LOCATION_TRENDS,
  CATEGORY_ORG_TRENDS,
  type CategoryTrendDataPoint,
} from '../data/trendDemoData';

// ── Types ────────────────────────────────────────────────────

export interface TrendAnalyticsState {
  period: TimePeriod;
  setPeriod: (p: TimePeriod) => void;
  availablePeriods: TimePeriod[];

  orgTrend: {
    foodSafety: TrendAnalysis;
    facilitySafety: TrendAnalysis;
  };

  categoryTrends: {
    tempCompliance: TrendAnalysis;
    checklistCompletion: TrendAnalysis;
    haccpMonitoring: TrendAnalysis;
    incidentResolution: TrendAnalysis;
    documentCurrency: TrendAnalysis;
    facilitySafetyOps: TrendAnalysis;
  };

  locationTrends: Record<string, {
    foodSafety: TrendAnalysis;
    facilitySafety: TrendAnalysis;
  }>;

  chartData: CategoryTrendDataPoint[];
  locationChartData: Record<string, CategoryTrendDataPoint[]>;

  thresholdCrossings: ThresholdCrossing[];

  loading: boolean;
}

// ── Helpers ──────────────────────────────────────────────────

function extractValues(
  data: CategoryTrendDataPoint[],
  key: keyof CategoryTrendDataPoint,
): number[] {
  return data.map((d) => d[key] as number);
}

function analyzeCategory(
  data: CategoryTrendDataPoint[],
  key: keyof CategoryTrendDataPoint,
): TrendAnalysis {
  return analyzeTrend(extractValues(data, key));
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Live data types ─────────────────────────────────────────

interface SnapshotRow {
  score_date: string;
  location_id: string;
  overall_score: number | null;
  food_safety_score: number | null;
  facility_safety_score: number | null;
  temp_in_range_pct: number | null;
  checklists_completed_pct: number | null;
  incidents_avg_resolution_hours: number | null;
  documents_current_pct: number | null;
  facility_safety_ops_score: number | null;
  food_safety_ops_score: number | null;
}

interface LocationRow {
  id: string;
  name: string;
}

// ── Transform live data ─────────────────────────────────────

function transformSnapshots(
  snapshots: SnapshotRow[],
  locationMap: Record<string, string>,
): {
  orgData: CategoryTrendDataPoint[];
  locationData: Record<string, CategoryTrendDataPoint[]>;
} {
  if (snapshots.length === 0) return { orgData: [], locationData: {} };

  const byLocation: Record<string, CategoryTrendDataPoint[]> = {};
  const byDate: Record<string, CategoryTrendDataPoint[]> = {};

  for (const row of snapshots) {
    // Derive a stable key from location name (lowercase, underscored)
    const locName = locationMap[row.location_id] || row.location_id;
    const locKey = locName.toLowerCase().replace(/\s+/g, '_');

    const point: CategoryTrendDataPoint = {
      date: row.score_date,
      dateDisplay: formatDisplay(row.score_date),
      foodSafety: row.food_safety_score ?? 0,
      facilitySafety: row.facility_safety_score ?? 0,
      tempCompliance: row.temp_in_range_pct ?? 0,
      checklistCompletion: row.checklists_completed_pct ?? 0,
      // SUGGESTION: Add a dedicated haccp_monitoring_pct column to compliance_score_snapshots
      // for more accurate HACCP tracking. Currently using food_safety_ops_score as a proxy
      // since HACCP monitoring is a 22.2% component of food safety operations.
      haccpMonitoring: row.food_safety_ops_score ?? 0,
      incidentResolution: row.incidents_avg_resolution_hours ?? 0,
      documentCurrency: row.documents_current_pct ?? 0,
      facilitySafetyOps: row.facility_safety_ops_score ?? 0,
    };

    if (!byLocation[locKey]) byLocation[locKey] = [];
    byLocation[locKey].push(point);

    if (!byDate[row.score_date]) byDate[row.score_date] = [];
    byDate[row.score_date].push(point);
  }

  // Compute org-level daily averages
  const orgData: CategoryTrendDataPoint[] = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, points]) => {
      const n = points.length;
      const avg = (key: keyof CategoryTrendDataPoint) =>
        Math.round(points.reduce((s, p) => s + (p[key] as number), 0) / n);
      const avgFloat = (key: keyof CategoryTrendDataPoint) =>
        Math.round((points.reduce((s, p) => s + (p[key] as number), 0) / n) * 10) / 10;

      return {
        date,
        dateDisplay: formatDisplay(date),
        foodSafety: avg('foodSafety'),
        facilitySafety: avg('facilitySafety'),
        tempCompliance: avg('tempCompliance'),
        checklistCompletion: avg('checklistCompletion'),
        haccpMonitoring: avg('haccpMonitoring'),
        incidentResolution: avgFloat('incidentResolution'),
        documentCurrency: avg('documentCurrency'),
        facilitySafetyOps: avg('facilitySafetyOps'),
      } satisfies CategoryTrendDataPoint;
    });

  return { orgData, locationData: byLocation };
}

// ── Hook ─────────────────────────────────────────────────────

export function useTrendAnalytics(isDemoMode: boolean): TrendAnalyticsState {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [liveOrgData, setLiveOrgData] = useState<CategoryTrendDataPoint[]>([]);
  const [liveLocationData, setLiveLocationData] = useState<Record<string, CategoryTrendDataPoint[]>>({});
  const [loading, setLoading] = useState(!isDemoMode);

  const availablePeriods: TimePeriod[] = ['30d', '60d', '90d'];

  // ── Live data fetch (always fetches 90 days, filtered client-side) ──

  const fetchLiveData = useCallback(async () => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const dateStr = ninetyDaysAgo.toISOString().slice(0, 10);

      const [snapshotRes, locationsRes] = await Promise.all([
        supabase
          .from('compliance_score_snapshots')
          .select('score_date, location_id, overall_score, food_safety_score, facility_safety_score, temp_in_range_pct, checklists_completed_pct, incidents_avg_resolution_hours, documents_current_pct, facility_safety_ops_score, food_safety_ops_score')
          .gte('score_date', dateStr)
          .order('score_date', { ascending: true }),
        supabase
          .from('locations')
          .select('id, name')
          .order('name'),
      ]);

      // Table may not exist or may be empty — not an error
      if (snapshotRes.error) {
        console.warn('[ComplianceTrends] Snapshots query:', snapshotRes.error.message);
      }
      if (locationsRes.error) {
        console.warn('[ComplianceTrends] Locations query:', locationsRes.error.message);
      }

      const snapshots = (snapshotRes.data ?? []) as SnapshotRow[];
      const locations = (locationsRes.data ?? []) as LocationRow[];

      // Build location ID → name map
      const locationMap: Record<string, string> = {};
      for (const loc of locations) {
        locationMap[loc.id] = loc.name;
      }

      const { orgData, locationData } = transformSnapshots(snapshots, locationMap);
      setLiveOrgData(orgData);
      setLiveLocationData(locationData);
    } catch (err) {
      // Only network/connection failures reach here
      console.warn('[ComplianceTrends] Connection error:', err);
      setLiveOrgData([]);
      setLiveLocationData({});
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // ── Filter by period (both demo and live paths) ─────────────

  const chartData = useMemo(() => {
    const source = isDemoMode ? CATEGORY_ORG_TRENDS : liveOrgData;
    return filterByPeriod(source, period);
  }, [isDemoMode, liveOrgData, period]);

  const locationChartData = useMemo(() => {
    const source = isDemoMode ? CATEGORY_LOCATION_TRENDS : liveLocationData;
    const result: Record<string, CategoryTrendDataPoint[]> = {};
    for (const [locId, trend] of Object.entries(source)) {
      result[locId] = filterByPeriod(trend, period);
    }
    return result;
  }, [isDemoMode, liveLocationData, period]);

  // ── Org-level pillar trends ─────────────────────────────────

  const orgTrend = useMemo(() => ({
    foodSafety: analyzeCategory(chartData, 'foodSafety'),
    facilitySafety: analyzeCategory(chartData, 'facilitySafety'),
  }), [chartData]);

  // ── Per-category trends (org-level) ─────────────────────────

  const categoryTrends = useMemo(() => ({
    tempCompliance: analyzeCategory(chartData, 'tempCompliance'),
    checklistCompletion: analyzeCategory(chartData, 'checklistCompletion'),
    haccpMonitoring: analyzeCategory(chartData, 'haccpMonitoring'),
    incidentResolution: analyzeCategory(chartData, 'incidentResolution'),
    documentCurrency: analyzeCategory(chartData, 'documentCurrency'),
    facilitySafetyOps: analyzeCategory(chartData, 'facilitySafetyOps'),
  }), [chartData]);

  // ── Per-location pillar trends ──────────────────────────────

  const locationTrends = useMemo(() => {
    const result: Record<string, {
      foodSafety: TrendAnalysis;
      facilitySafety: TrendAnalysis;
    }> = {};
    for (const [locId, data] of Object.entries(locationChartData)) {
      result[locId] = {
        foodSafety: analyzeCategory(data, 'foodSafety'),
        facilitySafety: analyzeCategory(data, 'facilitySafety'),
      };
    }
    return result;
  }, [locationChartData]);

  // ── Threshold crossings ─────────────────────────────────────

  const thresholdCrossings = useMemo(() => {
    if (chartData.length === 0) return [];
    const mapped = chartData.map((d) => ({ date: d.date, value: d.foodSafety }));
    return detectThresholdCrossings(mapped, [60, 75, 90]);
  }, [chartData]);

  return {
    period,
    setPeriod,
    availablePeriods,
    orgTrend,
    categoryTrends,
    locationTrends,
    chartData,
    locationChartData,
    thresholdCrossings,
    loading,
  };
}
