/**
 * useMasterChecklistDefinitions — fetches the master checklist library.
 *
 * Table: master_checklist_definitions (45 rows in PROD, immutable trigger).
 * All rows are pillar='food_safety'. Cadence: 4 per_shift, 1 once_daily,
 * 40 on_demand. No sort_order or category columns exist.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, type ApiQueryResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface MasterChecklistDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  pillar: string;
  cadence: string;
  appliesToJurisdictionTypes: string[] | null;
  appliesToFacilityTypes: string[] | null;
  version: string;
  effectiveDate: string | null;
  isActive: boolean;
  jieAuditStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Row Mapper ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MasterChecklistDefinition {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    pillar: row.pillar ?? 'food_safety',
    cadence: row.cadence ?? 'on_demand',
    appliesToJurisdictionTypes: row.applies_to_jurisdiction_types ?? null,
    appliesToFacilityTypes: row.applies_to_facility_types ?? null,
    version: row.version ?? '1.0.0',
    effectiveDate: row.effective_date ?? null,
    isActive: row.is_active ?? true,
    jieAuditStatus: row.jie_audit_status ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Query ─────────────────────────────────────────────────────

export interface MasterDefinitionFilters {
  pillar?: string;
  cadence?: string;
  search?: string;
  activeOnly?: boolean;
}

export function useMasterChecklistDefinitions(
  filters?: MasterDefinitionFilters,
): ApiQueryResult<MasterChecklistDefinition[]> {
  const { pillar, cadence, search, activeOnly = true } = filters ?? {};

  const cacheKey = [
    'master-checklist-defs',
    pillar ?? '',
    cadence ?? '',
    search ?? '',
    activeOnly ? '1' : '0',
  ].join(':');

  const queryFn = useCallback(async (): Promise<MasterChecklistDefinition[]> => {
    let query = supabase
      .from('master_checklist_definitions')
      .select('*')
      .order('name', { ascending: true });

    if (activeOnly) query = query.eq('is_active', true);
    if (pillar) query = query.eq('pillar', pillar);
    if (cadence) query = query.eq('cadence', cadence);
    if (search) {
      const q = `%${search}%`;
      query = query.or(`name.ilike.${q},code.ilike.${q},description.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }, [pillar, cadence, search, activeOnly]);

  return useApiQuery(cacheKey, queryFn, []);
}
