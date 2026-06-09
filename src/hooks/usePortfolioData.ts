/**
 * usePortfolioData — Portfolio Dashboard
 *
 * Queries locations + open drift_catches for the user's org.
 * Computes per-location posture per pillar (food_safety / fire_safety).
 * Posture: 0 open = Solid, any >14 days = Alarm, otherwise Watch.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export type PostureStatus = 'solid' | 'watch' | 'alarm';

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
}

interface UsePortfolioDataResult {
  locations: PortfolioLocation[];
  summary: PortfolioSummary;
  loading: boolean;
  error: Error | null;
  acknowledge: (driftCatchId: string) => void;
}

const ALARM_THRESHOLD_DAYS = 14;

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function computePosture(items: PortfolioOpenItem[]): PostureStatus {
  if (items.length === 0) return 'solid';
  if (items.some(i => i.days_open > ALARM_THRESHOLD_DAYS)) return 'alarm';
  return 'watch';
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
    totalOpenItems: 0, totalHandled: 0, totalAtRiskCents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const { data: locRows, error: locErr } = await supabase
          .from('locations')
          .select('id, name')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .order('name');

        if (cancelled) return;
        if (locErr) throw new Error(locErr.message);
        if (!locRows || locRows.length === 0) {
          setLocations([]);
          setSummary(prev => ({ ...prev, totalLocations: 0 }));
          setLoading(false);
          return;
        }

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const { data: catchRows, error: catchErr } = await supabase
          .from('drift_catches')
          .select('id, location_id, drift_type, pillar, severity, detected_at, source_table, expected_value, actual_value, estimated_savings_cents')
          .eq('org_id', orgId)
          .eq('status', 'open')
          .gte('detected_at', ninetyDaysAgo.toISOString())
          .order('detected_at', { ascending: false });

        if (cancelled) return;
        if (catchErr) throw new Error(catchErr.message);

        const catchesByLoc = new Map();
        for (const row of catchRows || []) {
          const r = row;
          const locId = r.location_id;
          if (!catchesByLoc.has(locId)) catchesByLoc.set(locId, []);
          const daysOpen = daysSince(r.detected_at);
          catchesByLoc.get(locId).push({
            id: r.id,
            drift_type: r.drift_type,
            pillar: r.pillar,
            severity: r.severity,
            detected_at: r.detected_at,
            source_table: r.source_table,
            expected_value: r.expected_value || null,
            actual_value: r.actual_value || null,
            estimated_savings_cents: r.estimated_savings_cents || 0,
            days_open: daysOpen,
          });
        }

        let foodAlarm = 0, foodWatch = 0, foodSolid = 0;
        let fireAlarm = 0, fireWatch = 0, fireSolid = 0;
        let totalOpen = 0;
        let totalAtRisk = 0;

        const result: PortfolioLocation[] = locRows.map(loc => {
          const items = catchesByLoc.get(loc.id) || [];
          const foodItems = items.filter((i: PortfolioOpenItem) => i.pillar === 'food_safety');
          const fireItems = items.filter((i: PortfolioOpenItem) => i.pillar === 'fire_safety');
          const foodStatus = computePosture(foodItems);
          const fireStatus = computePosture(fireItems);

          if (foodStatus === 'alarm') foodAlarm++;
          else if (foodStatus === 'watch') foodWatch++;
          else foodSolid++;

          if (fireStatus === 'alarm') fireAlarm++;
          else if (fireStatus === 'watch') fireWatch++;
          else fireSolid++;

          totalOpen += items.length;
          totalAtRisk += items.reduce((s: number, i: PortfolioOpenItem) => s + i.estimated_savings_cents, 0);

          return {
            id: loc.id,
            name: loc.name,
            foodStatus,
            fireStatus,
            openCount: items.length,
            openItems: items,
            foodOpenCount: foodItems.length,
            fireOpenCount: fireItems.length,
          };
        });

        if (cancelled) return;

        const { count: handledCount } = await supabase
          .from('drift_catches')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'resolved')
          .gte('detected_at', ninetyDaysAgo.toISOString());

        if (cancelled) return;

        setLocations(result);
        setSummary({
          totalLocations: locRows.length,
          foodAlarm, foodWatch, foodSolid,
          fireAlarm, fireWatch, fireSolid,
          totalOpenItems: totalOpen,
          totalHandled: handledCount || 0,
          totalAtRiskCents: totalAtRisk,
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

    setLocations(prev => prev.map(loc => {
      const idx = loc.openItems.findIndex(i => i.id === driftCatchId);
      if (idx === -1) return loc;
      const newItems = loc.openItems.filter(i => i.id !== driftCatchId);
      const foodItems = newItems.filter(i => i.pillar === 'food_safety');
      const fireItems = newItems.filter(i => i.pillar === 'fire_safety');
      return {
        ...loc,
        openItems: newItems,
        openCount: newItems.length,
        foodOpenCount: foodItems.length,
        fireOpenCount: fireItems.length,
        foodStatus: computePosture(foodItems),
        fireStatus: computePosture(fireItems),
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
