/**
 * usePortfolioData — Portfolio Dashboard
 *
 * Queries locations + drift data for the user's org.
 * Per-location posture (food_safety / fire_safety) is read from the
 * advisor_briefings cache — the same canonical posture that the dashboard
 * advisors display, computed by postureEngine.ts via dataLoader.ts.
 *
 * Fallback for locations without a cached briefing: local computation
 * using the shared computePosture rule with the same data sources
 * (drift catches incl. reduced/proven, corrective actions, proven drift
 * count, recent 30-day drift count).
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { computePosture } from '../lib/computePosture';
import type { Posture } from '../lib/computePosture';

export type PostureStatus = Posture;

export interface PortfolioOpenItem {
  id: string;
  drift_type: string;
  pillar: 'food_safety' | 'fire_safety';
  severity: string;
  detected_at: string;
  source_table: string;
  expected_value: string | null;
  actual_value: string | null;
  estimated_savings_cents: number;
  days_open: number;
}

export interface PortfolioLocation {
  id: string;
  name: string;
  foodStatus: PostureStatus;
  fireStatus: PostureStatus;
  openCount: number;
  openItems: PortfolioOpenItem[];
  foodOpenCount: number;
  fireOpenCount: number;
}

export interface PortfolioSummary {
  totalLocations: number;
  foodAlarm: number;
  foodWatch: number;
  foodSolid: number;
  fireAlarm: number;
  fireWatch: number;
  fireSolid: number;
  totalOpenItems: number;
  totalHandled: number;
  totalAtRiskCents: number;
  benchmarkPlaceholder: boolean;
}

interface UsePortfolioDataResult {
  locations: PortfolioLocation[];
  summary: PortfolioSummary;
  loading: boolean;
  error: Error | null;
  acknowledge: (driftCatchId: string) => void;
}

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

/**
 * Fallback posture for a (location, pillar) when no advisor_briefings cache exists.
 * Uses the shared computePosture rule with drift catches + corrective actions.
 * Matches postureEngine.ts urgency mapping: severity critical/high = urgent,
 * CA due within 7 days = urgent.
 */
function fallbackPosture(
  pillar: 'food_safety' | 'fire_safety',
  drifts: Array<{ pillar: string; severity: string }>,
  cas: Array<{ pillar: string | null; due_date: string | null }>,
  provenDrifts: Array<{ pillar: string }>,
  recentDrifts: Array<{ pillar: string }>,
): PostureStatus {
  const pDrifts = drifts.filter(d => d.pillar === pillar);
  const pCAs = cas.filter(c => c.pillar === pillar);

  const hasUrgentDrift = pDrifts.some(d => d.severity === 'critical' || d.severity === 'high');
  const hasUrgentCA = pCAs.some(c => {
    if (!c.due_date) return false;
    const target = new Date(c.due_date + 'T00:00:00Z');
    return Math.ceil((target.getTime() - Date.now()) / 86_400_000) <= 7;
  });

  return computePosture({
    openItemCount: pDrifts.length + pCAs.length,
    hasUrgentItem: hasUrgentDrift || hasUrgentCA,
    activeProvenDriftCount: provenDrifts.filter(d => d.pillar === pillar).length,
    recentDriftCount30d: recentDrifts.filter(d => d.pillar === pillar).length,
  });
}

