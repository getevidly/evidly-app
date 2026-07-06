import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// "What's at Risk" (internal: COI) — residual dollar exposure per pillar, three states.
// Obligations come from what the COUNTY and INSURANCE require, measured against real
// ONGOING operational state — NOT onboarding/setup completion. Fire and food are
// structurally different pillars and are computed differently:
//   FIRE = countable services (fire_service_standing view: standing per service_type_code).
//   FOOD = state-based (posture from open food drifts; food has no discrete service list).
//   INSURANCE (both) = pl_pse_conditions -> symbol registry satisfied_by_codes.
// Baseline from coi_benchmarks (segment, default casual). Exposure = baseline × state share.
// Read-only (never calls pl-pse-eval, which writes drifts).

type Pillar = 'food' | 'fire';
type Range = { low: number; high: number };
export interface PillarRisk {
  baseline: Range; reduced: Range; pending: Range; live: Range;
  counts: { done: number; pending: number; live: number; total: number };
}
export interface WhatsAtRisk {
  lines: { food: Record<string, { low: number; high: number }>; fire: Record<string, { low: number; high: number }> };
  food: PillarRisk; fire: PillarRisk;
  total: { baseline: Range; reduced: Range; pending: Range; live: Range };
  worst: { food: Range; fire: Range };
  isPlaceholder: boolean; segment: string; version: string; sourceRefs: string[]; loading: boolean;
}

const rank: Record<string, number> = { live: 3, pending: 2, done: 1 };
const worse = (a: string | undefined, b: string) => (rank[a || ''] >= rank[b] ? (a as string) : b);
const emptyPillar = (): PillarRisk => ({
  baseline: { low: 0, high: 0 }, reduced: { low: 0, high: 0 }, pending: { low: 0, high: 0 }, live: { low: 0, high: 0 },
  counts: { done: 0, pending: 0, live: 0, total: 0 },
});

// fire_service_standing.standing -> three-state
const fireStandingToState = (standing: string): string => {
  if (standing === 'overdue') return 'live';
  if (standing === 'approaching' || standing === 'awaiting_first_service') return 'pending';
  return 'done'; // current, deferred, monitored
};

