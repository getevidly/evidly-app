/**
 * useTaskInstances.ts — TASK-ASSIGN-01
 *
 * Queries today's task instances for the current user (by user_id OR assigned_role).
 * Supabase realtime subscription for live updates.
 * Demo mode → empty array.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import type { TaskInstance } from '../types/tasks';

export function useTaskInstances() {
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const userId = user?.id;
  const userRole = profile?.role;

  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchTasks = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setTasks([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_instances')
        .select('*')
        .eq('organization_id', orgId)
        .eq('date', today)
        .order('due_at', { ascending: true });

      if (error) {
        console.warn('[useTaskInstances] Fetch error:', error.message);
        setTasks([]);
        return;
      }

      setTasks(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, orgId, today]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (isDemoMode || !orgId) return;

    channelRef.current = supabase
      .channel(`task_instances_${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_instances',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isDemoMode, orgId, fetchTasks]);

  // ── Mutations ──

  const startTask = useCallback(
    async (taskId: string) => {
      if (isDemoMode || !userId) return;
      await supabase
        .from('task_instances')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', taskId);
    },
    [isDemoMode, userId]
  );

  const completeTask = useCallback(
    async (taskId: string, note?: string) => {
      if (isDemoMode || !userId) return;
      await supabase
        .from('task_instances')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId,
          completion_note: note ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
    },
    [isDemoMode, userId]
  );

  const skipTask = useCallback(
    async (taskId: string, note?: string) => {
      if (isDemoMode || !userId) return;
      await supabase
        .from('task_instances')
        .update({
          status: 'skipped',
          completion_note: note ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
    },
    [isDemoMode, userId]
  );

  // Filter helpers
  const myTasks = tasks.filter((t) => t.assigned_to === userId);
  const unassignedTasks = tasks.filter((t) => !t.assigned_to);
  const overdueTasks = tasks.filter((t) => t.status === 'overdue' || t.status === 'escalated');

  return {
    tasks,
    myTasks,
    unassignedTasks,
    overdueTasks,
    loading,
    startTask,
    completeTask,
    skipTask,
    refetch: fetchTasks,
  };
}
