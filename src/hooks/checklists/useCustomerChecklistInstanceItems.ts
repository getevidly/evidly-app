/**
 * useCustomerChecklistInstanceItems — fetches items for a customer instance.
 *
 * Table: customer_checklist_instance_items
 * Each row links an instance to a master_checklist_definition_item.
 * Joins master item data for rendering prompts and HACCP fields.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, type ApiQueryResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface InstanceItem {
  id: string;
  instanceId: string;
  masterItemId: string;
  isActive: boolean;
  sortOrderOverride: number | null;
  // Joined master item fields
  sortOrder: number;
  prompt: string;
  promptType: string;
  expectedResponse: Record<string, unknown> | null;
  displayLabel: string | null;
  helpText: string | null;
  isRequired: boolean;
  haccpCcp: string | null;
  haccpCriticalLimit: string | null;
  tempMin: number | null;
  tempMax: number | null;
  tempUnit: string;
  isCritical: boolean;
  requiresPhotoOnFail: boolean;
  requiresCorrectiveAction: boolean;
}

// ── Row Mapper ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): InstanceItem {
  const mi = row.master_checklist_definition_items;
  return {
    id: row.id,
    instanceId: row.instance_id,
    masterItemId: row.master_item_id,
    isActive: row.is_active ?? true,
    sortOrderOverride: row.sort_order_override ?? null,
    // From joined master item
    sortOrder: mi?.sort_order ?? 0,
    prompt: mi?.prompt ?? '',
    promptType: mi?.prompt_type ?? 'yes_no',
    expectedResponse: mi?.expected_response ?? null,
    displayLabel: mi?.display_label ?? null,
    helpText: mi?.help_text ?? null,
    isRequired: mi?.is_required ?? true,
    haccpCcp: mi?.haccp_ccp ?? null,
    haccpCriticalLimit: mi?.haccp_critical_limit ?? null,
    tempMin: mi?.temp_min != null ? Number(mi.temp_min) : null,
    tempMax: mi?.temp_max != null ? Number(mi.temp_max) : null,
    tempUnit: mi?.temp_unit ?? 'F',
    isCritical: mi?.is_critical ?? false,
    requiresPhotoOnFail: mi?.requires_photo_on_fail ?? false,
    requiresCorrectiveAction: mi?.requires_corrective_action ?? false,
  };
}

// ── Query ─────────────────────────────────────────────────────

export function useCustomerChecklistInstanceItems(
  instanceId: string | undefined,
): ApiQueryResult<InstanceItem[]> {
  const queryFn = useCallback(async (): Promise<InstanceItem[]> => {
    if (!instanceId) return [];
    const { data, error } = await supabase
      .from('customer_checklist_instance_items')
      .select(`
        *,
        master_checklist_definition_items(
          sort_order, prompt, prompt_type, expected_response,
          display_label, help_text, is_required,
          haccp_ccp, haccp_critical_limit,
          temp_min, temp_max, temp_unit,
          is_critical, requires_photo_on_fail, requires_corrective_action
        )
      `)
      .eq('instance_id', instanceId)
      .eq('is_active', true);

    if (error) throw error;

    // Sort by override first, then master sort_order
    const rows = (data ?? []).map(mapRow);
    rows.sort((a, b) => {
      const aSort = a.sortOrderOverride ?? a.sortOrder;
      const bSort = b.sortOrderOverride ?? b.sortOrder;
      return aSort - bSort;
    });
    return rows;
  }, [instanceId]);

  return useApiQuery(`instance-items-${instanceId ?? 'none'}`, queryFn, []);
}
