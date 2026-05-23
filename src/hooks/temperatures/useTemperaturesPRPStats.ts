/**
 * useTemperaturesPRPStats.ts
 *
 * Pure computation hook — derives PRP signal counts from the existing
 * CurrentReadingsSummary (failing, overdue, inRange, totalUnits) plus the
 * drift detection count. No additional Supabase queries.
 *
 * PREDICT = failing + overdue + drifting
 * REDUCE  = hardcoded "Exposure pending" (no data needed)
 * PROVE   = inRange / totalUnits
 */

import { useMemo } from 'react';
import type { CurrentReadingsSummary } from '../useCurrentReadingsSummary';

export interface TemperaturesPRPStats {
  predictCount: number;
  failingCount: number;
  overdueCount: number;
  driftingCount: number;
  proveInRange: number;
  proveTotal: number;
  foodHeldCount: number;
}

export function useTemperaturesPRPStats(
  summary: CurrentReadingsSummary,
  driftingCount: number,
): TemperaturesPRPStats {
  return useMemo(() => ({
    predictCount: summary.failing + summary.overdue + driftingCount,
    failingCount: summary.failing,
    overdueCount: summary.overdue,
    driftingCount,
    proveInRange: summary.inRange,
    proveTotal: summary.totalUnits,
    foodHeldCount: summary.totalFoodHeld,
  }), [summary, driftingCount]);
}
