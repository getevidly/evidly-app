/**
 * Service Request API hooks — stubbed with empty data.
 */
import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from '@shared/hooks/api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface ServiceRequest {
  id: string;
  vendor_id: string;
  source: 'evidly' | 'ai_estimate' | 'website' | 'phone' | 'email' | 'referral';
  evidly_location_id: string | null;
  ai_estimate_id: string | null;
  referral_code: string | null;
  organization_id: string | null;
  location_id: string | null;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  service_types: string[];
  urgency: 'normal' | 'soon' | 'urgent' | 'emergency';
  preferred_date: string | null;
  preferred_time_window: string | null;
  notes: string | null;
  ai_estimate_data: Record<string, unknown> | null;
  ai_estimated_price_low: number | null;
  ai_estimated_price_high: number | null;
  ai_estimated_hours: number | null;
  ai_equipment_detected: Array<{ type: string; count: number; size?: string; estimated_length?: string }> | null;
  ai_condition_assessment: string | null;
  ai_photos: string[] | null;
  status: 'new' | 'reviewing' | 'quoted' | 'scheduled' | 'declined' | 'cancelled';
  assigned_to: string | null;
  job_id: string | null;
  estimate_id: string | null;
  first_response_at: string | null;
  response_time_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestStats {
  newRequests: number;
  avgResponseTimeMinutes: number;
  conversionRate: number;
  thisWeek: number;
}

export interface ServiceRequestFilters {
  status?: string;
  source?: string;
  dateRange?: { start: string; end: string };
}

// ── Queries ───────────────────────────────────────────────────

export function useServiceRequests(filters?: ServiceRequestFilters): ApiQueryResult<ServiceRequest[]> {
  return useApiQuery<ServiceRequest[]>(['service-requests', filters], async () => [], { enabled: true });
}

export function useServiceRequest(id: string | undefined): ApiQueryResult<ServiceRequest | null> {
  return useApiQuery<ServiceRequest | null>(['service-request', id], async () => null, { enabled: !!id });
}

export function useServiceRequestStats(): ApiQueryResult<ServiceRequestStats> {
  return useApiQuery<ServiceRequestStats>(
    ['service-request-stats'],
    async () => ({ newRequests: 0, avgResponseTimeMinutes: 0, conversionRate: 0, thisWeek: 0 }),
    { enabled: true }
  );
}

// ── Mutations ─────────────────────────────────────────────────

export function useUpdateServiceRequestStatus(): ApiMutationResult<void, { id: string; status: string }> {
  const mutationFn = useCallback(async (_args: { id: string; status: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { id: string; status: string }>(mutationFn, { invalidateKeys: [['service-requests'], ['service-request-stats']] });
}

export function useAssignServiceRequest(): ApiMutationResult<void, { id: string; assignedTo: string }> {
  const mutationFn = useCallback(async (_args: { id: string; assignedTo: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { id: string; assignedTo: string }>(mutationFn, { invalidateKeys: [['service-requests']] });
}

export function useConvertToJob(): ApiMutationResult<void, { id: string }> {
  const mutationFn = useCallback(async (_args: { id: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { id: string }>(mutationFn, { invalidateKeys: [['service-requests'], ['service-request-stats']] });
}

export function useConvertToEstimate(): ApiMutationResult<void, { id: string }> {
  const mutationFn = useCallback(async (_args: { id: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { id: string }>(mutationFn, { invalidateKeys: [['service-requests'], ['service-request-stats']] });
}

export function useDeclineServiceRequest(): ApiMutationResult<void, { id: string; reason: string }> {
  const mutationFn = useCallback(async (_args: { id: string; reason: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { id: string; reason: string }>(mutationFn, { invalidateKeys: [['service-requests'], ['service-request-stats']] });
}
