/**
 * useLocationServiceSchedules — fetches active service schedules for the org.
 * Joins locations for name display. Realtime subscription on changes.
 * Demo mode returns empty array (no fake data per CLAUDE.md).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

export interface ServiceScheduleRow {
  id: string;
  name: string;
  category: string;
  cadence: string;
  vendorName: string | null;
  state: 'action' | 'attention' | 'current';
  locations: { locationId: string; locationName: string; state: string }[];
  citation: null;
  answerLine: null;
  cta: null;
}

interface UseLocationServiceSchedulesResult {
  services: ServiceScheduleRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function deriveState(nextDueDate: string | null): 'action' | 'attention' | 'current' {
  if (!nextDueDate) return 'current';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate + 'T00:00:00');
  const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'action';
  if (daysUntilDue <= 14) return 'attention';
  return 'current';
}

export function useLocationServiceSchedules(): UseLocationServiceSchedulesResult {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [services, setServices] = useState<ServiceScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchSchedules = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('location_service_schedules')
        .select('id, location_id, service_type_code, vendor_name, frequency, next_due_date, locations!location_id(id, name)')
        .eq('is_active', true)
        .order('next_due_date', { ascending: true, nullsFirst: false });

      if (fetchErr) {
        setError(fetchErr.message);
        setServices([]);
      } else {
        const mapped: ServiceScheduleRow[] = (data || []).map((row: Record<string, unknown>) => {
          const loc = row.locations as Record<string, unknown> | null;
          const state = deriveState(row.next_due_date as string | null);
          return {
            id: row.id as string,
            name: row.service_type_code as string,
            category: '',
            cadence: row.frequency as string,
            vendorName: (row.vendor_name as string) ?? null,
            state,
            locations: [{
              locationId: row.location_id as string,
              locationName: (loc?.name as string) ?? 'Unknown location',
              state,
            }],
            citation: null,
            answerLine: null,
            cta: null,
          };
        });
        setServices(mapped);
      }
    } catch {
      setError('Failed to fetch service schedules');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, isDemoMode]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Realtime subscription
  useEffect(() => {
    if (isDemoMode || !orgId) return;

    const channel = supabase
      .channel('service-schedules-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_service_schedules',
          filter: `organization_id=eq.${orgId}`,
        },
        () => { fetchSchedules(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, isDemoMode, fetchSchedules]);

  return { services, loading, error, refetch: fetchSchedules };
}
