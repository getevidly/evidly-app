/**
 * useSurveyData — Supabase reads for the Marketing Survey tab.
 *
 * Reads:  market_research_responses (with FK join to jurisdictions for county name)
 * Writes: none (read-only dashboard)
 *
 * Computes: KPIs, segment/hardest/wouldPay bar mixes, adjuster/attorney
 * correlation cross-tabs, and recent-responses list.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';

// ── Row type ────────────────────────────────────────────────────

export interface SurveyResponseRow {
  id: string;
  org_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  segment: string | null;
  kitchen_count: string | null;
  county_id: string | null;
  role: string | null;
  record_locations: string[] | null;
  due_discovery: string | null;
  hardest_parts: string[] | null;
  asked_by: string[] | null;
  would_pay_for: string | null;
  open_answer: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  county_name: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Numeric midpoint for kitchen_count text buckets */
const KC_NUM: Record<string, number> = { '1': 1, '2-5': 3.5, '6-20': 13, '21+': 25 };

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isAdjusterOrAttorney(askedBy: string[] | null): boolean {
  if (!askedBy) return false;
  return askedBy.includes('Insurance adjuster') || askedBy.includes('Attorney');
}

// ── Correlation group stats ──────────────────────────────────────

export interface GroupStats {
  n: number;
  onePlace: number;   // % who picked "Everything in one place, retrievable"
  multiUnit: number;  // % with kitchen_count != '1'
  binderOnly: number; // % whose record_locations is exactly ['Binder / folder']
  avgKitchens: number;
}

function computeGroupStats(group: SurveyResponseRow[]): GroupStats {
  const n = group.length;
  if (n === 0) return { n: 0, onePlace: 0, multiUnit: 0, binderOnly: 0, avgKitchens: 0 };

  const onePlace = group.filter(r => r.would_pay_for === 'Everything in one place, retrievable').length;
  const multiUnit = group.filter(r => r.kitchen_count && r.kitchen_count !== '1').length;
  const binderOnly = group.filter(r => {
    const rl = r.record_locations || [];
    return rl.length === 1 && rl[0] === 'Binder / folder';
  }).length;
  const kitchenNums = group.map(r => KC_NUM[r.kitchen_count || ''] || 1);
  const avgKitchens = kitchenNums.reduce((a, b) => a + b, 0) / n;

  return {
    n,
    onePlace: Math.round((onePlace / n) * 100),
    multiUnit: Math.round((multiUnit / n) * 100),
    binderOnly: Math.round((binderOnly / n) * 100),
    avgKitchens: Math.round(avgKitchens * 10) / 10,
  };
}

// ── Aggregate stats ──────────────────────────────────────────────

export interface SurveyStats {
  startedCount: number;
  completedCount: number;
  completionRate: number;
  medianMinutes: number;
  adjusterAttorneyCount: number;
  segmentCounts: Record<string, number>;
  hardestCounts: Record<string, number>;
  wouldPayCounts: Record<string, number>;
  adjGroup: GroupStats;
  restGroup: GroupStats;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useSurveyData() {
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('market_research_responses')
        .select('*, jurisdictions(county)')
        .order('created_at', { ascending: false });
      if (qErr) throw qErr;

      // Flatten the FK join into county_name
      const rows = (data || []).map((r: Record<string, unknown>) => {
        const jur = r.jurisdictions as { county: string } | null;
        return {
          ...r,
          county_name: jur?.county ?? null,
          jurisdictions: undefined,
        };
      }) as SurveyResponseRow[];

      setResponses(rows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load survey responses';
      setError(msg);
      setResponses([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const stats = useMemo((): SurveyStats => {
    const started = responses.filter(r => r.started_at);
    const completed = responses.filter(r => r.completed_at);

    // Completion rate
    const completionRate = started.length > 0
      ? Math.round((completed.length / started.length) * 100)
      : 0;

    // Median completion time (minutes)
    const durations = completed
      .filter(r => r.started_at && r.completed_at)
      .map(r => (new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime()) / 60000);
    const medianMinutes = Math.round(median(durations));

    // Adjuster / attorney count
    const adjusterAttorneyCount = completed.filter(r => isAdjusterOrAttorney(r.asked_by)).length;

    // Q1 segment mix
    const segmentCounts: Record<string, number> = {};
    completed.forEach(r => {
      if (r.segment) segmentCounts[r.segment] = (segmentCounts[r.segment] || 0) + 1;
    });

    // Q7 hardest parts mix (multi-select — count each selected value)
    const hardestCounts: Record<string, number> = {};
    completed.forEach(r => {
      (r.hardest_parts || []).forEach(hp => {
        hardestCounts[hp] = (hardestCounts[hp] || 0) + 1;
      });
    });

    // Q9 would-pay-for mix (single choice)
    const wouldPayCounts: Record<string, number> = {};
    completed.forEach(r => {
      if (r.would_pay_for) wouldPayCounts[r.would_pay_for] = (wouldPayCounts[r.would_pay_for] || 0) + 1;
    });

    // Correlation cross-tabs
    const adjGroup = computeGroupStats(completed.filter(r => isAdjusterOrAttorney(r.asked_by)));
    const restGroup = computeGroupStats(completed.filter(r => !isAdjusterOrAttorney(r.asked_by)));

    return {
      startedCount: started.length,
      completedCount: completed.length,
      completionRate,
      medianMinutes,
      adjusterAttorneyCount,
      segmentCounts,
      hardestCounts,
      wouldPayCounts,
      adjGroup,
      restGroup,
    };
  }, [responses]);

  return { responses, stats, loading, error, refresh };
}
