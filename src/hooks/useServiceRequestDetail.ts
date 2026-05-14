/**
 * useServiceRequestDetail — fetches a single service_request by id.
 * Joins vendors, locations, requester.
 * Realtime subscription on the single row.
 * Demo mode returns null (no fake data per CLAUDE.md).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { deriveState, deriveCta } from '../utils/serviceRequestState';

export interface ServiceRequestDetail {
  id: string;
  title: string;
  state: 'action' | 'attention' | 'current' | 'fulfilled' | 'cancelled';
  vendorName: string;
  sentDate: string;
  answerLine: null;
  viewedDate: null;
  reminders: number;
  cta: { variant: 'primary' | 'secondary'; label: string } | null;
}

interface UseServiceRequestDetailResult {
  request: ServiceRequestDetail | null;
  loading: boolean;
  error: string | null;
}

export function useServiceRequestDetail(requestId: string | undefined): UseServiceRequestDetailResult {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [request, setRequest] = useState<ServiceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchDetail = useCallback(async () => {
    if (isDemoMode || !orgId || !requestId) {
      setRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('service_requests')
        .select('*, vendors:vendor_id(company_name, email), locations:location_id(name), requester:requested_by(full_name)')
        .eq('id', requestId)
        .single();

      if (fetchErr) {
        setError(fetchErr.message);
        setRequest(null);
      } else if (data) {
        const r = data as Record<string, unknown>;
        const vendors = r.vendors as Record<string, unknown> | null;

        setRequest({
          id: r.id as string,
          title: (r.service_type as string) || '',
          state: deriveState(r.status as string),
          vendorName: (vendors?.company_name as string) || '',
          sentDate: r.created_at ? new Date(r.created_at as string).toLocaleDateString() : '',
          answerLine: null,
          viewedDate: null,
          reminders: 0,
          cta: deriveCta(r.status as string),
        });
      } else {
        setRequest(null);
      }
    } catch {
      setError('Failed to fetch service request');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, isDemoMode, requestId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Realtime subscription on the single row
  useEffect(() => {
    if (isDemoMode || !orgId || !requestId) return;

    const channel = supabase
      .channel(`request-detail-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `id=eq.${requestId}`,
        },
        () => { fetchDetail(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, isDemoMode, requestId, fetchDetail]);

  return { request, loading, error };
}
