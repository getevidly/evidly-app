/**
 * useRightNow — C15
 *
 * Fetches top 2 pending task_instances for the current kitchen_staff user today.
 * Returns current (top priority) and next (second) tasks.
 *
 * TODO: Job aid block omitted — pending task_definitions.job_aid jsonb column (C16+).
 * When added, render .rightnow-job with steps from job_aid.steps array.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface RightNowTask {
  id: string;
  title: string;
  due_at: string;
  due_relative: string;
  location_name: string | null;
}

interface UseRightNowResult {
  current: RightNowTask | null;
  next: RightNowTask | null;
  loading: boolean;
  error: Error | null;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function computeDueRelative(dueAt: string): string {
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const absDiffMin = Math.abs(Math.round(diffMs / 60_000));

  if (diffMs > 0) {
    // Future
    if (absDiffMin <= 60) return `Due in ${absDiffMin} minute${absDiffMin === 1 ? '' : 's'}`;
    if (absDiffMin <= 240) {
      const h = Math.floor(absDiffMin / 60);
      const m = absDiffMin % 60;
      return m > 0 ? `Due in ${h}h ${m}m` : `Due in ${h}h`;
    }
    try {
      const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Due at ${fmt.format(due)}`;
    } catch { return 'Due soon'; }
  } else {
    // Overdue
    if (absDiffMin <= 60) return `Overdue ${absDiffMin} minute${absDiffMin === 1 ? '' : 's'}`;
    if (absDiffMin <= 240) {
      const h = Math.floor(absDiffMin / 60);
      return `Overdue ${h}h`;
    }
    try {
      const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Overdue since ${fmt.format(due)}`;
    } catch { return 'Overdue'; }
  }
}

export function useRightNow(): UseRightNowResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;
  const userId = profile?.id;

  const [current, setCurrent] = useState<RightNowTask | null>(null);
  const [next, setNext] = useState<RightNowTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isStaff = userRole === 'kitchen_staff';

  useEffect(() => {
    if (!orgId || !userId || !isStaff) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const today = todayDate();

        const { data, error: qErr } = await supabase
          .from('task_instances')
          .select('id, title, due_at, status, assigned_to, location_id, definition_id, locations(name), task_definitions!inner(assigned_to_role)')
          .eq('organization_id', orgId!)
          .eq('date', today)
          .eq('status', 'pending')
          .order('due_at', { ascending: true });

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        // Filter to tasks assigned to this user or role-matched
        const myTasks = (data || []).filter(row => {
          const r = row as Record<string, unknown>;
          const assignedTo = r.assigned_to as string | null;
          if (assignedTo === userId) return true;
          if (!assignedTo) {
            const td = r.task_definitions as { assigned_to_role: string | null } | null;
            return td?.assigned_to_role === userRole;
          }
          return false;
        });

        const toRightNowTask = (row: unknown): RightNowTask => {
          const r = row as Record<string, unknown>;
          const loc = r.locations as { name: string } | null;
          const dueAt = r.due_at as string;
          return {
            id: r.id as string,
            title: r.title as string,
            due_at: dueAt,
            due_relative: computeDueRelative(dueAt),
            location_name: loc?.name || null,
          };
        };

        setCurrent(myTasks.length > 0 ? toRightNowTask(myTasks[0]) : null);
        setNext(myTasks.length > 1 ? toRightNowTask(myTasks[1]) : null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, userId, isStaff, userRole]);

  return { current, next, loading, error };
}
