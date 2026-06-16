// ============================================================
// useTrendAnalytics — stub (manufactured score trends removed)
// ============================================================
// The previous implementation queried manufactured compliance
// score data from compliance_score_snapshots and demo data.
// This stub preserves the hook signature so consumers compile.
// ============================================================

import { useState } from 'react';
import type { TrendAnalysis, TimePeriod, ThresholdCrossing } from '../lib/trendAnalytics';

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

  chartData: never[];
  locationChartData: Record<string, never[]>;

  thresholdCrossings: ThresholdCrossing[];

  loading: boolean;
}

// ── Empty analysis constant ──────────────────────────────────

const EMPTY_ANALYSIS: TrendAnalysis = {
  direction: 'stable' as const,
  periodDelta: 0,
  avgValue: 0,
  currentValue: 0,
  minValue: 0,
  maxValue: 0,
  volatility: 0,
};

// ── Hook (stub — returns empty data) ─────────────────────────

export function useTrendAnalytics(_isDemoMode: boolean): TrendAnalyticsState {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const availablePeriods: TimePeriod[] = ['30d', '60d', '90d'];

  return {
    period,
    setPeriod,
    availablePeriods,
    orgTrend: {
      foodSafety: EMPTY_ANALYSIS,
      facilitySafety: EMPTY_ANALYSIS,
    },
    categoryTrends: {
      tempCompliance: EMPTY_ANALYSIS,
      checklistCompletion: EMPTY_ANALYSIS,
      haccpMonitoring: EMPTY_ANALYSIS,
      incidentResolution: EMPTY_ANALYSIS,
      documentCurrency: EMPTY_ANALYSIS,
      facilitySafetyOps: EMPTY_ANALYSIS,
    },
    locationTrends: {},
    chartData: [],
    locationChartData: {},
    thresholdCrossings: [],
    loading: false,
  };
}
