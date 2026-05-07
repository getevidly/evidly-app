/**
 * Reschedule notice utilities.
 *
 * Powers the Request Reschedule modal: computes required notice from
 * cascading org/vendor/service-type minimums and validates whether a
 * proposed reschedule date provides sufficient business-day notice.
 */

/**
 * Resolve required notice days using cascading priority — biggest wins.
 *
 * Priority order: org default → vendor minimum → service-type minimum.
 * Whichever is largest is the required notice (most-restrictive wins).
 * Null/undefined values are treated as 0.
 */
export function calculateNoticeDays(
  orgDefault: number | null | undefined,
  vendorMin: number | null | undefined,
  serviceTypeMin: number | null | undefined,
): number {
  return Math.max(orgDefault ?? 0, vendorMin ?? 0, serviceTypeMin ?? 0);
}

/**
 * Count business days (Mon–Fri) between two dates.
 *
 * Start is exclusive, end is inclusive. Weekends are excluded.
 * No holiday calendar — out of scope.
 *
 * Returns 0 if end <= start.
 */
export function businessDaysBetween(start: Date, end: Date): number {
  if (end.getTime() <= start.getTime()) return 0;

  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

/**
 * Validate whether a requested reschedule date provides sufficient business-day notice.
 *
 * Returns true if the request meets the notice threshold (modal allows submission).
 * Returns false if below threshold (modal disables button + shows amber warning).
 */
export function isWithinNoticeWindow(
  today: Date,
  requestedDate: Date,
  requiredNoticeDays: number,
): boolean {
  return businessDaysBetween(today, requestedDate) >= requiredNoticeDays;
}
