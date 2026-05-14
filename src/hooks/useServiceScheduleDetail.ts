/**
 * useServiceScheduleDetail — fetches a single location_service_schedule by id.
 * Joins locations, vendors, service_type_definitions.
 * Realtime subscription on the single row.
 * Demo mode returns null (no fake data per CLAUDE.md).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { deriveScheduleState } from './useLocationServiceSchedules';

export interface ServiceScheduleDetail {
  id: string;
  name: string;
  category: string;
  cadence: string;
  vendorName: string | null;
  state: 'action' | 'attention' | 'current';
  locations: { locationId: string; locationName: string; state: string; detail: string | null }[];
  citation: string | null;
  answerLine: null;
  cta: null;
}

interface UseServiceScheduleDetailResult {
  service: ServiceScheduleDetail | null;
  loading: boolean;
  error: string | null;
}

export function useServiceScheduleDetail(scheduleId: string | undefined): UseServiceScheduleDetailResult {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [service, setService] = useState<ServiceScheduleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchDetail = useCallback(async () => {
    if (isDemoMode || !orgId || !scheduleId) {
      setService(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('location_service_schedules')
        .select('*, locations!location_id(id, name), vendors!vendor_id(company_name), service_type_definitions!service_type_code(name, nfpa_citation, default_frequency)')
        .eq('id', scheduleId)
        .single();

      if (fetchErr) {
        setError(fetchErr.message);
        setService(null);
      } else if (data) {
        const row = data as Record<string, unknown>;
        const loc = row.locations as Record<string, unknown> | null;
        const vendor = row.vendors as Record<string, unknown> | null;
        const typeDef = row.service_type_definitions as Record<string, unknown> | null;
        const state = deriveScheduleState(row.next_due_date as string | null);

        setService({
          id: row.id as string,
          name: (typeDef?.name as string) || (row.service_type_code as string) || '',
          category: '',
          cadence: (row.frequency as string) || '',
          vendorName: (vendor?.company_name as string) ?? null,
          state,
          locations: [{
            locationId: row.location_id as string,
            locationName: (loc?.name as string) ?? 'Unknown location',
            state,
            detail: null,
          }],
          citation: (typeDef?.nfpa_citation as string) ?? null,
          answerLine: null,
          cta: null,
        });
      } else {
        setService(null);
      }
    } catch {
      setError('Failed to fetch service schedule');
      setService(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, isDemoMode, scheduleId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Realtime subscription on the single row
  useEffect(() => {
    if (isDemoMode || !orgId || !scheduleId) return;

    const channel = supabase
      .channel(`schedule-detail-${scheduleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_service_schedules',
          filter: `id=eq.${scheduleId}`,
        },
        () => { fetchDetail(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, isDemoMode, scheduleId, fetchDetail]);

  return { service, loading, error };
}
