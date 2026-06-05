/**
 * useChecklistStatus — C11
 *
 * Queries today's task_instances joined with task_definitions
 * for food_safety pillar. Groups by cadence (daily/weekly/monthly),
 * computes per-item status, and provides completeInstance action.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrgSummary } from './useOrgSummary';

export type ChecklistItemStatus = 'done' | 'overdue' | 'due' | 'upcoming';

export interface ChecklistItem {
  instanceId: string;
  definitionId: string;
  title: string;
  taskType: string;
  scheduleType: string;
  assignedToRole: string | null;
  status: ChecklistItemStatus;
  dueAt: string;
  completedAt: string | null;
  shift: string | null;
}

export interface ChecklistSummary {
  dailyDone: number;
  dailyTotal: number;
  weeklyDone: number;
  weeklyTotal: number;
  monthlyDone: number;
  monthlyTotal: number;
  overdueCount: number;
  dueCount: number;
}

interface UseChecklistStatusReturn {
  dailyItems: ChecklistItem[];
  weeklyItems: ChecklistItem[];
  monthlyItems: ChecklistItem[];
  summary: ChecklistSummary;
  loading: boolean;
  error: string | null;
  completeInstance: (instanceId: string) => Promise<boolean>;
}

const DONE_STATUSES = ['completed', 'passed'];

function computeItemStatus(
  instanceStatus: string,
  dueAt: string,
  now: Date,
): ChecklistItemStatus {
  if (DONE_STATUSES.includes(instanceStatus)) return 'done';
  if (instanceStatus === 'overdue' || instanceStatus === 'escalated') return 'overdue';
  const dueTime = new Date(dueAt).getTime();
  const nowTime = now.getTime();
  if (dueTime < nowTime) return 'overdue';
  if (dueTime - nowTime < 2 * 60 * 60 * 1000) return 'due';
  return 'upcoming';
}

/** Returns today's date string in the org timezone (YYYY-MM-DD). */
function todayInTimezone(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    return parts; // en-CA formats as YYYY-MM-DD
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function useChecklistStatus(options?: { locationIdFilter?: string }): UseChecklistStatusReturn {
  const { user, profile } = useAuth();
  const orgId = profile?.organization_id;
  const { timezone } = useOrgSummary();
  const locationIdFilter = options?.locationIdFilter;

  const [dailyItems, setDailyItems] = useState<ChecklistItem[]>([]);
  const [weeklyItems, setWeeklyItems] = useState<ChecklistItem[]>([]);
  const [monthlyItems, setMonthlyItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const today = todayInTimezone(timezone);
      let q = supabase
        .from('task_instances')
        .select(`
          id,
          definition_id,
          title,
          task_type,
          pillar,
          status,
          due_at,
          completed_at,
          shift,
          task_definitions!inner (
            schedule_type,
            assigned_to_role,
            pillar,
            is_active
          )
        `)
        .eq('organization_id', orgId)
        .eq('task_definitions.pillar', 'food_safety')
        .eq('task_definitions.is_active', true)
        .eq('date', today)
        .order('due_at', { ascending: true });
      if (locationIdFilter) {
        q = q.or(`location_id.eq.${locationIdFilter},location_id.is.null`);
      }
      const { data, error: queryErr } = await q;

      if (queryErr) throw new Error(queryErr.message);

      const now = new Date();
      const daily: ChecklistItem[] = [];
      const weekly: ChecklistItem[] = [];
      const monthly: ChecklistItem[] = [];

      for (const row of data ?? []) {
        const def = row.task_definitions as unknown as {
          schedule_type: string;
          assigned_to_role: string | null;
          pillar: string;
          is_active: boolean;
        };

        const item: ChecklistItem = {
          instanceId: row.id,
          definitionId: row.definition_id,
          title: row.title,
          taskType: row.task_type,
          scheduleType: def.schedule_type,
          assignedToRole: def.assigned_to_role,
          status: computeItemStatus(row.status, row.due_at, now),
          dueAt: row.due_at,
          completedAt: row.completed_at,
          shift: row.shift || null,
        };

        if (def.schedule_type === 'weekly') weekly.push(item);
        else if (def.schedule_type === 'monthly') monthly.push(item);
        else daily.push(item); // daily, shift, custom all map to daily cadence
      }

      setDailyItems(daily);
      setWeeklyItems(weekly);
      setMonthlyItems(monthly);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orgId, timezone, locationIdFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary: ChecklistSummary = {
    dailyDone: dailyItems.filter(i => i.status === 'done').length,
    dailyTotal: dailyItems.length,
    weeklyDone: weeklyItems.filter(i => i.status === 'done').length,
    weeklyTotal: weeklyItems.length,
    monthlyDone: monthlyItems.filter(i => i.status === 'done').length,
    monthlyTotal: monthlyItems.length,
    overdueCount:
      dailyItems.filter(i => i.status === 'overdue').length +
      weeklyItems.filter(i => i.status === 'overdue').length +
      monthlyItems.filter(i => i.status === 'overdue').length,
    dueCount:
      dailyItems.filter(i => i.status === 'due').length +
      weeklyItems.filter(i => i.status === 'due').length +
      monthlyItems.filter(i => i.status === 'due').length,
  };

  const completeInstance = useCallback(async (instanceId: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Optimistic update
    const updateItems = (items: ChecklistItem[]) =>
      items.map(i =>
        i.instanceId === instanceId
          ? { ...i, status: 'done' as ChecklistItemStatus, completedAt: new Date().toISOString() }
          : i,
      );
    setDailyItems(prev => updateItems(prev));
    setWeeklyItems(prev => updateItems(prev));
    setMonthlyItems(prev => updateItems(prev));

    const { error: updateErr } = await supabase
      .from('task_instances')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq('id', instanceId);

    if (updateErr) {
      // Rollback on error
      await fetchData();
      return false;
    }
    return true;
  }, [user?.id, fetchData]);

  return { dailyItems, weeklyItems, monthlyItems, summary, loading, error, completeInstance };
}
