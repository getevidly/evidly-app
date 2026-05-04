/**
 * useTaskTemplates.ts — TASK-ASSIGN-01
 *
 * Fetches task_definition_templates (system library) and annotates each
 * with usage state for this org. A template is "in use" when this org has
 * a task_definitions row with template_id matching it.
 *
 * Demo mode → empty array (templates surface only in live mode).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import type {
  TaskDefinitionTemplate,
  TaskDefinitionTemplateWithUsage,
} from '../types/tasks';

export function useTaskTemplates() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;

  const [templates, setTemplates] = useState<TaskDefinitionTemplateWithUsage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch all active system templates
      const { data: tplData, error: tplError } = await supabase
        .from('task_definition_templates')
        .select('*')
        .eq('is_active', true)
        .order('schedule_type', { ascending: true })
        .order('due_time', { ascending: true });

      if (tplError) {
        console.warn('[useTaskTemplates] Template fetch error:', tplError.message);
        setTemplates([]);
        return;
      }

      const tpls = (tplData ?? []) as TaskDefinitionTemplate[];
      if (tpls.length === 0) {
        setTemplates([]);
        return;
      }

      // 2. Fetch this org's definitions that reference any of these templates
      const tplIds = tpls.map((t) => t.id);
      const { data: defData, error: defError } = await supabase
        .from('task_definitions')
        .select('id, template_id')
        .eq('organization_id', orgId)
        .in('template_id', tplIds)
        .is('archived_at', null);

      if (defError) {
        console.warn('[useTaskTemplates] Definition lookup error:', defError.message);
        // Still show templates without usage state rather than failing entirely
        setTemplates(
          tpls.map((t) => ({ ...t, inUse: false, existingDefinitionId: null }))
        );
        return;
      }

      // 3. Build template_id → definition_id map
      const usageMap = new Map<string, string>();
      (defData ?? []).forEach((d: { id: string; template_id: string | null }) => {
        if (d.template_id) usageMap.set(d.template_id, d.id);
      });

      // 4. Annotate templates with usage state
      const annotated: TaskDefinitionTemplateWithUsage[] = tpls.map((t) => ({
        ...t,
        inUse: usageMap.has(t.id),
        existingDefinitionId: usageMap.get(t.id) ?? null,
      }));

      setTemplates(annotated);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, orgId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    refetch: fetchTemplates,
  };
}
