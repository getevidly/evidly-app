import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_SHIFTS, type ShiftKey } from '../lib/shifts';

export interface PreviousHandoff {
  shift_name: string;
  shift_date: string;
  completed_at: string | null;
  notes: string | null;
  open_items: string[] | null;
  handed_off_by: string;
  stats_snapshot: Record<string, unknown> | null;
}

export interface ExistingHandoff {
  id: string;
  handed_off_by: string;
  notes: string | null;
  completed_at: string | null;
}

export interface ShiftStats {
  tempCount: number;
  checklistCount: number;
  caResolved: number;
  openItemCount: number;
  allTempsInRange: boolean;
  incidentCount: number;
}

interface UseShiftHandoffDataArgs {
  locationId: string | null;
  organizationId: string | null;
  shiftName: ShiftKey;
  shiftDate: string;
}

export function useShiftHandoffData({ locationId, organizationId, shiftName, shiftDate }: UseShiftHandoffDataArgs) {
  const [stats, setStats] = useState<ShiftStats>({
    tempCount: 0, checklistCount: 0, caResolved: 0, openItemCount: 0, allTempsInRange: true, incidentCount: 0,
  });
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [previousHandoff, setPreviousHandoff] = useState<PreviousHandoff | null>(null);
  const [existingHandoff, setExistingHandoff] = useState<ExistingHandoff | null>(null);
  const [shiftTemplateId, setShiftTemplateId] = useState<string | null>(null);
  const [shiftStartHour, setShiftStartHour] = useState(0);
  const [shiftEndHour, setShiftEndHour] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!locationId || !organizationId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      // Resolve shift time boundaries
      const shiftDef = DEFAULT_SHIFTS[shiftName];
      let startHour = shiftDef.startHour;
      let endHour = shiftDef.endHour;
      let templateId: string | null = null;

      try {
        const { data: tmpl } = await supabase
          .from('shift_templates')
          .select('id, start_time, end_time')
          .eq('organization_id', organizationId)
          .eq('location_id', locationId)
          .ilike('name', shiftName)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (tmpl) {
          templateId = tmpl.id;
          const sh = parseInt(tmpl.start_time, 10);
          const eh = parseInt(tmpl.end_time, 10);
          if (!isNaN(sh)) startHour = sh;
          if (!isNaN(eh)) endHour = eh;
        }
      } catch { /* shift_templates may not exist — use defaults */ }

      setShiftTemplateId(templateId);
      setShiftStartHour(startHour);
      setShiftEndHour(endHour);

      const startISO = `${shiftDate}T${String(startHour).padStart(2, '0')}:00:00`;
      const endISO   = `${shiftDate}T${String(endHour).padStart(2, '0')}:00:00`;

      const [tempRes, doneTaskRes, openTaskRes, caRes, incidentRes, prevRes, dupeRes] = await Promise.all([
        // 1. Temperature logs (need temp_pass for allTempsInRange)
        supabase.from('temperature_logs').select('temp_pass')
          .eq('facility_id', locationId).eq('shift', shiftName)
          .gte('reading_time', `${shiftDate}T00:00:00`)
          .lt('reading_time', `${shiftDate}T23:59:59.999`),

        // 2. Completed task instances
        supabase.from('task_instances').select('id', { count: 'exact' })
          .eq('location_id', locationId).eq('shift', shiftName).eq('date', shiftDate)
          .not('completed_at', 'is', null),

        // 3. Open task instances
        supabase.from('task_instances').select('title')
          .eq('location_id', locationId).eq('shift', shiftName).eq('date', shiftDate)
          .is('completed_at', null).neq('status', 'skipped'),

        // 4. Corrective actions resolved in shift window
        supabase.from('corrective_actions').select('id', { count: 'exact' })
          .eq('location_id', locationId)
          .gte('closed_at', startISO).lt('closed_at', endISO),

        // 5. Incidents reported in shift window
        supabase.from('incidents').select('id', { count: 'exact' })
          .eq('location_id', locationId).is('archived_at', null)
          .gte('created_at', startISO).lt('created_at', endISO),

        // 6. Previous handoff (most recent for this location, fetch a few to filter)
        supabase.from('shift_handoffs')
          .select('shift_name, shift_date, completed_at, notes, open_items, handed_off_by, stats_snapshot')
          .eq('location_id', locationId)
          .order('shift_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),

        // 7. Duplicate check for current shift
        supabase.from('shift_handoffs')
          .select('id, handed_off_by, notes, completed_at')
          .eq('location_id', locationId).eq('shift_date', shiftDate).eq('shift_name', shiftName)
          .limit(1).maybeSingle(),
      ]);

      const tempData = tempRes.data ?? [];
      const tempCount = tempData.length;
      const allTempsInRange = tempData.length === 0 || tempData.every(r => r.temp_pass !== false);

      const checklistCount = doneTaskRes.count ?? 0;
      const openTaskList = (openTaskRes.data ?? []).map(r => r.title).filter(Boolean) as string[];

      const caResolved = caRes.count ?? 0;
      const incidentCount = incidentRes.count ?? 0;

      // Filter previous handoff: exclude current shift+date combo
      const prevRows = (prevRes.data ?? []).filter(
        r => !(r.shift_date === shiftDate && r.shift_name === shiftName)
      );

      setStats({ tempCount, checklistCount, caResolved, openItemCount: openTaskList.length, allTempsInRange, incidentCount });
      setOpenItems(openTaskList);
      setPreviousHandoff((prevRows[0] as PreviousHandoff) ?? null);
      setExistingHandoff((dupeRes.data as ExistingHandoff) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift data');
      console.error('[ShiftHandoff]', err);
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

  return { stats, openItems, previousHandoff, existingHandoff, shiftTemplateId, shiftStartHour, shiftEndHour, loading, error, refetch: fetchData };
}
