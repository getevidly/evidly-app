/**
 * useOpenDriftCounts — pillar-split open drift counts for the dashboard.
 *
 * Returns food_safety and fire_safety open drift counts SEPARATELY.
 * These two values are NEVER summed — Food and Fire are independent pillars.
 * Reads drift_catches WHERE status='open', scoped to org + optional location.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OpenDriftCounts {
  foodCount: number;
  fireCount: number;
  loading: boolean;
}

export function useOpenDriftCounts(locationIdFilter?: string | null): OpenDriftCounts {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || '';
  const [foodCount, setFoodCount] = useState(0);
  const [fireCount, setFireCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    async function fetchCounts() {
      setLoading(true);

      let q = supabase
        .from('drift_catches')
        .select('pillar')
        .eq('org_id', orgId)
        .eq('status', 'open');

      if (locationIdFilter) {
        q = q.eq('location_id', locationIdFilter);
      }

      const { data, error } = await q;
      if (cancelled) return;

      if (error) {
        console.error('[useOpenDriftCounts]', error.message);
        setLoading(false);
        return;
      }

      let food = 0;
      let fire = 0;
      for (const row of data || []) {
        if (row.pillar === 'food_safety') food++;
        else if (row.pillar === 'fire_safety') fire++;
      }
      setFoodCount(food);
      setFireCount(fire);
      setLoading(false);
    }

    fetchCounts();
    return () => { cancelled = true; };
  }, [orgId, locationIdFilter]);

  return { foodCount, fireCount, loading };
}
