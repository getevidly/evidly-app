/**
 * weeklyTarget — shared helpers for per-week cadence overrides.
 *
 * Used by ChannelCadences (editor), StartToday, and AdherenceCards.
 */

/** Number of future weeks shown in the weekly schedule editor. */
export const SCHEDULE_WEEKS = 8;

/**
 * Returns the Monday (ISO yyyy-mm-dd) of the week containing `d`.
 * Week starts Monday, matching StartToday's per_week window.
 */
export function mondayOf(d: Date): string {
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  dt.setDate(dt.getDate() + diff);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Resolves the effective target for a given week.
 * Returns the override if one exists for `weekStart`, otherwise the baseline.
 *
 * @param baseline  The channel's default target_count (may be null / "not set").
 * @param overrides Map of Monday yyyy-mm-dd → override target_count.
 * @param weekStart The Monday to resolve.
 */
export function targetForWeek(
  baseline: number | null,
  overrides: Record<string, number>,
  weekStart: string,
): number | null {
  if (weekStart in overrides) return overrides[weekStart];
  return baseline;
}
