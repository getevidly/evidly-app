/**
 * useTaskDefinitions.ts — TASK-ASSIGN-01
 *
 * CRUD hook for task_definitions (admin/manager use).
 * Demo mode → empty array.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import type { TaskDefinition } from '../types/tasks';

type CreatePayload = Omit<TaskDefinition, 'id' | 'created_at' | 'updated_at'>;
type UpdatePayload = Partial<Omit<TaskDefinition, 'id' | 'org_id' | 'created_at' | 'updated_at'>>;

export function useTaskDefinitions() {
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const userId = user?.id;

  const [definitions, setDefinitions] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDefinitions = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setDefinitions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_definitions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[useTaskDefinitions] Fetch error:', error.message);
        setDefinitions([]);
        return;
      }

      setDefinitions(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, orgId]);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  const create = useCallback(
    async (payload: CreatePayload) => {
      if (isDemoMode || !orgId || !userId) return null;

      const { data, error } = await supabase
        .from('task_definitions')
        .insert({ ...payload, org_id: orgId, created_by: userId })
        .select()
        .single();

      if (error) {
        console.error('[useTaskDefinitions] Create error:', error.message);
        return null;
      }

      await fetchDefinitions();
      return data as TaskDefinition;
    },
    [isDemoMode, orgId, userId, fetchDefinitions]
  );

  const update = useCallback(
    async (id: string, payload: UpdatePayload) => {
      if (isDemoMode || !orgId) return;

      const { error } = await supabase
        .from('task_definitions')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) {
        console.error('[useTaskDefinitions] Update error:', error.message);
        return;
      }

      await fetchDefinitions();
    },
    [isDemoMode, orgId, fetchDefinitions]
  );

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      await update(id, { is_active: isActive });
    },
    [update]
  );

  return {
    definitions,
    loading,
    create,
    update,
    toggleActive,
    refetch: fetchDefinitions,
  };
}
