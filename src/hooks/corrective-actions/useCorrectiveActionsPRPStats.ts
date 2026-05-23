import { useMemo } from 'react';
import type { CARecurringPattern } from './useCARecurringPatterns';

/**
 * Minimal CA shape needed for PRP signal calculations.
 */
export interface CAForPRP {
  id: string;
  status: string;
  createdAt: string;
  dueDate: string;
  assignee: string;
  resolvedAt: string | null;
  verifiedAt: string | null;
  verification_note: string | null;
  resolution_note: string | null;
}

export interface CAPRPStats {
  predictCount: number;
  overdueCount: number;
  dueSoonCount: number;
  unassignedOpenCount: number;
  patternCount: number;
  overdueIds: Set<string>;
  dueSoonIds: Set<string>;
  proveCount: number;
  proveTotal: number;
}

const MS_48H = 48 * 60 * 60 * 1000;
const OPEN_STATUSES = ['reported', 'assigned', 'in_progress'];

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
 * Computes PRP signal stats from the corrective actions array.
 *
 * Predict = overdue actions + actions due within 48h + distinct recurring patterns
 * Prove = actions verified this week with documentation
 *         (verification_note or resolution_note non-null)
 */
export function useCorrectiveActionsPRPStats(
  actions: CAForPRP[],
  recurringPatterns: CARecurringPattern[]
): CAPRPStats {
  return useMemo(() => {
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const weekStart = getWeekStart().getTime();

    const overdueIds = new Set<string>();
    const dueSoonIds = new Set<string>();
    let unassignedOpenCount = 0;

    for (const ca of actions) {
      if (!OPEN_STATUSES.includes(ca.status)) continue;

      // Overdue: open + due date before today
      if (ca.dueDate < todayStr) {
        overdueIds.add(ca.id);
      }

      // Due soon: open + due within 48h (but not overdue)
      const dueMs = new Date(ca.dueDate + 'T23:59:59').getTime();
      if (dueMs >= now && dueMs - now <= MS_48H) {
        dueSoonIds.add(ca.id);
      }

      // Unassigned open
      if (!ca.assignee || ca.assignee.trim() === '') {
        unassignedOpenCount++;
      }
    }

    const overdueCount = overdueIds.size;
    const dueSoonCount = dueSoonIds.size;
    const patternCount = recurringPatterns.length;
    const predictCount = overdueCount + dueSoonCount + patternCount;

    // Prove: verified this week with documentation
    let proveCount = 0;
    let proveTotal = 0;

    for (const ca of actions) {
      if (ca.status !== 'verified') continue;
      if (!ca.verifiedAt) continue;
      const verifiedMs = new Date(ca.verifiedAt).getTime();
      if (verifiedMs < weekStart) continue;

      proveTotal++;

      const hasVerificationNote = !!ca.verification_note;
      const hasResolutionNote = !!ca.resolution_note;
      if (hasVerificationNote || hasResolutionNote) {
        proveCount++;
      }
    }

    return {
      predictCount,
      overdueCount,
      dueSoonCount,
      unassignedOpenCount,
      patternCount,
      overdueIds,
      dueSoonIds,
      proveCount,
      proveTotal,
    };
  }, [actions, recurringPatterns]);
}
