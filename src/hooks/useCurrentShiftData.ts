import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_SHIFTS, type ShiftKey } from '../lib/shifts';
import type { ShiftPRPMetrics } from './useShiftPRPMetrics';

export interface CurrentShiftStats {
  tempCount: number;
  completedTasks: number;
  totalTasks: number;
  incidentCount: number;
  openCACount: number;
  allTempsInRange: boolean;
}

export interface OpenTask {
  title: string;
  dueAt: string | null;
  status: string;
}

interface UseCurrentShiftDataArgs {
  locationId: string | null;
  organizationId: string | null;
  shiftName: ShiftKey;
  shiftDate: string;
}

export function useCurrentShiftData({ locationId, organizationId, shiftName, shiftDate }: UseCurrentShiftDataArgs) {
  const [stats, setStats] = useState<CurrentShiftStats>({
    tempCount: 0, completedTasks: 0, totalTasks: 0,
    incidentCount: 0, openCACount: 0, allTempsInRange: true,
  });
  const [prpMetrics, setPrpMetrics] = useState<ShiftPRPMetrics>({
    predict: 0, reduce: 0, prove: { ready: 0, total: 0, pct: 0 },
  });
  const [openTasks, setOpenTasks] = useState<OpenTask[]>([]);
  const [shiftStartHour, setShiftStartHour] = useState(0);
  const [shiftEndHour, setShiftEndHour] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!locationId || !organizationId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const shiftDef = DEFAULT_SHIFTS[shiftName];
      let startHour = shiftDef.startHour;
      let endHour = shiftDef.endHour;

      try {
        const { data: tmpl } = await supabase
          .from('shift_templates').select('id, start_time, end_time')
          .eq('organization_id', organizationId).eq('location_id', locationId)
          .ilike('name', shiftName).eq('is_active', true).limit(1).maybeSingle();
        if (tmpl) {
          const sh = parseInt(tmpl.start_time, 10);
          const eh = parseInt(tmpl.end_time, 10);
          if (!isNaN(sh)) startHour = sh;
          if (!isNaN(eh)) endHour = eh;
        }
      } catch { /* shift_templates may not exist */ }

      setShiftStartHour(startHour);
      setShiftEndHour(endHour);

      const startISO = `${shiftDate}T${String(startHour).padStart(2, '0')}:00:00`;
      const endISO = `${shiftDate}T${String(endHour).padStart(2, '0')}:00:00`;
      const now = new Date().toISOString();
      const in4h = new Date(Date.now() + 4 * 3600000).toISOString();

      const [tempRes, doneRes, totalRes, openRes, incRes, caRes, dueSoonRes, overdueRes] = await Promise.all([
        supabase.from('temperature_logs').select('temp_pass')
          .eq('facility_id', locationId).eq('shift', shiftName)
          .gte('reading_time', `${shiftDate}T00:00:00`).lt('reading_time', `${shiftDate}T23:59:59.999`),
        supabase.from('task_instances').select('id', { count: 'exact' })
          .eq('location_id', locationId).eq('shift', shiftName).eq('date', shiftDate)
          .not('completed_at', 'is', null),
        supabase.from('task_instances').select('id', { count: 'exact' })
          .eq('location_id', locationId).eq('shift', shiftName).eq('date', shiftDate)
          .neq('status', 'skipped'),
        supabase.from('task_instances').select('title, due_at, status')
          .eq('location_id', locationId).eq('shift', shiftName).eq('date', shiftDate)
          .is('completed_at', null).neq('status', 'skipped')
          .order('due_at', { ascending: true }).limit(20),
        supabase.from('incidents').select('id', { count: 'exact' })
          .eq('location_id', locationId).is('archived_at', null)
          .gte('created_at', startISO).lt('created_at', endISO),
        supabase.from('corrective_actions').select('id', { count: 'exact' })
          .eq('location_id', locationId).in('status', ['reported', 'assigned', 'in_progress']),
        supabase.from('task_instances').select('id', { count: 'exact' })
          .eq('location_id', locationId).eq('shift', shiftName).eq('date', shiftDate)
          .is('completed_at', null).neq('status', 'skipped')
          .gte('due_at', now).lte('due_at', in4h),
        supabase.from('task_instances').select('id', { count: 'exact' })
          .eq('location_id', locationId).eq('shift', shiftName).eq('date', shiftDate)
          .is('completed_at', null).neq('status', 'skipped').lt('due_at', now),
      ]);

      const tempData = tempRes.data ?? [];
      const completedTasks = doneRes.count ?? 0;
      const totalTasks = totalRes.count ?? 0;
      const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      setStats({
        tempCount: tempData.length, completedTasks, totalTasks,
        incidentCount: incRes.count ?? 0, openCACount: caRes.count ?? 0,
        allTempsInRange: tempData.length === 0 || tempData.every(r => r.temp_pass !== false),
      });
      setPrpMetrics({
        predict: dueSoonRes.count ?? 0, reduce: overdueRes.count ?? 0,
        prove: { ready: completedTasks, total: totalTasks, pct },
      });
      setOpenTasks((openRes.data ?? []).map(t => ({
        title: t.title || 'Untitled task',
        dueAt: t.due_at ? new Date(t.due_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
        status: t.status || 'pending',
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift data');
      console.error('[CurrentShift]', err);
    } finally {
      setLoading(false);
    }
  }, [locationId, organizationId, shiftName, shiftDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') fetchData(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchData]);

  return { stats, prpMetrics, openTasks, shiftStartHour, shiftEndHour, loading, error, refetch: fetchData };
}
