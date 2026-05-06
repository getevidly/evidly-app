/**
 * Canonical Documents-State Hook
 *
 * Single source of truth for document state across the org. Returns
 * active document list with pre-aggregated counts (total, expired,
 * expiring-within-N-days tiers, by category) plus an "expiring soon"
 * surface for dashboards.
 *
 * Reads:
 *   - documents (active rows only, with optional category filter)
 *
 * Architectural rules enforced:
 *   - Soft-delete via status = 'active' filter (PROD has no
 *     archived_at column on documents — soft-delete is via status)
 *   - Kitchen-local time via canonicalTime — never browser-local UTC
 *     for expiration comparisons
 *   - No score generation, no rating system
 *
 * Schema notes (verified against PROD information_schema):
 *   - documents has NO CHECK constraints on status or category — both
 *     are free-text varchar. The hook treats category as opaque string
 *     (no enum). DocumentStatus is a TypeScript type union based on
 *     observed application usage, not PROD-enforced. Common observed
 *     categories: 'haccp', 'pest_control', 'food_safety_plan',
 *     'allergen_policy', 'License', 'Permit'.
 *   - documents has NO archived_at column. Soft-delete is via status.
 *     Existing ViolationRadar.jsx:37 filter .is('archived_at', null)
 *     is a bug — the column doesn't exist (logged for Layer 3).
 *   - documents has NO pillar column. Documents are not pillar-split.
 *
 * NOT covered (separate concerns):
 *   - vault_documents (admin-only, separate table)
 *   - marketplace_documents (separate concern)
 *   - document_alerts / document_reminders (alert/reminder queues,
 *     not primary document state)
 *   - File storage operations (Supabase storage — write-path)
 *   - Document classification (classify-document edge function — write-path)
 *
 * Layer 2: builds the hook only. Consumer migration is Layer 3 work.
 * Layer 3 will migrate Documents.tsx, standingQueries fetchLiveEvents
 * + fetchLiveReadiness, opsIntelligenceEngine generateDocumentInsights,
 * useMobileAlerts, useMobileTasks, ViolationRadar (also fixes the
 * archived_at bug), and useFeatureCriteriaProgress onto this hook.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { kitchenToday } from '@/lib/canonicalTime';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type DocumentStatus = 'active' | 'expired' | 'pending' | 'archived';

export interface DocumentLite {
  id: string;
  organization_id: string;
  location_id: string | null;
  title: string;
  category: string;
  status: DocumentStatus;
  expiration_date: string | null;
  days_until_expiry: number | null;
  is_expired: boolean;
  uploaded_by: string | null;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

export interface DocumentCounts {
  total: number;
  expired: number;
  expiringWithin14Days: number;
  expiringWithin30Days: number;
  expiringWithin60Days: number;
  expiringWithin90Days: number;
  byCategory: Record<string, number>;
  noExpirySet: number;
}

export interface DocumentLocationRollup {
  counts: DocumentCounts;
  expiringSoon: DocumentLite[];
}

export interface DocumentsState {
  active: DocumentLite[];
  counts: DocumentCounts;
  expiringSoon: DocumentLite[];
  byLocation?: Record<string, DocumentLocationRollup>;
}

export interface UseDocumentsStateArgs {
  orgId: string;
  tz: string;
  categoryFilter?: string | string[];
  locationFilter?: string | string[];
  expiringSoonLimit?: number;
}

export interface UseDocumentsStateResult {
  data: DocumentsState | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

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

function applyCategoryFilter<T extends { eq: Function; in: Function }>(
  query: T,
  filter: string | string[] | undefined
): T {
  if (filter === undefined) return query;
  if (typeof filter === 'string') return query.eq('category', filter);
  if (Array.isArray(filter) && filter.length > 0) return query.in('category', filter);
  return query;
}

function emptyCounts(): DocumentCounts {
  return {
    total: 0,
    expired: 0,
    expiringWithin14Days: 0,
    expiringWithin30Days: 0,
    expiringWithin60Days: 0,
    expiringWithin90Days: 0,
    byCategory: {},
    noExpirySet: 0,
  };
}

function aggregateCounts(rows: DocumentLite[]): DocumentCounts {
  const counts = emptyCounts();
  counts.total = rows.length;
  for (const row of rows) {
    if (row.expiration_date === null) {
      counts.noExpirySet++;
    } else if (row.is_expired) {
      counts.expired++;
    } else if (row.days_until_expiry !== null) {
      const d = row.days_until_expiry;
      if (d <= 14) counts.expiringWithin14Days++;
      if (d <= 30) counts.expiringWithin30Days++;
      if (d <= 60) counts.expiringWithin60Days++;
      if (d <= 90) counts.expiringWithin90Days++;
    }
    counts.byCategory[row.category] = (counts.byCategory[row.category] ?? 0) + 1;
  }
  return counts;
}

function decorate(
  raw: {
    id: string;
    organization_id: string;
    location_id: string | null;
    title: string;
    category: string;
    status: DocumentStatus;
    expiration_date: string | null;
    uploaded_by: string | null;
    file_url: string;
    file_type: string | null;
    created_at: string;
  },
  todayStr: string
): DocumentLite {
  let daysUntilExpiry: number | null = null;
  let isExpired = false;
  if (raw.expiration_date) {
    const todayMs = new Date(todayStr + 'T00:00:00').getTime();
    const expiryMs = new Date(raw.expiration_date + 'T00:00:00').getTime();
    daysUntilExpiry = Math.floor((expiryMs - todayMs) / (1000 * 60 * 60 * 24));
    isExpired = daysUntilExpiry < 0;
  }
  return {
    ...raw,
    days_until_expiry: daysUntilExpiry,
    is_expired: isExpired,
  };
}

function pickExpiringSoon(
  active: DocumentLite[],
  limit: number
): DocumentLite[] {
  return active
    .filter(
      (d) =>
        d.expiration_date !== null &&
        d.days_until_expiry !== null &&
        d.days_until_expiry >= 0 &&
        d.days_until_expiry <= 30
    )
    .sort((a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0))
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────
// Module-level cache and subscriptions
// ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: DocumentsState;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const subscriptions = new Map<string, { channel: RealtimeChannel; refCount: number }>();
const invalidationListeners = new Map<string, Set<() => void>>();

function cacheKey(
  orgId: string,
  tz: string,
  categoryFilter: string | string[] | undefined,
  locationFilter: string | string[] | undefined,
  expiringSoonLimit: number
): string {
  const catPart = categoryFilter
    ? Array.isArray(categoryFilter)
      ? `[${[...categoryFilter].sort().join(',')}]`
      : categoryFilter
    : 'all';
  const locPart = locationFilter
    ? Array.isArray(locationFilter)
      ? `[${[...locationFilter].sort().join(',')}]`
      : locationFilter
    : 'all';
  return `${orgId}::${tz}::${catPart}::${locPart}::${expiringSoonLimit}`;
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
    .channel(`documents-state:${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'documents', filter: `organization_id=eq.${orgId}` },
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

async function fetchDocumentsState(
  orgId: string,
  tz: string,
  categoryFilter: string | string[] | undefined,
  locationFilter: string | string[] | undefined,
  expiringSoonLimit: number
): Promise<DocumentsState> {
  const todayStr = kitchenToday(tz);

  let q = supabase
    .from('documents')
    .select(
      'id, organization_id, location_id, title, category, status, expiration_date, uploaded_by, file_url, file_type, created_at'
    )
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .order('expiration_date', { ascending: true, nullsFirst: false });

  q = applyCategoryFilter(q, categoryFilter);
  q = applyLocationFilter(q, locationFilter);

  const res = await q;
  if (res.error) throw new Error(res.error.message);

  const rawRows = (res.data ?? []) as Parameters<typeof decorate>[0][];
  const active: DocumentLite[] = rawRows.map((r) => decorate(r, todayStr));

  const counts = aggregateCounts(active);
  const expiringSoon = pickExpiringSoon(active, expiringSoonLimit);

  let byLocation: Record<string, DocumentLocationRollup> | undefined;
  if (locationFilter === undefined) {
    byLocation = {};
    const grouped = new Map<string, DocumentLite[]>();
    for (const row of active) {
      if (!row.location_id) continue;
      const list = grouped.get(row.location_id) ?? [];
      list.push(row);
      grouped.set(row.location_id, list);
    }
    for (const [locId, list] of grouped) {
      byLocation[locId] = {
        counts: aggregateCounts(list),
        expiringSoon: pickExpiringSoon(list, expiringSoonLimit),
      };
    }
  }

  return {
    active,
    counts,
    expiringSoon,
    byLocation,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────

export function useDocumentsState({
  orgId,
  tz,
  categoryFilter,
  locationFilter,
  expiringSoonLimit = 10,
}: UseDocumentsStateArgs): UseDocumentsStateResult {
  const [data, setData] = useState<DocumentsState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const key = cacheKey(orgId, tz, categoryFilter, locationFilter, expiringSoonLimit);

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
      const fetched = await fetchDocumentsState(
        orgId,
        tz,
        categoryFilter,
        locationFilter,
        expiringSoonLimit
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
