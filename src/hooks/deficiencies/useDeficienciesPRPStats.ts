import { useMemo } from 'react';
import type { DefRecurringPattern } from './useDeficiencyRecurringPatterns';

export interface DefForPRP {
  id: string;
  status: string;
  foundDate: string;
  resolvedAt: string | null;
  timelineRequirement: string;
}

export interface DeficienciesPRPStats {
  predictCount: number;
  approachingCount: number;
  approachingIds: Set<string>;
  recurringCodeCount: number;
  proveCount: number;
  proveTotal: number;
  avgTimeToCorrect: number;
}

const MS_DAY = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = ['open', 'acknowledged', 'in_progress'];

const TIMELINE_DAYS: Record<string, number> = {
  immediate: 0,
  '30_days': 30,
  '90_days': 90,
};

/**
 * Computes an absolute correction deadline from foundDate + timeline requirement.
 * Returns null for 'next_service' (no computable deadline).
 */
function getComputedDeadline(foundDate: string, timelineReq: string): Date | null {
  const days = TIMELINE_DAYS[timelineReq];
  if (days === undefined) return null;
  const d = new Date(foundDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Returns the start of the current ISO week (Monday 00:00).
 */
function getWeekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Computes PRP signal stats for deficiencies.
 *
 * Predict = approaching correction deadline (within 7 days) + recurring code count
 * Prove = resolved this week + avg time to correct
 */
export function useDeficienciesPRPStats(
  deficiencies: DefForPRP[],
  recurringPatterns: DefRecurringPattern[]
): DeficienciesPRPStats {
  return useMemo(() => {
    const now = Date.now();
    const sevenDaysOut = now + 7 * MS_DAY;
    const weekStart = getWeekStart().getTime();

    const approachingIds = new Set<string>();

    for (const d of deficiencies) {
      if (!OPEN_STATUSES.includes(d.status)) continue;

      const deadline = getComputedDeadline(d.foundDate, d.timelineRequirement);
      if (!deadline) continue;

      const deadlineMs = deadline.getTime();
      // Approaching: deadline is in the future but within 7 days
      // Also include already-overdue items (deadline < now)
      if (deadlineMs <= sevenDaysOut) {
        approachingIds.add(d.id);
      }
    }

    const approachingCount = approachingIds.size;
    const recurringCodeCount = recurringPatterns.length;
    const predictCount = approachingCount + recurringCodeCount;

    // Prove: resolved this week
    let proveCount = 0;
    let proveTotal = 0;

    // Avg time to correct: across ALL resolved deficiencies
    let totalResolveDays = 0;
    let resolvedCount = 0;

    for (const d of deficiencies) {
      if (d.status !== 'resolved') continue;
      if (!d.resolvedAt) continue;

      const resolvedMs = new Date(d.resolvedAt).getTime();
      const foundMs = new Date(d.foundDate + 'T00:00:00').getTime();
      const daysDiff = (resolvedMs - foundMs) / MS_DAY;
      totalResolveDays += daysDiff;
      resolvedCount++;

      if (resolvedMs >= weekStart) {
        proveTotal++;
        // All resolved deficiencies count toward prove (they have resolution by definition)
        proveCount++;
      }
    }

    const avgTimeToCorrect =
      resolvedCount > 0
        ? Math.round((totalResolveDays / resolvedCount) * 10) / 10
        : 0;

    return {
      predictCount,
      approachingCount,
      approachingIds,
      recurringCodeCount,
      proveCount,
      proveTotal,
      avgTimeToCorrect,
    };
  }, [deficiencies, recurringPatterns]);
}
