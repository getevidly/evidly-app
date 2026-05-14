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
import type { ServiceRequest } from '../types/serviceRequest';

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
  raw: ServiceRequest | null;
}

interface UseServiceRequestDetailResult {
  request: ServiceRequestDetail | null;
  loading: boolean;
  error: string | null;
  acceptAlternative: (requestId: string, selectedSlot: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  resendRequest: (requestId: string) => Promise<void>;
  sendReminder: (requestId: string) => Promise<void>;
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

        const rawRequest: ServiceRequest = {
          ...(data as ServiceRequest),
          vendor_name: (vendors?.company_name as string) || undefined,
          vendor_email: (vendors?.email as string) || undefined,
        };

        setRequest({
          id: r.id as string,
          title: (r.service_type as string) || '',
          state: deriveState(r.status as string),
          vendorName: (vendors?.company_name as string) || '',
          sentDate: r.created_at ? new Date(r.created_at as string).toLocaleDateString() : '',
          answerLine: null,
          viewedDate: null,
          reminders: (r.reminders_count as number) ?? 0,
          cta: deriveCta(r.status as string),
          raw: rawRequest,
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

  const acceptAlternative = async (reqId: string, selectedSlot: string) => {
    if (isDemoMode) return;

    const slotDate = new Date(selectedSlot);

    await supabase
      .from('service_requests')
      .update({
        confirmed_datetime: selectedSlot,
        confirmed_by: 'operator',
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reqId);

    if (request?.raw && orgId) {
      const raw = request.raw;
      await supabase.from('calendar_events').insert({
        organization_id: orgId,
        location_id: raw.location_id,
        title: `${raw.service_type} — ${raw.vendor_name || 'Vendor'}`,
        type: 'vendor',
        category: raw.service_type,
        date: slotDate.toISOString().slice(0, 10),
        start_time: slotDate.toTimeString().slice(0, 5),
        end_time: new Date(slotDate.getTime() + 120 * 60000).toTimeString().slice(0, 5),
        vendor_id: raw.vendor_id,
        vendor_name: raw.vendor_name || 'Vendor',
        service_request_id: reqId,
      });
    }

    fetchDetail();
  };

  const cancelRequest = async (reqId: string) => {
    if (isDemoMode) return;

    await supabase
      .from('service_requests')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reqId);

    fetchDetail();
  };

  const resendRequest = async (reqId: string) => {
    if (isDemoMode) return;

    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-service-request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ requestId: reqId }),
      }
    );

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to resend request');
    fetchDetail();
  };

  const sendReminder = async (reqId: string) => {
    if (isDemoMode) return;

    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-service-request-reminder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ requestId: reqId }),
      }
    );

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to send reminder');
    fetchDetail();
  };

  return { request, loading, error, acceptAlternative, cancelRequest, resendRequest, sendReminder };
}
