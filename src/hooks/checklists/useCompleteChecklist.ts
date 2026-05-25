/**
 * useCompleteChecklist — marks a completion as 'completed'.
 *
 * The auto-scoring trigger (fn_cci_completions_compute_score) fires
 * on UPDATE and computes total_items, passed_items, failed_items,
 * skipped_items, score_percentage automatically.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiMutation, type ApiMutationResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface CompleteChecklistInput {
  completionId: string;
  notes?: string;
}

export interface CompleteChecklistResult {
  completionId: string;
  scorePercentage: number | null;
  totalItems: number;
  passedItems: number;
  failedItems: number;
}

// ── Mutation ──────────────────────────────────────────────────

export function useCompleteChecklist(): ApiMutationResult<CompleteChecklistInput, CompleteChecklistResult> {
  const { profile } = useAuth();

  const mutationFn = useCallback(async (args: CompleteChecklistInput): Promise<CompleteChecklistResult> => {
    const userId = profile?.id;
    if (!userId) throw new Error('Not authenticated');

    // Update status to 'completed' — trigger computes score
    const { data, error } = await supabase
      .from('customer_checklist_instance_completions')
      .update({
        status: 'completed',
        completed_by: userId,
        notes: args.notes ?? null,
      })
      .eq('id', args.completionId)
      .select('id, score_percentage, total_items, passed_items, failed_items')
      .single();

    if (error) throw new Error(error.message);
    return {
      completionId: data.id,
      scorePercentage: data.score_percentage,
      totalItems: data.total_items,
      passedItems: data.passed_items,
      failedItems: data.failed_items,
    };
  }, [profile?.id]);

  const demoFn = useCallback((_args: CompleteChecklistInput): CompleteChecklistResult => ({
    completionId: _args.completionId,
    scorePercentage: 100,
    totalItems: 0,
    passedItems: 0,
    failedItems: 0,
  }), []);

  return useApiMutation(mutationFn, demoFn);
}

// ── Abandon ───────────────────────────────────────────────────

export interface AbandonChecklistInput {
  completionId: string;
  notes?: string;
}

export function useAbandonChecklist(): ApiMutationResult<AbandonChecklistInput> {
  const mutationFn = useCallback(async (args: AbandonChecklistInput): Promise<void> => {
    const { error } = await supabase
      .from('customer_checklist_instance_completions')
      .update({
        status: 'abandoned',
        notes: args.notes ?? null,
      })
      .eq('id', args.completionId);

    if (error) throw new Error(error.message);
  }, []);

  const demoFn = useCallback((_args: AbandonChecklistInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
