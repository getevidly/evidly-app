/**
 * useTodayChecklists — computes which instances are due today.
 *
 * Combines customer_checklist_instances with today's completions
 * to determine which checklists need doing and their progress.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import type { CustomerChecklistInstance } from './useCustomerChecklistInstances';

// ── Types ─────────────────────────────────────────────────────

export interface TodayChecklist {
  instance: CustomerChecklistInstance;
  displayName: string;
  cadence: string;
  todayCompletionCount: number;
  latestCompletionId: string | null;
  latestCompletionStatus: string | null;
  latestScorePercentage: number | null;
  isDue: boolean;
}

// ── Day-of-week helper ────────────────────────────────────────

const DAY_LETTERS = ['U', 'M', 'T', 'W', 'R', 'F', 'S']; // Sun=0 .. Sat=6

function isTodayActive(activeDays: string): boolean {
  const today = DAY_LETTERS[new Date().getDay()];
  return activeDays.includes(today);
}

function cadenceRequiresMultiple(cadence: string): boolean {
  return cadence === 'per_shift' || cadence === 'multiple_daily';
}

// ── Hook ──────────────────────────────────────────────────────

export function useTodayChecklists(
  instances: CustomerChecklistInstance[],
): { todayChecklists: TodayChecklist[]; isLoading: boolean; refetch: () => void } {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;

  const [todayChecklists, setTodayChecklists] = useState<TodayChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const compute = useCallback(async () => {
    if (isDemoMode || !orgId || instances.length === 0) {
      setTodayChecklists([]);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch today's completions for all active instances
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const instanceIds = instances
        .filter((i) => i.isActive)
        .map((i) => i.id);

      if (instanceIds.length === 0) {
        setTodayChecklists([]);
        setIsLoading(false);
        return;
      }

      const { data: completions, error } = await supabase
        .from('customer_checklist_instance_completions')
        .select('id, instance_id, status, score_percentage, started_at')
        .eq('organization_id', orgId)
        .in('instance_id', instanceIds)
        .gte('started_at', todayStart.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;

      // Group completions by instance_id
      const completionsByInstance = new Map<string, typeof completions>();
      for (const c of completions ?? []) {
        const arr = completionsByInstance.get(c.instance_id) ?? [];
        arr.push(c);
        completionsByInstance.set(c.instance_id, arr);
      }

      // Build today's checklist list
      const result: TodayChecklist[] = [];

      for (const inst of instances) {
        if (!inst.isActive) continue;

        const cadence = inst.cadenceOverride ?? inst.masterDefinitionCadence ?? 'on_demand';

        // Skip weekly/monthly/quarterly unless specific logic is needed
        if (['weekly', 'monthly', 'quarterly'].includes(cadence)) continue;

        // Check if today is an active day
        if (!isTodayActive(inst.activeDays)) continue;

        const todayCompletions = completionsByInstance.get(inst.id) ?? [];
        const completedToday = todayCompletions.filter((c) => c.status === 'completed');
        const latestCompletion = todayCompletions[0] ?? null;

        // Determine if still due
        let isDue = true;
        if (cadence === 'once_daily' && completedToday.length >= 1) {
          isDue = false;
        }
        // per_shift and multiple_daily are always due (can be done multiple times)
        // on_demand is always available

        result.push({
          instance: inst,
          displayName: inst.nameOverride ?? inst.masterDefinitionName ?? 'Untitled Checklist',
          cadence,
          todayCompletionCount: completedToday.length,
          latestCompletionId: latestCompletion?.id ?? null,
          latestCompletionStatus: latestCompletion?.status ?? null,
          latestScorePercentage: latestCompletion?.score_percentage ?? null,
          isDue,
        });
      }

      // Sort: due first, then by name
      result.sort((a, b) => {
        if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
      });

      setTodayChecklists(result);
    } catch {
      setTodayChecklists([]);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, isDemoMode, instances]);

  useEffect(() => {
    compute();
  }, [compute]);

  return { todayChecklists, isLoading, refetch: compute };
}
