import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOnboardingState } from './onboarding/useOnboardingState';
import { REQUIREMENT_TO_SERVICE_CODE } from '../components/onboarding/work/workConstants';

// "What's at Risk" (internal: COI) — residual dollar exposure per pillar, three states.
// Obligation set = county (useOnboardingState -> service_type_code) UNION insurance
// (pl_pse_conditions -> symbol registry satisfied_by_codes -> service_type_code),
// deduplicated on service_type_code. Each obligation is done / pending / live(overdue).
// Baseline from coi_benchmarks (segment, default casual). All figures reconcile:
// reduced + pending + live = baseline, both bounds. Read-only (never calls pl-pse-eval,
// which writes drifts). Misses come from drift_catches (county task drifts + insurance
// pse_condition drifts, already unified in that table).

type Pillar = 'food' | 'fire';
type Range = { low: number; high: number };
export interface PillarRisk {
  baseline: Range; reduced: Range; pending: Range; live: Range;
  counts: { done: number; pending: number; live: number; total: number };
}
export interface WhatsAtRisk {
  food: PillarRisk; fire: PillarRisk;
  total: { baseline: Range; reduced: Range; pending: Range; live: Range };
  worst: { food: Range; fire: Range };
  isPlaceholder: boolean; segment: string; loading: boolean;
}

const SERVICE_PILLAR: Record<string, Pillar> = {
  KEC:'fire', FS:'fire', FA:'fire', SP:'fire', FE:'fire',
  PC:'food', GT:'food', BFT:'food',
};
const rank: Record<string, number> = { live:3, pending:2, done:1 };
const worse = (a: string | undefined, b: string) => (rank[a || ''] >= rank[b] ? (a as string) : b);
const emptyPillar = (): PillarRisk => ({
  baseline:{low:0,high:0}, reduced:{low:0,high:0}, pending:{low:0,high:0}, live:{low:0,high:0},
  counts:{done:0,pending:0,live:0,total:0},
});

