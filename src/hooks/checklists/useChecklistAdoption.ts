/**
 * useChecklistAdoption — adopts a master definition for the organization.
 *
 * Creates a customer_checklist_instances row + copies all active
 * master_checklist_definition_items into customer_checklist_instance_items.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiMutation, type ApiMutationResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface AdoptChecklistInput {
  masterDefinitionId: string;
  facilityId?: string;
  cadenceOverride?: string;
  nameOverride?: string;
}

export interface AdoptChecklistResult {
  instanceId: string;
  itemCount: number;
}

// ── Mutation ──────────────────────────────────────────────────

export function useChecklistAdoption(): ApiMutationResult<AdoptChecklistInput, AdoptChecklistResult> {
  const { profile } = useAuth();

  const mutationFn = useCallback(async (args: AdoptChecklistInput): Promise<AdoptChecklistResult> => {
    const orgId = profile?.organization_id;
    if (!orgId) throw new Error('Not authenticated');

    // 1. Fetch master definition version
    const { data: masterDef, error: defError } = await supabase
      .from('master_checklist_definitions')
      .select('version')
      .eq('id', args.masterDefinitionId)
      .single();

    if (defError) throw new Error(defError.message);

    // 2. Create instance
    const { data: instance, error: instError } = await supabase
      .from('customer_checklist_instances')
      .insert({
        organization_id: orgId,
        master_definition_id: args.masterDefinitionId,
        facility_id: args.facilityId ?? null,
        cadence_override: args.cadenceOverride ?? null,
        name_override: args.nameOverride ?? null,
        master_version_pinned: masterDef?.version ?? '1.0.0',
        created_by: profile?.id ?? null,
      })
      .select('id')
      .single();

    if (instError) {
      // Unique constraint: org + master_definition already adopted
      if (instError.code === '23505') {
        throw new Error('This checklist has already been adopted for your organization.');
      }
      throw new Error(instError.message);
    }

    // 3. Fetch active master items
    const { data: masterItems, error: itemsError } = await supabase
      .from('master_checklist_definition_items')
      .select('id')
      .eq('definition_id', args.masterDefinitionId)
      .eq('is_active', true);

    if (itemsError) throw new Error(itemsError.message);

    // 4. Bulk-insert instance items
    if (masterItems && masterItems.length > 0) {
      const rows = masterItems.map((mi) => ({
        instance_id: instance.id,
        master_item_id: mi.id,
      }));

      const { error: bulkError } = await supabase
        .from('customer_checklist_instance_items')
        .insert(rows);

      if (bulkError) throw new Error(bulkError.message);
    }

    return {
      instanceId: instance.id,
      itemCount: masterItems?.length ?? 0,
    };
  }, [profile?.organization_id, profile?.id]);

  const demoFn = useCallback((args: AdoptChecklistInput): AdoptChecklistResult => ({
    instanceId: `demo-instance-${Date.now()}`,
    itemCount: 0,
  }), []);

  return useApiMutation(mutationFn, demoFn);
}
