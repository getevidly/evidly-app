/**
 * useCoverageGaps.ts
 *
 * Detects coverage gaps by walking the EXPECTED reading schedule across
 * the filter window, not by iterating between actual readings.
 *
 * For each qualifying equipment unit (holding 240min / storage 480min),
 * divides the filter window into expected check intervals, then checks
 * whether each interval contains at least one reading. Contiguous missed
 * intervals are consolidated into a single gap record.
 *
 * Handles all three edge cases:
 *   (a) Gap at start — first expected window has no readings
 *   (b) Gap at end   — last expected window(s) have no readings
 *   (c) Zero readings — entire window is one consolidated gap
 *
 * TODO: Filter expected_windows by active shift schedule when shift data
 * is available. Currently counts all expected windows in the filter range.
 */

import { useMemo } from 'react';
import { isHoldingEquipment, isStorageEquipment } from '../../lib/equipmentHelpers';
import { TEMP_CHECK_INTERVALS } from '../../config/tempConfig';
import type { TempCheckCompletion, TemperatureEquipment } from '../../pages/TempLogs';

export interface CoverageGap {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  gapStartTime: string;
  gapEndTime: string;
  gapMinutes: number;
  expectedIntervalMinutes: number;
}

function getExpectedInterval(equipmentType: string): number | null {
  if (isHoldingEquipment(equipmentType)) {
    return TEMP_CHECK_INTERVALS.HOT_HOLDING_OVERDUE_MINUTES;
  }
  if (isStorageEquipment(equipmentType)) {
    return TEMP_CHECK_INTERVALS.EQUIPMENT_CHECK_OVERDUE_MINUTES;
  }
  return null;
}

export function useCoverageGaps(
  filteredHistory: TempCheckCompletion[],
  equipment: TemperatureEquipment[],
  filterWindowStart: Date,
  filterWindowEnd: Date,
): CoverageGap[] {
  return useMemo(() => {
    const gaps: CoverageGap[] = [];
    const windowStartMs = filterWindowStart.getTime();
    const windowEndMs = filterWindowEnd.getTime();

    if (windowEndMs <= windowStartMs) return gaps;

    // Only evaluate holding and storage equipment
    const qualifyingEquipment = equipment.filter(
      eq => isHoldingEquipment(eq.equipment_type) || isStorageEquipment(eq.equipment_type),
    );

    for (const eq of qualifyingEquipment) {
      const intervalMinutes = getExpectedInterval(eq.equipment_type);
      if (intervalMinutes === null) continue;
      const intervalMs = intervalMinutes * 60_000;

      // Get this equipment's readings sorted chronologically
      const readingTimestamps = filteredHistory
        .filter(h => h.equipment_id === eq.id)
        .map(h => new Date(h.created_at).getTime())
        .sort((a, b) => a - b);

      // Build expected windows and check each for readings
      // Track contiguous missed windows for consolidation
      let gapContigStart: number | null = null;
      let gapContigEnd: number | null = null;

      let cursor = windowStartMs;
      while (cursor < windowEndMs) {
        const windowEnd = Math.min(cursor + intervalMs, windowEndMs);

        // Check if any reading falls within [cursor, windowEnd)
        const hasReading = readingTimestamps.some(
          ts => ts >= cursor && ts < windowEnd,
        );

        if (!hasReading) {
          // Extend or start a contiguous gap
          if (gapContigStart === null) {
            gapContigStart = cursor;
          }
          gapContigEnd = windowEnd;
        } else {
          // Flush any accumulated contiguous gap
          if (gapContigStart !== null && gapContigEnd !== null) {
            const gapMinutes = Math.round((gapContigEnd - gapContigStart) / 60_000);
            gaps.push({
              equipmentId: eq.id,
              equipmentName: eq.name,
              equipmentType: eq.equipment_type,
              gapStartTime: new Date(gapContigStart).toISOString(),
              gapEndTime: new Date(gapContigEnd).toISOString(),
              gapMinutes,
              expectedIntervalMinutes: intervalMinutes,
            });
            gapContigStart = null;
            gapContigEnd = null;
          }
        }

        cursor = windowEnd;
      }

      // Flush trailing contiguous gap (covers end-of-range case)
      if (gapContigStart !== null && gapContigEnd !== null) {
        const gapMinutes = Math.round((gapContigEnd - gapContigStart) / 60_000);
        gaps.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          equipmentType: eq.equipment_type,
          gapStartTime: new Date(gapContigStart).toISOString(),
          gapEndTime: new Date(gapContigEnd).toISOString(),
          gapMinutes,
          expectedIntervalMinutes: intervalMinutes,
        });
      }
    }

    // Sort by gap duration descending
    gaps.sort((a, b) => b.gapMinutes - a.gapMinutes);
    return gaps;
  }, [filteredHistory, equipment, filterWindowStart, filterWindowEnd]);
}
