/**
 * Deficiency API hooks — stubbed with demo data.
 *
 * When Supabase `deficiencies` table is ready,
 * replace the queryFn implementations with real queries.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';
import {
  DEMO_DEFICIENCIES,
  type DeficiencyItem,
  type DefStatus,
} from '../../data/deficienciesDemoData';

// ── Queries ───────────────────────────────────────────────────

/** Fetch all deficiencies for the current org. */
export function useDeficiencies(): ApiQueryResult<DeficiencyItem[]> {
  const queryFn = useCallback(async (): Promise<DeficiencyItem[]> => {
    // TODO: Replace with Supabase query
    return DEMO_DEFICIENCIES;
  }, []);

  return useApiQuery('deficiencies', queryFn, DEMO_DEFICIENCIES);
}

/** Fetch deficiencies filtered by location. */
export function useLocationDeficiencies(locationId: string): ApiQueryResult<DeficiencyItem[]> {
  const demoData = DEMO_DEFICIENCIES.filter(d => d.locationId === locationId);

  const queryFn = useCallback(async (): Promise<DeficiencyItem[]> => {
    // TODO: Replace with Supabase query filtered by location_id
    return demoData;
  }, [demoData]);

  return useApiQuery(`deficiencies-${locationId}`, queryFn, demoData);
}

/** Fetch a single deficiency by ID. */
export function useDeficiency(id: string | undefined): ApiQueryResult<DeficiencyItem | null> {
  const demoData = DEMO_DEFICIENCIES.find(d => d.id === id) ?? null;

  const queryFn = useCallback(async (): Promise<DeficiencyItem | null> => {
    if (!id) return null;
    // TODO: Replace with Supabase query
    return demoData;
  }, [id, demoData]);

  return useApiQuery(`deficiency-${id}`, queryFn, demoData);
}

// ── Mutations ─────────────────────────────────────────────────

/** Update deficiency status. */
export function useUpdateDeficiencyStatus(): ApiMutationResult<{ id: string; status: DefStatus; notes?: string }> {
  const mutationFn = useCallback(async (_args: { id: string; status: DefStatus; notes?: string }): Promise<void> => {
    // TODO: Update deficiencies set status = args.status
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_args: { id: string; status: DefStatus; notes?: string }): void => {
    // no-op in demo — page manages local state
  }, []);

  return useApiMutation(mutationFn, demoFn);
}

/** Resolve a deficiency. */
export function useResolveDeficiency(): ApiMutationResult<{ id: string; notes: string; photoIds?: string[] }> {
  const mutationFn = useCallback(async (_args: { id: string; notes: string; photoIds?: string[] }): Promise<void> => {
    // TODO: Update deficiencies set status='resolved', resolved_at=now()
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_args: { id: string; notes: string; photoIds?: string[] }): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
