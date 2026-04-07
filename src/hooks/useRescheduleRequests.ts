// ── useRescheduleRequests — RESCHEDULE-EVIDLY-01 ─────────────────
// Fetches service_reschedule_requests for the org + realtime subscription.
// Provides submit, confirm, cancel mutations.
// Demo mode returns empty array (no fake data per CLAUDE.md).

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import type { RescheduleRequest, SubmitRescheduleParams } from '../types/rescheduleRequest';

interface UseRescheduleRequestsResult {
  requests: RescheduleRequest[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  submitReschedule: (params: SubmitRescheduleParams) => Promise<string | null>;
  confirmReschedule: (requestId: string) => Promise<void>;
  cancelReschedule: (requestId: string) => Promise<void>;
  hasPendingReschedule: (serviceTypeCode: string, locationId?: string) => boolean;
}

export function useRescheduleRequests(locationId?: string): UseRescheduleRequestsResult {
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
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
        .from('service_reschedule_requests')
        .select(`
          *,
          requester:requested_by (full_name),
          locations:location_id (name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) {
        setError(fetchErr.message);
        setRequests([]);
      } else {
        const mapped = (data || []).map((r: any) => ({
          ...r,
          requester_name: r.requester?.full_name,
          location_name: r.locations?.name,
        }));
        setRequests(mapped);
      }
    } catch {
      setError('Failed to fetch reschedule requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, isDemoMode, locationId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Realtime subscription
  useEffect(() => {
    if (isDemoMode || !orgId) return;

    const channel = supabase
      .channel('reschedule-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_reschedule_requests',
          filter: `organization_id=eq.${orgId}`,
        },
        () => { fetchRequests(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, isDemoMode, fetchRequests]);

  // Submit a new reschedule request
  const submitReschedule = async (params: SubmitRescheduleParams): Promise<string | null> => {
    if (isDemoMode || !orgId || !user) return null;

    const { data, error: insertErr } = await supabase
      .from('service_reschedule_requests')
      .insert({
        organization_id: params.organization_id,
        location_id: params.location_id,
        service_type_code: params.service_type_code,
        schedule_id: params.schedule_id,
        requested_by: user.id,
        original_due_date: params.original_due_date,
        requested_date: params.requested_date,
        reason: params.reason || null,
        urgency: params.urgency,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr || !data) {
      setError(insertErr?.message || 'Failed to submit reschedule');
      return null;
    }

    // Client-side notification for org roles
    await supabase.from('notifications').insert({
      organization_id: orgId,
      type: 'service_reschedule_requested',
      category: 'vendors',
      title: `Service reschedule requested — ${params.service_type_code}`,
      body: `Reschedule from ${params.original_due_date} to ${params.requested_date}`,
      action_url: '/services',
      action_label: 'View Services',
      priority: 'medium',
      severity: 'info',
      source_type: 'reschedule_request',
      source_id: data.id,
    }).catch(() => {});

    fetchRequests();
    return data.id;
  };

  // Manually confirm a reschedule (operator confirms)
  const confirmReschedule = async (requestId: string): Promise<void> => {
    if (isDemoMode) return;

    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    // Update reschedule request status
    await supabase
      .from('service_reschedule_requests')
      .update({
        status: 'confirmed',
        confirmed_by: 'operator',
        vendor_confirmed_date: req.requested_date,
      })
      .eq('id', requestId);

    // Update the service schedule's next_due_date
    if (req.schedule_id) {
      await supabase
        .from('location_service_schedules')
        .update({
          next_due_date: req.requested_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.schedule_id);
    } else {
      // Fallback: update by composite key
      await supabase
        .from('location_service_schedules')
        .update({
          next_due_date: req.requested_date,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', req.organization_id)
        .eq('location_id', req.location_id)
        .eq('service_type_code', req.service_type_code);
    }

    fetchRequests();
  };

  // Cancel a pending reschedule
  const cancelReschedule = async (requestId: string): Promise<void> => {
    if (isDemoMode) return;

    await supabase
      .from('service_reschedule_requests')
      .update({ status: 'canceled' })
      .eq('id', requestId);

    fetchRequests();
  };

  // Check if there's already a pending reschedule for a service type at a location
  const hasPendingReschedule = (serviceTypeCode: string, locId?: string): boolean => {
    const effectiveLocId = locId || locationId;
    return requests.some(
      r => r.service_type_code === serviceTypeCode
        && r.status === 'pending'
        && (!effectiveLocId || r.location_id === effectiveLocId)
    );
  };

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
    submitReschedule,
    confirmReschedule,
    cancelReschedule,
    hasPendingReschedule,
  };
}
