import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export type ItemCategory =
  | 'poultry'
  | 'ground_beef'
  | 'whole_muscle_beef'
  | 'pork'
  | 'fish'
  | 'eggs'
  | 'vegetables'
  | 'soup_stew'
  | 'dairy'
  | 'grain_pasta';

export interface CooldownLog {
  id: string;
  organization_id: string;
  location_id: string | null;
  food_item_name: string;
  starting_temp: number;
  stage1_target_temp: number | null;
  stage2_target_temp: number | null;
  current_stage: number | null;
  status: string | null;
  start_time: string | null;
  stage1_complete_time: string | null;
  stage2_complete_time: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  food_batch_id: string | null;
  step: string;
  ccp_number: number | null;
  is_override: boolean;
  overrides_log_id: string | null;
  superseded_by_log_id: string | null;
  override_reason: string | null;
  menu_item_id: string | null;
  item_category: ItemCategory | null;
}

export interface StartCooldownInput {
  organizationId: string;
  locationId: string;
  foodItemName: string;
  startingTemp: number;
  menuItemId?: string | null;
  itemCategory?: ItemCategory | null;
  recordedBy?: string | null;
  notes?: string | null;
}

export interface StartCooldownResult {
  cooldownLogId: string;
  startCheckId: string;
}

interface UseCooldownLogsOptions {
  isActiveOnly?: boolean;
}

// ── Queries ───────────────────────────────────────────────────

export function useCooldownLogs(
  locationId: string,
  options?: UseCooldownLogsOptions,
): ApiQueryResult<CooldownLog[]> {
  const { isActiveOnly = false } = options ?? {};

  const queryFn = useCallback(async (): Promise<CooldownLog[]> => {
    // Explicit location filter: cooldown_logs RLS scopes to org only, not location.
    // Other reference-data hooks (sensor_devices, vendor_contacts, menu_items) skip this
    // because their RLS policies scope by location directly.
    let query = supabase
      .from('cooldown_logs')
      .select('*')
      .eq('location_id', locationId);
    if (isActiveOnly) query = query.eq('status', 'active');
    query = query.order('start_time', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return (data as CooldownLog[]) ?? [];
  }, [locationId, isActiveOnly]);

  return useApiQuery(`cooldown-logs-${locationId}-${isActiveOnly}`, queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export function useStartCooldown(): ApiMutationResult<StartCooldownInput, StartCooldownResult> {
  const mutationFn = useCallback(async (input: StartCooldownInput): Promise<StartCooldownResult> => {
    // 1. Insert cooldown_logs row
    const { data: logRow, error: logError } = await supabase
      .from('cooldown_logs')
      .insert({
        organization_id: input.organizationId,
        location_id: input.locationId,
        food_item_name: input.foodItemName,
        starting_temp: input.startingTemp,
        ccp_number: 4,
        menu_item_id: input.menuItemId ?? null,
        item_category: input.itemCategory ?? null,
        recorded_by: input.recordedBy ?? null,
        notes: input.notes ?? null,
      })
      .select('id')
      .single();

    if (logError) throw new Error(`Failed to create cooldown log: ${logError.message}`);

    // 2. Insert initial temp check (starting temperature, stage 1).
    // If this fails, the cooldown_logs row remains — recoverable manually
    // and preferable to the complexity of a client-side rollback.
    const { data: checkRow, error: checkError } = await supabase
      .from('cooldown_temp_checks')
      .insert({
        cooldown_log_id: logRow.id,
        temperature_value: input.startingTemp,
        stage: 1,
      })
      .select('id')
      .single();

    if (checkError) throw new Error(`Cooldown log created (${logRow.id}) but initial check failed: ${checkError.message}`);

    return {
      cooldownLogId: logRow.id,
      startCheckId: checkRow.id,
    };
  }, []);

  const demoFn = useCallback((): StartCooldownResult => ({
    cooldownLogId: crypto.randomUUID(),
    startCheckId: crypto.randomUUID(),
  }), []);

  return useApiMutation(mutationFn, demoFn);
}
