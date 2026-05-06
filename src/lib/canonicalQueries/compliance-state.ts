/**
 * Canonical Compliance-State Hook
 *
 * Single source of truth for compliance state across the org. Replaces
 * scattered queries in ComplianceOverview, foodSafety/Overview,
 * fireSafety/Overview, ViolationRadar, and opsIntelligenceEngine.
 *
 * Reads:
 *   - inspection_reports (last inspection per pillar per location)
 *   - corrective_actions (open count + severity breakdown per pillar)
 *
 * Architectural rules enforced:
 *   - Pillars (food_safety, fire_safety) always separate, never blended
 *   - raw_result + raw_result_type returned as a pair, never aggregated
 *   - No score generation, no rating system
 *
 * Layer 2: builds the hook only. Consumer migration is Layer 3 work.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { OPEN_CORRECTIVE_ACTION_STATUSES } from '@/constants/correctiveActionStatus';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type Pillar = 'food_safety' | 'fire_safety';
export type RawResultType = 'numeric' | 'letter_grade' | 'pass_fail' | 'narrative_only';
export type InspectionType = 'routine' | 'reinspection' | 'complaint' | 'follow_up' | 'pre_opening' | 'other';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface LastInspection {
  id: string;
  location_id: string;
  jurisdiction_id: string;
  pillar: Pillar;
  inspection_date: string;
  inspection_type: InspectionType;
  raw_result: string;
  raw_result_type: RawResultType;
  numeric_equivalent: number | null;
  critical_violations: number | null;
  non_critical_violations: number | null;
}

export interface OpenCASummary {
  total: number;
  bySeverity: Record<Severity, number>;
}

export interface PillarState {
  pillar: Pillar;
  lastInspection: LastInspection | null;
  openCorrectiveActions: OpenCASummary;
}

export interface PerLocationState {
  foodSafety: PillarState;
  fireSafety: PillarState;
}

export interface ComplianceState {
  foodSafety: PillarState;
  fireSafety: PillarState;
  byLocation?: Record<string, PerLocationState>;
}

export interface UseComplianceStateArgs {
  orgId: string;
  locationFilter?: string | string[];
}

export interface UseComplianceStateResult {
  data: ComplianceState | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Apply location filter to a Supabase query. Reusable across canonical
 * hooks. Handles single string, array of strings, and undefined.
 */
function applyLocationFilter<T extends { eq: Function; in: Function }>(
  query: T,
  filter: string | string[] | undefined
): T {
  if (filter === undefined) return query;
  if (typeof filter === 'string') return query.eq('location_id', filter);
  if (Array.isArray(filter) && filter.length > 0) return query.in('location_id', filter);
  return query;
}

/**
 * Empty pillar state — used when no inspection or CAs exist.
 */
function emptyPillarState(pillar: Pillar): PillarState {
  return {
    pillar,
    lastInspection: null,
    openCorrectiveActions: {
      total: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    },
  };
}

/**
 * Reduce inspection rows to most recent per location.
 * Input rows are pre-sorted by inspection_date DESC by the query, so
 * the first occurrence per location_id is the most recent.
 */
function mostRecentByLocation(rows: LastInspection[]): Map<string, LastInspection> {
  const map = new Map<string, LastInspection>();
  for (const row of rows) {
    if (!map.has(row.location_id)) map.set(row.location_id, row);
  }
  return map;
}

/**
 * Aggregate open CAs into total + severity breakdown.
 */
function aggregateOpenCAs(rows: { severity: Severity; location_id: string | null }[]): OpenCASummary {
  const summary: OpenCASummary = {
    total: rows.length,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
  };
  for (const row of rows) {
    if (row.severity in summary.bySeverity) {
      summary.bySeverity[row.severity]++;
    }
  }
  return summary;
}

/**
 * Group open CAs by location_id.
 */
