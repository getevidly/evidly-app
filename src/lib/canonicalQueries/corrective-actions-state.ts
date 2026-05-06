/**
 * Canonical Corrective-Actions-State Hook
 *
 * Single source of truth for corrective action state across the org.
 * Returns full CA list with pre-aggregated counts (status, severity,
 * source_type, pillar) plus aging-aware "needs attention" surface.
 *
 * Coexists with compliance-state.ts — that hook returns just the
 * open-count rollup for compliance overview. This hook serves the
 * richer surfaces: CorrectiveActions.tsx page (when migrated from demo),
 * pillar Overview / Analysis / Trajectory pages, ViolationRadar,
 * TeamLeaderboard, opsIntelligenceEngine.
 *
 * Reads:
 *   - corrective_actions (full list, server-filtered by org/pillar/
 *     status, client-aggregated by severity/source_type)
 *
 * Architectural rules enforced:
 *   - Pillars (food_safety, fire_safety) always separate, never blended
 *   - Filter archived_at IS NULL on every read (soft-delete)
 *   - Use canonical OPEN_CORRECTIVE_ACTION_STATUSES / CLOSED_*
 *     constants — no raw status literals
 *   - Kitchen-local time via canonicalTime — never browser-local UTC
 *     for aging / overdue computation
 *   - No score generation, no rating system
 *
 * NOT covered (separate concerns):
 *   - corrective_action_history (write-only in current codebase)
 *   - corrective_action_templates (unused in production reads)
 *   - haccp_corrective_actions (separate table, separate domain)
 *
 * Layer 2: builds the hook only. Consumer migration is Layer 3 work.
 * Layer 3 will migrate ~16 read sites onto this hook, including the
 * 4-query severity pattern in foodSafety/Overview and fireSafety/
 * Overview (one fetch replaces four), and the raw status literals in
 * foodSafety/Analysis and fireSafety/Analysis.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  OPEN_CORRECTIVE_ACTION_STATUSES,
  CLOSED_CORRECTIVE_ACTION_STATUSES,
} from '@/constants/correctiveActionStatus';
import { kitchenNow } from '@/lib/canonicalTime';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type Pillar = 'food_safety' | 'fire_safety';
export type CAStatus =
  | 'reported'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'closed'
  | 'archived';
export type CASeverity = 'critical' | 'high' | 'medium' | 'low';
export type CASourceType =
  | 'inspection'
  | 'checklist'
  | 'temperature'
  | 'self_inspection'
  | 'manual'
  | 'incident';

export interface CorrectiveActionLite {
  id: string;
  organization_id: string;
  location_id: string | null;
  pillar: Pillar;
  status: CAStatus;
  severity: CASeverity;
  source_type: CASourceType | null;
  title: string;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  created_at: string;
  resolved_at: string | null;
  age_days: number | null;
  is_overdue: boolean;
}

export interface CACounts {
  total: number;
  bySeverity: Record<CASeverity, number>;
  byStatus: Record<CAStatus, number>;
  bySourceType: Record<CASourceType, number>;
  byPillar: Record<Pillar, number>;
}

export interface CALocationRollup {
  openCounts: CACounts;
  needsAttention: CorrectiveActionLite[];
}

export interface CorrectiveActionsState {
  open: CorrectiveActionLite[];
  openCounts: CACounts;
  needsAttention: CorrectiveActionLite[];
  byLocation?: Record<string, CALocationRollup>;
}

export interface UseCorrectiveActionsStateArgs {
  orgId: string;
  tz: string;
  pillarFilter?: Pillar;
  locationFilter?: string | string[];
  excludeSourceTypes?: CASourceType[];
  needsAttentionLimit?: number;
}

export interface UseCorrectiveActionsStateResult {
  data: CorrectiveActionsState | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const ALL_STATUSES: CAStatus[] = [
  'reported',
  'assigned',
  'in_progress',
  'resolved',
  'verified',
  'closed',
  'archived',
];

const ALL_SEVERITIES: CASeverity[] = ['critical', 'high', 'medium', 'low'];

const ALL_SOURCE_TYPES: CASourceType[] = [
  'inspection',
  'checklist',
  'temperature',
  'self_inspection',
  'manual',
  'incident',
];

const NEEDS_ATTENTION_SEVERITIES: CASeverity[] = ['critical', 'high', 'medium'];

const STALE_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────

function applyLocationFilter<T extends { eq: Function; in: Function }>(
  query: T,
  filter: string | string[] | undefined
): T {
  if (filter === undefined) return query;
  if (typeof filter === 'string') return query.eq('location_id', filter);
  if (Array.isArray(filter) && filter.length > 0) return query.in('location_id', filter);
  return query;
}

function emptyCounts(): CACounts {
  const bySeverity = ALL_SEVERITIES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as Record<CASeverity, number>);
  const byStatus = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as Record<CAStatus, number>);
  const bySourceType = ALL_SOURCE_TYPES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as Record<CASourceType, number>);
  return {
    total: 0,
    bySeverity,
    byStatus,
    bySourceType,
    byPillar: { food_safety: 0, fire_safety: 0 },
  };
}

function aggregateCounts(rows: CorrectiveActionLite[]): CACounts {
  const counts = emptyCounts();
  counts.total = rows.length;
  for (const row of rows) {
    if (row.severity in counts.bySeverity) counts.bySeverity[row.severity]++;
    if (row.status in counts.byStatus) counts.byStatus[row.status]++;
    if (row.source_type && row.source_type in counts.bySourceType) {
      counts.bySourceType[row.source_type]++;
    }
    if (row.pillar in counts.byPillar) counts.byPillar[row.pillar]++;
  }
  return counts;
}

function decorate(
  raw: {
    id: string;
    organization_id: string;
    location_id: string | null;
    pillar: Pillar;
    status: CAStatus;
    severity: CASeverity;
    source_type: CASourceType | null;
    title: string;
    assignee_id: string | null;
    assignee_name: string | null;
    due_date: string | null;
    created_at: string;
    resolved_at: string | null;
  },
  nowMs: number
): CorrectiveActionLite {
  const createdMs = new Date(raw.created_at).getTime();
  const ageDays = Math.floor((nowMs - createdMs) / (1000 * 60 * 60 * 24));
  let isOverdue = false;
  if (raw.due_date) {
    const dueMs = new Date(raw.due_date + 'T23:59:59').getTime();
    isOverdue = nowMs > dueMs;
  }
  return {
    ...raw,
    age_days: isFinite(ageDays) ? ageDays : null,
    is_overdue: isOverdue,
  };
}

function pickNeedsAttention(
  open: CorrectiveActionLite[],
  limit: number
): CorrectiveActionLite[] {
  const severityOrder: Record<CASeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return open
    .filter((r) => NEEDS_ATTENTION_SEVERITIES.includes(r.severity))
    .sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (aDue !== bDue) return aDue - bDue;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────
// Module-level cache and subscriptions
// ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: CorrectiveActionsState;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const subscriptions = new Map<string, { channel: RealtimeChannel; refCount: number }>();
const invalidationListeners = new Map<string, Set<() => void>>();

function cacheKey(
  orgId: string,
  tz: string,
  pillarFilter: Pillar | undefined,
  locationFilter: string | string[] | undefined,
  excludeSourceTypes: CASourceType[] | undefined,
  needsAttentionLimit: number
): string {
  const filterPart = locationFilter
    ? Array.isArray(locationFilter)
      ? `[${[...locationFilter].sort().join(',')}]`
      : locationFilter
    : 'all';
  const excludePart =
    excludeSourceTypes && excludeSourceTypes.length > 0
      ? `[${[...excludeSourceTypes].sort().join(',')}]`
      : 'none';
  return `${orgId}::${tz}::${pillarFilter ?? 'both'}::${filterPart}::${excludePart}::${needsAttentionLimit}`;
}

function invalidateOrg(orgId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${orgId}::`)) cache.delete(key);
  }
  const listeners = invalidationListeners.get(orgId);
  if (listeners) {
    for (const listener of listeners) listener();
  }
}

function ensureSubscription(orgId: string): void {
  const existing = subscriptions.get(orgId);
  if (existing) {
    existing.refCount++;
    return;
  }
  const channel = supabase
    .channel(`corrective-actions-state:${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'corrective_actions', filter: `organization_id=eq.${orgId}` },
      () => invalidateOrg(orgId)
    )
    .subscribe();
  subscriptions.set(orgId, { channel, refCount: 1 });
}

function releaseSubscription(orgId: string): void {
  const entry = subscriptions.get(orgId);
  if (!entry) return;
  entry.refCount--;
  if (entry.refCount <= 0) {
    supabase.removeChannel(entry.channel);
    subscriptions.delete(orgId);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────

async function fetchCorrectiveActionsState(
  orgId: string,
  pillarFilter: Pillar | undefined,
  locationFilter: string | string[] | undefined,
  excludeSourceTypes: CASourceType[] | undefined,
  needsAttentionLimit: number
): Promise<CorrectiveActionsState> {
  const nowMs = kitchenNow().getTime();

  let q = supabase
    .from('corrective_actions')
    .select(
      'id, organization_id, location_id, pillar, status, severity, source_type, title, assignee_id, assignee_name, due_date, created_at, resolved_at'
    )
    .eq('organization_id', orgId)
    .is('archived_at', null)
    .in('status', [...OPEN_CORRECTIVE_ACTION_STATUSES])
    .order('created_at', { ascending: false });

  if (pillarFilter) {
    q = q.eq('pillar', pillarFilter);
  }

  q = applyLocationFilter(q, locationFilter);

  if (excludeSourceTypes && excludeSourceTypes.length > 0) {
    q = q.not('source_type', 'in', `(${excludeSourceTypes.join(',')})`);
  }

  const res = await q;
  if (res.error) throw new Error(res.error.message);

  const rawRows = (res.data ?? []) as Parameters<typeof decorate>[0][];
  const open: CorrectiveActionLite[] = rawRows.map((r) => decorate(r, nowMs));

  const openCounts = aggregateCounts(open);
  const needsAttention = pickNeedsAttention(open, needsAttentionLimit);

  let byLocation: Record<string, CALocationRollup> | undefined;
  if (locationFilter === undefined) {
    byLocation = {};
    const grouped = new Map<string, CorrectiveActionLite[]>();
    for (const row of open) {
      if (!row.location_id) continue;
      const list = grouped.get(row.location_id) ?? [];
      list.push(row);
      grouped.set(row.location_id, list);
    }
    for (const [locId, list] of grouped) {
      byLocation[locId] = {
        openCounts: aggregateCounts(list),
        needsAttention: pickNeedsAttention(list, needsAttentionLimit),
      };
    }
  }

  return {
    open,
    openCounts,
    needsAttention,
    byLocation,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────

export function useCorrectiveActionsState({
  orgId,
  tz,
  pillarFilter,
  locationFilter,
  excludeSourceTypes,
  needsAttentionLimit = 5,
}: UseCorrectiveActionsStateArgs): UseCorrectiveActionsStateResult {
  const [data, setData] = useState<CorrectiveActionsState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const key = cacheKey(orgId, tz, pillarFilter, locationFilter, excludeSourceTypes, needsAttentionLimit);

  const load = async (force = false): Promise<void> => {
    if (!orgId || !tz) return;
    const cached = cache.get(key);
    const fresh = cached && Date.now() - cached.fetchedAt < STALE_MS;

    if (cached && !force) {
      if (mountedRef.current) {
        setData(cached.data);
        setError(null);
      }
      if (fresh) {
        if (mountedRef.current) setIsLoading(false);
        return;
      }
    }

    if (mountedRef.current && !cached) setIsLoading(true);

    try {
      const fetched = await fetchCorrectiveActionsState(
        orgId,
        pillarFilter,
        locationFilter,
        excludeSourceTypes,
        needsAttentionLimit
      );
      cache.set(key, { data: fetched, fetchedAt: Date.now() });
      if (mountedRef.current) {
        setData(fetched);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!orgId || !tz) {
      setIsLoading(false);
      return;
    }

    ensureSubscription(orgId);

    const listener = () => {
      void load(true);
    };
    let listeners = invalidationListeners.get(orgId);
    if (!listeners) {
      listeners = new Set();
      invalidationListeners.set(orgId, listeners);
    }
    listeners.add(listener);

    void load(false);

    return () => {
      mountedRef.current = false;
      const ls = invalidationListeners.get(orgId);
      if (ls) {
        ls.delete(listener);
        if (ls.size === 0) invalidationListeners.delete(orgId);
      }
      releaseSubscription(orgId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, tz, key]);

  const refetch = async (): Promise<void> => {
    await load(true);
  };

  return { data, isLoading, error, refetch };
}

// Re-export canonical constants for consumer convenience
export { OPEN_CORRECTIVE_ACTION_STATUSES, CLOSED_CORRECTIVE_ACTION_STATUSES };
