/**
 * Timecard API hooks — stubbed with demo data.
 *
 * When Supabase `time_entries` / `pay_periods` tables are ready,
 * replace the queryFn implementations with real queries.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from '@shared/hooks/api/useApiQuery';
import {
  DEMO_SHIFTS,
  DEMO_PAY_PERIODS,
  type ShiftEntry,
  type PayPeriod,
  getCurrentClockStatus,
  getEmployeeWeekSummaries,
  type EmployeeWeekSummary,
} from '../../data/timecardsDemoData';

// ── Queries ───────────────────────────────────────────────────

/** Fetch all time entries (shifts) for the current pay period. */
export function useTimeEntries(): ApiQueryResult<ShiftEntry[]> {
  const queryFn = useCallback(async (): Promise<ShiftEntry[]> => {
    // TODO: Replace with Supabase query
    // const { data } = await supabase.from('time_entries').select('*').eq('org_id', orgId);
    return DEMO_SHIFTS;
  }, []);

  return useApiQuery('time-entries', queryFn, DEMO_SHIFTS);
}

/** Fetch time entries for a specific employee. */
export function useEmployeeTimeEntries(employeeId: string): ApiQueryResult<ShiftEntry[]> {
  const demoData = DEMO_SHIFTS.filter(s => s.employeeId === employeeId);

  const queryFn = useCallback(async (): Promise<ShiftEntry[]> => {
    // TODO: Replace with Supabase query filtered by employee_id
    return demoData;
  }, [demoData]);

  return useApiQuery(`time-entries-${employeeId}`, queryFn, demoData);
}

/** Fetch team summaries (aggregated hours per employee). */
export function useTeamTimeEntries(): ApiQueryResult<EmployeeWeekSummary[]> {
  const demoData = getEmployeeWeekSummaries();

  const queryFn = useCallback(async (): Promise<EmployeeWeekSummary[]> => {
    // TODO: Replace with Supabase aggregation query or RPC
    return demoData;
  }, [demoData]);

  return useApiQuery('team-time-entries', queryFn, demoData);
}

/** Fetch the current active shift for an employee (clocked in, not out). */
export function useCurrentShift(employeeId: string): ApiQueryResult<ShiftEntry | null> {
  const demoData = getCurrentClockStatus(employeeId);

  const queryFn = useCallback(async (): Promise<ShiftEntry | null> => {
    // TODO: Replace with Supabase query
    // const { data } = await supabase.from('time_entries')
    //   .select('*').eq('employee_id', employeeId).is('clock_out', null).single();
    return demoData;
  }, [demoData]);

  return useApiQuery(`current-shift-${employeeId}`, queryFn, demoData);
}

/** Fetch all pay periods for the org. */
export function usePayPeriods(): ApiQueryResult<PayPeriod[]> {
  const queryFn = useCallback(async (): Promise<PayPeriod[]> => {
    // TODO: Replace with Supabase query
    return DEMO_PAY_PERIODS;
  }, []);

  return useApiQuery('pay-periods', queryFn, DEMO_PAY_PERIODS);
}

/** Fetch a single pay period by ID. */
export function usePayPeriod(id: string): ApiQueryResult<PayPeriod | null> {
  const demoData = DEMO_PAY_PERIODS.find(p => p.id === id) ?? null;

  const queryFn = useCallback(async (): Promise<PayPeriod | null> => {
    // TODO: Replace with Supabase query
    return demoData;
  }, [demoData]);

  return useApiQuery(`pay-period-${id}`, queryFn, demoData);
}

// ── Mutations ─────────────────────────────────────────────────

interface ClockInArgs {
  employeeId: string;
  notes?: string;
  locationId?: string;
}

/** Clock in — creates a new time entry with clock_out=null. */
export function useClockIn(): ApiMutationResult<ClockInArgs, ShiftEntry> {
  const mutationFn = useCallback(async (args: ClockInArgs): Promise<ShiftEntry> => {
    // TODO: Insert into time_entries table
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((args: ClockInArgs): ShiftEntry => {
    const now = new Date();
    return {
      id: `sh-new-${Date.now()}`,
      employeeId: args.employeeId,
      employeeName: '',
      locationId: args.locationId || 'downtown',
      locationName: 'Downtown Kitchen',
      date: now.toISOString().slice(0, 10),
      clockIn: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      clockOut: null,
      breakMinutes: 0,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      doubleTimeHours: 0,
      status: 'pending',
      notes: args.notes || null,
      anomalies: [],
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    };
  }, []);

  return useApiMutation(mutationFn, demoFn);
}

/** Clock out — updates the active time entry with clock_out time. */
export function useClockOut(): ApiMutationResult<{ shiftId: string; notes?: string }> {
  const mutationFn = useCallback(async (_args: { shiftId: string; notes?: string }): Promise<void> => {
    // TODO: Update time_entries set clock_out = now()
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_args: { shiftId: string; notes?: string }): void => {
    // no-op — page manages local state
  }, []);

  return useApiMutation(mutationFn, demoFn);
}

/** Approve a shift. */
export function useApproveShift(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_shiftId: string): Promise<void> => {
    // TODO: Update time_entries set status = 'approved'
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_shiftId: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

/** Create a new pay period. */
export function useCreatePayPeriod(): ApiMutationResult<{ startDate: string; endDate: string }, PayPeriod> {
  const mutationFn = useCallback(async (_args: { startDate: string; endDate: string }): Promise<PayPeriod> => {
    throw new Error('Not implemented');
  }, []);

  return useApiMutation(mutationFn);
}

/** Close a pay period (locks all shifts). */
export function useClosePayPeriod(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_id: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_id: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

/** Export a pay period in a given format. */
export function useExportPayPeriod(): ApiMutationResult<{ id: string; format: string }, Blob> {
  const mutationFn = useCallback(async (_args: { id: string; format: string }): Promise<Blob> => {
    throw new Error('Not implemented');
  }, []);

  return useApiMutation(mutationFn);
}
