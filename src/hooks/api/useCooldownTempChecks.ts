import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface CooldownTempCheck {
  id: string;
  cooldown_log_id: string;
  temperature_value: number;
  check_time: string | null;
  stage: number;
  created_at: string | null;
  is_override: boolean;
  overrides_log_id: string | null;
  superseded_by_log_id: string | null;
  override_reason: string | null;
}

export interface LogCooldownCheckInput {
  cooldownLogId: string;
  temperatureValue: number;
  stage: number;
  checkTime?: string | null;
}

export interface LogCooldownCheckResult {
  checkId: string;
}

// ── Queries ───────────────────────────────────────────────────

export function useCooldownTempChecks(
  cooldownLogId: string,
): ApiQueryResult<CooldownTempCheck[]> {
  const queryFn = useCallback(async (): Promise<CooldownTempCheck[]> => {
    const { data, error } = await supabase
      .from('cooldown_temp_checks')
      .select('*')
      .eq('cooldown_log_id', cooldownLogId)
      .order('check_time', { ascending: true });
    if (error) throw error;
    return (data as CooldownTempCheck[]) ?? [];
  }, [cooldownLogId]);

  return useApiQuery(`cooldown-temp-checks-${cooldownLogId}`, queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export function useLogCooldownCheck(): ApiMutationResult<LogCooldownCheckInput, LogCooldownCheckResult> {
  const mutationFn = useCallback(async (input: LogCooldownCheckInput): Promise<LogCooldownCheckResult> => {
    const { data, error } = await supabase
      .from('cooldown_temp_checks')
      .insert({
        cooldown_log_id: input.cooldownLogId,
        temperature_value: input.temperatureValue,
        stage: input.stage,
        ...(input.checkTime != null && { check_time: input.checkTime }),
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to log cooldown check: ${error.message}`);

    return { checkId: data.id };
  }, []);

  const demoFn = useCallback((): LogCooldownCheckResult => ({
    checkId: crypto.randomUUID(),
  }), []);

  return useApiMutation(mutationFn, demoFn);
}
