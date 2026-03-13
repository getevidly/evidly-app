/**
 * Service Record API hooks — stubbed with demo data.
 *
 * When Supabase `service_records` table is ready,
 * replace the queryFn implementations with real queries.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';
import {
  DEMO_SERVICE_RECORDS,
  type DemoServiceRecord,
} from '../../data/demoServiceRecords';

// ── Queries ───────────────────────────────────────────────────

/** Fetch all service records for the current org. */
export function useServiceRecords(): ApiQueryResult<DemoServiceRecord[]> {
  const queryFn = useCallback(async (): Promise<DemoServiceRecord[]> => {
    // TODO: Replace with Supabase query
    return DEMO_SERVICE_RECORDS;
  }, []);

  return useApiQuery('service-records', queryFn, DEMO_SERVICE_RECORDS);
}

/** Fetch service records filtered by location. */
export function useLocationServiceRecords(locationId: string): ApiQueryResult<DemoServiceRecord[]> {
  const demoData = DEMO_SERVICE_RECORDS.filter(r => r.locationId === locationId);

  const queryFn = useCallback(async (): Promise<DemoServiceRecord[]> => {
    // TODO: Replace with Supabase query filtered by location_id
    return demoData;
  }, [demoData]);

  return useApiQuery(`service-records-${locationId}`, queryFn, demoData);
}

/** Fetch a single service record by ID. */
export function useServiceRecord(id: string | undefined): ApiQueryResult<DemoServiceRecord | null> {
  const demoData = DEMO_SERVICE_RECORDS.find(r => r.id === id) ?? null;

  const queryFn = useCallback(async (): Promise<DemoServiceRecord | null> => {
    if (!id) return null;
    // TODO: Replace with Supabase query
    return demoData;
  }, [id, demoData]);

  return useApiQuery(`service-record-${id}`, queryFn, demoData);
}

// ── Mutations ─────────────────────────────────────────────────

/** Update QA review status for a service record. */
export function useUpdateQaStatus(): ApiMutationResult<{
  id: string;
  qaStatus: 'approved' | 'flagged';
  flagReason?: string;
  flagCategory?: string;
}> {
  const mutationFn = useCallback(async (_args: {
    id: string;
    qaStatus: 'approved' | 'flagged';
    flagReason?: string;
    flagCategory?: string;
  }): Promise<void> => {
    // TODO: Update service_records set qa_status, qa_reviewed_by, qa_reviewed_at
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_args: {
    id: string;
    qaStatus: 'approved' | 'flagged';
    flagReason?: string;
    flagCategory?: string;
  }): void => {}, []);

  return useApiMutation(mutationFn, demoFn);
}
