// ============================================================
// useTrendAnalytics — React hook for GAP-03 trend analytics
// ============================================================

import { useState, useMemo } from 'react';
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
    overall: TrendAnalysis;
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
    overall: TrendAnalysis;
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

// ── Hook ─────────────────────────────────────────────────────

export function useTrendAnalytics(isDemoMode: boolean): TrendAnalyticsState {
  const [period, setPeriod] = useState<TimePeriod>('30d');

  const availablePeriods: TimePeriod[] = ['30d', '60d', '90d'];

  // Filter org data by period
  const chartData = useMemo(
    () => (isDemoMode ? filterByPeriod(CATEGORY_ORG_TRENDS, period) : []),
    [isDemoMode, period],
  );

  // Filter per-location data by period
  const locationChartData = useMemo(() => {
    if (!isDemoMode) return {};
    const result: Record<string, CategoryTrendDataPoint[]> = {};
    for (const [locId, trend] of Object.entries(CATEGORY_LOCATION_TRENDS)) {
      result[locId] = filterByPeriod(trend, period);
    }
    return result;
  }, [isDemoMode, period]);

  // Org-level pillar trends
  const orgTrend = useMemo(() => ({
    overall: analyzeCategory(chartData, 'overall'),
    foodSafety: analyzeCategory(chartData, 'foodSafety'),
    facilitySafety: analyzeCategory(chartData, 'facilitySafety'),
  }), [chartData]);

  // Per-category trends (org-level)
  const categoryTrends = useMemo(() => ({
    tempCompliance: analyzeCategory(chartData, 'tempCompliance'),
    checklistCompletion: analyzeCategory(chartData, 'checklistCompletion'),
    haccpMonitoring: analyzeCategory(chartData, 'haccpMonitoring'),
    incidentResolution: analyzeCategory(chartData, 'incidentResolution'),
    documentCurrency: analyzeCategory(chartData, 'documentCurrency'),
    facilitySafetyOps: analyzeCategory(chartData, 'facilitySafetyOps'),
  }), [chartData]);

  // Per-location pillar trends
  const locationTrends = useMemo(() => {
    const result: Record<string, {
      overall: TrendAnalysis;
      foodSafety: TrendAnalysis;
      facilitySafety: TrendAnalysis;
    }> = {};
    for (const [locId, data] of Object.entries(locationChartData)) {
      result[locId] = {
        overall: analyzeCategory(data, 'overall'),
        foodSafety: analyzeCategory(data, 'foodSafety'),
        facilitySafety: analyzeCategory(data, 'facilitySafety'),
      };
    }
    return result;
  }, [locationChartData]);

  // Threshold crossings for org-level overall
  const thresholdCrossings = useMemo(() => {
    if (chartData.length === 0) return [];
    const mapped = chartData.map((d) => ({ date: d.date, value: d.overall }));
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
    loading: false,
  };
}