export function useWhatsAtRisk(locationId?: string | null): WhatsAtRisk {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const segment = 'casual'; // segment field TBD — default casual placeholder (governed follow-up)
  const onboarding = useOnboardingState();
  const [ins, setIns] = useState<{ symbol_code: string; pillar: string; legState: string }[] | null>(null);
  const [drifts, setDrifts] = useState<{ pillar: string; service: string | null }[] | null>(null);
  const [bench, setBench] = useState<any[] | null>(null);

  // coi_benchmarks (segment)
  useEffect(() => {
    let dead = false;
    (async () => {
      const { data } = await supabase.from('coi_benchmarks').select('*').eq('segment', segment);
      if (!dead) setBench(data || []);
    })();
    return () => { dead = true; };
  }, [segment]);

  // insurance conditions -> resolve satisfied_by_codes ; misses from drift_catches
  useEffect(() => {
    if (!orgId) { setIns([]); setDrifts([]); return; }
    let dead = false;
    (async () => {
      // active conditions (optionally location-scoped)
      let condQ = supabase.from('pl_pse_conditions')
        .select('symbol_code, pillar, endorsement_expiration_date, location_id')
        .eq('condition_status', 'active');
      if (locationId) condQ = condQ.eq('location_id', locationId);
      const { data: conds } = await condQ;

      // symbol registry -> satisfied_by_codes
      const { data: regs } = await supabase.from('pl_pse_symbol_registry')
        .select('symbol_code, requirement');
      const satisfiedBy: Record<string, string[]> = {};
      for (const r of regs || []) {
        const codes = (r as any)?.requirement?.evidence?.satisfied_by_codes;
        satisfiedBy[(r as any).symbol_code] = Array.isArray(codes) ? codes : [];
      }
      // condition -> legState (current/approaching/lapsed) from expiration date
      const now = Date.now();
      const legOf = (iso: string | null): string => {
        if (!iso) return 'no_due_date';
        const t = new Date(iso).getTime();
        if (isNaN(t)) return 'no_due_date';
        const days = Math.ceil((t - now) / 86_400_000);
        if (days < 0) return 'lapsed';
        if (days <= 30) return 'approaching';
        return 'current';
      };
      const insRows: { symbol_code: string; pillar: string; legState: string }[] = [];
      for (const c of conds || []) {
        insRows.push({ symbol_code: (c as any).symbol_code, pillar: (c as any).pillar,
                       legState: legOf((c as any).endorsement_expiration_date) });
      }

      // open drift_catches -> misses (county task drifts + insurance pse_condition drifts)
      let driftQ = supabase.from('drift_catches')
        .select('pillar, dimension, source_record_id, drift_type, status, location_id')
        .eq('status', 'open')
        .in('drift_type', ['task_overdue', 'task_skipped', 'compliance']);
      if (locationId) driftQ = driftQ.eq('location_id', locationId);
      const { data: dr } = await driftQ;
      const driftRows = (dr || []).map((d: any) => ({ pillar: d.pillar, service: null }));

      if (!dead) {
        // stash satisfiedBy on the ins rows via closure by expanding here
        (insRows as any)._satisfiedBy = satisfiedBy;
        setIns(insRows);
        setDrifts(driftRows);
      }
    })();
    return () => { dead = true; };
  }, [orgId, locationId]);

  const loading = onboarding.loading || ins === null || drifts === null || bench === null;

  // ---- compute ----
  const build = (): WhatsAtRisk => {
    const base: WhatsAtRisk = {
      food: emptyPillar(), fire: emptyPillar(),
      total:{ baseline:{low:0,high:0}, reduced:{low:0,high:0}, pending:{low:0,high:0}, live:{low:0,high:0} },
      worst:{ food:{low:0,high:0}, fire:{low:0,high:0} },
      isPlaceholder:true, segment, loading,
    };
    if (loading) return base;

    // baseline per pillar from coi_benchmarks (sum loss lines; worst at pillar grain)
    const pillarBaseline: Record<Pillar, Range> = { food:{low:0,high:0}, fire:{low:0,high:0} };
    const pillarWorst: Record<Pillar, Range> = { food:{low:0,high:0}, fire:{low:0,high:0} };
    let placeholder = false;
    for (const b of bench!) {
      const p = b.pillar as Pillar;
      pillarBaseline[p].low += Number(b.typical_low); pillarBaseline[p].high += Number(b.typical_high);
      pillarWorst[p] = { low: Number(b.worst_low), high: Number(b.worst_high) };
      if (b.is_placeholder) placeholder = true;
    }

    // obligation set: service_type_code -> state, per pillar
    const obl: Record<Pillar, Map<string, string>> = { food:new Map(), fire:new Map() };

    // county
    const countyItems = [...(onboarding.foodSafety?.items || []), ...(onboarding.fireSafety?.items || [])];
    for (const it of countyItems as any[]) {
      if (it.status === 'skipped') continue;
      const svc = (REQUIREMENT_TO_SERVICE_CODE as any)[it.requirement_code];
      if (!svc) continue;
      const p = SERVICE_PILLAR[svc]; if (!p) continue;
      const st = it.status === 'done' ? 'done' : 'pending';
      obl[p].set(svc, worse(obl[p].get(svc), st));
    }
    // insurance (expand satisfied_by_codes; P-5 -> KEC+FS)
    const satisfiedBy = (ins as any)?._satisfiedBy || {};
    for (const c of ins!) {
      const codes: string[] = satisfiedBy[c.symbol_code] || [];
      const st = c.legState === 'current' ? 'done'
               : (c.legState === 'approaching' || c.legState === 'no_due_date') ? 'pending' : 'live';
      for (const svc of codes) {
        const p = SERVICE_PILLAR[svc]; if (!p) continue;
        obl[p].set(svc, worse(obl[p].get(svc), st));
      }
    }
    // drift misses -> pillar-level: mark any not-done obligation in that pillar live if drift present.
    // (service-grain drift linkage is partial; apply at pillar grain: if there is an open drift in a
    //  pillar, the pending items most at risk become live. Conservative: bump pending->live up to drift count.)
    const driftCountByPillar: Record<Pillar, number> = { food:0, fire:0 };
    for (const d of drifts!) {
      const p = d.pillar === 'fire_safety' ? 'fire' : d.pillar === 'food_safety' ? 'food' : null;
      if (p) driftCountByPillar[p]++;
    }
    (['food','fire'] as Pillar[]).forEach(p => {
      let bump = driftCountByPillar[p];
      if (bump <= 0) return;
      for (const [svc, st] of obl[p]) {
        if (bump <= 0) break;
        if (st === 'pending') { obl[p].set(svc, 'live'); bump--; }
      }
    });

    // partition + dollar-weight
    (['food','fire'] as Pillar[]).forEach(p => {
      let done=0, pending=0, live=0;
      for (const st of obl[p].values()) { if (st==='done') done++; else if (st==='pending') pending++; else live++; }
      const total = done + pending + live;
      const bl = pillarBaseline[p];
      const share = (n: number) => total > 0 ? n/total : 0;
      const pr: PillarRisk = {
        baseline: bl,
        reduced: { low: bl.low*share(done),    high: bl.high*share(done) },
        pending: { low: bl.low*share(pending), high: bl.high*share(pending) },
        live:    { low: bl.low*share(live),    high: bl.high*share(live) },
        counts: { done, pending, live, total },
      };
      base[p] = pr;
    });

    base.total = {
      baseline:{ low: base.food.baseline.low+base.fire.baseline.low, high: base.food.baseline.high+base.fire.baseline.high },
      reduced: { low: base.food.reduced.low+base.fire.reduced.low,   high: base.food.reduced.high+base.fire.reduced.high },
      pending: { low: base.food.pending.low+base.fire.pending.low,   high: base.food.pending.high+base.fire.pending.high },
      live:    { low: base.food.live.low+base.fire.live.low,         high: base.food.live.high+base.fire.live.high },
    };
    base.worst = { food: pillarWorst.food, fire: pillarWorst.fire };
    base.isPlaceholder = placeholder;
    return base;
  };

  return build();
}
