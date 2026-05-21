/**
 * useOrgAge — C17.5
 *
 * Reads organizations.created_at for the current user's org and derives
 * day-count, phase flags, and baseline-progress values.
 *
 * // TODO MBG sprint: prefer fully_configured_at when column exists
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface OrgAge {
  daysSinceCreate: number;
  isDay1Phase: boolean;           // < 14
  isDay90Phase: boolean;          // >= 60
  baselineProgress: number;       // min(daysSinceCreate / 30, 1)
  baselineDaysRemaining: number;  // max(30 - daysSinceCreate, 0)
  loading: boolean;
}

export function useOrgAge(): OrgAge {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [daysSinceCreate, setDaysSinceCreate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        // TODO MBG sprint: prefer fully_configured_at when column exists
        const { data, error } = await supabase
          .from('organizations')
          .select('created_at')
          .eq('id', orgId)
          .single();

        if (cancelled) return;
        if (error || !data?.created_at) {
          setLoading(false);
          return;
        }

        const created = new Date(data.created_at as string).getTime();
        const now = Date.now();
        const days = Math.floor((now - created) / 86_400_000);
        setDaysSinceCreate(Math.max(days, 0));
      } catch {
        // Fallback: assume day 0 so Day 1 empty states render
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId]);

  return {
    daysSinceCreate,
    isDay1Phase: daysSinceCreate < 14,
    isDay90Phase: daysSinceCreate >= 60,
    baselineProgress: Math.min(daysSinceCreate / 30, 1),
    baselineDaysRemaining: Math.max(30 - daysSinceCreate, 0),
    loading,
  };
}
