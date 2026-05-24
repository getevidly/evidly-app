/**
 * useHistoryPeriodSummary.ts
 *
 * Pure computation hook — derives period summary stats from filtered
 * history readings. No Supabase queries.
 */

import { useMemo } from 'react';
import type { TempCheckCompletion } from '../../pages/TempLogs';

export interface HistoryPeriodSummary {
  totalReadings: number;
  inRangeCount: number;
  inRangePct: number;
  failedCount: number;
  failedWithCA: number;
  failedWithoutCA: number;
  gapCount: number;
}

export function useHistoryPeriodSummary(
  filteredHistory: TempCheckCompletion[],
  gapCount: number,
): HistoryPeriodSummary {
  return useMemo(() => {
    const totalReadings = filteredHistory.length;
    const inRangeCount = filteredHistory.filter(h => h.is_within_range).length;
    const inRangePct = totalReadings > 0 ? Math.round((inRangeCount / totalReadings) * 100) : 0;
    const failedCount = totalReadings - inRangeCount;
    const failedWithCA = filteredHistory.filter(h => !h.is_within_range && h.corrective_action).length;
    const failedWithoutCA = failedCount - failedWithCA;

    return {
      totalReadings,
      inRangeCount,
      inRangePct,
      failedCount,
      failedWithCA,
      failedWithoutCA,
      gapCount,
    };
  }, [filteredHistory, gapCount]);
}
