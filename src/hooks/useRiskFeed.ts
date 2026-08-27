/**
 * useRiskFeed — one severity-ordered view of everything open across the org.
 *
 * Four sources, one scale. Drift catches, overdue records, incidents and
 * corrective actions all pass through severityEngine.classify, so a hood
 * cleaning three weeks late and a critical temperature excursion can sit in the
 * same list and mean the same thing by their band.
 *
 * The hook loads org-wide and exposes the aggregation per location; scoping to
 * a selected kitchen is the caller's job, so switching tabs costs no refetch.
 *
 * Every query here already exists elsewhere in the app — the overdue trio is
 * lifted from useOverdueItems, the in-motion reverse lookup from
 * DriftsCaughtList, the schedule read from the table DashboardView already
 * uses. Nothing new is invented.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getDriftLabel } from '../constants/driftTypeLabels';
import {
  classify,
  fromStoredSeverity,
  SEVERITY_ASC,
  SEVERITY_RANK,
  type Severity,
} from '../lib/severityEngine';
import type { DriftCatchWithAcks } from './useDriftCatches';
import type { DriftRecipient } from './useDriftRouting';

export type RiskKind = 'drift' | 'service' | 'document' | 'task' | 'incident' | 'corrective_action';

/** The corrective action already working an item, if one exists. */
export interface InMotion {
  id: string;
  sealed: boolean;
}

export interface RiskFeedItem {
  id: string;
  kind: RiskKind;
  severity: Severity;
  reason: string;
  title: string;
  locationId: string | null;
  locationName: string | null;
  /** True when the item belongs to the business, not a kitchen (vendor docs, business records). */
  orgLevel: boolean;
  daysOverdue: number;
  /** Due, but not yet past due — inside its warning window. */
  approaching: boolean;
  inMotion: InMotion | null;
  href: string;
  /** Record id shown in mono for incidents and actions. */
  recordId?: string;
  pillar?: 'food_safety' | 'fire_safety' | null;
  /** Drift rows only — who the catch was routed to, for the escalation line. */
  recipients?: DriftRecipient[];
  /** Drift rows only — 'open' or 'reduced'. Gates the acknowledge affordance. */
  driftStatus?: string;
}

export interface LocationRisk {
  locationId: string;
  locationName: string;
  worst: Severity | null;
  counts: Record<Severity, number>;
  topItem: RiskFeedItem | null;
  /** Next scheduled service due date, "YYYY-MM-DD". */
  nextDue: string | null;
  openCount: number;
}

interface UseRiskFeedOptions {
  /**
   * Drift catches and their routing come from the page, which already holds the
   * useDriftCatches subscription and its acknowledge handler. Passing them in
   * keeps one drift query for the whole dashboard rather than two.
   */
  driftCatches?: DriftCatchWithAcks[];
  routingMap?: Record<string, DriftRecipient[]>;
}

interface UseRiskFeedResult {
  items: RiskFeedItem[];
  byLocation: LocationRisk[];
  /** Earliest upcoming due across the org. */
  portfolioNextDue: string | null;
  counts: Record<Severity, number>;
  loading: boolean;
}

const APPROACHING_WINDOW_DAYS = 14;

function emptyCounts(): Record<Severity, number> {
  return { Critical: 0, High: 0, Medium: 0, Low: 0 };
}

function daysBetween(target: string, now: Date): number {
  const t = new Date(target).getTime();
  if (isNaN(t)) return 0;
  return Math.floor((now.getTime() - t) / 86_400_000);
}

/**
 * Band first, then approaching ahead of overdue inside the band, then the most
 * overdue. A thing about to lapse sits above one already lapsed at the same
 * severity because it is still preventable.
 */
function sortItems(a: RiskFeedItem, b: RiskFeedItem): number {
  const rank = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (rank !== 0) return rank;
  if (a.approaching !== b.approaching) return a.approaching ? -1 : 1;
  return b.daysOverdue - a.daysOverdue;
}

