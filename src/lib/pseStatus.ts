/**
 * PSE (Pillar-Specific Element) compliance status calculator.
 *
 * Powers the PSE Alert Banner on dashboard + fire safety overview.
 * Three states reflect how far past due a service is, in calendar-month terms.
 */

export type PSEStatus = 'current' | 'overdue' | 'at_risk';

/**
 * Calculate PSE compliance status from a next-due date.
 *
 * - 'current'  — today is before nextDue
 * - 'overdue'  — today is on or past nextDue, but still in the same calendar month as nextDue
 * - 'at_risk'  — today's calendar month is at least one month past nextDue's calendar month
 *
 * Calendar-month boundaries are computed in UTC. Callers that need kitchen-local
 * month boundaries (e.g. for users west of UTC checking the dashboard near midnight)
 * should pre-normalize dates via canonicalTime.ts before passing them in.
 *
 * @param nextDue The service's scheduled next-due date.
 * @param today   Optional reference date (defaults to now). Test injection point.
 */
export function calculatePSEStatus(nextDue: Date, today: Date = new Date()): PSEStatus {
  if (today.getTime() < nextDue.getTime()) {
    return 'current';
  }

  const todayMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const oneMonthAfterDue = new Date(Date.UTC(nextDue.getUTCFullYear(), nextDue.getUTCMonth() + 1, 1));

  if (todayMonthStart.getTime() >= oneMonthAfterDue.getTime()) {
    return 'at_risk';
  }

  return 'overdue';
}
