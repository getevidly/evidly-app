import { describe, it, expect } from 'vitest';
import {
  classifyDirection,
  analyzeTrend,
  filterByPeriod,
  detectThresholdCrossings,
  computeDelta,
  comparePeriods,
} from '../trendAnalytics';

// ─── classifyDirection ───────────────────────────────────────

describe('classifyDirection', () => {
  it('positive rate above threshold → improving', () => {
    expect(classifyDirection(2.5)).toBe('improving');
  });

  it('negative rate below threshold → declining', () => {
    expect(classifyDirection(-3.0)).toBe('declining');
  });

  it('rate within threshold → stable', () => {
    expect(classifyDirection(0.5)).toBe('stable');
    expect(classifyDirection(-0.8)).toBe('stable');
    expect(classifyDirection(0)).toBe('stable');
  });

  it('custom threshold works', () => {
    expect(classifyDirection(1.5, 2.0)).toBe('stable');
    expect(classifyDirection(2.5, 2.0)).toBe('improving');
  });
});

// ─── analyzeTrend ────────────────────────────────────────────

describe('analyzeTrend', () => {
  it('increasing series → direction improving', () => {
    const values = Array.from({ length: 30 }, (_, i) => 70 + i);
    const result = analyzeTrend(values);
    expect(result.direction).toBe('improving');
    expect(result.rateOfChange).toBeGreaterThan(0);
    expect(result.currentValue).toBe(99);
    expect(result.periodStartValue).toBe(70);
  });

  it('flat series → direction stable', () => {
    const values = Array.from({ length: 30 }, () => 85);
    const result = analyzeTrend(values);
    expect(result.direction).toBe('stable');
    expect(result.rateOfChange).toBe(0);
    expect(result.periodDelta).toBe(0);
  });

  it('decreasing series → direction declining', () => {
    const values = Array.from({ length: 30 }, (_, i) => 90 - i);
    const result = analyzeTrend(values);
    expect(result.direction).toBe('declining');
    expect(result.rateOfChange).toBeLessThan(0);
  });

  it('computes correct summary stats', () => {
    const values = [80, 82, 84, 86, 88];
    const result = analyzeTrend(values);
    expect(result.minValue).toBe(80);
    expect(result.maxValue).toBe(88);
    expect(result.avgValue).toBe(84);
    expect(result.periodDelta).toBe(8);
  });

  it('empty array → stable with zeros', () => {
    const result = analyzeTrend([]);
    expect(result.direction).toBe('stable');
    expect(result.currentValue).toBe(0);
    expect(result.rateOfChange).toBe(0);
  });

  it('single value → stable with that value', () => {
    const result = analyzeTrend([75]);
    expect(result.direction).toBe('stable');
    expect(result.currentValue).toBe(75);
    expect(result.periodDelta).toBe(0);
  });

  it('computes volatility for noisy data', () => {
    const values = [80, 85, 78, 88, 76, 90];
    const result = analyzeTrend(values);
    expect(result.volatility).toBeGreaterThan(0);
  });
});

// ─── filterByPeriod ──────────────────────────────────────────

describe('filterByPeriod', () => {
  const data = Array.from({ length: 90 }, (_, i) => ({ day: i }));

  it('returns last 30 items for 30d', () => {
    const result = filterByPeriod(data, '30d');
    expect(result).toHaveLength(30);
    expect(result[0].day).toBe(60);
    expect(result[29].day).toBe(89);
  });

  it('returns last 60 items for 60d', () => {
    const result = filterByPeriod(data, '60d');
    expect(result).toHaveLength(60);
    expect(result[0].day).toBe(30);
  });

  it('returns all data if fewer than requested', () => {
    const small = [{ day: 1 }, { day: 2 }];
    const result = filterByPeriod(small, '90d');
    expect(result).toHaveLength(2);
  });
});

// ─── detectThresholdCrossings ────────────────────────────────

describe('detectThresholdCrossings', () => {
  it('detects crossing above threshold', () => {
    const data = [
      { date: '2026-01-01', value: 73 },
      { date: '2026-01-02', value: 76 },
    ];
    const crossings = detectThresholdCrossings(data, [75]);
    expect(crossings).toHaveLength(1);
    expect(crossings[0].direction).toBe('crossed_above');
    expect(crossings[0].threshold).toBe(75);
  });

  it('detects crossing below threshold', () => {
    const data = [
      { date: '2026-01-01', value: 92 },
      { date: '2026-01-02', value: 88 },
    ];
    const crossings = detectThresholdCrossings(data, [90]);
    expect(crossings).toHaveLength(1);
    expect(crossings[0].direction).toBe('crossed_below');
  });

  it('returns empty for no crossings', () => {
    const data = [
      { date: '2026-01-01', value: 85 },
      { date: '2026-01-02', value: 86 },
    ];
    const crossings = detectThresholdCrossings(data, [75, 90]);
    expect(crossings).toHaveLength(0);
  });

  it('detects multiple threshold crossings', () => {
    const data = [
      { date: '2026-01-01', value: 55 },
      { date: '2026-01-02', value: 65 },
      { date: '2026-01-03', value: 80 },
    ];
    const crossings = detectThresholdCrossings(data, [60, 75]);
    expect(crossings).toHaveLength(2);
  });
});

// ─── computeDelta ────────────────────────────────────────────

describe('computeDelta', () => {
  const data = [
    { date: '2026-01-01', value: 80 },
    { date: '2026-01-02', value: 82 },
    { date: '2026-01-03', value: 85 },
    { date: '2026-01-04', value: 83 },
    { date: '2026-01-05', value: 87 },
  ];

  it('computes correct delta', () => {
    const result = computeDelta(data, 3);
    expect(result).not.toBeNull();
    expect(result!.current).toBe(87);
    expect(result!.previous).toBe(82);
    expect(result!.delta).toBe(5);
  });

  it('returns null for insufficient data', () => {
    expect(computeDelta(data, 10)).toBeNull();
    expect(computeDelta([], 1)).toBeNull();
    expect(computeDelta([{ date: '2026-01-01', value: 80 }], 1)).toBeNull();
  });
});

// ─── comparePeriods ──────────────────────────────────────────

describe('comparePeriods', () => {
  const data = Array.from({ length: 60 }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    value: 70 + i * 0.5,
  }));

  it('compares current vs previous period', () => {
    const result = comparePeriods(data, 30, 30);
    expect(result).not.toBeNull();
    expect(result!.current).toBeGreaterThan(result!.previous);
    expect(result!.delta).toBeGreaterThan(0);
    expect(result!.direction).toBe('improving');
  });

  it('returns null for insufficient data', () => {
    const small = [{ date: '2026-01-01', value: 80 }];
    expect(comparePeriods(small, 30, 30)).toBeNull();
  });
});
