import { useMemo } from 'react';

/**
 * Minimal incident shape needed for recurring pattern detection.
 * Satisfies the Incident interface defined in IncidentLog.tsx.
 */
export interface IncidentForPattern {
  id: string;
  category: string;
  location: string;
  rootCause?: string | null;
  status: string;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface RecurringPattern {
  patternId: string;
  category: string;
  rootCause: string | null;
  location: string | null;
  incidentIds: string[];
  count30d: number;
  recentResolutions: { id: string; date: string }[];
}

const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;
const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;
const CLOSED_STATUSES = ['resolved', 'verified'];

/**
 * Detects recurring incident patterns from the incidents array.
 *
 * Grouping logic:
 * 1. If rootCause is non-null and not 'unknown', group by rootCause.
 * 2. Otherwise, fall back to category + location grouping.
 *
 * A pattern qualifies when at least one resolved member exists within
 * the last 90 days. count30d = members created within last 30 days.
 *
 * TODO: Enhanced pattern detection once data model supports
 * structured root-cause taxonomy or linked CA chains.
 */
export function useRecurringPatterns(incidents: IncidentForPattern[]): RecurringPattern[] {
  return useMemo(() => {
    const now = Date.now();
    const cutoff90d = now - MS_90_DAYS;
    const cutoff30d = now - MS_30_DAYS;

    // Build groups keyed by rootCause or category+location
    const groups = new Map<string, IncidentForPattern[]>();

    for (const inc of incidents) {
      const hasRootCause = inc.rootCause && inc.rootCause !== 'unknown';
      const key = hasRootCause
        ? `rc:${inc.rootCause}`
        : `cl:${inc.category}::${inc.location}`;

      const list = groups.get(key) ?? [];
      list.push(inc);
      groups.set(key, list);
    }

    const patterns: RecurringPattern[] = [];

    for (const [key, members] of groups) {
      // Need at least 2 incidents to form a pattern
      if (members.length < 2) continue;

      // Check for at least one resolved member within 90 days
      const recentResolutions = members.filter(
        (m) =>
          CLOSED_STATUSES.includes(m.status) &&
          m.resolvedAt &&
          new Date(m.resolvedAt).getTime() >= cutoff90d
      );

      if (recentResolutions.length === 0) continue;

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
        incidentIds: members.map((m) => m.id),
        count30d,
        recentResolutions: recentResolutions
          .sort(
            (a, b) =>
              new Date(b.resolvedAt!).getTime() -
              new Date(a.resolvedAt!).getTime()
          )
          .slice(0, 3)
          .map((m) => ({ id: m.id, date: m.resolvedAt! })),
      });
    }

    // Sort by count30d descending (most active patterns first)
    patterns.sort((a, b) => b.count30d - a.count30d);

    return patterns;
  }, [incidents]);
}
