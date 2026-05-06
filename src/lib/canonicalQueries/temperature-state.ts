/**
 * Canonical Temperature-State Hook
 *
 * Single source of truth for current temperature state across the org.
 * Returns latest reading per active equipment, with derived in-range /
 * failing / overdue / awaiting status counts.
 *
 * Reads:
 *   - temperature_equipment (active equipment via organization_id)
 *   - temperature_logs (latest valid reading per equipment, ambient only)
 *
 * Architectural rules enforced:
 *   - Trust temp_pass from DB (computed at insert) — no client-side
 *     threshold re-derivation
 *   - Filter superseded_by_log_id IS NULL — only latest valid readings
 *   - Filter menu_item_id IS NULL — ambient equipment readings only
 *   - Filter is_active != false — soft-active equipment
 *   - Kitchen-local time via canonicalTime — never browser-local UTC
 *   - 4-hour overdue window (matches existing 3 patterns: standingQueries,
 *     useCurrentReadingsSummary, useUnifiedCurrentReadings)
 *   - No score generation, no rating system
 *
 * NOT covered (separate concerns):
 *   - receiving_temp_logs (write-only in current codebase)
 *   - food_batch_id / menu_item_id holding lookups (separate canonical
 *     hook later if needed)
 *   - Threshold mutations (writes stay in their existing paths)
 *
 * Layer 2: builds the hook only. Consumer migration is Layer 3 work.
 * Layer 3 will migrate the 10 DST-vulnerable temperature call sites
 * identified in the Step 2 inspection.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { kitchenNow } from '@/lib/canonicalTime';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type TempReadingStatus = 'pass' | 'fail' | 'overdue' | 'awaiting';

export interface TemperatureReadingLite {
  equipment_id: string;
  equipment_name: string;
  facility_id: string;
  log_id: string | null;
  reading_time: string | null;
  temperature: number | null;
  temp_pass: boolean | null;
  status: TempReadingStatus;
  age_minutes: number | null;
}

export interface TemperatureCounts {
  total: number;
  inRange: number;
  failing: number;
  overdue: number;
  awaiting: number;
}

export interface TemperatureLocationRollup {
  counts: TemperatureCounts;
  equipment: TemperatureReadingLite[];
}

export interface TemperatureState {
  counts: TemperatureCounts;
  equipment: TemperatureReadingLite[];
  byLocation?: Record<string, TemperatureLocationRollup>;
}

export interface UseTemperatureStateArgs {
  orgId: string;
  tz: string;
  locationFilter?: string | string[];
}

export interface UseTemperatureStateResult {
  data: TemperatureState | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const OVERDUE_MINUTES = 240; // 4 hours
const STALE_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────

function applyEquipmentLocationFilter<T extends { eq: Function; in: Function }>(
  query: T,
  filter: string | string[] | undefined
): T {
  if (filter === undefined) return query;
  if (typeof filter === 'string') return query.eq('location_id', filter);
  if (Array.isArray(filter) && filter.length > 0) return query.in('location_id', filter);
  return query;
}

function applyLogFacilityFilter<T extends { eq: Function; in: Function }>(
  query: T,
  filter: string | string[] | undefined
): T {
  if (filter === undefined) return query;
  if (typeof filter === 'string') return query.eq('facility_id', filter);
  if (Array.isArray(filter) && filter.length > 0) return query.in('facility_id', filter);
  return query;
}

function emptyCounts(): TemperatureCounts {
  return { total: 0, inRange: 0, failing: 0, overdue: 0, awaiting: 0 };
}

function deriveStatus(
  log: { temp_pass: boolean | null; reading_time: string } | null,
  nowMs: number
): { status: TempReadingStatus; age_minutes: number | null } {
  if (!log) return { status: 'awaiting', age_minutes: null };
  const readingMs = new Date(log.reading_time).getTime();
  const ageMin = Math.floor((nowMs - readingMs) / 60000);
  if (ageMin > OVERDUE_MINUTES) return { status: 'overdue', age_minutes: ageMin };
  if (log.temp_pass === false) return { status: 'fail', age_minutes: ageMin };
  return { status: 'pass', age_minutes: ageMin };
}

function aggregateCounts(equipment: TemperatureReadingLite[]): TemperatureCounts {
  const counts = emptyCounts();
  counts.total = equipment.length;
  for (const e of equipment) {
    if (e.status === 'pass') counts.inRange++;
    else if (e.status === 'fail') counts.failing++;
    else if (e.status === 'overdue') counts.overdue++;
    else if (e.status === 'awaiting') counts.awaiting++;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────
// Module-level cache and subscriptions
// ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: TemperatureState;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const subscriptions = new Map<string, { channel: RealtimeChannel; refCount: number }>();
const invalidationListeners = new Map<string, Set<() => void>>();

function cacheKey(
  orgId: string,
  tz: string,
  locationFilter: string | string[] | undefined
): string {
  const filterPart = locationFilter
    ? Array.isArray(locationFilter)
      ? `[${[...locationFilter].sort().join(',')}]`
      : locationFilter
    : 'all';
  return `${orgId}::${tz}::${filterPart}`;
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
    .channel(`temperature-state:${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'temperature_equipment', filter: `organization_id=eq.${orgId}` },
      () => invalidateOrg(orgId)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'temperature_logs' },
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

async function fetchTemperatureState(
  orgId: string,
  locationFilter: string | string[] | undefined
): Promise<TemperatureState> {
  const nowMs = kitchenNow().getTime();
  const lookbackIso = new Date(nowMs - OVERDUE_MINUTES * 60_000 * 2).toISOString();

  const equipQ = applyEquipmentLocationFilter(
    supabase
      .from('temperature_equipment')
      .select('id, name, location_id, organization_id, is_active')
      .eq('organization_id', orgId)
      .neq('is_active', false),
    locationFilter
  );

  const equipRes = await equipQ;
  if (equipRes.error) throw new Error(equipRes.error.message);

  const equipmentRows = (equipRes.data ?? []) as {
    id: string;
    name: string;
    location_id: string;
    organization_id: string;
    is_active: boolean | null;
  }[];

  if (equipmentRows.length === 0) {
    return {
      counts: emptyCounts(),
      equipment: [],
      byLocation: locationFilter === undefined ? {} : undefined,
    };
  }

  const equipmentIds = equipmentRows.map((e) => e.id);

  const logsQ = applyLogFacilityFilter(
    supabase
      .from('temperature_logs')
      .select('id, equipment_id, facility_id, temperature, temp_pass, reading_time, superseded_by_log_id, menu_item_id')
      .in('equipment_id', equipmentIds)
      .is('superseded_by_log_id', null)
      .is('menu_item_id', null)
      .gte('reading_time', lookbackIso)
      .order('reading_time', { ascending: false }),
    locationFilter
  );

  const logsRes = await logsQ;
  if (logsRes.error) throw new Error(logsRes.error.message);

  const logRows = (logsRes.data ?? []) as {
    id: string;
    equipment_id: string;
    facility_id: string;
    temperature: number;
    temp_pass: boolean;
    reading_time: string;
  }[];

  const latestByEquipment = new Map<string, typeof logRows[number]>();
  for (const row of logRows) {
    if (!latestByEquipment.has(row.equipment_id)) {
      latestByEquipment.set(row.equipment_id, row);
    }
  }

  const equipmentLite: TemperatureReadingLite[] = equipmentRows.map((eq) => {
    const log = latestByEquipment.get(eq.id) ?? null;
    const { status, age_minutes } = deriveStatus(log, nowMs);
    return {
      equipment_id: eq.id,
      equipment_name: eq.name,
      facility_id: eq.location_id,
      log_id: log?.id ?? null,
      reading_time: log?.reading_time ?? null,
      temperature: log?.temperature ?? null,
      temp_pass: log?.temp_pass ?? null,
      status,
      age_minutes,
    };
  });

  const counts = aggregateCounts(equipmentLite);

  let byLocation: Record<string, TemperatureLocationRollup> | undefined;
  if (locationFilter === undefined) {
    byLocation = {};
    const grouped = new Map<string, TemperatureReadingLite[]>();
    for (const e of equipmentLite) {
      const list = grouped.get(e.facility_id) ?? [];
      list.push(e);
      grouped.set(e.facility_id, list);
    }
    for (const [locId, list] of grouped) {
      byLocation[locId] = {
        counts: aggregateCounts(list),
        equipment: list,
      };
    }
  }

  return {
    counts,
    equipment: equipmentLite,
    byLocation,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────

export function useTemperatureState({
  orgId,
  tz,
  locationFilter,
}: UseTemperatureStateArgs): UseTemperatureStateResult {
  const [data, setData] = useState<TemperatureState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const key = cacheKey(orgId, tz, locationFilter);

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
      const fetched = await fetchTemperatureState(orgId, locationFilter);
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
