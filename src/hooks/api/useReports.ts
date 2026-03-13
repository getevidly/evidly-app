/**
 * Reports API hooks — stubbed with empty data.
 *
 * When Supabase tables are ready, replace the queryFn
 * implementations with real queries.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface ReportParams {
  dateRange?: { start: string; end: string };
  locationIds?: string[];
  employeeIds?: string[];
  status?: string;
  serviceType?: string;
  severity?: string;
  horizon?: string;
  showUnprofitableOnly?: string;
  [key: string]: unknown;
}

export interface GeneratedReport {
  id: string;
  slug: string;
  title: string;
  generatedAt: string;
  params: ReportParams;
  data: Record<string, unknown>;
  status: 'completed' | 'failed' | 'generating';
}

export interface ScheduledReport {
  id: string;
  slug: string;
  reportTitle: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
  format: 'pdf' | 'excel';
  isActive: boolean;
  createdAt: string;
  lastRunAt: string | null;
}

// ── Queries ───────────────────────────────────────────────────

export function useReportHistory(): ApiQueryResult<GeneratedReport[]> {
  const queryFn = useCallback(async (): Promise<GeneratedReport[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('report-history', queryFn, []);
}

export function useScheduledReports(): ApiQueryResult<ScheduledReport[]> {
  const queryFn = useCallback(async (): Promise<ScheduledReport[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('scheduled-reports', queryFn, []);
}

export function useFavoriteReports(): ApiQueryResult<string[]> {
  const queryFn = useCallback(async (): Promise<string[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('favorite-reports', queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export function useGenerateReport(): ApiMutationResult<{ slug: string; params: ReportParams }, GeneratedReport> {
  const mutationFn = useCallback(async (_args: { slug: string; params: ReportParams }): Promise<GeneratedReport> => {
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((args: { slug: string; params: ReportParams }): GeneratedReport => ({
    id: `rpt-${Date.now()}`,
    slug: args.slug,
    title: args.slug,
    generatedAt: new Date().toISOString(),
    params: args.params,
    data: {},
    status: 'completed',
  }), []);

  return useApiMutation(mutationFn, demoFn);
}

export function useCreateScheduledReport(): ApiMutationResult<Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRunAt'>, ScheduledReport> {
  const mutationFn = useCallback(async (_args: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRunAt'>): Promise<ScheduledReport> => {
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((args: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRunAt'>): ScheduledReport => ({
    ...args,
    id: `sched-${Date.now()}`,
    createdAt: new Date().toISOString(),
    lastRunAt: null,
  }), []);

  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateScheduledReport(): ApiMutationResult<ScheduledReport> {
  const mutationFn = useCallback(async (_args: ScheduledReport): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: ScheduledReport): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useDeleteScheduledReport(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_id: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_id: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useToggleFavorite(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_slug: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_slug: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
