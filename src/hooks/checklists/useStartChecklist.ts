/**
 * useStartChecklist — creates an in_progress completion for an instance.
 *
 * Table: customer_checklist_instance_completions
 * Locks the master_version_snapshot at start time.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiMutation, type ApiMutationResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface StartChecklistInput {
  instanceId: string;
  locationId: string;
  masterVersionSnapshot: string;
  loggedRetroactively?: boolean;
  retroactiveReason?: string;
  latitude?: number;
  longitude?: number;
}

export interface StartChecklistResult {
  completionId: string;
  startedAt: string;
}

// ── Mutation ──────────────────────────────────────────────────

export function useStartChecklist(): ApiMutationResult<StartChecklistInput, StartChecklistResult> {
  const { profile } = useAuth();

  const mutationFn = useCallback(async (args: StartChecklistInput): Promise<StartChecklistResult> => {
    const orgId = profile?.organization_id;
    const userId = profile?.id;
    if (!orgId || !userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('customer_checklist_instance_completions')
      .insert({
        instance_id: args.instanceId,
        organization_id: orgId,
        location_id: args.locationId,
        started_by: userId,
        status: 'in_progress',
        master_version_snapshot: args.masterVersionSnapshot,
        logged_retroactively: args.loggedRetroactively ?? false,
        retroactive_reason: args.retroactiveReason ?? null,
        retroactive_logged_at: args.loggedRetroactively ? new Date().toISOString() : null,
        latitude: args.latitude ?? null,
        longitude: args.longitude ?? null,
      })
      .select('id, started_at')
      .single();

    if (error) throw new Error(error.message);
    return {
      completionId: data.id,
      startedAt: data.started_at,
    };
  }, [profile?.organization_id, profile?.id]);

  const demoFn = useCallback((_args: StartChecklistInput): StartChecklistResult => ({
    completionId: `demo-completion-${Date.now()}`,
    startedAt: new Date().toISOString(),
  }), []);

  return useApiMutation(mutationFn, demoFn);
}
