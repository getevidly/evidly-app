/**
 * useReceivingTabSignals.ts
 *
 * Queries receiving_temp_logs for PRP signal counts scoped to receiving.
 *
 * PREDICT = 0 (no scheduled_deliveries table exists).
 * REDUCE  = items flagged out-of-temp (is_pass = false) in the last 7 days.
 * PROVE   = receiving log rows created today.
 *
 * TODO: When a scheduled_deliveries or vendor_appointments table is added,
 *       wire predictCount to deliveries in the next 4 hours with no log yet.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';

export interface ReceivingTabSignals {
  predictCount: number;
  reduceCount: number;
  proveCount: number;
  loading: boolean;
}

export function useReceivingTabSignals(): ReceivingTabSignals {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id;
  const locationIds = getAccessibleLocations().map(l => l.locationId).filter(Boolean);

  const [reduceCount, setReduceCount] = useState(0);
  const [proveCount, setProveCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchSignals = useCallback(async () => {
    if (!orgId || locationIds.length === 0) {
      setReduceCount(0);
      setProveCount(0);
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // REDUCE: flagged items in last 7 days
      const { count: flaggedCount, error: flagErr } = await supabase
        .from('receiving_temp_logs')
        .select('id', { count: 'exact', head: true })
        .in('location_id', locationIds)
        .eq('is_pass', false)
        .gte('created_at', sevenDaysAgo)
        .is('superseded_by_log_id', null);

      if (flagErr) throw flagErr;

      // PROVE: logs created today
      const { count: todayCount, error: todayErr } = await supabase
        .from('receiving_temp_logs')
        .select('id', { count: 'exact', head: true })
        .in('location_id', locationIds)
        .gte('created_at', todayStart)
        .is('superseded_by_log_id', null);

      if (todayErr) throw todayErr;

      setReduceCount(flaggedCount ?? 0);
      setProveCount(todayCount ?? 0);
    } catch (e) {
      console.warn('[useReceivingTabSignals]', e instanceof Error ? e.message : e);
    } finally {
      setLoading(false);
    }
  }, [orgId, locationIds.join(',')]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return {
    predictCount: 0,
    reduceCount,
    proveCount,
    loading,
  };
}
