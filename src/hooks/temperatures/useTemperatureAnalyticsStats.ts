import { useMemo } from 'react';
import { subDays } from 'date-fns';
import { isHoldingEquipment, isStorageEquipment } from '../../lib/equipmentHelpers';
import { TEMP_CHECK_INTERVALS } from '../../config/tempConfig';
import type { TempCheckCompletion, TemperatureEquipment } from '../../pages/TempLogs';

export type TrendDirection = 'up' | 'down' | 'flat' | 'no_comparison';

export interface AnalyticsStats {
  totalReadings: number;
  totalReadingsTrend: TrendDirection;
  complianceRate: number;
  complianceRateTrend: TrendDirection;
  manualCount: number;
  manualPct: number;
  sensorCount: number;
  sensorPct: number;
  gapCount: number;
  gapCountTrend: TrendDirection;
}

function computeTrend(
  current: number,
  prior: number,
  hasPriorData: boolean,
): TrendDirection {
  if (!hasPriorData) return 'no_comparison';
  if (prior === 0 && current === 0) return 'flat';
  if (prior === 0) return 'up';
  const pctChange = ((current - prior) / prior) * 100;
  if (Math.abs(pctChange) < 5) return 'flat';
  return pctChange > 0 ? 'up' : 'down';
}

function countGaps(
  readings: TempCheckCompletion[],
  equipment: TemperatureEquipment[],
  windowStart: Date,
  windowEnd: Date,
): number {
  let gaps = 0;
  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  if (windowEndMs <= windowStartMs) return 0;

  const qualifying = equipment.filter(
    eq => isHoldingEquipment(eq.equipment_type) || isStorageEquipment(eq.equipment_type),
  );

  for (const eq of qualifying) {
    const intervalMinutes = isHoldingEquipment(eq.equipment_type)
      ? TEMP_CHECK_INTERVALS.HOT_HOLDING_OVERDUE_MINUTES
      : TEMP_CHECK_INTERVALS.EQUIPMENT_CHECK_OVERDUE_MINUTES;
    const intervalMs = intervalMinutes * 60_000;

    const timestamps = readings
      .filter(h => h.equipment_id === eq.id)
      .map(h => new Date(h.created_at).getTime())
      .sort((a, b) => a - b);

    let cursor = windowStartMs;
    while (cursor < windowEndMs) {
      const end = Math.min(cursor + intervalMs, windowEndMs);
      const hasReading = timestamps.some(ts => ts >= cursor && ts < end);
      if (!hasReading) gaps++;
      cursor = end;
    }
  }

  return gaps;
}

export function useTemperatureAnalyticsStats(
  history: TempCheckCompletion[],
  equipment: TemperatureEquipment[],
  windowDays: number,
): AnalyticsStats {
  return useMemo(() => {
    const now = new Date();
    const windowStart = windowDays === 0
      ? new Date(Math.min(...history.map(h => new Date(h.created_at).getTime()), now.getTime()))
      : subDays(now, windowDays);
    const priorStart = windowDays === 0
      ? windowStart
      : subDays(windowStart, windowDays);

    // Current window
    const current = history.filter(h => new Date(h.created_at) >= windowStart);
    // Prior window (equal length, immediately before)
    const prior = windowDays === 0
      ? []
      : history.filter(h => {
          const d = new Date(h.created_at);
          return d >= priorStart && d < windowStart;
        });

    const totalReadings = current.length;
    const priorTotal = prior.length;

    const passCount = current.filter(h => h.is_within_range).length;
    const priorPassCount = prior.filter(h => h.is_within_range).length;
    const complianceRate = totalReadings > 0 ? Math.round((passCount / totalReadings) * 100) : 0;
    const priorComplianceRate = priorTotal > 0 ? Math.round((priorPassCount / priorTotal) * 100) : 0;

    const manualCount = current.filter(h => (h.input_method || 'manual') === 'manual').length;
    const sensorCount = current.filter(h => h.input_method === 'iot_sensor' || h.input_method === 'qr_scan').length;

    const hasPriorData = prior.length > 0;

    const gapCount = countGaps(current, equipment, windowStart, now);
    const priorGapCount = windowDays === 0
      ? 0
      : countGaps(prior, equipment, priorStart, windowStart);

    // For gaps, fewer is better, so invert the trend
    const gapTrendRaw = computeTrend(gapCount, priorGapCount, hasPriorData);
    const gapCountTrend: TrendDirection = gapTrendRaw === 'up' ? 'down'
      : gapTrendRaw === 'down' ? 'up'
      : gapTrendRaw;

    return {
      totalReadings,
      totalReadingsTrend: computeTrend(totalReadings, priorTotal, hasPriorData),
      complianceRate,
      complianceRateTrend: computeTrend(complianceRate, priorComplianceRate, hasPriorData),
      manualCount,
      manualPct: totalReadings > 0 ? Math.round((manualCount / totalReadings) * 100) : 0,
      sensorCount,
      sensorPct: totalReadings > 0 ? Math.round((sensorCount / totalReadings) * 100) : 0,
      gapCount,
      gapCountTrend,
    };
  }, [history, equipment, windowDays]);
}
