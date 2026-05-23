import { useMemo } from 'react';

export interface DefForPattern {
  id: string;
  code: string;
  category: string;
  status: string;
  foundBy: string;
  foundDate: string;
  resolvedAt: string | null;
}

export interface DefRecurringPattern {
  patternId: string;
  code: string;
  category: string;
  deficiencyIds: string[];
  count30d: number;
  inspectorNames: string[];
  recentClosures: { id: string; date: string }[];
}

const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;
const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

/**
 * Detects recurring deficiency patterns by grouping on code citation.
 *
 * A pattern qualifies when the same code appears in ≥2 deficiencies
 * and at least one member is resolved within the last 90 days.
 */
export function useDeficiencyRecurringPatterns(
  deficiencies: DefForPattern[]
): DefRecurringPattern[] {
  return useMemo(() => {
    const now = Date.now();
    const cutoff90d = now - MS_90_DAYS;
    const cutoff30d = now - MS_30_DAYS;

    const groups = new Map<string, DefForPattern[]>();

    for (const d of deficiencies) {
      const list = groups.get(d.code) ?? [];
      list.push(d);
      groups.set(d.code, list);
    }

    const patterns: DefRecurringPattern[] = [];

    for (const [code, members] of groups) {
      if (members.length < 2) continue;

      const recentClosures = members.filter(
        (m) =>
          m.status === 'resolved' &&
          m.resolvedAt &&
          new Date(m.resolvedAt).getTime() >= cutoff90d
      );

      if (recentClosures.length === 0) continue;

      const count30d = members.filter(
        (m) => new Date(m.foundDate).getTime() >= cutoff30d
      ).length;

      const inspectorSet = new Set<string>();
      for (const m of members) {
        if (m.foundBy) inspectorSet.add(m.foundBy);
      }

      patterns.push({
        patternId: code,
        code,
        category: members[0].category,
        deficiencyIds: members.map((m) => m.id),
        count30d,
        inspectorNames: Array.from(inspectorSet),
        recentClosures: recentClosures
          .sort(
            (a, b) =>
              new Date(b.resolvedAt!).getTime() -
              new Date(a.resolvedAt!).getTime()
          )
          .slice(0, 3)
          .map((m) => ({ id: m.id, date: m.resolvedAt! })),
      });
    }

    patterns.sort((a, b) => b.count30d - a.count30d);

    return patterns;
  }, [deficiencies]);
}