export function useWhatsAtRisk(locationId?: string | null): WhatsAtRisk {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const segment = 'casual'; // segment field TBD — default casual placeholder (governed follow-up)

  const [ins, setIns] = useState<{ symbol_code: string; pillar: string; legState: string }[] | null>(null);
  const [fireStanding, setFireStanding] = useState<{ service_type_code: string; standing: string }[] | null>(null);
  const [foodPosture, setFoodPosture] = useState<string | null>(null);
  const [foodDrifts, setFoodDrifts] = useState<number | null>(null);
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

  useEffect(() => {
    if (!orgId) { setIns([]); setFireStanding([]); setFoodPosture('solid'); setFoodDrifts(0); return; }
    let dead = false;
    (async () => {
      // ---- INSURANCE: active conditions -> satisfied_by_codes ----
      let condQ = supabase.from('pl_pse_conditions')
        .select('symbol_code, pillar, endorsement_expiration_date, location_id')
        .eq('condition_status', 'active');
      if (locationId) condQ = condQ.eq('location_id', locationId);
      const { data: conds } = await condQ;
      const { data: regs } = await supabase.from('pl_pse_symbol_registry').select('symbol_code, requirement');
      const satisfiedBy: Record<string, string[]> = {};
      for (const r of regs || []) {
        const codes = (r as any)?.requirement?.evidence?.satisfied_by_codes;
        satisfiedBy[(r as any).symbol_code] = Array.isArray(codes) ? codes : [];
      }
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
        insRows.push({ symbol_code: (c as any).symbol_code, pillar: (c as any).pillar, legState: legOf((c as any).endorsement_expiration_date) });
      }
      (insRows as any)._satisfiedBy = satisfiedBy;

      // ---- FIRE COUNTY: fire_service_standing (required services + standing) ----
      let fsQ = supabase.from('fire_service_standing').select('location_id, service_type_code, standing');
      if (locationId) fsQ = fsQ.eq('location_id', locationId);
      const { data: fsData } = await fsQ;
      // worst standing per service_type_code across locations (in-scope)
      const fsByCode: Record<string, string> = {};
      for (const row of fsData || []) {
        const code = (row as any).service_type_code;
        const st = fireStandingToState((row as any).standing);
        fsByCode[code] = worse(fsByCode[code], st);
      }
      const fireRows = Object.entries(fsByCode).map(([service_type_code, standing]) => ({ service_type_code, standing }));

      // ---- FOOD COUNTY: posture from open food drifts (food has no service list) ----
      let fdQ = supabase.from('drift_catches')
        .select('pillar, status, location_id')
        .eq('status', 'open')
        .eq('pillar', 'food_safety');
      if (locationId) fdQ = fdQ.eq('location_id', locationId);
      const { data: fdData } = await fdQ;
      const foodOpen = (fdData || []).length;
      const posture = foodOpen === 0 ? 'solid' : foodOpen >= 3 ? 'alarm' : 'watch';

      if (!dead) {
        setIns(insRows);
        setFireStanding(fireRows);
        setFoodPosture(posture);
        setFoodDrifts(foodOpen);
      }
    })();
    return () => { dead = true; };
  }, [orgId, locationId]);

  const loading = ins === null || fireStanding === null || foodPosture === null || foodDrifts === null || bench === null;

  const build = (): WhatsAtRisk => {
    const base: WhatsAtRisk = {
      food: emptyPillar(), fire: emptyPillar(),
      total: { baseline: { low: 0, high: 0 }, reduced: { low: 0, high: 0 }, pending: { low: 0, high: 0 }, live: { low: 0, high: 0 } },
      worst: { food: { low: 0, high: 0 }, fire: { low: 0, high: 0 } },
      isPlaceholder: true, segment, version: '', sourceRefs: [], loading, lines: { food: {}, fire: {} },
    };
    if (loading) return base;

    // baseline per pillar from coi_benchmarks
    const pillarBaseline: Record<Pillar, Range> = { food: { low: 0, high: 0 }, fire: { low: 0, high: 0 } };
    const pillarWorst: Record<Pillar, Range> = { food: { low: 0, high: 0 }, fire: { low: 0, high: 0 } };
    let placeholder = false;
    let _version = '';
    const _sourceSet = new Set<string>();
    const _lines: { food: Record<string, { low: number; high: number }>; fire: Record<string, { low: number; high: number }> } = { food: {}, fire: {} };
    for (const b of bench!) {
      const p = b.pillar as Pillar;
      pillarBaseline[p].low += Number(b.typical_low); pillarBaseline[p].high += Number(b.typical_high);
      pillarWorst[p] = { low: Number(b.worst_low), high: Number(b.worst_high) };
      _lines[p][b.loss_line] = { low: Number(b.typical_low), high: Number(b.typical_high) };
      if (b.is_placeholder) placeholder = true;
      if (b.version) _version = b.version;
      if (b.source_ref) _sourceSet.add(b.source_ref);
    }

    // ---- FIRE: countable services (fire_service_standing) + insurance fire conditions ----
    const fireObl: Record<string, string> = {};
    for (const r of fireStanding!) fireObl[r.service_type_code] = worse(fireObl[r.service_type_code], r.standing);
    // insurance fire conditions expand satisfied_by_codes into fire service codes
    const satisfiedBy = (ins as any)?._satisfiedBy || {};
    const FIRE_CODES = new Set(['KEC', 'FS', 'FA', 'SP', 'FE']);
    for (const c of ins!) {
      const codes: string[] = satisfiedBy[c.symbol_code] || [];
      const st = c.legState === 'current' ? 'done' : (c.legState === 'approaching' || c.legState === 'no_due_date') ? 'pending' : 'live';
      for (const svc of codes) if (FIRE_CODES.has(svc)) fireObl[svc] = worse(fireObl[svc], st);
    }
    let fDone = 0, fPend = 0, fLive = 0;
    for (const st of Object.values(fireObl)) { if (st === 'done') fDone++; else if (st === 'pending') fPend++; else fLive++; }
    const fTotal = fDone + fPend + fLive;
    const fShare = (n: number) => fTotal > 0 ? n / fTotal : 0;
    const fb = pillarBaseline.fire;
    base.fire = {
      baseline: fb,
      reduced: { low: fb.low * fShare(fDone), high: fb.high * fShare(fDone) },
      pending: { low: fb.low * fShare(fPend), high: fb.high * fShare(fPend) },
      live: { low: fb.low * fShare(fLive), high: fb.high * fShare(fLive) },
      counts: { done: fDone, pending: fPend, live: fLive, total: fTotal },
    };

    // ---- FOOD: state-based from posture (solid=reduced, watch=split, alarm=live) ----
    const foodFrac = foodPosture === 'solid' ? { done: 1, pending: 0, live: 0 }
                   : foodPosture === 'alarm' ? { done: 0, pending: 0, live: 1 }
                   : { done: 0, pending: 0.5, live: 0.5 }; // watch
    const fdb = pillarBaseline.food;
    base.food = {
      baseline: fdb,
      reduced: { low: fdb.low * foodFrac.done, high: fdb.high * foodFrac.done },
      pending: { low: fdb.low * foodFrac.pending, high: fdb.high * foodFrac.pending },
      live: { low: fdb.low * foodFrac.live, high: fdb.high * foodFrac.live },
      counts: { done: foodFrac.done ? 1 : 0, pending: foodFrac.pending ? 1 : 0, live: (foodDrifts as number) || (foodFrac.live ? 1 : 0), total: 1 },
    };

    base.total = {
      baseline: { low: base.food.baseline.low + base.fire.baseline.low, high: base.food.baseline.high + base.fire.baseline.high },
      reduced: { low: base.food.reduced.low + base.fire.reduced.low, high: base.food.reduced.high + base.fire.reduced.high },
      pending: { low: base.food.pending.low + base.fire.pending.low, high: base.food.pending.high + base.fire.pending.high },
      live: { low: base.food.live.low + base.fire.live.low, high: base.food.live.high + base.fire.live.high },
    };
    base.worst = { food: pillarWorst.food, fire: pillarWorst.fire };
    base.lines = _lines;
    base.isPlaceholder = placeholder;
    base.version = _version;
    base.sourceRefs = [..._sourceSet];
    return base;
  };

  return build();
}
