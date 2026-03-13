/**
 * useAvailability — API hooks for weekly availability submission system.
 * All hooks return empty data until Supabase tables are populated.
 */
import { useMemo } from 'react';
import { useApiQuery, useApiMutation } from './useApiQuery';

// ── Types ──────────────────────────────────────────────────

export type SubmissionStatus = 'pending' | 'submitted' | 'late' | 'approved' | 'rejected';

export interface DayAvailability {
  date: string;            // YYYY-MM-DD
  dayOfWeek: string;       // 'monday' | 'tuesday' | ...
  available: boolean;
  startTime: string | null; // HH:mm
  endTime: string | null;   // HH:mm
  notes: string | null;
}

export interface AvailabilitySubmission {
  id: string;
  vendorId: string;
  employeeId: string;
  employeeName: string;
  weekStart: string;        // YYYY-MM-DD (Monday)
  submittedAt: string | null;
  status: SubmissionStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  preferredAreas: string | null;
  notes: string | null;
  days: DayAvailability[];
  createdAt: string;
}

export interface SubmitAvailabilityInput {
  weekStart: string;
  days: {
    date: string;
    available: boolean;
    startTime?: string;
    endTime?: string;
    notes?: string;
  }[];
  preferredAreas?: string;
  notes?: string;
}

export interface ApproveInput {
  submissionId: string;
}

export interface RejectInput {
  submissionId: string;
  reason: string;
}

export interface DeadlineInfo {
  deadlineDate: Date;
  isBeforeDeadline: boolean;
  hoursRemaining: number;
  urgency: 'green' | 'yellow' | 'orange' | 'red';
}

// ── Helpers ────────────────────────────────────────────────

/** Get Monday of next week */
function getNextMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMon = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMon);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Get Thursday 2 PM PT deadline for next week's availability */
function getDeadline(): Date {
  const nextMon = getNextMonday();
  // Deadline is Thursday before that Monday = 4 days before
  const deadline = new Date(nextMon);
  deadline.setDate(deadline.getDate() - 4); // Thursday of current week
  deadline.setHours(14, 0, 0, 0); // 2 PM
  return deadline;
}

/** Get Mon-Sun date strings for next week */
function getNextWeekDateStrings(): string[] {
  const mon = getNextMonday();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

// ── Query hooks ────────────────────────────────────────────

/** Get current user's submission for a given week */
export function useAvailabilitySubmission(weekStart?: string) {
  return useApiQuery<AvailabilitySubmission | null>(
    ['availability-submission', weekStart],
    async () => null,
    { enabled: !!weekStart },
  );
}

/** Get team availability for a given week (supervisor+) */
export function useTeamAvailability(weekStart?: string) {
  return useApiQuery<AvailabilitySubmission[]>(
    ['team-availability', weekStart],
    async () => [],
    { enabled: !!weekStart },
  );
}

/** Get late submissions needing approval (supervisor+) */
export function usePendingApprovals() {
  return useApiQuery<AvailabilitySubmission[]>(
    ['availability-pending-approvals'],
    async () => [],
  );
}

// ── Mutation hooks ─────────────────────────────────────────

export function useSubmitAvailability() {
  return useApiMutation<AvailabilitySubmission, SubmitAvailabilityInput>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['availability-submission'], ['team-availability']] },
  );
}

export function useUpdateAvailability() {
  return useApiMutation<AvailabilitySubmission, { id: string } & Partial<SubmitAvailabilityInput>>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['availability-submission'], ['team-availability']] },
  );
}

export function useApproveAvailability() {
  return useApiMutation<AvailabilitySubmission, ApproveInput>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['availability-pending-approvals'], ['team-availability']] },
  );
}

export function useRejectAvailability() {
  return useApiMutation<AvailabilitySubmission, RejectInput>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['availability-pending-approvals'], ['team-availability']] },
  );
}

// ── Derived / Helper hooks ─────────────────────────────────

/** Deadline info for the current submission cycle */
export function useAvailabilityDeadline(): DeadlineInfo {
  return useMemo(() => {
    const deadline = getDeadline();
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hoursRemaining = diff / 3600000;

    let urgency: DeadlineInfo['urgency'] = 'green';
    if (hoursRemaining <= 0) urgency = 'red';
    else if (hoursRemaining <= 1) urgency = 'orange';
    else if (hoursRemaining <= 24) urgency = 'yellow';

    return {
      deadlineDate: deadline,
      isBeforeDeadline: diff > 0,
      hoursRemaining: Math.max(0, hoursRemaining),
      urgency,
    };
  }, []);
}

/** Boolean: is current time before the Thursday 2 PM deadline? */
export function useIsBeforeDeadline(): boolean {
  const { isBeforeDeadline } = useAvailabilityDeadline();
  return isBeforeDeadline;
}

/** Mon-Sun date strings for next week */
export function useNextWeekDates(): { dates: string[]; dayNames: typeof DAY_NAMES; weekStart: string } {
  return useMemo(() => {
    const dates = getNextWeekDateStrings();
    return { dates, dayNames: DAY_NAMES, weekStart: dates[0] };
  }, []);
}
