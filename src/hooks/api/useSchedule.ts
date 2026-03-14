/**
 * Schedule API hooks — stubbed with empty data.
 *
 * When Supabase tables are ready, replace the queryFn
 * implementations with real queries.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export type JobStatus = 'scheduled' | 'confirmed' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type ScheduleView = 'day' | 'week' | 'month';

export interface ScheduledJob {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  locationId: string;
  locationName: string;
  locationAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: JobStatus;
  technicianId: string | null;
  technicianName: string | null;
  serviceTypes: string[];
  notes: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recurringScheduleId: string | null;
  routeOrder: number | null;
  meetingLocation: string | null;
  meetingLocationNotes: string | null;
  meetingLocationLat: number | null;
  meetingLocationLng: number | null;
  createdAt: string;
}

export interface Technician {
  id: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  isAvailable: boolean;
}

export interface TechnicianAvailability {
  technicianId: string;
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

export interface AvailabilityException {
  id: string;
  technicianId: string;
  date: string;
  type: 'vacation' | 'sick' | 'personal' | 'holiday';
  notes: string;
}

export interface RouteOptimization {
  technicianId: string;
  date: string;
  originalOrder: string[];
  optimizedOrder: string[];
  originalDriveMinutes: number;
  optimizedDriveMinutes: number;
  originalDistanceMiles: number;
  optimizedDistanceMiles: number;
}

export interface RecurringSchedule {
  id: string;
  customerId: string;
  customerName: string;
  locationId: string;
  locationName: string;
  serviceTypes: string[];
  frequency: RecurrenceFrequency;
  preferredDay: number | null;
  preferredTime: string | null;
  technicianId: string | null;
  technicianName: string | null;
  isActive: boolean;
  nextDate: string | null;
  createdAt: string;
}

export interface ScheduleFilters {
  date: string;
  view: ScheduleView;
  technicianId?: string;
}

// ── Queries ───────────────────────────────────────────────────

export function useSchedule(_filters?: ScheduleFilters): ApiQueryResult<ScheduledJob[]> {
  const queryFn = useCallback(async (): Promise<ScheduledJob[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('schedule-jobs', queryFn, []);
}

export function useUnassignedJobs(): ApiQueryResult<ScheduledJob[]> {
  const queryFn = useCallback(async (): Promise<ScheduledJob[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('unassigned-jobs', queryFn, []);
}

export function useScheduleTechnicians(): ApiQueryResult<Technician[]> {
  const queryFn = useCallback(async (): Promise<Technician[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('schedule-technicians', queryFn, []);
}

export function useTechnicianAvailability(techId: string | undefined): ApiQueryResult<{
  weekly: TechnicianAvailability[];
  exceptions: AvailabilityException[];
}> {
  const queryFn = useCallback(async () => {
    // TODO: Replace with Supabase query
    return { weekly: [] as TechnicianAvailability[], exceptions: [] as AvailabilityException[] };
  }, []);
  return useApiQuery(`tech-availability-${techId}`, queryFn, { weekly: [], exceptions: [] });
}

export function useRecurringSchedules(): ApiQueryResult<RecurringSchedule[]> {
  const queryFn = useCallback(async (): Promise<RecurringSchedule[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('recurring-schedules', queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export function useRescheduleJob(): ApiMutationResult<{
  jobId: string;
  date: string;
  startTime: string;
  endTime: string;
  technicianId?: string;
  reason?: string;
}> {
  const mutationFn = useCallback(async (_args: {
    jobId: string; date: string; startTime: string; endTime: string; technicianId?: string; reason?: string;
  }): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useAssignJob(): ApiMutationResult<{ jobId: string; technicianId: string }> {
  const mutationFn = useCallback(async (_args: { jobId: string; technicianId: string }): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useOptimizeRoute(): ApiMutationResult<{ date: string; technicianId: string }, RouteOptimization> {
  const mutationFn = useCallback(async (_args: { date: string; technicianId: string }): Promise<RouteOptimization> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((args: { date: string; technicianId: string }): RouteOptimization => ({
    technicianId: args.technicianId,
    date: args.date,
    originalOrder: [],
    optimizedOrder: [],
    originalDriveMinutes: 0,
    optimizedDriveMinutes: 0,
    originalDistanceMiles: 0,
    optimizedDistanceMiles: 0,
  }), []);
  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateAvailability(): ApiMutationResult<{
  technicianId: string;
  weekly: TechnicianAvailability[];
  exceptions: AvailabilityException[];
}> {
  const mutationFn = useCallback(async (_args: {
    technicianId: string; weekly: TechnicianAvailability[]; exceptions: AvailabilityException[];
  }): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useCreateRecurringSchedule(): ApiMutationResult<Omit<RecurringSchedule, 'id' | 'createdAt' | 'nextDate'>, RecurringSchedule> {
  const mutationFn = useCallback(async (_args: Omit<RecurringSchedule, 'id' | 'createdAt' | 'nextDate'>): Promise<RecurringSchedule> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((args: Omit<RecurringSchedule, 'id' | 'createdAt' | 'nextDate'>): RecurringSchedule => ({
    ...args,
    id: `rec-${Date.now()}`,
    createdAt: new Date().toISOString(),
    nextDate: null,
  }), []);
  return useApiMutation(mutationFn, demoFn);
}
