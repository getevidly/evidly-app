import { useMemo } from 'react';
import type { RecurringPattern } from './useRecurringPatterns';

/**
 * Minimal incident shape needed for PRP signal calculations.
 * Satisfies the Incident interface defined in IncidentLog.tsx.
 */
export interface IncidentForPRP {
  id: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  resolutionSummary?: string | null;
  resolutionPhotos?: { url?: string }[] | null;
}

export interface IncidentsPRPStats {
  predictCount: number;
  agingCount: number;
  patternCount: number;
  agingIncidentIds: Set<string>;
  proveCount: number;
  proveTotal: number;
}

const MS_24H = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = ['open', 'reported', 'assigned', 'investigating', 'in_progress'];

/**
 * Returns the start of the current ISO week (Monday 00:00).
 */
function getWeekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // JS day: 0=Sun,1=Mon,...6=Sat → offset to Monday
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Computes PRP signal stats from the incidents array.
 *
 * Predict = aging incidents (open + age > 24h) + distinct recurring patterns
 * Prove = resolved this week with documentation proof
 *         (resolutionSummary non-null OR resolutionPhotos.length > 0)
 */
export function useIncidentsPRPStats(
  incidents: IncidentForPRP[],
  recurringPatterns: RecurringPattern[]
): IncidentsPRPStats {
  return useMemo(() => {
    const now = Date.now();
    const weekStart = getWeekStart().getTime();

    // Aging: open incidents older than 24h
    const agingIncidentIds = new Set<string>();
    for (const inc of incidents) {
      if (!OPEN_STATUSES.includes(inc.status)) continue;
      const age = now - new Date(inc.createdAt).getTime();
      if (age > MS_24H) {
        agingIncidentIds.add(inc.id);
      }
    }

    const agingCount = agingIncidentIds.size;
    const patternCount = recurringPatterns.length;
    const predictCount = agingCount + patternCount;

    // Prove: resolved this week with documentation
    let proveCount = 0;
    let proveTotal = 0;

    for (const inc of incidents) {
      if (inc.status !== 'resolved' && inc.status !== 'verified') continue;
      if (!inc.resolvedAt) continue;
      const resolvedMs = new Date(inc.resolvedAt).getTime();
      if (resolvedMs < weekStart) continue;

      proveTotal++;

      const hasNotes = !!inc.resolutionSummary;
      const hasPhotos =
        Array.isArray(inc.resolutionPhotos) && inc.resolutionPhotos.length > 0;
      if (hasNotes || hasPhotos) {
        proveCount++;
      }
    }

    return {
      predictCount,
      agingCount,
      patternCount,
      agingIncidentIds,
      proveCount,
      proveTotal,
    };
  }, [incidents, recurringPatterns]);
}
