/**
 * Service Record API hooks — wired to `vendor_service_records` table.
 *
 * Reads vendor service records with location name join, org-scoped.
 * QA mutation remains a stub until write path is built.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';
import {
  DEMO_SERVICE_RECORDS,
  type DemoServiceRecord,
} from '../../data/demoServiceRecords';

// ── Row mapper ───────────────────────────────────────────────

const SERVICE_RECORD_SELECT = `
  id, organization_id, location_id, safeguard_type, service_type_code,
  vendor_name, technician_name, cert_number, service_date, next_due_date,
  interval_label, notes, price_charged, certificate_url, source,
  qa_status, qa_reviewed_by, qa_reviewed_at,
  result, cost, category_id, service_id,
  created_at, updated_at,
  locations!location_id(name)
`;

function mapServiceRecordRow(row: any): DemoServiceRecord {
  return {
    id: row.id,
    vendorName: row.vendor_name || '',
    categoryId: row.category_id || row.safeguard_type || '',
    serviceId: row.service_id || row.service_type_code || '',
    serviceName: row.service_type_code || row.safeguard_type || '',
    locationId: row.location_id || '',
    locationName: row.locations?.name || '',
    serviceDate: row.service_date || '',
    nextDueDate: row.next_due_date || '',
    technicianName: row.technician_name || '',
    status: row.service_date ? 'completed' : 'scheduled',
    result: (row.result || 'n/a') as 'pass' | 'fail' | 'n/a',
    cost: row.cost != null ? Number(row.cost) : (row.price_charged != null ? Number(row.price_charged) : null),
    notes: row.notes || '',
    certificateNumber: row.cert_number || null,
    qaStatus: row.qa_status || null,
    qaReviewedBy: row.qa_reviewed_by || null,
    qaReviewedAt: row.qa_reviewed_at || null,
    qaFlagReason: null,
    qaFlagCategory: null,
    photosBefore: [],
    photosAfter: [],
  };
}

// ── Queries ───────────────────────────────────────────────────

/** Fetch all service records for the current org. */
export function useServiceRecords(): ApiQueryResult<DemoServiceRecord[]> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const queryFn = useCallback(async (): Promise<DemoServiceRecord[]> => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('vendor_service_records')
      .select(SERVICE_RECORD_SELECT)
      .eq('organization_id', orgId)
      .eq('is_sample', false)
      .order('service_date', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapServiceRecordRow);
  }, [orgId]);

  return useApiQuery(`service-records-${orgId}`, queryFn, DEMO_SERVICE_RECORDS);
}

/** Fetch service records filtered by location. */
export function useLocationServiceRecords(locationId: string): ApiQueryResult<DemoServiceRecord[]> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const demoData = DEMO_SERVICE_RECORDS.filter(r => r.locationId === locationId);

  const queryFn = useCallback(async (): Promise<DemoServiceRecord[]> => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('vendor_service_records')
      .select(SERVICE_RECORD_SELECT)
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .eq('is_sample', false)
      .order('service_date', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapServiceRecordRow);
  }, [orgId, locationId]);

  return useApiQuery(`service-records-${orgId}-${locationId}`, queryFn, demoData);
}

/** Fetch a single service record by ID. */
export function useServiceRecord(id: string | undefined): ApiQueryResult<DemoServiceRecord | null> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const demoData = DEMO_SERVICE_RECORDS.find(r => r.id === id) ?? null;

  const queryFn = useCallback(async (): Promise<DemoServiceRecord | null> => {
    if (!id || !orgId) return null;
    const { data, error } = await supabase
      .from('vendor_service_records')
      .select(SERVICE_RECORD_SELECT)
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapServiceRecordRow(data) : null;
  }, [id, orgId]);

  return useApiQuery(`service-record-${orgId}-${id}`, queryFn, demoData);
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
    // TODO: Update vendor_service_records set qa_status, qa_reviewed_by, qa_reviewed_at
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
