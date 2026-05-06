/**
 * Canonical Incidents-State Hook
 *
 * Single source of truth for incident state across the org. Returns
 * full open incident list with pre-aggregated counts (status, severity,
 * pillar, urgency_label) plus a "needs attention" sort.
 *
 * Reads:
 *   - incidents (full list, server-filtered by org/pillar/status,
 *     client-aggregated by severity/pillar/urgency)
 *
 * Architectural rules enforced:
 *   - Pillars (food_safety, fire_safety) always separate, never blended
 *   - Filter archived_at IS NULL on every read (soft-delete)
 *   - Use canonical OPEN_INCIDENT_STATUSES / CLOSED_INCIDENT_STATUSES
 *     constants from src/types/incidents.ts
 *   - Status union matches verified PROD CHECK exactly:
 *     ('open', 'investigating', 'resolved', 'verified')
 *   - Severity union matches verified PROD CHECK exactly:
 *     ('critical', 'high', 'medium', 'low')
 *   - Urgency union matches verified PROD CHECK exactly:
 *     ('immediate', '4_hours', 'same_day', '1_day', '7_days')
 *   - Kitchen-local time via canonicalTime — never browser-local UTC
 *     for aging / overdue computation
 *   - No score generation, no rating system
 *
 * NOT covered (separate concerns):
 *   - incident_timeline (consumed by IncidentLog directly via join)
 *   - incident_comments (consumed by IncidentLog directly via join)
 *   - incident_templates (consumed by IncidentLog directly)
 *   - predictive_alerts (separate table, separate concept; the
 *     mislabeled fetchLiveAttention mixing is a Layer 3 cleanup)
 *
 * Layer 2: builds the hook only. Consumer migration is Layer 3 work.
 * Layer 3 will migrate IncidentLog.tsx, useMobileAlerts, useMobileTasks,
 * standingQueries fetchLocationStanding/fetchLiveAttention,
 * foodSafety/Overview, foodSafety/Trajectory, IncidentSummaryWidget,
 * and AuditReport onto this hook + canonical types.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  OPEN_INCIDENT_STATUSES,
  CLOSED_INCIDENT_STATUSES,
} from '@/types/incidents';
import { kitchenNow } from '@/lib/canonicalTime';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────
// Types (verified against PROD CHECK constraints)
// ─────────────────────────────────────────────────────────────────────

export type Pillar = 'food_safety' | 'fire_safety';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'verified';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentUrgency =
  | 'immediate'
  | '4_hours'
  | 'same_day'
  | '1_day'
  | '7_days';

export interface IncidentLite {
  id: string;
  organization_id: string;
  location_id: string | null;
  location_name: string | null;
  incident_number: string;
  pillar: Pillar;
  type: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  urgency_label: IncidentUrgency | null;
  title: string;
  assigned_to: string | null;
  reported_by: string | null;
  requires_regulatory_report: boolean;
  linked_corrective_action_id: string | null;
  created_at: string;
  resolved_at: string | null;
  age_hours: number | null;
}

export interface IncidentCounts {
  total: number;
  byStatus: Record<IncidentStatus, number>;
  bySeverity: Record<IncidentSeverity, number>;
  byPillar: Record<Pillar, number>;
  byUrgency: Record<IncidentUrgency, number>;
  requiresRegulatoryReport: number;
}

export interface IncidentLocationRollup {
  openCounts: IncidentCounts;
  needsAttention: IncidentLite[];
}

export interface IncidentsState {
  open: IncidentLite[];
  openCounts: IncidentCounts;
  needsAttention: IncidentLite[];
  byLocation?: Record<string, IncidentLocationRollup>;
}

export interface UseIncidentsStateArgs {
  orgId: string;
  tz: string;
  pillarFilter?: Pillar;
  locationFilter?: string | string[];
  needsAttentionLimit?: number;
}

export interface UseIncidentsStateResult {
  data: IncidentsState | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const ALL_STATUSES: IncidentStatus[] = ['open', 'investigating', 'resolved', 'verified'];

const ALL_SEVERITIES: IncidentSeverity[] = ['critical', 'high', 'medium', 'low'];

const ALL_URGENCIES: IncidentUrgency[] = [
  'immediate',
  '4_hours',
  'same_day',
  '1_day',
  '7_days',
];

const NEEDS_ATTENTION_SEVERITIES: IncidentSeverity[] = ['critical', 'high', 'medium'];

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

function emptyCounts(): IncidentCounts {
  const byStatus = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as Record<IncidentStatus, number>);
  const bySeverity = ALL_SEVERITIES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as Record<IncidentSeverity, number>);
  const byUrgency = ALL_URGENCIES.reduce((acc, u) => {
    acc[u] = 0;
    return acc;
  }, {} as Record<IncidentUrgency, number>);
  return {
    total: 0,
    byStatus,
    bySeverity,
    byPillar: { food_safety: 0, fire_safety: 0 },
    byUrgency,
    requiresRegulatoryReport: 0,
  };
}

function aggregateCounts(rows: IncidentLite[]): IncidentCounts {
  const counts = emptyCounts();
  counts.total = rows.length;
  for (const row of rows) {
    if (row.status in counts.byStatus) counts.byStatus[row.status]++;
    if (row.severity in counts.bySeverity) counts.bySeverity[row.severity]++;
    if (row.pillar in counts.byPillar) counts.byPillar[row.pillar]++;
    if (row.urgency_label && row.urgency_label in counts.byUrgency) {
      counts.byUrgency[row.urgency_label]++;
    }
    if (row.requires_regulatory_report) counts.requiresRegulatoryReport++;
  }
  return counts;
}

function decorate(
  raw: {
    id: string;
    organization_id: string;
    location_id: string | null;
    location_name: string | null;
    incident_number: string;
    pillar: Pillar;
    type: string;
    status: IncidentStatus;
    severity: IncidentSeverity;
    urgency_label: IncidentUrgency | null;
    title: string;
    assigned_to: string | null;
    reported_by: string | null;
    requires_regulatory_report: boolean;
    linked_corrective_action_id: string | null;
    created_at: string;
    resolved_at: string | null;
  },
  nowMs: number
): IncidentLite {
  const createdMs = new Date(raw.created_at).getTime();
  const ageHours = Math.floor((nowMs - createdMs) / (1000 * 60 * 60));
  return {
    ...raw,
    age_hours: isFinite(ageHours) ? ageHours : null,
  };
}

function pickNeedsAttention(
  open: IncidentLite[],
  limit: number
): IncidentLite[] {
  // Severity DESC → urgency DESC → regulatory flag → oldest first
  const severityOrder: Record<IncidentSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const urgencyOrder: Record<IncidentUrgency, number> = {
    immediate: 0,
    '4_hours': 1,
    same_day: 2,
    '1_day': 3,
    '7_days': 4,
  };
  return open
    .filter((r) => NEEDS_ATTENTION_SEVERITIES.includes(r.severity))
    .sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      const aUrg = a.urgency_label ? urgencyOrder[a.urgency_label] : Infinity;
      const bUrg = b.urgency_label ? urgencyOrder[b.urgency_label] : Infinity;
      if (aUrg !== bUrg) return aUrg - bUrg;
      if (a.requires_regulatory_report !== b.requires_regulatory_report) {
        return a.requires_regulatory_report ? -1 : 1;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────
// Module-level cache and subscriptions
// ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: IncidentsState;
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
  needsAttentionLimit: number
): string {
  const filterPart = locationFilter
    ? Array.isArray(locationFilter)
      ? `[${[...locationFilter].sort().join(',')}]`
      : locationFilter
    : 'all';
  return `${orgId}::${tz}::${pillarFilter ?? 'both'}::${filterPart}::${needsAttentionLimit}`;
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
    .channel(`incidents-state:${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'incidents', filter: `organization_id=eq.${orgId}` },
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

async function fetchIncidentsState(
  orgId: string,
  pillarFilter: Pillar | undefined,
  locationFilter: string | string[] | undefined,
  needsAttentionLimit: number
): Promise<IncidentsState> {
  const nowMs = kitchenNow().getTime();

  let q = supabase
    .from('incidents')
    .select(
      'id, organization_id, location_id, location_name, incident_number, pillar, type, status, severity, urgency_label, title, assigned_to, reported_by, requires_regulatory_report, linked_corrective_action_id, created_at, resolved_at'
    )
    .eq('organization_id', orgId)
    .is('archived_at', null)
    .in('status', [...OPEN_INCIDENT_STATUSES])
    .order('created_at', { ascending: false });

  if (pillarFilter) {
    q = q.eq('pillar', pillarFilter);
  }

  q = applyLocationFilter(q, locationFilter);

  const res = await q;
  if (res.error) throw new Error(res.error.message);

  const rawRows = (res.data ?? []) as Parameters<typeof decorate>[0][];
  const open: IncidentLite[] = rawRows.map((r) => decorate(r, nowMs));

  const openCounts = aggregateCounts(open);
  const needsAttention = pickNeedsAttention(open, needsAttentionLimit);

  let byLocation: Record<string, IncidentLocationRollup> | undefined;
  if (locationFilter === undefined) {
    byLocation = {};
    const grouped = new Map<string, IncidentLite[]>();
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

export function useIncidentsState({
  orgId,
  tz,
  pillarFilter,
  locationFilter,
  needsAttentionLimit = 5,
}: UseIncidentsStateArgs): UseIncidentsStateResult {
  const [data, setData] = useState<IncidentsState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const key = cacheKey(orgId, tz, pillarFilter, locationFilter, needsAttentionLimit);

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
      const fetched = await fetchIncidentsState(
        orgId,
        pillarFilter,
        locationFilter,
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
export { OPEN_INCIDENT_STATUSES, CLOSED_INCIDENT_STATUSES };
