import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UpcomingServiceItem {
  title: string;
  due: string;
  pillar: 'food_safety' | 'fire_safety' | 'facility_services';
}

export interface UpcomingServicesList {
  items: UpcomingServiceItem[];
  loading: boolean;
}

/**
 * Returns detailed upcoming service items for the next `windowDays` days.
 * Similar to useUpcomingServices but returns the list (not just counts).
 */
export function useUpcomingServicesList(
  windowDays = 30,
  locationId?: string | null,
  pillarFilter?: 'food_safety' | 'fire_safety' | null
): UpcomingServicesList {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<UpcomingServicesList>({ items: [], loading: true });

  useEffect(() => {
    if (!orgId) { setState({ items: [], loading: false }); return; }
    let cancelled = false;

    (async () => {
      let q = supabase
        .from('location_service_schedules')
        .select('id, next_due_date, is_active, service_type_definitions(category, short_name), locations(name)')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .not('next_due_date', 'is', null);
      if (locationId) q = q.eq('location_id', locationId);

      const { data, error } = await q;
      if (cancelled) return;
      if (error || !data) { setState({ items: [], loading: false }); return; }

      const now = Date.now();
      const items: UpcomingServiceItem[] = [];

      for (const r of data as any[]) {
        const iso = r.next_due_date;
        if (!iso) continue;
        const t = new Date(iso).getTime();
        if (isNaN(t)) continue;
        const days = Math.ceil((t - now) / 86_400_000);
        if (days < 0 || days > windowDays) continue;

        const cat = r.service_type_definitions?.category || 'facility_services';
        if (pillarFilter && cat !== pillarFilter) continue;

        const svc = r.service_type_definitions?.short_name || 'Service';
        const loc = r.locations?.name || '';
        const title = loc ? `${svc} · ${loc}` : svc;
        const due = days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`;

        items.push({ title, due, pillar: cat });
      }

      items.sort((a, b) => {
        const daysA = parseInt(a.due.match(/\d+/)?.[0] || '0');
        const daysB = parseInt(b.due.match(/\d+/)?.[0] || '0');
        return daysA - daysB;
      });

      setState({ items, loading: false });
    })();

    return () => { cancelled = true; };
  }, [orgId, windowDays, locationId, pillarFilter]);

  return state;
}
