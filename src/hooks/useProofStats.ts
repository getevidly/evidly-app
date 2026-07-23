import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ProofStats {
  filed: number;
  total: number;
  subtitle: string;
  loading: boolean;
}

/**
 * Returns filed/total obligation counts for a given pillar.
 * Queries location_service_schedules + service_type_definitions.
 * "Filed" = has last_completed_at within the recurrence window (simplified: non-null).
 */
export function useProofStats(
  pillar: 'food_safety' | 'fire_safety',
  locationId?: string | null
): ProofStats {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<ProofStats>({ filed: 0, total: 0, subtitle: '', loading: true });

  useEffect(() => {
    if (!orgId) { setState({ filed: 0, total: 0, subtitle: '', loading: false }); return; }
    let cancelled = false;

    (async () => {
      let q = supabase
        .from('location_service_schedules')
        .select('id, last_completed_at, is_active, service_type_definitions(category)')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      if (locationId) q = q.eq('location_id', locationId);

      const { data, error } = await q;
      if (cancelled) return;
      if (error || !data) { setState({ filed: 0, total: 0, subtitle: '', loading: false }); return; }

      let total = 0;
      let filed = 0;
      for (const row of data as any[]) {
        const cat = row.service_type_definitions?.category;
        if (cat !== pillar) continue;
        total++;
        if (row.last_completed_at) filed++;
      }

      const subtitle = filed === total && total > 0
        ? 'All records current'
        : total === 0
          ? 'No obligations configured'
          : `${total - filed} pending`;

      setState({ filed, total, subtitle, loading: false });
    })();

    return () => { cancelled = true; };
  }, [orgId, pillar, locationId]);

  return state;
}
