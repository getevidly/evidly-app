/**
 * Clock In/Out Reminders & Auto Clock-Out hooks — stubbed with empty data.
 */
import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export type ReminderType = 'clock_in' | 'clock_out' | 'auto_clockout_warning';
export type AutoClockoutReason = 'geofence_exit' | 'idle_timeout' | 'end_of_day';

export interface ClockReminder {
  id: string;
  orgId: string;
  employeeId: string;
  employeeName?: string;
  jobId: string | null;
  jobTitle?: string;
  reminderType: ReminderType;
  scheduledAt: string;
  sentAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface ClockReminderSettings {
  clockInReminderMinutes: number;
  clockOutReminderMinutes: number;
  autoClockoutEnabled: boolean;
  autoClockoutMinutes: number;
  geofenceRadiusMeters: number;
}

export interface TimecardAlteration {
  id: string;
  orgId: string;
  timeEntryId: string;
  alteredBy: string | null;
  alteredByName?: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AutoClockoutEvent {
  timeEntryId: string;
  reason: AutoClockoutReason;
}

// ── Queries ───────────────────────────────────────────────────

/** Fetch pending reminders for an employee. */
export function useClockReminders(employeeId?: string): ApiQueryResult<ClockReminder[]> {
  const queryFn = useCallback(async (): Promise<ClockReminder[]> => [], []);
  return useApiQuery(`clock-reminders-${employeeId || 'all'}`, queryFn, []);
}

/** Fetch clock reminder settings for the org. */
export function useClockReminderSettings(): ApiQueryResult<ClockReminderSettings | null> {
  const queryFn = useCallback(async (): Promise<ClockReminderSettings | null> => null, []);
  return useApiQuery('clock-reminder-settings', queryFn, null);
}

/** Fetch timecard alteration history for a time entry. */
export function useTimecardAlterations(timeEntryId?: string): ApiQueryResult<TimecardAlteration[]> {
  const queryFn = useCallback(async (): Promise<TimecardAlteration[]> => [], []);
  return useApiQuery(`timecard-alterations-${timeEntryId || 'all'}`, queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

/** Update clock reminder settings. */
export function useUpdateClockReminderSettings(): ApiMutationResult<ClockReminderSettings> {
  const mutationFn = useCallback(async (_args: ClockReminderSettings): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: ClockReminderSettings): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

/** Acknowledge a clock reminder. */
export function useAcknowledgeReminder(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_id: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_id: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

/** Trigger auto clock-out for a time entry. */
export function useAutoClockout(): ApiMutationResult<AutoClockoutEvent> {
  const mutationFn = useCallback(async (_args: AutoClockoutEvent): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: AutoClockoutEvent): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

/** Log a timecard alteration. */
export function useLogTimecardAlteration(): ApiMutationResult<Omit<TimecardAlteration, 'id' | 'orgId' | 'createdAt'>> {
  const mutationFn = useCallback(async (_args: Omit<TimecardAlteration, 'id' | 'orgId' | 'createdAt'>): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: Omit<TimecardAlteration, 'id' | 'orgId' | 'createdAt'>): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
