/**
 * useChecklistResponse — submits a single item response.
 *
 * Table: customer_checklist_instance_responses
 * HACCP cross-posting trigger fires on INSERT when temperature_reading
 * is present and the master item has a haccp_ccp value.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiMutation, type ApiMutationResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface SubmitResponseInput {
  completionId: string;
  masterItemId: string;
  responseValue: string;
  responseType?: string;
  isPass?: boolean;
  temperatureReading?: number;
  correctiveAction?: string;
  photoUrl?: string;
  deviceId?: string;
}

export interface SubmitResponseResult {
  responseId: string;
}

// ── Mutation ──────────────────────────────────────────────────

export function useChecklistResponse(): ApiMutationResult<SubmitResponseInput, SubmitResponseResult> {
  const { profile } = useAuth();

  const mutationFn = useCallback(async (args: SubmitResponseInput): Promise<SubmitResponseResult> => {
    const userId = profile?.id;
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('customer_checklist_instance_responses')
      .insert({
        completion_id: args.completionId,
        master_item_id: args.masterItemId,
        response_value: args.responseValue,
        response_type: args.responseType ?? null,
        is_pass: args.isPass ?? null,
        temperature_reading: args.temperatureReading ?? null,
        corrective_action: args.correctiveAction ?? null,
        photo_url: args.photoUrl ?? null,
        device_id: args.deviceId ?? null,
        responded_by: userId,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return { responseId: data.id };
  }, [profile?.id]);

  const demoFn = useCallback((_args: SubmitResponseInput): SubmitResponseResult => ({
    responseId: `demo-response-${Date.now()}`,
  }), []);

  return useApiMutation(mutationFn, demoFn);
}

// ── Batch Submit ──────────────────────────────────────────────

export function useBatchChecklistResponses(): ApiMutationResult<SubmitResponseInput[], SubmitResponseResult[]> {
  const { profile } = useAuth();

  const mutationFn = useCallback(async (args: SubmitResponseInput[]): Promise<SubmitResponseResult[]> => {
    const userId = profile?.id;
    if (!userId) throw new Error('Not authenticated');

    const rows = args.map((r) => ({
      completion_id: r.completionId,
      master_item_id: r.masterItemId,
      response_value: r.responseValue,
      response_type: r.responseType ?? null,
      is_pass: r.isPass ?? null,
      temperature_reading: r.temperatureReading ?? null,
      corrective_action: r.correctiveAction ?? null,
      photo_url: r.photoUrl ?? null,
      device_id: r.deviceId ?? null,
      responded_by: userId,
    }));

    const { data, error } = await supabase
      .from('customer_checklist_instance_responses')
      .insert(rows)
      .select('id');

    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => ({ responseId: d.id }));
  }, [profile?.id]);

  const demoFn = useCallback((args: SubmitResponseInput[]): SubmitResponseResult[] =>
    args.map(() => ({ responseId: `demo-response-${Date.now()}-${Math.random()}` })),
  []);

  return useApiMutation(mutationFn, demoFn);
}
