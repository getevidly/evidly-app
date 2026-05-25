/**
 * useChecklistHistory — fetches past completions with filters.
 *
 * Table: customer_checklist_instance_completions
 * Joins instance name and user profiles for display.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiQuery, type ApiQueryResult } from '../api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface ChecklistHistoryEntry {
  id: string;
  instanceId: string;
  checklistName: string;
  organizationId: string;
  locationId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  startedByName: string | null;
  completedByName: string | null;
  scorePercentage: number | null;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  skippedItems: number;
  loggedRetroactively: boolean;
  retroactiveReason: string | null;
  notes: string | null;
}

// ── Row Mapper ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ChecklistHistoryEntry {
  const instance = row.customer_checklist_instances;
  const masterDef = instance?.master_checklist_definitions;
  return {
    id: row.id,
    instanceId: row.instance_id,
    checklistName:
      instance?.name_override ??
      masterDef?.name ??
      'Untitled Checklist',
    organizationId: row.organization_id,
    locationId: row.location_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? null,
    startedByName: row.started_by_profile?.full_name ?? null,
    completedByName: row.completed_by_profile?.full_name ?? null,
    scorePercentage: row.score_percentage ?? null,
    totalItems: row.total_items ?? 0,
    passedItems: row.passed_items ?? 0,
    failedItems: row.failed_items ?? 0,
    skippedItems: row.skipped_items ?? 0,
    loggedRetroactively: row.logged_retroactively ?? false,
    retroactiveReason: row.retroactive_reason ?? null,
    notes: row.notes ?? null,
  };
}

// ── Query ─────────────────────────────────────────────────────

export interface HistoryFilters {
  instanceId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export function useChecklistHistory(
  filters?: HistoryFilters,
): ApiQueryResult<ChecklistHistoryEntry[]> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { instanceId, status, dateFrom, dateTo, limit = 50 } = filters ?? {};

  const cacheKey = [
    'checklist-history',
    orgId ?? '',
    instanceId ?? '',
    status ?? '',
    dateFrom ?? '',
    dateTo ?? '',
    String(limit),
  ].join(':');

  const queryFn = useCallback(async (): Promise<ChecklistHistoryEntry[]> => {
    if (!orgId) return [];

    let query = supabase
      .from('customer_checklist_instance_completions')
      .select(`
        *,
        customer_checklist_instances(
          name_override,
          master_checklist_definitions(name, code)
        ),
        started_by_profile:user_profiles!started_by(full_name),
        completed_by_profile:user_profiles!completed_by(full_name)
      `)
      .eq('organization_id', orgId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (instanceId) query = query.eq('instance_id', instanceId);
    if (status) query = query.eq('status', status);
    if (dateFrom) query = query.gte('started_at', dateFrom);
    if (dateTo) query = query.lte('started_at', dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }, [orgId, instanceId, status, dateFrom, dateTo, limit]);

  return useApiQuery(cacheKey, queryFn, []);
}
