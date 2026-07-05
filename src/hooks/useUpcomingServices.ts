import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Upcoming third-party services that need coordination (booking a vendor).
// Services with next_due_date within `windowDays` ahead (past = already a drift,
// excluded). Pillar split via service_type_definitions.category — Fire and Food
// tallied SEPARATELY, never summed. RLS scopes rows to the user's org.
export interface UpcomingServices {
  topLabel: string | null;
  total: number;
  fire: number;
  food: number;
  loading: boolean;
}

export function useUpcomingServices(windowDays = 14, locationId?: string | null): UpcomingServices {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<UpcomingServices>({ total: 0, fire: 0, food: 0, topLabel: null, loading: true });

  useEffect(() => {
    if (!orgId) { setState({ total: 0, fire: 0, food: 0, topLabel: null, loading: false }); return; }
    let cancelled = false;

    (async () => {
      let q = supabase
        .from('location_service_schedules')
        .select('id, next_due_date, is_active, location_id, service_type_definitions(category, short_name), locations(name)')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .not('next_due_date', 'is', null);
      if (locationId) q = q.eq('location_id', locationId);

      const { data, error } = await q;
      if (cancelled) return;
      if (error || !data) { setState({ total: 0, fire: 0, food: 0, topLabel: null, loading: false }); return; }

      const now = Date.now();
      const inWindow = (iso: string | null) => {
        if (!iso) return false;
        const t = new Date(iso).getTime();
        if (isNaN(t)) return false;
        const days = Math.ceil((t - now) / 86_400_000);
        return days >= 0 && days <= windowDays;
      };

      let total = 0, fire = 0, food = 0;
      let soonestMs = Infinity; let topLabel: string | null = null;
      for (const r of data as any[]) {
        if (!inWindow(r.next_due_date)) continue;
        total++;
        const ms = new Date(r.next_due_date).getTime();
        if (ms < soonestMs) {
          soonestMs = ms;
          const svc = r.service_type_definitions?.short_name || 'Service';
          const loc = r.locations?.name;
          topLabel = loc ? `${loc} ${svc.toLowerCase()}` : svc;
        }
        const cat = r.service_type_definitions?.category;
        if (cat === 'fire_safety') fire++;
        else if (cat === 'food_safety') food++;
        // facility_services counts toward total, not a pillar tally
      }
      setState({ total, fire, food, topLabel, loading: false });
    })();

    return () => { cancelled = true; };
  }, [orgId, windowDays, locationId]);

  return state;
}
