/**
 * useCooldownTabSignals.ts
 *
 * Signal aggregation for the Cooldown tab PRP band.
 * PREDICT = active cooldowns in progress
 * REDUCE  = cooldowns at risk (pct >= 0.75 or failed without disposition)
 * PROVE   = completed today
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';

export interface CooldownTabSignals {
  inProgress: number;
  atRisk: number;
  completedToday: number;
  needsDisposition: number;
  loading: boolean;
}

export function useCooldownTabSignals(): CooldownTabSignals {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id;
  const locationIds = getAccessibleLocations().map(l => l.locationId).filter(Boolean);

  const [signals, setSignals] = useState<Omit<CooldownTabSignals, 'loading'>>({
    inProgress: 0,
    atRisk: 0,
    completedToday: 0,
    needsDisposition: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchSignals = useCallback(async () => {
    if (!orgId || locationIds.length === 0) {
      setSignals({ inProgress: 0, atRisk: 0, completedToday: 0, needsDisposition: 0 });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cooldown_events')
        .select('id, status, started_at, stage_1_target_at, stage_2_target_at, stage_1_completed_at, disposition, failed_stage')
        .in('location_id', locationIds)
        .neq('status', 'cancelled');

      if (error) throw error;

      const rows = data ?? [];
      const now = Date.now();
      const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();

      let inProgress = 0;
      let atRisk = 0;
      let completedToday = 0;
      let needsDisposition = 0;

      for (const row of rows) {
        const status = row.status as string;

        if (status === 'completed') {
          // Check if completed today
          const completedAt = row.stage_2_completed_at;
          if (completedAt && completedAt >= todayStart) {
            completedToday++;
          }
          continue;
        }

        if (status === 'failed') {
          if (!row.disposition) {
            needsDisposition++;
            atRisk++;
          }
          continue;
        }

        // in_progress or stage_1_complete
        if (status === 'in_progress' || status === 'stage_1_complete') {
          inProgress++;

          // Check if at risk: past deadline or >= 75% elapsed
          if (status === 'in_progress') {
            const s1Target = new Date(row.stage_1_target_at).getTime();
            if (now > s1Target) {
              atRisk++;
            } else {
              const startMs = new Date(row.started_at).getTime();
              const stageLen = s1Target - startMs;
              const pct = stageLen > 0 ? (now - startMs) / stageLen : 1;
              if (pct >= 0.75) atRisk++;
            }
          } else {
            const s2Target = new Date(row.stage_2_target_at).getTime();
            if (now > s2Target) {
              atRisk++;
            } else {
              const s1CompMs = row.stage_1_completed_at ? new Date(row.stage_1_completed_at).getTime() : new Date(row.stage_1_target_at).getTime();
              const stageLen = s2Target - s1CompMs;
              const pct = stageLen > 0 ? (now - s1CompMs) / stageLen : 1;
              if (pct >= 0.75) atRisk++;
            }
          }
        }
      }

      setSignals({ inProgress, atRisk, completedToday, needsDisposition });
    } catch (e) {
      console.warn('[useCooldownTabSignals]', e instanceof Error ? e.message : e);
    } finally {
      setLoading(false);
    }
  }, [orgId, locationIds.join(',')]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return { ...signals, loading };
}
