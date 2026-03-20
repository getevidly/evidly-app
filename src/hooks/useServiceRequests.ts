// ── useServiceRequests — SERVICE-REQUEST-01 ─────────────────────
// Fetches service_requests for the org + realtime subscription.
// Demo mode returns empty array (no fake data per CLAUDE.md).

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import type { ServiceRequest, ServiceRequestStatus } from '../types/serviceRequest';

interface UseServiceRequestsResult {
  requests: ServiceRequest[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  acceptAlternative: (requestId: string, selectedSlot: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
}

export function useServiceRequests(statusFilter?: ServiceRequestStatus | 'all'): UseServiceRequestsResult {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchRequests = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('service_requests')
        .select(`
          *,
          vendors:vendor_id (company_name, email),
          locations:location_id (name),
          requester:requested_by (full_name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) {
        setError(fetchErr.message);
        setRequests([]);
      } else {
        const mapped = (data || []).map((r: any) => ({
          ...r,
          vendor_name: r.vendors?.company_name,
          vendor_email: r.vendors?.email,
          location_name: r.locations?.name,
          requester_name: r.requester?.full_name,
        }));
        setRequests(mapped);
      }
    } catch {
      setError('Failed to fetch service requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, isDemoMode, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Realtime subscription
  useEffect(() => {
    if (isDemoMode || !orgId) return;

    const channel = supabase
      .channel('service-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `organization_id=eq.${orgId}`,
        },
        () => { fetchRequests(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, isDemoMode, fetchRequests]);

  const acceptAlternative = async (requestId: string, selectedSlot: string) => {
    if (isDemoMode) return;

    const slotDate = new Date(selectedSlot);

    // Update service request to confirmed
    await supabase
      .from('service_requests')
      .update({
        confirmed_datetime: selectedSlot,
        confirmed_by: 'operator',
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Find the request to get vendor info for calendar event
    const req = requests.find(r => r.id === requestId);
    if (req && orgId) {
      await supabase.from('calendar_events').insert({
        organization_id: orgId,
        location_id: req.location_id,
        title: `${req.service_type} — ${req.vendor_name || 'Vendor'}`,
        type: 'vendor',
        category: req.service_type,
        date: slotDate.toISOString().slice(0, 10),
        start_time: slotDate.toTimeString().slice(0, 5),
        end_time: new Date(slotDate.getTime() + 120 * 60000).toTimeString().slice(0, 5),
        vendor_id: req.vendor_id,
        vendor_name: req.vendor_name || 'Vendor',
        service_request_id: requestId,
      });
    }

    fetchRequests();
  };

  const cancelRequest = async (requestId: string) => {
    if (isDemoMode) return;

    await supabase
      .from('service_requests')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    fetchRequests();
  };

  return { requests, loading, error, refetch: fetchRequests, acceptAlternative, cancelRequest };
}
