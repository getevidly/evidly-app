/**
 * Canonical Task-State Hook
 *
 * Single source of truth for task state across the org. Reads from the
 * modern task system (task_instances + task_definitions). The legacy
 * `tasks` table read by standingQueries.ts is NOT subsumed — that
 * consumer migrates onto this hook in Layer 3, after which the legacy
 * reads die.
 *
 * Reads:
 *   - task_instances (today's tasks, overdue, upcoming, by pillar)
 *
 * Architectural rules enforced:
 *   - Pillars (food_safety, fire_safety) always separate, never blended
 *   - Soft-delete via archived_at IS NULL filter on every read
 *   - Kitchen-local time via canonicalTime — never browser-local UTC
 *   - No score generation, no rating system
 *
 * First consumer of canonicalTime.ts in the codebase. Layer 3 will
 * migrate the other 5 DST-vulnerable call sites identified in the
 * Step 2 inspection (useTaskInstances, standingQueries, useMobileTasks).
 *
 * Layer 2: builds the hook only. Consumer migration is Layer 3 work.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { kitchenToday, kitchenNow } from '@/lib/canonicalTime';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type Pillar = 'food_safety' | 'fire_safety';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped' | 'escalated';

export interface TaskInstanceLite {
  id: string;
  title: string;
  status: TaskStatus;
  pillar: Pillar;
  due_at: string;
  assigned_to: string | null;
  location_id: string | null;
}

export interface TaskCounts {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPillar: Record<Pillar, number>;
}

export interface TaskLocationRollup {
  todayCounts: TaskCounts;
  overdueCount: number;
}

export interface TaskState {
  todayCounts: TaskCounts;
  overdueCount: number;
  upcomingTasks: TaskInstanceLite[];
  byLocation?: Record<string, TaskLocationRollup>;
}

export interface UseTaskStateArgs {
  orgId: string;
  tz: string;
  locationFilter?: string | string[];
  upcomingLimit?: number;
}

export interface UseTaskStateResult {
  data: TaskState | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────

const ALL_STATUSES: TaskStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'skipped',
  'escalated',
];

const PENDING_STATUSES: TaskStatus[] = ['pending', 'in_progress'];

function applyLocationFilter<T extends { eq: Function; in: Function }>(
  query: T,
  filter: string | string[] | undefined
): T {
  if (filter === undefined) return query;
  if (typeof filter === 'string') return query.eq('location_id', filter);
  if (Array.isArray(filter) && filter.length > 0) return query.in('location_id', filter);
  return query;
}

function emptyCounts(): TaskCounts {
  const byStatus = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as Record<TaskStatus, number>);
  return {
    total: 0,
    byStatus,
    byPillar: { food_safety: 0, fire_safety: 0 },
  };
}

function aggregateCounts(
  rows: { status: TaskStatus; pillar: Pillar }[]
): TaskCounts {
  const counts = emptyCounts();
  counts.total = rows.length;
  for (const row of rows) {
    if (row.status in counts.byStatus) counts.byStatus[row.status]++;
    if (row.pillar in counts.byPillar) counts.byPillar[row.pillar]++;
  }
  return counts;
}

function groupTodayByLocation(
  rows: { status: TaskStatus; pillar: Pillar; location_id: string | null }[]
): Map<string, { status: TaskStatus; pillar: Pillar }[]> {
  const grouped = new Map<string, { status: TaskStatus; pillar: Pillar }[]>();
  for (const row of rows) {
    if (!row.location_id) continue;
    const existing = grouped.get(row.location_id) ?? [];
    existing.push({ status: row.status, pillar: row.pillar });
    grouped.set(row.location_id, existing);
  }
  return grouped;
}

function groupOverdueByLocation(
  rows: { location_id: string | null }[]
): Map<string, number> {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    if (!row.location_id) continue;
    grouped.set(row.location_id, (grouped.get(row.location_id) ?? 0) + 1);
  }
  return grouped;
}

// ─────────────────────────────────────────────────────────────────────
// Module-level cache and subscriptions
// ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: TaskState;
  fetchedAt: number;
}

const STALE_MS = 30_000;

const cache = new Map<string, CacheEntry>();
const subscriptions = new Map<string, { channel: RealtimeChannel; refCount: number }>();
const invalidationListeners = new Map<string, Set<() => void>>();

function cacheKey(
  orgId: string,
  tz: string,
  locationFilter: string | string[] | undefined,
  upcomingLimit: number
): string {
  const filterPart = locationFilter
    ? Array.isArray(locationFilter)
      ? `[${[...locationFilter].sort().join(',')}]`
      : locationFilter
    : 'all';
  return `${orgId}::${tz}::${filterPart}::${upcomingLimit}`;
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
    .channel(`task-state:${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_instances', filter: `organization_id=eq.${orgId}` },
      () => invalidateOrg(orgId)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_definitions', filter: `organization_id=eq.${orgId}` },
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

async function fetchTaskState(
  orgId: string,
  tz: string,
  locationFilter: string | string[] | undefined,
  upcomingLimit: number
): Promise<TaskState> {
  const today = kitchenToday(tz);
  const nowIso = kitchenNow().toISOString();

  const todayQ = applyLocationFilter(
    supabase
      .from('task_instances')
      .select('id, status, pillar, location_id')
      .eq('organization_id', orgId)
      .eq('date', today)
      .is('archived_at', null),
    locationFilter
  );

  const overdueQ = applyLocationFilter(
    supabase
      .from('task_instances')
      .select('id, location_id')
      .eq('organization_id', orgId)
      .in('status', PENDING_STATUSES)
      .lt('due_at', nowIso)
      .is('archived_at', null),
    locationFilter
  );

  const upcomingQ = applyLocationFilter(
    supabase
      .from('task_instances')
      .select('id, title, status, pillar, due_at, assigned_to, location_id')
      .eq('organization_id', orgId)
      .in('status', PENDING_STATUSES)
      .gte('due_at', nowIso)
      .is('archived_at', null)
      .order('due_at', { ascending: true })
      .limit(upcomingLimit),
    locationFilter
  );

  const [todayRes, overdueRes, upcomingRes] = await Promise.all([todayQ, overdueQ, upcomingQ]);

  const firstError = todayRes.error || overdueRes.error || upcomingRes.error;
  if (firstError) throw new Error(firstError.message);

  const todayRows = (todayRes.data ?? []) as {
    id: string;
    status: TaskStatus;
    pillar: Pillar;
    location_id: string | null;
  }[];
  const overdueRows = (overdueRes.data ?? []) as { id: string; location_id: string | null }[];
  const upcomingRows = (upcomingRes.data ?? []) as TaskInstanceLite[];

  const todayCounts = aggregateCounts(todayRows);
  const overdueCount = overdueRows.length;

  let byLocation: Record<string, TaskLocationRollup> | undefined;
  if (locationFilter === undefined) {
    const todayByLoc = groupTodayByLocation(todayRows);
    const overdueByLoc = groupOverdueByLocation(overdueRows);
    const allLocIds = new Set<string>([...todayByLoc.keys(), ...overdueByLoc.keys()]);

    byLocation = {};
    for (const locId of allLocIds) {
      byLocation[locId] = {
        todayCounts: aggregateCounts(todayByLoc.get(locId) ?? []),
        overdueCount: overdueByLoc.get(locId) ?? 0,
      };
    }
  }

  return {
    todayCounts,
    overdueCount,
    upcomingTasks: upcomingRows,
    byLocation,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────

export function useTaskState({
  orgId,
  tz,
  locationFilter,
  upcomingLimit = 10,
}: UseTaskStateArgs): UseTaskStateResult {
  const [data, setData] = useState<TaskState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const key = cacheKey(orgId, tz, locationFilter, upcomingLimit);

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
      const fetched = await fetchTaskState(orgId, tz, locationFilter, upcomingLimit);
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