function groupCAsByLocation(
  rows: { severity: Severity; location_id: string | null }[]
): Map<string, OpenCASummary> {
  const grouped = new Map<string, { severity: Severity; location_id: string | null }[]>();
  for (const row of rows) {
    if (!row.location_id) continue;
    const existing = grouped.get(row.location_id) ?? [];
    existing.push(row);
    grouped.set(row.location_id, existing);
  }
  const result = new Map<string, OpenCASummary>();
  for (const [locId, locRows] of grouped) {
    result.set(locId, aggregateOpenCAs(locRows));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────
// Module-level cache and subscriptions
// ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: ComplianceState;
  fetchedAt: number;
}

const STALE_MS = 30_000;

const cache = new Map<string, CacheEntry>();
const subscriptions = new Map<string, { channel: RealtimeChannel; refCount: number }>();
const invalidationListeners = new Map<string, Set<() => void>>();

function cacheKey(orgId: string, locationFilter?: string | string[]): string {
  const filterPart = locationFilter
    ? Array.isArray(locationFilter)
      ? `[${[...locationFilter].sort().join(',')}]`
      : locationFilter
    : 'all';
  return `${orgId}::${filterPart}`;
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
    .channel(`compliance-state:${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inspection_reports', filter: `organization_id=eq.${orgId}` },
      () => invalidateOrg(orgId)
    )
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

async function fetchComplianceState(
  orgId: string,
  locationFilter?: string | string[]
): Promise<ComplianceState> {
  const inspSelect =
    'id, location_id, jurisdiction_id, pillar, inspection_date, inspection_type, raw_result, raw_result_type, numeric_equivalent, critical_violations, non_critical_violations';
  const caSelect = 'id, severity, location_id';

  const foodInspQ = applyLocationFilter(
    supabase
      .from('inspection_reports')
      .select(inspSelect)
      .eq('organization_id', orgId)
      .eq('pillar', 'food_safety')
      .order('inspection_date', { ascending: false }),
    locationFilter
  );

  const fireInspQ = applyLocationFilter(
    supabase
      .from('inspection_reports')
      .select(inspSelect)
      .eq('organization_id', orgId)
      .eq('pillar', 'fire_safety')
      .order('inspection_date', { ascending: false }),
    locationFilter
  );

  const foodCaQ = applyLocationFilter(
    supabase
      .from('corrective_actions')
      .select(caSelect)
      .eq('organization_id', orgId)
      .eq('pillar', 'food_safety')
      .in('status', [...OPEN_CORRECTIVE_ACTION_STATUSES]),
    locationFilter
  );

  const fireCaQ = applyLocationFilter(
    supabase
      .from('corrective_actions')
      .select(caSelect)
      .eq('organization_id', orgId)
      .eq('pillar', 'fire_safety')
      .in('status', [...OPEN_CORRECTIVE_ACTION_STATUSES]),
    locationFilter
  );

  const [foodInspRes, fireInspRes, foodCaRes, fireCaRes] = await Promise.all([
    foodInspQ,
    fireInspQ,
    foodCaQ,
    fireCaQ,
  ]);

  const firstError =
    foodInspRes.error || fireInspRes.error || foodCaRes.error || fireCaRes.error;
  if (firstError) throw new Error(firstError.message);

  const foodInsp = (foodInspRes.data ?? []) as LastInspection[];
  const fireInsp = (fireInspRes.data ?? []) as LastInspection[];
  const foodCa = (foodCaRes.data ?? []) as { severity: Severity; location_id: string | null }[];
  const fireCa = (fireCaRes.data ?? []) as { severity: Severity; location_id: string | null }[];

  const foodSafetyState: PillarState = {
    pillar: 'food_safety',
    lastInspection: foodInsp[0] ?? null,
    openCorrectiveActions: aggregateOpenCAs(foodCa),
  };
  const fireSafetyState: PillarState = {
    pillar: 'fire_safety',
    lastInspection: fireInsp[0] ?? null,
    openCorrectiveActions: aggregateOpenCAs(fireCa),
  };

  let byLocation: Record<string, PerLocationState> | undefined;
  if (locationFilter === undefined) {
    const foodInspByLoc = mostRecentByLocation(foodInsp);
    const fireInspByLoc = mostRecentByLocation(fireInsp);
    const foodCaByLoc = groupCAsByLocation(foodCa);
    const fireCaByLoc = groupCAsByLocation(fireCa);

    const allLocIds = new Set<string>([
      ...foodInspByLoc.keys(),
      ...fireInspByLoc.keys(),
      ...foodCaByLoc.keys(),
      ...fireCaByLoc.keys(),
    ]);

    byLocation = {};
    for (const locId of allLocIds) {
      byLocation[locId] = {
        foodSafety: {
          pillar: 'food_safety',
          lastInspection: foodInspByLoc.get(locId) ?? null,
          openCorrectiveActions: foodCaByLoc.get(locId) ?? emptyPillarState('food_safety').openCorrectiveActions,
        },
        fireSafety: {
          pillar: 'fire_safety',
          lastInspection: fireInspByLoc.get(locId) ?? null,
          openCorrectiveActions: fireCaByLoc.get(locId) ?? emptyPillarState('fire_safety').openCorrectiveActions,
        },
      };
    }
  }

  return {
    foodSafety: foodSafetyState,
    fireSafety: fireSafetyState,
    byLocation,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────

export function useComplianceState({
  orgId,
  locationFilter,
}: UseComplianceStateArgs): UseComplianceStateResult {
  const [data, setData] = useState<ComplianceState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const key = cacheKey(orgId, locationFilter);

  const load = async (force = false): Promise<void> => {
    if (!orgId) return;
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
      const fetched = await fetchComplianceState(orgId, locationFilter);
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
    if (!orgId) {
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
  }, [orgId, key]);

  const refetch = async (): Promise<void> => {
    await load(true);
  };

  return { data, isLoading, error, refetch };
}