// ── Helpers to group arrays by a key ────────────────────────────────
function groupBy<T>(rows: T[], key: (r: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return map;
}

export function usePortfolioData(): UsePortfolioDataResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;
  const userId = profile?.id;

  const [locations, setLocations] = useState<PortfolioLocation[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalLocations: 0,
    foodAlarm: 0, foodWatch: 0, foodSolid: 0,
    fireAlarm: 0, fireWatch: 0, fireSolid: 0,
    totalOpenItems: 0, totalHandled: 0, totalAtRiskCents: 0, benchmarkPlaceholder: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const now = new Date();
        const nowISO = now.toISOString();
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // ── Parallel queries ─────────────────────────────────────
        const [locRes, driftRes, briefRes, caRes, provenRes, recentRes, handledRes] = await Promise.all([
          // 1. Org locations
          supabase
            .from('locations')
            .select('id, name')
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .order('name'),

          // 2. Open/reduced/proven drift catches (90 days) — drill-down items + fallback posture
          supabase
            .from('drift_catches')
            .select('id, location_id, drift_type, pillar, severity, status, detected_at, source_table, expected_value, actual_value, estimated_savings_cents')
            .eq('org_id', orgId)
            .in('status', ['open', 'reduced', 'proven'])
            .gte('detected_at', ninetyDaysAgo.toISOString())
            .order('detected_at', { ascending: false }),

          // 3. Advisor briefings — canonical posture from postureEngine.ts
          supabase
            .from('advisor_briefings')
            .select('location_id, advisor_type, posture')
            .eq('org_id', orgId)
            .in('advisor_type', ['food_safety', 'fire_safety'])
            .not('location_id', 'is', null)
            .gt('valid_until', nowISO)
            .order('generated_at', { ascending: false }),

          // 4. Open corrective actions — fallback posture input
          supabase
            .from('corrective_actions')
            .select('id, location_id, pillar, due_date')
            .eq('organization_id', orgId)
            .eq('status', 'open'),

          // 5. Proven drifts (any date) — fallback active_proven_drift_count
          supabase
            .from('drift_catches')
            .select('location_id, pillar')
            .eq('org_id', orgId)
            .eq('status', 'proven'),

          // 6. Recent drifts (30 days, any status) — fallback recent_drift_count_30d
          supabase
            .from('drift_catches')
            .select('location_id, pillar')
            .eq('org_id', orgId)
            .gte('detected_at', thirtyDaysAgo.toISOString()),

          // 7. Resolved count (90 days) — "What's Handled" KPI
          supabase
            .from('drift_catches')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId)
            .eq('status', 'resolved')
            .gte('detected_at', ninetyDaysAgo.toISOString()),
        ]);

        if (cancelled) return;
        if (locRes.error) throw new Error(locRes.error.message);
        const locRows = locRes.data || [];
        if (locRows.length === 0) {
          setLocations([]);
          setSummary(prev => ({ ...prev, totalLocations: 0 }));
          setLoading(false);
          return;
        }

        // ── Build briefing posture map (most-recent per location+advisor) ──
        // ── What's at Risk: coi_benchmarks (casual) + fire_service_standing (org-wide, batched) ──
        const { data: benchData } = await supabase.from('coi_benchmarks').select('*').eq('segment', 'casual');
        const _fireBase = { low: 0, high: 0 }, _foodBase = { low: 0, high: 0 };
        let _benchPlaceholder = false;
        for (const b of benchData || []) {
          if ((b as any).pillar === 'fire') { _fireBase.low += Number((b as any).typical_low); _fireBase.high += Number((b as any).typical_high); }
          else if ((b as any).pillar === 'food') { _foodBase.low += Number((b as any).typical_low); _foodBase.high += Number((b as any).typical_high); }
          if ((b as any).is_placeholder) _benchPlaceholder = true;
        }
        const { data: fireStandData } = await supabase.from('fire_service_standing').select('location_id, service_type_code, standing');
        const fireStandByLoc = groupBy(fireStandData || [], (r: any) => r.location_id);
        const _rank: Record<string, number> = { live: 3, pending: 2, done: 1 };
        const _worse = (a: string | undefined, b: string) => (_rank[a || ''] >= _rank[b] ? (a as string) : b);
        const _fireStandingToState = (st: string) => st === 'overdue' ? 'live' : (st === 'approaching' || st === 'awaiting_first_service') ? 'pending' : 'done';
        const kitchenAtRisk = (locId: string, foodStatus: string): { low: number; high: number } => {
          // FIRE: countable services from fire_service_standing
          const rows = (fireStandByLoc.get(locId) || []) as any[];
          const fireObl: Record<string, string> = {};
          for (const r of rows) fireObl[r.service_type_code] = _worse(fireObl[r.service_type_code], _fireStandingToState(r.standing));
          let fD = 0, fP = 0, fL = 0;
          for (const st of Object.values(fireObl)) { if (st === 'done') fD++; else if (st === 'pending') fP++; else fL++; }
          const fT = fD + fP + fL, fShare = (n: number) => fT > 0 ? n / fT : 0;
          const fireAtLow = _fireBase.low * fShare(fP) + _fireBase.low * fShare(fL);
          const fireAtHigh = _fireBase.high * fShare(fP) + _fireBase.high * fShare(fL);
          // FOOD: posture -> state-based
          const ff = foodStatus === 'solid' ? { pending: 0, live: 0 } : foodStatus === 'alarm' ? { pending: 0, live: 1 } : { pending: 0.5, live: 0.5 };
          const foodAtLow = _foodBase.low * ff.pending + _foodBase.low * ff.live;
          const foodAtHigh = _foodBase.high * ff.pending + _foodBase.high * ff.live;
          return { low: fireAtLow + foodAtLow, high: fireAtHigh + foodAtHigh };
        };

        const postureMap = new Map<string, PostureStatus>();
        for (const b of briefRes.data || []) {
          const key = `${b.location_id}:${b.advisor_type}`;
          // ordered by generated_at desc — first seen = most recent
          if (!postureMap.has(key)) postureMap.set(key, b.posture as PostureStatus);
        }

        // ── Group data by location for drill-down + fallback ─────
        const driftsByLoc = groupBy(driftRes.data || [], r => r.location_id);
        const casByLoc = groupBy(caRes.data || [], r => r.location_id);
        const provenByLoc = groupBy(provenRes.data || [], r => r.location_id);
        const recentByLoc = groupBy(recentRes.data || [], r => r.location_id);

        // ── Build per-location result ────────────────────────────
        let foodAlarm = 0, foodWatch = 0, foodSolid = 0;
        let fireAlarm = 0, fireWatch = 0, fireSolid = 0;
        let totalOpen = 0;
        let totalAtRisk = 0;
        let atRiskLow = 0, atRiskHigh = 0;

        const result: PortfolioLocation[] = locRows.map(loc => {
          const allDrifts = driftsByLoc.get(loc.id) || [];

          // Drill-down items: only status='open' (UI unchanged)
          const openDrifts = allDrifts.filter((d: { status: string }) => d.status === 'open');
          const items: PortfolioOpenItem[] = openDrifts.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            drift_type: r.drift_type as string,
            pillar: r.pillar as 'food_safety' | 'fire_safety',
            severity: r.severity as string,
            detected_at: r.detected_at as string,
            source_table: r.source_table as string,
            expected_value: (r.expected_value as string) || null,
            actual_value: (r.actual_value as string) || null,
            estimated_savings_cents: (r.estimated_savings_cents as number) || 0,
            days_open: daysSince(r.detected_at as string),
          }));

          // ── Posture: prefer advisor_briefings, fallback to local computation ──
          const foodBriefing = postureMap.get(`${loc.id}:food_safety`);
          const fireBriefing = postureMap.get(`${loc.id}:fire_safety`);

          const foodStatus: PostureStatus = foodBriefing ?? fallbackPosture(
            'food_safety',
            allDrifts as Array<{ pillar: string; severity: string }>,
            (casByLoc.get(loc.id) || []) as Array<{ pillar: string | null; due_date: string | null }>,
            (provenByLoc.get(loc.id) || []) as Array<{ pillar: string }>,
            (recentByLoc.get(loc.id) || []) as Array<{ pillar: string }>,
          );

          const fireStatus: PostureStatus = fireBriefing ?? fallbackPosture(
            'fire_safety',
            allDrifts as Array<{ pillar: string; severity: string }>,
            (casByLoc.get(loc.id) || []) as Array<{ pillar: string | null; due_date: string | null }>,
            (provenByLoc.get(loc.id) || []) as Array<{ pillar: string }>,
            (recentByLoc.get(loc.id) || []) as Array<{ pillar: string }>,
          );

          // Tally summaries
          if (foodStatus === 'alarm') foodAlarm++;
          else if (foodStatus === 'watch') foodWatch++;
          else foodSolid++;

          if (fireStatus === 'alarm') fireAlarm++;
          else if (fireStatus === 'watch') fireWatch++;
          else fireSolid++;

          const foodItems = items.filter(i => i.pillar === 'food_safety');
          const fireItems = items.filter(i => i.pillar === 'fire_safety');
          totalOpen += items.length;
          totalAtRisk += items.reduce((s, i) => s + i.estimated_savings_cents, 0);

          const _kAtRisk = kitchenAtRisk(loc.id, foodStatus);
          atRiskLow += _kAtRisk.low; atRiskHigh += _kAtRisk.high;
          return {
            id: loc.id,
            name: loc.name,
            foodStatus,
            fireStatus,
            atRiskLow: _kAtRisk.low,
            atRiskHigh: _kAtRisk.high,
            openCount: items.length,
            openItems: items,
            foodOpenCount: foodItems.length,
            fireOpenCount: fireItems.length,
          };
        });

        if (cancelled) return;

        setLocations(result);
        setSummary({
          totalLocations: locRows.length,
          foodAlarm, foodWatch, foodSolid,
          fireAlarm, fireWatch, fireSolid,
          totalOpenItems: totalOpen,
          totalHandled: handledRes.count || 0,
          totalAtRiskCents: totalAtRisk,
          atRiskLow,
          atRiskHigh,
          benchmarkPlaceholder: _benchPlaceholder,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId]);

  const acknowledge = useCallback((driftCatchId: string) => {
    if (!orgId || !userId || !userRole) return;

    // Optimistic: remove item from drill-down list.
    // Posture stays unchanged — the drift is still open, only acknowledged.
    setLocations(prev => prev.map(loc => {
      const idx = loc.openItems.findIndex(i => i.id === driftCatchId);
      if (idx === -1) return loc;
      const newItems = loc.openItems.filter(i => i.id !== driftCatchId);
      return {
        ...loc,
        openItems: newItems,
        openCount: newItems.length,
        foodOpenCount: newItems.filter(i => i.pillar === 'food_safety').length,
        fireOpenCount: newItems.filter(i => i.pillar === 'fire_safety').length,
      };
    }));

    supabase
      .from('drift_acknowledgments')
      .insert({ org_id: orgId, drift_catch_id: driftCatchId, user_id: userId, role: userRole })
      .then(({ error: insertErr }) => {
        if (insertErr && !insertErr.message.includes('duplicate')) {
          console.error('[usePortfolioData] ack failed:', insertErr.message);
        }
      });
  }, [orgId, userId, userRole]);

  return { locations, summary, loading, error, acknowledge };
}
