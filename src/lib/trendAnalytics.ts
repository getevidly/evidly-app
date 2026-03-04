// ============================================================
// Trend Analytics Engine — GAP-03
// ============================================================
// Pure-function library for analyzing compliance score trends.
// Computes direction, rate of change, volatility, threshold
// crossings, and period-based filtering.
// ============================================================

// ── Types ────────────────────────────────────────────────────

export type TrendDirection = 'improving' | 'stable' | 'declining';
export type TimePeriod = '30d' | '60d' | '90d';

export interface TrendAnalysis {
  direction: TrendDirection;
  rateOfChange: number;       // points per 30 days (positive = improving)
  volatility: number;         // std dev of daily changes
  currentValue: number;
  periodStartValue: number;
  periodDelta: number;
  periodDeltaPct: number;     // percentage change
  minValue: number;
  maxValue: number;
  avgValue: number;
}

export interface ThresholdCrossing {
  date: string;
  direction: 'crossed_above' | 'crossed_below';
  threshold: number;
  value: number;
}

export interface TrendComparison {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  direction: TrendDirection;
}

// ── Period Mapping ───────────────────────────────────────────

const PERIOD_DAYS: Record<TimePeriod, number> = {
  '30d': 30,
  '60d': 60,
  '90d': 90,
};

// ── Direction Classification ─────────────────────────────────

/**
 * Classify a rate of change as improving, stable, or declining.
 * Default threshold: 1 point per 30 days.
 */
export function classifyDirection(
  rateOfChange: number,
  threshold = 1.0,
): TrendDirection {
  if (rateOfChange > threshold) return 'improving';
  if (rateOfChange < -threshold) return 'declining';
  return 'stable';
}

// ── Core Trend Analysis ──────────────────────────────────────

/**
 * Analyze a series of numeric values to determine trend direction,
 * rate of change, volatility, and summary statistics.
 *
 * Uses simple linear regression (least squares) to compute slope,
 * then converts to points-per-30-days rate.
 */
export function analyzeTrend(values: number[]): TrendAnalysis {
  if (values.length === 0) {
    return {
      direction: 'stable',
      rateOfChange: 0,
      volatility: 0,
      currentValue: 0,
      periodStartValue: 0,
      periodDelta: 0,
      periodDeltaPct: 0,
      minValue: 0,
      maxValue: 0,
      avgValue: 0,
    };
  }

  if (values.length === 1) {
    const v = values[0];
    return {
      direction: 'stable',
      rateOfChange: 0,
      volatility: 0,
      currentValue: v,
      periodStartValue: v,
      periodDelta: 0,
      periodDeltaPct: 0,
      minValue: v,
      maxValue: v,
      avgValue: v,
    };
  }

  const n = values.length;
  const currentValue = values[n - 1];
  const periodStartValue = values[0];

  // Linear regression: y = mx + b
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Convert slope (points per day) to points per 30 days
  const rateOfChange = Math.round(slope * 30 * 10) / 10;

  // Volatility: std dev of day-over-day changes
  const dailyChanges: number[] = [];
  for (let i = 1; i < n; i++) {
    dailyChanges.push(values[i] - values[i - 1]);
  }
  const volatility = standardDeviation(dailyChanges);

  // Summary stats
  const periodDelta = currentValue - periodStartValue;
  const periodDeltaPct = periodStartValue !== 0
    ? Math.round((periodDelta / periodStartValue) * 1000) / 10
    : 0;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const avgValue = Math.round((sumY / n) * 10) / 10;

  return {
    direction: classifyDirection(rateOfChange),
    rateOfChange,
    volatility,
    currentValue,
    periodStartValue,
    periodDelta,
    periodDeltaPct,
    minValue,
    maxValue,
    avgValue,
  };
}

// ── Period Filtering ─────────────────────────────────────────

/**
 * Filter a data array to the last N days based on the time period.
 * Assumes data is sorted chronologically (oldest first).
 */
export function filterByPeriod<T>(
  data: T[],
  period: TimePeriod,
): T[] {
  const days = PERIOD_DAYS[period];
  if (data.length <= days) return data;
  return data.slice(-days);
}

// ── Threshold Crossing Detection ─────────────────────────────

/**
 * Detect when values cross specified thresholds (e.g., 60, 75, 90).
 * Returns an array of crossing events.
 */
export function detectThresholdCrossings(
  data: { date: string; value: number }[],
  thresholds: number[],
): ThresholdCrossing[] {
  const crossings: ThresholdCrossing[] = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].value;
    const curr = data[i].value;

    for (const threshold of thresholds) {
      if (prev < threshold && curr >= threshold) {
        crossings.push({
          date: data[i].date,
          direction: 'crossed_above',
          threshold,
          value: curr,
        });
      } else if (prev >= threshold && curr < threshold) {
        crossings.push({
          date: data[i].date,
          direction: 'crossed_below',
          threshold,
          value: curr,
        });
      }
    }
  }

  return crossings;
}

// ── Delta Computation ────────────────────────────────────────

/**
 * Compute the delta between the most recent value and the value
 * N days ago. Returns null if insufficient data.
 */
export function computeDelta(
  data: { date: string; value: number }[],
  daysAgo: number,
): { current: number; previous: number; delta: number } | null {
  if (data.length < 2) return null;

  const current = data[data.length - 1].value;
  const targetIdx = data.length - 1 - daysAgo;

  if (targetIdx < 0) return null;

  const previous = data[targetIdx].value;
  return {
    current,
    previous,
    delta: current - previous,
  };
}

// ── Period Comparison ────────────────────────────────────────

/**
 * Compare the average of the most recent `currentDays` vs the
 * `previousDays` before that.
 */
export function comparePeriods(
  data: { date: string; value: number }[],
  currentDays: number,
  previousDays: number,
): TrendComparison | null {
  const total = currentDays + previousDays;
  if (data.length < total) return null;

  const currentSlice = data.slice(-currentDays);
  const previousSlice = data.slice(-total, -currentDays);

  const currentAvg = currentSlice.reduce((s, d) => s + d.value, 0) / currentSlice.length;
  const previousAvg = previousSlice.reduce((s, d) => s + d.value, 0) / previousSlice.length;
  const delta = Math.round((currentAvg - previousAvg) * 10) / 10;
  const deltaPct = previousAvg !== 0
    ? Math.round((delta / previousAvg) * 1000) / 10
    : 0;

  return {
    current: Math.round(currentAvg * 10) / 10,
    previous: Math.round(previousAvg * 10) / 10,
    delta,
    deltaPct,
    direction: classifyDirection(delta),
  };
}

// ── Helpers ──────────────────────────────────────────────────

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((s, v) => s + v, 0) / values.length;
  return Math.round(Math.sqrt(variance) * 100) / 100;
}