export function useRiskFeed(options?: UseRiskFeedOptions): UseRiskFeedResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const driftCatches = options?.driftCatches;
  const routingMap = options?.routingMap;

  // The page rebuilds these on every render, so they can never be effect deps by
  // identity — that refires the whole feed query on each paint. Read them through
  // refs and key the effect on a content signature instead.
  const driftRef = useRef(driftCatches);
  driftRef.current = driftCatches;
  const routingRef = useRef(routingMap);
  routingRef.current = routingMap;

  const driftKey = (driftCatches || [])
    .map(d => `${d.id}:${d.status}:${d.severity}:${d.detected_at}`)
    .join(',');
  const routingKey = Object.keys(routingMap || {})
    .sort()
    .map(id => `${id}:${(routingMap?.[id] || [])
      .map(r => `${r.user_id}|${r.acknowledged_at || ''}|${r.escalated_at || ''}|${r.escalation_deadline || ''}`)
      .join('~')}`)
    .join(',');

  const [items, setItems] = useState<RiskFeedItem[]>([]);
  const [schedules, setSchedules] = useState<{ location_id: string | null; next_due_date: string | null }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const nowIso = now.toISOString();

      const [locRes, schedRes, taskRes, docRes, caRes, incRes] = await Promise.all([
        supabase.from('locations').select('id, name').eq('organization_id', orgId),

        // service schedules: overdue services AND the next-due line
        supabase
          .from('location_service_schedules')
          .select('id, location_id, service_type_code, next_due_date, frequency_interval_days, is_active')
          .eq('organization_id', orgId)
          .eq('is_active', true),

        // (b) the overdue trio — same queries useOverdueItems runs
        supabase
          .from('task_instances')
          .select('id, title, due_at, location_id')
          .eq('organization_id', orgId).eq('status', 'pending').lt('due_at', nowIso),

        supabase
          .from('documents')
          .select('id, title, expiration_date, location_id')
          .eq('organization_id', orgId).eq('status', 'active').lt('expiration_date', today),

        // (d) open corrective actions — also supplies the overdue-CA rows
        supabase
          .from('corrective_actions')
          .select('id, title, severity, status, location_id, due_date, pillar, source_type, source_id, seal_id')
          .eq('organization_id', orgId)
          .neq('status', 'verified')
          .is('archived_at', null),

        // (c) open incidents, plus resolved-but-unsealed
        supabase
          .from('incidents')
          .select('id, incident_number, title, severity, status, category, location_id, location_name, created_at, linked_corrective_action_id, seal_id')
          .eq('organization_id', orgId)
          .in('status', ['open', 'investigating', 'resolved']),
      ]);

      if (cancelled) return;

      const locs = (locRes.data || []) as { id: string; name: string }[];
      const locName = new Map(locs.map(l => [l.id, l.name]));

      const openActions = (caRes.data || []) as Record<string, unknown>[];

      // In-motion: one batched reverse lookup over the same corrective_actions
      // rows already fetched — a drift or record flag is "in motion" when an
      // action points back at it. Lifted from DriftsCaughtList.
      const inMotionBySource = new Map<string, InMotion>();
      for (const a of openActions) {
        const srcId = a.source_id as string | null;
        if (srcId && (a.source_type === 'drift' || a.source_type === 'record_expiry')) {
          inMotionBySource.set(srcId, { id: a.id as string, sealed: !!a.seal_id });
        }
      }

      const out: RiskFeedItem[] = [];

      // ── (a) drift — supplied by the page, not queried here ──
      for (const d of (driftRef.current || [])) {
        const title = getDriftLabel(d.drift_type, { form: 'noun' });
        const rated = classify({ kind: 'drift', priority: d.severity, title });
        const lid = d.location_id ?? null;
        out.push({
          id: d.id,
          kind: 'drift',
          severity: rated.severity,
          reason: rated.reason,
          title,
          locationId: lid,
          locationName: d.location_name ?? (lid ? locName.get(lid) ?? null : null),
          orgLevel: !lid,
          daysOverdue: daysBetween(d.detected_at, now),
          approaching: false,
          inMotion: inMotionBySource.get(d.id) ?? null,
          href: '',
          pillar: d.pillar,
          recipients: routingRef.current?.[d.id] || [],
          driftStatus: d.status,
        });
      }

      // ── (b1) services, from the schedule table ──
      for (const s of (schedRes.data || []) as Record<string, unknown>[]) {
        const due = s.next_due_date as string | null;
        if (!due) continue;
        const late = daysBetween(due, now);
        const approaching = late < 0 && Math.abs(late) <= APPROACHING_WINDOW_DAYS;
        if (late < 0 && !approaching) continue; // not yet in view
        const label = String(s.service_type_code || 'Service').replace(/_/g, ' ');
        const rated = classify({
          kind: 'service',
          intervalDays: Number(s.frequency_interval_days) || 0,
          daysOverdue: late,
          label,
        });
        const lid = (s.location_id as string) ?? null;
        out.push({
          id: s.id as string,
          kind: 'service',
          severity: rated.severity,
          reason: rated.reason,
          title: label,
          locationId: lid,
          locationName: lid ? locName.get(lid) ?? null : null,
          orgLevel: !lid,
          daysOverdue: Math.max(0, late),
          approaching,
          inMotion: inMotionBySource.get(s.id as string) ?? null,
          href: '',
        });
      }

      // ── (b2) tasks ──
      for (const t of (taskRes.data || []) as Record<string, unknown>[]) {
        const late = daysBetween(t.due_at as string, now);
        const title = (t.title as string) || 'Task';
        const rated = classify({ kind: 'task', daysOverdue: late, label: title });
        const lid = (t.location_id as string) ?? null;
        out.push({
          id: t.id as string,
          kind: 'task',
          severity: rated.severity,
          reason: rated.reason,
          title,
          locationId: lid,
          locationName: lid ? locName.get(lid) ?? null : null,
          orgLevel: !lid,
          daysOverdue: late,
          approaching: false,
          inMotion: inMotionBySource.get(t.id as string) ?? null,
          href: '/checklists',
        });
      }

      // ── (b3) documents ──
      for (const d of (docRes.data || []) as Record<string, unknown>[]) {
        const late = daysBetween(d.expiration_date as string, now);
        const title = (d.title as string) || 'Untitled';
        const rated = classify({ kind: 'document', docLabel: title, daysOverdue: late });
        const lid = (d.location_id as string) ?? null;
        out.push({
          id: d.id as string,
          kind: 'document',
          severity: rated.severity,
          reason: rated.reason,
          title,
          locationId: lid,
          locationName: lid ? locName.get(lid) ?? null : null,
          orgLevel: !lid,
          daysOverdue: late,
          approaching: false,
          inMotion: inMotionBySource.get(d.id as string) ?? null,
          href: '/documents',
        });
      }

      // ── (c) incidents ──
      for (const i of (incRes.data || []) as Record<string, unknown>[]) {
        // resolved counts only while still unsealed — a sealed incident is done.
        if (i.status === 'resolved' && i.seal_id) continue;
        const title = (i.title as string) || 'Incident';
        const rated = classify({ kind: 'corrective_action', storedSeverity: i.severity as string, label: title });
        const lid = (i.location_id as string) ?? null;
        out.push({
          id: i.id as string,
          kind: 'incident',
          severity: rated.severity,
          reason: rated.reason,
          title,
          locationId: lid,
          locationName: (i.location_name as string) ?? (lid ? locName.get(lid) ?? null : null),
          orgLevel: !lid,
          daysOverdue: daysBetween(i.created_at as string, now),
          approaching: false,
          inMotion: i.linked_corrective_action_id
            ? { id: i.linked_corrective_action_id as string, sealed: false }
            : null,
          href: '/incidents',
          recordId: (i.incident_number as string) || undefined,
          pillar: (i.category as 'food_safety' | 'fire_safety') ?? null,
        });
      }

      // ── (d) open corrective actions ──
      for (const a of openActions) {
        const title = (a.title as string) || 'Corrective action';
        const due = a.due_date as string | null;
        const late = due ? daysBetween(due, now) : 0;
        const approaching = !!due && late < 0 && Math.abs(late) <= APPROACHING_WINDOW_DAYS;
        const lid = (a.location_id as string) ?? null;
        out.push({
          id: a.id as string,
          kind: 'corrective_action',
          severity: fromStoredSeverity(a.severity as string),
          reason: title,
          title,
          locationId: lid,
          locationName: lid ? locName.get(lid) ?? null : null,
          orgLevel: !lid,
          daysOverdue: Math.max(0, late),
          approaching,
          inMotion: null,
          href: `/corrective-actions/${a.id as string}`,
          recordId: String(a.id).slice(0, 8),
          pillar: (a.pillar as 'food_safety' | 'fire_safety') ?? null,
        });
      }

      out.sort(sortItems);
      setItems(out);
      setSchedules(
        ((schedRes.data || []) as Record<string, unknown>[]).map(s => ({
          location_id: (s.location_id as string) ?? null,
          next_due_date: (s.next_due_date as string) ?? null,
        })),
      );
      setLocations(locs);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orgId, driftKey, routingKey]);

  const counts = useMemo(() => {
    const c = emptyCounts();
    for (const i of items) c[i.severity] += 1;
    return c;
  }, [items]);

  const portfolioNextDue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = schedules
      .map(s => s.next_due_date)
      .filter((d): d is string => !!d && d >= today)
      .sort();
    return upcoming[0] ?? null;
  }, [schedules]);

  const byLocation = useMemo<LocationRisk[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return locations.map(loc => {
      const mine = items.filter(i => i.locationId === loc.id);
      const c = emptyCounts();
      for (const i of mine) c[i.severity] += 1;
      const worst = [...SEVERITY_ASC].reverse().find(s => c[s] > 0) ?? null;
      const nextDue =
        schedules
          .filter(s => s.location_id === loc.id && s.next_due_date && s.next_due_date >= today)
          .map(s => s.next_due_date as string)
          .sort()[0] ?? null;
      return {
        locationId: loc.id,
        locationName: loc.name,
        worst,
        counts: c,
        topItem: mine[0] ?? null,
        nextDue,
        openCount: mine.length,
      };
    });
  }, [items, locations, schedules]);

  return { items, byLocation, portfolioNextDue, counts, loading };
}
