// generate-weekly-drift-report — timezone helpers
// Monday 7 AM detection and week boundary calculation in org-local time.

/**
 * Check if the current UTC time corresponds to Monday 7 AM in the given timezone.
 * pg_cron fires every hour on the hour — exactly one UTC hour per timezone
 * maps to Monday 7:xx.
 */
export function isMondaySevenAm(orgTimezone: string, now: Date): boolean {
  const parts = getLocalParts(orgTimezone, now);
  return parts.dayOfWeek === 1 && parts.hour === 7;
}

/**
 * Get prior week boundaries (Monday–Sunday) in the org's timezone.
 * If today is Monday 2026-05-25, returns:
 *   weekStart = '2026-05-18' (prior Monday)
 *   weekEnd   = '2026-05-24' (prior Sunday)
 */
export function getPriorWeekBounds(
  orgTimezone: string,
  now: Date,
): { weekStart: string; weekEnd: string } {
  const parts = getLocalParts(orgTimezone, now);
  // today is Monday (dayOfWeek=1), so prior Monday = 7 days ago
  const todayLocal = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  );
  const priorMonday = new Date(todayLocal.getTime() - 7 * 86400000);
  const priorSunday = new Date(todayLocal.getTime() - 1 * 86400000);
  return {
    weekStart: formatDate(priorMonday),
    weekEnd: formatDate(priorSunday),
  };
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getLocalParts(
  tz: string,
  now: Date,
): { year: number; month: number; day: number; hour: number; dayOfWeek: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    dayOfWeek: dayMap[get('weekday')] ?? -1,
  };
}
