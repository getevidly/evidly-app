/**
 * useCustomerChecklistInstances — CRUD for adopted checklist instances.
 *
 * Table: customer_checklist_instances
 * Each row = one master definition adopted by an organization.
 * facility_id and master_definition_id are nullable in PROD.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface CustomerChecklistInstance {
  id: string;
  organizationId: string;
  facilityId: string | null;
  masterDefinitionId: string | null;
  nameOverride: string | null;
  cadenceOverride: string | null;
  activeDays: string;
  dueWindows: unknown[];
  masterVersionPinned: string | null;
  lastSyncedMasterAt: string | null;
  isActive: boolean;
  customizedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields (when fetched with master def)
  masterDefinitionName?: string;
  masterDefinitionCode?: string;
  masterDefinitionCadence?: string;
  itemCount?: number;
  // Citation metadata (derived from instance items → master items)
  firstCalcodeSection?: string | null;
  firstHaccpCcp?: string | null;
  ccpCount?: number;
}

// ── Row Mapper ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CustomerChecklistInstance {
  const masterDef = row.master_checklist_definitions;

  // Extract citation metadata from nested instance_items → master_items join
  const instanceItems: any[] = row.customer_checklist_instance_items ?? [];
  let firstCalcodeSection: string | null = null;
  let firstHaccpCcp: string | null = null;
  let ccpCount = 0;

  for (const ii of instanceItems) {
    const mi = ii.master_checklist_definition_items;
    if (!mi) continue;
    if (!firstCalcodeSection && mi.calcode_section) firstCalcodeSection = mi.calcode_section;
    if (!firstHaccpCcp && mi.haccp_ccp) firstHaccpCcp = mi.haccp_ccp;
    if (mi.haccp_ccp) ccpCount++;
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    facilityId: row.facility_id ?? null,
    masterDefinitionId: row.master_definition_id ?? null,
    nameOverride: row.name_override ?? null,
    cadenceOverride: row.cadence_override ?? null,
    activeDays: row.active_days ?? 'MTWRFSU',
    dueWindows: row.due_windows ?? [],
    masterVersionPinned: row.master_version_pinned ?? null,
    lastSyncedMasterAt: row.last_synced_master_at ?? null,
    isActive: row.is_active ?? true,
    customizedAt: row.customized_at ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    masterDefinitionName: masterDef?.name ?? undefined,
    masterDefinitionCode: masterDef?.code ?? undefined,
    masterDefinitionCadence: masterDef?.cadence ?? undefined,
    itemCount: instanceItems.length > 0 ? instanceItems.length : undefined,
    firstCalcodeSection,
    firstHaccpCcp,
    ccpCount,
  };
}

// ── Query ─────────────────────────────────────────────────────

export function useCustomerChecklistInstances(): ApiQueryResult<CustomerChecklistInstance[]> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const queryFn = useCallback(async (): Promise<CustomerChecklistInstance[]> => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('customer_checklist_instances')
      .select(`
        *,
        master_checklist_definitions(name, code, cadence),
        customer_checklist_instance_items(
          id,
          master_checklist_definition_items(calcode_section, haccp_ccp)
        )
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  }, [orgId]);

  return useApiQuery(`customer-instances-${orgId ?? 'none'}`, queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export interface DeactivateInstanceInput {
  instanceId: string;
}

export function useDeactivateInstance(): ApiMutationResult<DeactivateInstanceInput> {
  const mutationFn = useCallback(async (args: DeactivateInstanceInput): Promise<void> => {
    const { error } = await supabase
      .from('customer_checklist_instances')
      .update({ is_active: false })
      .eq('id', args.instanceId);

    if (error) throw new Error(error.message);
  }, []);

  const demoFn = useCallback((_args: DeactivateInstanceInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export interface UpdateInstanceInput {
  instanceId: string;
  cadenceOverride?: string | null;
  activeDays?: string;
  dueWindows?: unknown[];
  nameOverride?: string | null;
  isActive?: boolean;
}

export function useUpdateInstance(): ApiMutationResult<UpdateInstanceInput> {
  const mutationFn = useCallback(async (args: UpdateInstanceInput): Promise<void> => {
    const { instanceId, ...fields } = args;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {};
    if (fields.cadenceOverride !== undefined) payload.cadence_override = fields.cadenceOverride;
    if (fields.activeDays !== undefined) payload.active_days = fields.activeDays;
    if (fields.dueWindows !== undefined) payload.due_windows = fields.dueWindows;
    if (fields.nameOverride !== undefined) payload.name_override = fields.nameOverride;
    if (fields.isActive !== undefined) payload.is_active = fields.isActive;

    const { error } = await supabase
      .from('customer_checklist_instances')
      .update(payload)
      .eq('id', instanceId);

    if (error) throw new Error(error.message);
  }, []);

  const demoFn = useCallback((_args: UpdateInstanceInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
