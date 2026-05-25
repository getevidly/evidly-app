/**
 * useMasterChecklistDefinitionItems — fetches items for a master definition.
 *
 * Table: master_checklist_definition_items (262 rows total in PROD).
 * Uses prompt_type (not item_type). Has HACCP columns from Phase 1 migration.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, type ApiQueryResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface MasterChecklistItem {
  id: string;
  definitionId: string;
  sortOrder: number;
  prompt: string;
  promptType: string;
  expectedResponse: Record<string, unknown> | null;
  displayLabel: string | null;
  helpText: string | null;
  calcodeSection: string | null;
  fdaSection: string | null;
  nfpaSection: string | null;
  riskFactorId: string | null;
  inspectionViolationCategory: string | null;
  inspectionSeverityIfFailed: string | null;
  firesCorrectiveAction: boolean;
  evidenceArtifactRequired: boolean;
  isRequired: boolean;
  isActive: boolean;
  // HACCP fields (Phase 1 migration)
  haccpCcp: string | null;
  haccpHazard: string | null;
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
function mapRow(row: any): MasterChecklistItem {
  return {
    id: row.id,
    definitionId: row.definition_id,
    sortOrder: row.sort_order ?? 0,
    prompt: row.prompt ?? '',
    promptType: row.prompt_type ?? 'yes_no',
    expectedResponse: row.expected_response ?? null,
    displayLabel: row.display_label ?? null,
    helpText: row.help_text ?? null,
    calcodeSection: row.calcode_section ?? null,
    fdaSection: row.fda_section ?? null,
    nfpaSection: row.nfpa_section ?? null,
    riskFactorId: row.risk_factor_id ?? null,
    inspectionViolationCategory: row.inspection_violation_category ?? null,
    inspectionSeverityIfFailed: row.inspection_severity_if_failed ?? null,
    firesCorrectiveAction: row.fires_corrective_action ?? false,
    evidenceArtifactRequired: row.evidence_artifact_required ?? false,
    isRequired: row.is_required ?? true,
    isActive: row.is_active ?? true,
    haccpCcp: row.haccp_ccp ?? null,
    haccpHazard: row.haccp_hazard ?? null,
    haccpCriticalLimit: row.haccp_critical_limit ?? null,
    tempMin: row.temp_min != null ? Number(row.temp_min) : null,
    tempMax: row.temp_max != null ? Number(row.temp_max) : null,
    tempUnit: row.temp_unit ?? 'F',
    isCritical: row.is_critical ?? false,
    requiresPhotoOnFail: row.requires_photo_on_fail ?? false,
    requiresCorrectiveAction: row.requires_corrective_action ?? false,
  };
}

// ── Query ─────────────────────────────────────────────────────

export function useMasterChecklistDefinitionItems(
  definitionId: string | undefined,
): ApiQueryResult<MasterChecklistItem[]> {
  const queryFn = useCallback(async (): Promise<MasterChecklistItem[]> => {
    if (!definitionId) return [];
    const { data, error } = await supabase
      .from('master_checklist_definition_items')
      .select('*')
      .eq('definition_id', definitionId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  }, [definitionId]);

  return useApiQuery(`master-def-items-${definitionId ?? 'none'}`, queryFn, []);
}
