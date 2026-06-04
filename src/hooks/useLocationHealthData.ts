/**
 * useLocationHealthData — C18 Phase 3
 *
 * Per-location health data for the heat map and switcher dots.
 * Returns open task count, drift count, and health state per location.
 * Signal count is 0 per location (notifications table lacks location_id).
 *
 * Health state:
 *   coral  = drift > 0
 *   teal   = open tasks > 0 (no drift)
 *   green  = clean
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardLocation } from '../contexts/DashboardLocationContext';
import { useOrgSummary } from './useOrgSummary';
import { useTemperatureState } from '../lib/canonicalQueries/temperature-state';

export type HealthState = 'coral' | 'teal' | 'green';

export interface LocationHealth {
  locationId: string;
  locationName: string;
  openTasks: number;
  driftCount: number;
  signalCount: number;
  health: HealthState;
}

export function useLocationHealthData(): { data: LocationHealth[]; loading: boolean } {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || '';
  const { locations } = useDashboardLocation();
  const { timezone } = useOrgSummary();

  const { data: tempData, isLoading: tempLoading } = useTemperatureState({
    orgId,
    tz: timezone,
  });

  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    if (!orgId || locations.length === 0) { setTasksLoading(false); return; }
    let cancelled = false;

    async function load() {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('task_instances')
        .select('location_id, status')
        .eq('organization_id', orgId)
        .eq('date', today);

      if (cancelled) return;

      const counts: Record<string, { total: number; done: number }> = {};
      for (const row of data || []) {
        const lid = (row as Record<string, unknown>).location_id as string;
        if (!lid) continue;
        if (!counts[lid]) counts[lid] = { total: 0, done: 0 };
        counts[lid].total++;
        if ((row as Record<string, unknown>).status === 'completed') counts[lid].done++;
      }

      setTaskCounts(counts);
      setTasksLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, locations.length]);

  const healthData: LocationHealth[] = locations.map(loc => {
    const tasks = taskCounts[loc.id] || { total: 0, done: 0 };
    const openTasks = Math.max(tasks.total - tasks.done, 0);
    const driftCount = tempData?.byLocation?.[loc.id]?.counts?.failing ?? 0;

    let health: HealthState = 'green';
    if (driftCount > 0) health = 'coral';
    else if (openTasks > 0) health = 'teal';

    return {
      locationId: loc.id,
      locationName: loc.name,
      openTasks,
      driftCount,
      signalCount: 0,
      health,
    };
  });

  return { data: healthData, loading: tasksLoading || tempLoading };
}
