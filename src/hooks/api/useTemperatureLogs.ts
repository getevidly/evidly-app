import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export type HaccpStep = 'hot_holding' | 'cold_holding' | 'storage' | 'prep' | 'cooking' | 'serving';
export type InputMethod = 'manual' | 'qr_scan' | 'iot_sensor';

export interface TemperatureLog {
  id: string;
  facility_id: string;
  equipment_id: string | null;
  step: HaccpStep | string;
  ccp_number: number | null;
  temperature: number;
  required_min: number | null;
  required_max: number | null;
  temp_pass: boolean;
  reading_time: string;
  input_method: InputMethod;
  shift: string | null;
  log_type: string;
  logged_by: string | null;
  notes: string | null;
  corrective_action: string | null;
  food_batch_id: string | null;
  is_override: boolean;
  overrides_log_id: string | null;
  superseded_by_log_id: string | null;
  override_reason: string | null;
  created_at: string;
}

export interface UseTemperatureLogsOptions {
  locationId: string;
  step?: HaccpStep;
  steps?: HaccpStep[];
  sinceHours?: number;
  since?: string;
  until?: string;
  limit?: number;
  excludeOverridden?: boolean;
}

export interface LogTemperatureInput {
  locationId: string;
  equipmentId: string | null;
  step: HaccpStep;
  temperature: number;
  requiredMin?: number | null;
  requiredMax?: number | null;
  tempPass: boolean;
  readingTime?: string;
  inputMethod: InputMethod;
  shift?: string | null;
  loggedBy?: string | null;
  notes?: string | null;
  correctiveAction?: string | null;
  foodBatchId?: string | null;
  isOverride?: boolean;
  overridesLogId?: string | null;
  overrideReason?: string | null;
}

export interface LogTemperatureResult {
  id: string;
}

// ── Read Hook ─────────────────────────────────────────────────

export function useTemperatureLogs(
  options: UseTemperatureLogsOptions,
): ApiQueryResult<TemperatureLog[]> {
  const {
    locationId,
    step,
    steps,
    sinceHours,
    since,
    until,
    limit = 200,
    excludeOverridden = true,
  } = options;

  if (step && steps) {
    console.warn('useTemperatureLogs: both step and steps provided — using step (single).');
  }

  // Stable primitive for dep array — avoids inline array identity churn
  const stepsKey = steps ? steps.join(',') : '';

  // Cache key encodes INTENT, not computed timestamps
  const stepKey = step ?? (stepsKey || 'all');
  const cacheKey = locationId
    ? [
        'temperature-logs',
        locationId,
        stepKey,
        since ? `since:${since}` : '',
        until ? `until:${until}` : '',
        !since && !until ? `lastHours:${sinceHours ?? 24}` : '',
        `limit:${limit}`,
        `excludeOverridden:${excludeOverridden}`,
      ].filter(Boolean).join(':')
    : 'temperature-logs:empty';

  const queryFn = useCallback(async (): Promise<TemperatureLog[]> => {
    if (!locationId) return [];

    let query = supabase
      .from('temperature_logs')
      .select('*')
      .eq('facility_id', locationId);

    // Step filter
    if (step) {
      query = query.eq('step', step);
    } else if (steps && steps.length > 0) {
      query = query.in('step', steps);
    }

    // Time filters — computed fresh at execution time
    const computedSince = since
      ?? (until ? undefined : new Date(Date.now() - (sinceHours ?? 24) * 60 * 60 * 1000).toISOString());

    if (computedSince) {
      query = query.gte('reading_time', computedSince);
    }
    if (until) {
      query = query.lte('reading_time', until);
    }

    // Override filter
    if (excludeOverridden) {
      query = query.is('superseded_by_log_id', null);
    }

    query = query.order('reading_time', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data as TemperatureLog[]) ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, step, stepsKey, since, until, sinceHours, limit, excludeOverridden]);

  return useApiQuery(cacheKey, queryFn, []);
}

// ── Mutation Hook ─────────────────────────────────────────────

export function useLogTemperature(): ApiMutationResult<LogTemperatureInput, LogTemperatureResult> {
  const mutationFn = useCallback(async (input: LogTemperatureInput): Promise<LogTemperatureResult> => {
    const { data, error } = await supabase
      .from('temperature_logs')
      .insert({
        facility_id: input.locationId,
        equipment_id: input.equipmentId,
        step: input.step,
        log_type: input.step,
        temperature: input.temperature,
        required_min: input.requiredMin ?? null,
        required_max: input.requiredMax ?? null,
        temp_pass: input.tempPass,
        reading_time: input.readingTime ?? new Date().toISOString(),
        input_method: input.inputMethod,
        shift: input.shift ?? null,
        logged_by: input.loggedBy ?? null,
        notes: input.notes ?? null,
        corrective_action: input.correctiveAction ?? null,
        food_batch_id: input.foodBatchId ?? null,
        is_override: input.isOverride ?? false,
        overrides_log_id: input.overridesLogId ?? null,
        override_reason: input.overrideReason ?? null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('A reading already exists for this equipment and step in the same minute. Use override if intentional.');
      }
      throw new Error(error.message ?? 'Failed to log temperature');
    }

    return { id: data.id };
  }, []);

  const demoFn = useCallback((): LogTemperatureResult => ({
    id: crypto.randomUUID(),
  }), []);

  return useApiMutation(mutationFn, demoFn);
}
