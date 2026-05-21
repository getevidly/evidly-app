/**
 * useFacilityServices — C14
 *
 * Fetches facility service categories from service_type_definitions,
 * joined with location_service_schedules for schedule data.
 * Facilities_manager role only.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface FacilityServiceSchedule {
  location_name: string;
  vendor_name: string;
  frequency_label: string;
  next_due_date: string | null;
  last_service_date: string | null;
  status_tone: 'due' | 'overdue' | 'ok';
}

export interface FacilityServiceCategory {
  service_type_code: string;
  name: string;
  short_name: string | null;
  icon: string;
  schedules: FacilityServiceSchedule[];
}

interface UseFacilityServicesResult {
  categories: FacilityServiceCategory[];
  loading: boolean;
  error: Error | null;
}

function computeTone(nextDue: string | null): 'due' | 'overdue' | 'ok' {
  if (!nextDue) return 'ok';
  const today = new Date().toISOString().split('T')[0];
  const thirtyOut = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];
  if (nextDue < today) return 'overdue';
  if (nextDue <= thirtyOut) return 'due';
  return 'ok';
}

export function useFacilityServices(): UseFacilityServicesResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;

  const [categories, setCategories] = useState<FacilityServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isFM = userRole === 'facilities_manager';

  useEffect(() => {
    if (!orgId || !isFM) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const [defsRes, schedRes] = await Promise.all([
          supabase
            .from('service_type_definitions')
            .select('code, name, short_name, icon')
            .eq('category', 'facility_services')
            .eq('is_active', true)
            .order('sort_order'),
          supabase
            .from('location_service_schedules')
            .select('service_type_code, vendor_name, frequency, next_due_date, last_service_date, location_id, is_active, locations(name)')
            .eq('organization_id', orgId!)
            .eq('is_active', true),
        ]);

        if (cancelled) return;
        if (defsRes.error) throw new Error(defsRes.error.message);

        const defs = defsRes.data || [];
        const scheds = schedRes.data || [];

        // Group schedules by service_type_code
        const schedByCode = new Map<string, FacilityServiceSchedule[]>();
        for (const s of scheds) {
          const r = s as Record<string, unknown>;
          const code = r.service_type_code as string;
          const loc = r.locations as { name: string } | null;
          if (!schedByCode.has(code)) schedByCode.set(code, []);
          const nextDue = (r.next_due_date as string) || null;
          schedByCode.get(code)!.push({
            location_name: loc?.name || 'Unknown',
            vendor_name: (r.vendor_name as string) || 'Not assigned',
            frequency_label: (r.frequency as string) || '',
            next_due_date: nextDue,
            last_service_date: (r.last_service_date as string) || null,
            status_tone: computeTone(nextDue),
          });
        }

        const result: FacilityServiceCategory[] = defs.map(d => {
          const def = d as { code: string; name: string; short_name: string | null; icon: string | null };
          return {
            service_type_code: def.code,
            name: def.name,
            short_name: def.short_name,
            icon: def.icon || 'tool',
            schedules: schedByCode.get(def.code) || [],
          };
        });

        setCategories(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, isFM]);

  return { categories, loading, error };
}
