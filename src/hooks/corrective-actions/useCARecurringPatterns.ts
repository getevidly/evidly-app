import { useMemo } from 'react';

/**
 * Minimal CA shape needed for recurring pattern detection.
 */
export interface CAForPattern {
  id: string;
  category: string;
  location: string;
  rootCause: string;
  status: string;
  resolvedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface CARecurringPattern {
  patternId: string;
  category: string;
  rootCause: string | null;
  location: string | null;
  actionIds: string[];
  count30d: number;
  recentClosures: { id: string; date: string }[];
}

const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;
const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;
const CLOSED_STATUSES = ['resolved', 'verified'];

/**
 * Detects recurring corrective action patterns.
 *
 * Grouping logic:
 * 1. If rootCause is non-empty and not 'unknown', group by rootCause.
 * 2. Otherwise, fall back to category + location grouping.
 *
 * A pattern qualifies when at least one closed member exists within
 * the last 90 days. count30d = members created within last 30 days.
 */
export function useCARecurringPatterns(actions: CAForPattern[]): CARecurringPattern[] {
  return useMemo(() => {
    const now = Date.now();
    const cutoff90d = now - MS_90_DAYS;
    const cutoff30d = now - MS_30_DAYS;

    const groups = new Map<string, CAForPattern[]>();

    for (const ca of actions) {
      const hasRootCause = ca.rootCause && ca.rootCause.trim() !== '' && ca.rootCause !== 'unknown';
      const key = hasRootCause
        ? `rc:${ca.rootCause}`
        : `cl:${ca.category}::${ca.location}`;

      const list = groups.get(key) ?? [];
      list.push(ca);
      groups.set(key, list);
    }

    const patterns: CARecurringPattern[] = [];

    for (const [key, members] of groups) {
      if (members.length < 2) continue;

      const recentClosures = members.filter((m) => {
        if (!CLOSED_STATUSES.includes(m.status)) return false;
        const closedDate = m.verifiedAt || m.resolvedAt;
        if (!closedDate) return false;
        return new Date(closedDate).getTime() >= cutoff90d;
      });

      if (recentClosures.length === 0) continue;

      const isRootCauseKey = key.startsWith('rc:');
      const rootCause = isRootCauseKey ? key.slice(3) : null;
      const category = members[0].category;
      const location = isRootCauseKey ? null : members[0].location;

      const count30d = members.filter(
        (m) => new Date(m.createdAt).getTime() >= cutoff30d
      ).length;

      patterns.push({
        patternId: key,
        category,
        rootCause,
        location,
        actionIds: members.map((m) => m.id),
        count30d,
        recentClosures: recentClosures
          .sort((a, b) => {
            const dateA = new Date(a.verifiedAt || a.resolvedAt!).getTime();
            const dateB = new Date(b.verifiedAt || b.resolvedAt!).getTime();
            return dateB - dateA;
          })
          .slice(0, 3)
          .map((m) => ({ id: m.id, date: (m.verifiedAt || m.resolvedAt)! })),
      });
    }

    patterns.sort((a, b) => b.count30d - a.count30d);

    return patterns;
  }, [actions]);
}
