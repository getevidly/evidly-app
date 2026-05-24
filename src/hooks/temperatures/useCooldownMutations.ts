/**
 * useCooldownMutations.ts
 *
 * Three mutation hooks for cooldown PRP:
 * 1. useCreateCooldownEvent — inserts cooldown_events + initial cooldown_checks
 * 2. useLogCooldownCheck — inserts cooldown_checks + applies stage transition
 * 3. useLogCooldownDisposition — updates disposition + creates corrective_action
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiMutation, type ApiMutationResult } from '../api/useApiQuery';

// ── 1. Create Cooldown Event ────────────────────────────────

export interface CreateCooldownEventInput {
  organizationId: string;
  locationId: string;
  foodItemName: string;
  startingTemperature: number;
  coolingLocation?: string | null;
  createdBy?: string | null;
}

export interface CreateCooldownEventResult {
  eventId: string;
  checkId: string;
}

export function useCreateCooldownEvent(): ApiMutationResult<CreateCooldownEventInput, CreateCooldownEventResult> {
  const mutationFn = useCallback(async (input: CreateCooldownEventInput): Promise<CreateCooldownEventResult> => {
    const now = new Date();
    const stage1Target = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    const stage2Target = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6 hours

    const { data: eventRow, error: evErr } = await supabase
      .from('cooldown_events')
      .insert({
        organization_id: input.organizationId,
        location_id: input.locationId,
        food_item_name: input.foodItemName,
        starting_temperature: input.startingTemperature,
        cooling_location: input.coolingLocation ?? null,
        started_at: now.toISOString(),
        stage_1_target_at: stage1Target.toISOString(),
        stage_2_target_at: stage2Target.toISOString(),
        created_by: input.createdBy ?? null,
      })
      .select('id')
      .single();

    if (evErr) throw new Error(`Failed to create cooldown event: ${evErr.message}`);

    // Insert initial temp check
    const { data: checkRow, error: chErr } = await supabase
      .from('cooldown_checks')
      .insert({
        cooldown_event_id: eventRow.id,
        temperature: input.startingTemperature,
        checked_by: input.createdBy ?? null,
      })
      .select('id')
      .single();

    if (chErr) throw new Error(`Cooldown event created (${eventRow.id}) but initial check failed: ${chErr.message}`);

    return { eventId: eventRow.id, checkId: checkRow.id };
  }, []);

  const demoFn = useCallback((): CreateCooldownEventResult => ({
    eventId: crypto.randomUUID(),
    checkId: crypto.randomUUID(),
  }), []);

  return useApiMutation(mutationFn, demoFn);
}

// ── 2. Log Cooldown Check ───────────────────────────────────

export interface LogCooldownCheckInput {
  cooldownEventId: string;
  temperature: number;
  notes?: string | null;
  checkedBy?: string | null;
  /** Current status of the event for stage transition logic */
  currentStatus: string;
  /** Stage 1 target temp threshold (70°F) */
  stage1Threshold?: number;
}

export interface LogCooldownCheckResult {
  checkId: string;
  newStatus: string | null;
}

export function useLogCooldownCheck(): ApiMutationResult<LogCooldownCheckInput, LogCooldownCheckResult> {
  const mutationFn = useCallback(async (input: LogCooldownCheckInput): Promise<LogCooldownCheckResult> => {
    const { data: checkRow, error: chErr } = await supabase
      .from('cooldown_checks')
      .insert({
        cooldown_event_id: input.cooldownEventId,
        temperature: input.temperature,
        notes: input.notes ?? null,
        checked_by: input.checkedBy ?? null,
      })
      .select('id')
      .single();

    if (chErr) throw new Error(`Failed to log cooldown check: ${chErr.message}`);

    // Stage transition logic
    const threshold = input.stage1Threshold ?? 70;
    let newStatus: string | null = null;

    if (input.currentStatus === 'in_progress' && input.temperature <= threshold) {
      // Stage 1 complete: reached 70°F or below
      const { error: upErr } = await supabase
        .from('cooldown_events')
        .update({
          status: 'stage_1_complete',
          stage_1_completed_at: new Date().toISOString(),
        })
        .eq('id', input.cooldownEventId);

      if (upErr) throw new Error(`Check logged but stage transition failed: ${upErr.message}`);
      newStatus = 'stage_1_complete';
    } else if (input.currentStatus === 'stage_1_complete' && input.temperature <= 41) {
      // Stage 2 complete: reached 41°F or below
      const { error: upErr } = await supabase
        .from('cooldown_events')
        .update({
          status: 'completed',
          stage_2_completed_at: new Date().toISOString(),
        })
        .eq('id', input.cooldownEventId);

      if (upErr) throw new Error(`Check logged but stage transition failed: ${upErr.message}`);
      newStatus = 'completed';
    }

    return { checkId: checkRow.id, newStatus };
  }, []);

  const demoFn = useCallback((): LogCooldownCheckResult => ({
    checkId: crypto.randomUUID(),
    newStatus: null,
  }), []);

  return useApiMutation(mutationFn, demoFn);
}

// ── 3. Log Disposition ──────────────────────────────────────

export interface LogDispositionInput {
  cooldownEventId: string;
  disposition: 'discarded' | 'reheated_recooled' | 'other';
  dispositionNotes: string;
  witnessedBy: string | null;
  /** For CA creation */
  organizationId: string;
  locationId: string;
  foodItemName: string;
  failedStage: number | null;
}

export interface LogDispositionResult {
  correctiveActionId: string;
}

export function useLogCooldownDisposition(): ApiMutationResult<LogDispositionInput, LogDispositionResult> {
  const mutationFn = useCallback(async (input: LogDispositionInput): Promise<LogDispositionResult> => {
    // 1. Create corrective action
    const dispositionLabel = input.disposition === 'discarded' ? 'Discarded'
      : input.disposition === 'reheated_recooled' ? 'Reheated & Recooled'
      : 'Other';

    const { data: caRow, error: caErr } = await supabase
      .from('corrective_actions')
      .insert({
        organization_id: input.organizationId,
        location_id: input.locationId,
        title: `Cooldown failure — ${input.foodItemName}`,
        description: `Stage ${input.failedStage ?? '?'} failure. Disposition: ${dispositionLabel}. ${input.dispositionNotes}`.trim(),
        category: 'food_safety',
        severity: 'critical',
        status: 'created',
        source: `cooldown_event:${input.cooldownEventId}`,
        regulation_reference: 'CalCode §114002 · FDA §3-501.14',
      })
      .select('id')
      .single();

    if (caErr) throw new Error(`Failed to create corrective action: ${caErr.message}`);

    // 2. Update cooldown event with disposition + CA link
    const { error: upErr } = await supabase
      .from('cooldown_events')
      .update({
        disposition: input.disposition,
        disposition_notes: input.dispositionNotes,
        disposition_witnessed_by: input.witnessedBy,
        disposition_corrective_action_id: caRow.id,
      })
      .eq('id', input.cooldownEventId);

    if (upErr) throw new Error(`CA created (${caRow.id}) but event update failed: ${upErr.message}`);

    return { correctiveActionId: caRow.id };
  }, []);

  const demoFn = useCallback((): LogDispositionResult => ({
    correctiveActionId: crypto.randomUUID(),
  }), []);

  return useApiMutation(mutationFn, demoFn);
}
