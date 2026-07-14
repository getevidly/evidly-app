/**
 * EvidLYDashboard — preview-only dashboard for the /join/:token signup page.
 *
 * Uses SIMULATED operational data (sanctioned exception, same footing as Guided Tour).
 * This component NEVER touches the live /dashboard route or its data hooks.
 * The boundary is absolute: /join/:token preview = simulated; live app = real data only.
 *
 * The shape of the simulation matches the real schema — coi_benchmarks, v_pse_gate,
 * compliance_documents (column: `type`), temperature_logs — so the customer never
 * sees a structure the database cannot produce.
 */

import {
  Flame, Utensils, CheckCircle2, Calendar, FileText, TrendingUp,
  ShieldCheck, ShieldX, AlertTriangle, Thermometer, Clock,
} from 'lucide-react';
import { FONT, SURFACE, TEXT, LINE, TONE, PILLAR, TYPE } from '../../design/tokens';

/* ── Helpers ───────────────────────────────────────────────────── */
const fmt = n => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(n);

/* ══════════════════════════════════════════════════════════════ */
/*  SIMULATED PREVIEW DATA                                       */
/*  Sanctioned exception to zero-fake-data rule.                 */
/*  Shape mirrors real schema; figures are illustrative.         */
/* ══════════════════════════════════════════════════════════════ */

const BASE_GATE = [
  { symbol: 'P-1', label: 'Automatic sprinkler system', proven: true },
  { symbol: 'P-2', label: 'Fire detection & alarm', proven: true },
  { symbol: 'P-5', label: 'Kitchen exhaust cleaning', proven: true },
  { symbol: 'P-5', label: 'Fire suppression system', proven: true },
];

const PREVIEW_DATA = {
  all: {
    ring: 92,
    headline: "You're covered.",
    sub: 'All records current. Nothing overdue.',
    stats: [
      { label: 'Kitchens', value: 9 },
      { label: 'Sensors', value: 26 },
      { label: 'Readings', value: 847 },
      { label: 'Requirements', value: 23 },
    ],
    fire: { posture: 'clear', proof: { filed: 6, total: 7 } },
    food: { posture: 'clear', proof: { filed: 4, total: 4 } },
    risk: {
      fire: { typicalLow: 18000, typicalHigh: 45000, worstLow: 85000, worstHigh: 220000, isPlaceholder: true },
      food: { typicalLow: 8000, typicalHigh: 22000, worstLow: 35000, worstHigh: 95000, isPlaceholder: true },
    },
    gate: { conditions: BASE_GATE, gateOpen: true },
    predict: [
      { name: 'Hood cleaning certificate', type: 'KEC', pillar: 'fire', daysLeft: 32 },
      { name: 'Fire suppression service', type: 'SUPP', pillar: 'fire', daysLeft: 65 },
      { name: 'Health permit', type: 'HP', pillar: 'food', daysLeft: 77 },
      { name: 'Food handler card — Maria R.', type: 'FHC', pillar: 'food', daysLeft: 89 },
      { name: 'Sprinkler inspection', type: 'SPRK', pillar: 'fire', daysLeft: 112 },
    ],
    onFile: [
      { name: 'Kitchen exhaust cleaning certificate', type: 'KEC', pillar: 'fire', status: 'current', issued: '2026-04-15' },
      { name: 'Fire suppression service record', type: 'SUPP', pillar: 'fire', status: 'current', issued: '2026-03-22' },
      { name: 'Sprinkler inspection report', type: 'SPRK', pillar: 'fire', status: 'current', issued: '2026-01-10' },
      { name: 'Fire alarm test certificate', type: 'ALRM', pillar: 'fire', status: 'current', issued: '2026-02-28' },
      { name: 'Health department permit', type: 'HP', pillar: 'food', status: 'current', issued: '2026-06-01' },
      { name: 'Food handler certification', type: 'FHC', pillar: 'food', status: 'current', issued: '2026-05-14' },
    ],
    measured: [
      { equipment: 'Walk-in cooler', temp: 38, min: 32, max: 41, time: '7:15 AM' },
      { equipment: 'Prep station', temp: 42, min: 32, max: 41, time: '7:20 AM' },
      { equipment: 'Hot holding — soup', temp: 142, min: 135, max: 165, time: '11:45 AM' },
      { equipment: 'Freezer #1', temp: -2, min: -10, max: 0, time: '7:00 AM' },
    ],
  },
  loc1: {
    ring: 94,
    headline: 'Vista Grill · on track.',
    sub: 'All records current. Nothing overdue.',
    stats: [
      { label: 'Sensors', value: 12 },
      { label: 'Readings', value: 412 },
      { label: 'Requirements', value: 8 },
    ],
    fire: { posture: 'clear', proof: { filed: 3, total: 3 } },
    food: { posture: 'clear', proof: { filed: 2, total: 2 } },
    risk: {
      fire: { typicalLow: 6000, typicalHigh: 15000, worstLow: 28000, worstHigh: 73000, isPlaceholder: true },
      food: { typicalLow: 3000, typicalHigh: 8000, worstLow: 12000, worstHigh: 32000, isPlaceholder: true },
    },
    gate: { conditions: BASE_GATE, gateOpen: true },
    predict: [
      { name: 'Hood cleaning certificate', type: 'KEC', pillar: 'fire', daysLeft: 32 },
      { name: 'Health permit', type: 'HP', pillar: 'food', daysLeft: 77 },
      { name: 'Sprinkler inspection', type: 'SPRK', pillar: 'fire', daysLeft: 112 },
    ],
    onFile: [
      { name: 'Kitchen exhaust cleaning certificate', type: 'KEC', pillar: 'fire', status: 'current', issued: '2026-04-15' },
      { name: 'Fire suppression service record', type: 'SUPP', pillar: 'fire', status: 'current', issued: '2026-03-22' },
      { name: 'Health department permit', type: 'HP', pillar: 'food', status: 'current', issued: '2026-06-01' },
    ],
    measured: [
      { equipment: 'Walk-in cooler', temp: 38, min: 32, max: 41, time: '7:15 AM' },
      { equipment: 'Hot holding — soup', temp: 142, min: 135, max: 165, time: '11:45 AM' },
    ],
  },
  loc2: {
    ring: 88,
    headline: 'Harbor House · 1 alert caught.',
    sub: 'EvidLY caught 1 thing that was overlooked. See below.',
    stats: [
      { label: 'Sensors', value: 6 },
      { label: 'Readings', value: 234 },
      { label: 'Requirements', value: 8 },
    ],
    fire: { posture: 'action', proof: { filed: 2, total: 3 } },
    food: { posture: 'clear', proof: { filed: 2, total: 2 } },
    risk: {
      fire: { typicalLow: 6000, typicalHigh: 15000, worstLow: 28000, worstHigh: 73000, isPlaceholder: true },
      food: { typicalLow: 3000, typicalHigh: 8000, worstLow: 12000, worstHigh: 32000, isPlaceholder: true },
    },
    gate: {
      conditions: [
        { symbol: 'P-1', label: 'Automatic sprinkler system', proven: true },
        { symbol: 'P-2', label: 'Fire detection & alarm', proven: true },
        { symbol: 'P-5', label: 'Kitchen exhaust cleaning', proven: false },
        { symbol: 'P-5', label: 'Fire suppression system', proven: true },
      ],
      gateOpen: false,
    },
    predict: [
      { name: 'Hood cleaning certificate', type: 'KEC', pillar: 'fire', daysLeft: -3 },
      { name: 'Fire suppression service', type: 'SUPP', pillar: 'fire', daysLeft: 65 },
      { name: 'Food handler card — James T.', type: 'FHC', pillar: 'food', daysLeft: 44 },
    ],
    onFile: [
      { name: 'Fire suppression service record', type: 'SUPP', pillar: 'fire', status: 'current', issued: '2026-03-22' },
      { name: 'Sprinkler inspection report', type: 'SPRK', pillar: 'fire', status: 'current', issued: '2026-01-10' },
      { name: 'Health department permit', type: 'HP', pillar: 'food', status: 'current', issued: '2026-06-01' },
    ],
    measured: [
      { equipment: 'Walk-in cooler', temp: 38, min: 32, max: 41, time: '7:15 AM' },
      { equipment: 'Prep station', temp: 42, min: 32, max: 41, time: '7:20 AM' },
    ],
  },
  loc3: {
    ring: 91,
    headline: 'The Anchor Room · on track.',
    sub: 'All records current. Nothing overdue.',
    stats: [
      { label: 'Sensors', value: 8 },
      { label: 'Readings', value: 201 },
      { label: 'Requirements', value: 7 },
    ],
    fire: { posture: 'clear', proof: { filed: 1, total: 1 } },
    food: { posture: 'clear', proof: { filed: 2, total: 2 } },
    risk: {
      fire: { typicalLow: 6000, typicalHigh: 15000, worstLow: 28000, worstHigh: 73000, isPlaceholder: true },
      food: { typicalLow: 2000, typicalHigh: 6000, worstLow: 10000, worstHigh: 31000, isPlaceholder: true },
    },
    gate: { conditions: BASE_GATE, gateOpen: true },
    predict: [
      { name: 'Sprinkler inspection', type: 'SPRK', pillar: 'fire', daysLeft: 90 },
      { name: 'Food handler certification renewal', type: 'FHC', pillar: 'food', daysLeft: 105 },
    ],
    onFile: [
      { name: 'Kitchen exhaust cleaning certificate', type: 'KEC', pillar: 'fire', status: 'current', issued: '2026-05-02' },
      { name: 'Health department permit', type: 'HP', pillar: 'food', status: 'current', issued: '2026-06-15' },
      { name: 'Food handler certification', type: 'FHC', pillar: 'food', status: 'current', issued: '2026-04-20' },
    ],
    measured: [
      { equipment: 'Walk-in cooler', temp: 37, min: 32, max: 41, time: '7:10 AM' },
      { equipment: 'Hot holding — chowder', temp: 148, min: 135, max: 165, time: '11:30 AM' },
      { equipment: 'Freezer #1', temp: -4, min: -10, max: 0, time: '7:00 AM' },
    ],
  },
};

/* ══════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENTS                                               */
/* ══════════════════════════════════════════════════════════════ */

/* ── ReadinessRing ────────────────────────────────────────────── */
function ReadinessRing({ value }) {
  const size = 96;
  const sw = 5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={SURFACE.rail} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={value >= 90 ? TONE.sage.fill : TONE.amber.fill}
          strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: TYPE.ring, fontWeight: 600, color: TEXT.ink, fontFamily: FONT.display, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: TYPE.ringPct, color: TEXT.meta, fontFamily: FONT.mono, lineHeight: 1, alignSelf: 'flex-start', marginTop: 10 }}>%</span>
      </div>
    </div>
  );
}

/* ── StatusPill ────────────────────────────────────────────────── */
function StatusPill({ posture }) {
  const map = {
    clear:  { label: 'On track',      bg: TONE.sage.tint,  color: TONE.sage.text,  dot: TONE.sage.dot },
    action: { label: 'Action needed', bg: TONE.amber.tint, color: TONE.amber.text, dot: TONE.amber.dot },
  };
  const s = map[posture] || map.clear;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
      padding: '4px 10px', backgroundColor: s.bg, color: s.color, fontFamily: FONT.mono,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

/* ── PillarChip ───────────────────────────────────────────────── */
function PillarChip({ pillar }) {
  const t = pillar === 'fire' ? PILLAR.fire : PILLAR.food;
  const label = pillar === 'fire' ? 'Fire' : 'Food';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      padding: '2px 8px', backgroundColor: t.tint, color: t.text, fontFamily: FONT.mono,
    }}>
      {label}
    </span>
  );
}

/* ── PillarPreview (updated — derives Next: from predict list) ─ */
function PillarPreview({ name, Icon, pillarToken, proof, posture, nextItem }) {
  return (
    <div style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}` }}>
      <div style={{
        padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 8, backgroundColor: pillarToken.tint }}>
            <Icon size={18} style={{ color: pillarToken.bar }} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: TEXT.ink, fontFamily: FONT.display }}>{name}</span>
            {nextItem && (
              <div style={{ fontSize: 11, color: TEXT.muted, fontFamily: FONT.mono, marginTop: 2 }}>
                Next: {nextItem.name} · {nextItem.daysLeft > 0 ? `${nextItem.daysLeft}d` : 'overdue'}
              </div>
            )}
          </div>
        </div>
        <StatusPill posture={posture} />
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FileText size={13} style={{ color: TONE.sage.text }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, color: TONE.sage.text, fontFamily: FONT.mono }}>Prove</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: TYPE.figure, fontWeight: 700, color: TEXT.ink, fontFamily: FONT.display, lineHeight: 1 }}>{proof.filed}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: TEXT.muted, fontFamily: FONT.body }}>of {proof.total} required</span>
        </div>
        <div style={{ height: 6, backgroundColor: SURFACE.rail, marginBottom: 12 }}>
          <div style={{
            height: '100%',
            width: `${proof.total > 0 ? (proof.filed / proof.total) * 100 : 0}%`,
            backgroundColor: proof.filed === proof.total ? TONE.sage.fill : TONE.amber.fill,
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ fontSize: 11, color: TEXT.muted, fontFamily: FONT.mono }}>
          {proof.filed === proof.total ? 'All records on file' : `${proof.total - proof.filed} remaining`}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  SECTION COMPONENTS — the five that were missing              */
/* ══════════════════════════════════════════════════════════════ */

/* ── 1. What's at risk ─────────────────────────────────────── */
function WhatsAtRisk({ risk, gate }) {
  const fireIsPlaceholder = risk.fire.isPlaceholder;
  const foodIsPlaceholder = risk.food.isPlaceholder;
  const showDisclaimer = fireIsPlaceholder || foodIsPlaceholder;

  return (
    <div style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}`, marginBottom: 24 }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} style={{ color: TONE.amber.text }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: TEXT.ink, fontFamily: FONT.mono }}>
            What's at risk
          </span>
        </div>
      </div>

      {/* Fire row */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PillarChip pillar="fire" />
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT.ink, fontFamily: FONT.body }}>Fire Safety</span>
          </div>
          <span style={{ fontSize: 13, color: TEXT.meta, fontFamily: FONT.mono }}>
            {fmt(risk.fire.typicalLow)} — {fmt(risk.fire.typicalHigh)}/yr typical
          </span>
        </div>
        {/* Worst case + gate status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{
            fontSize: 13, fontFamily: FONT.mono,
            color: gate.gateOpen ? TEXT.muted : TONE.red.text,
            textDecoration: gate.gateOpen ? 'line-through' : 'none',
          }}>
            {fmt(risk.fire.worstLow)} — {fmt(risk.fire.worstHigh)} worst case
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
            fontFamily: FONT.mono,
            color: gate.gateOpen ? TONE.sage.text : TONE.red.text,
          }}>
            Fire ceiling: {gate.gateOpen ? 'Closed.' : 'Stands in full.'}
          </span>
        </div>
      </div>

      {/* Food row */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PillarChip pillar="food" />
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT.ink, fontFamily: FONT.body }}>Food Safety</span>
          </div>
          <span style={{ fontSize: 13, color: TEXT.meta, fontFamily: FONT.mono }}>
            {fmt(risk.food.typicalLow)} — {fmt(risk.food.typicalHigh)}/yr typical
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, fontFamily: FONT.mono, color: TEXT.muted }}>
            {fmt(risk.food.worstLow)} — {fmt(risk.food.worstHigh)} worst case
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: TEXT.meta, fontFamily: FONT.mono }}>
            Defense — always on the table.
          </span>
        </div>
      </div>

      {/* Disclaimer — driven by is_placeholder */}
      {showDisclaimer && (
        <div style={{ padding: '12px 24px', backgroundColor: SURFACE.raised }}>
          <span style={{ fontSize: 11, color: TEXT.meta, fontFamily: FONT.mono, fontStyle: 'italic' }}>
            Illustrative figures based on industry benchmarks.
          </span>
        </div>
      )}
    </div>
  );
}

/* ── 2. Protective Safeguards gate ─────────────────────────── */
function PSEGate({ gate }) {
  return (
    <div style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}`, marginBottom: 24 }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {gate.gateOpen
            ? <ShieldCheck size={16} style={{ color: TONE.sage.text }} />
            : <ShieldX size={16} style={{ color: TONE.red.text }} />}
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: TEXT.ink, fontFamily: FONT.mono }}>
            Protective Safeguards · CP 04 11
          </span>
        </div>
      </div>

      {/* Condition rows — no progress bar, no percentage. Binary. */}
      <div style={{ padding: '16px 24px' }}>
        {gate.conditions.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0',
            borderBottom: i < gate.conditions.length - 1 ? `1px solid ${LINE.soft}` : 'none',
          }}>
            {c.proven
              ? <CheckCircle2 size={16} style={{ color: TONE.sage.text, flexShrink: 0 }} />
              : <ShieldX size={16} style={{ color: TONE.red.text, flexShrink: 0 }} />}
            <span style={{ fontSize: 13, color: TEXT.ink, fontFamily: FONT.body, flex: 1 }}>
              {c.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', fontFamily: FONT.mono, color: TEXT.meta }}>
              {c.symbol}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, fontFamily: FONT.mono,
              color: c.proven ? TONE.sage.text : TONE.red.text,
            }}>
              {c.proven ? 'Sealed' : 'Missing'}
            </span>
          </div>
        ))}
      </div>

      {/* Binary gate result */}
      <div style={{
        margin: '0 24px', padding: '14px 0',
        borderTop: `2px solid ${gate.gateOpen ? TONE.sage.fill : TONE.red.fill}`,
        borderBottom: `2px solid ${gate.gateOpen ? TONE.sage.fill : TONE.red.fill}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: FONT.mono, color: TEXT.ink }}>
          Fire ceiling
        </span>
        <span style={{
          fontSize: 16, fontWeight: 700, fontFamily: FONT.display,
          color: gate.gateOpen ? TONE.sage.text : TONE.red.text,
        }}>
          {gate.gateOpen ? 'Closed.' : 'Stands in full.'}
        </span>
      </div>

      {/* Required footnote — verbatim */}
      <div style={{ padding: '14px 24px' }}>
        <p style={{ fontSize: 11, color: TEXT.meta, fontFamily: FONT.mono, margin: 0, lineHeight: 1.5 }}>
          EvidLY reads and identifies what your policy requires. It does not determine coverage.
        </p>
      </div>
    </div>
  );
}

/* ── 3. What's upcoming (Predict layer) ────────────────────── */
function WhatsUpcoming({ predict }) {
  return (
    <div style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}`, marginBottom: 24 }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} style={{ color: TONE.amber.text }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: TEXT.ink, fontFamily: FONT.mono }}>
            What's upcoming
          </span>
          <span style={{ fontSize: 10, color: TEXT.meta, fontFamily: FONT.mono, marginLeft: 'auto', fontStyle: 'italic' }}>
            Predict the failure, reduce the cost
          </span>
        </div>
      </div>
      <div>
        {predict.map((item, i) => {
          const overdue = item.daysLeft < 0;
          const soon = item.daysLeft >= 0 && item.daysLeft <= 30;
          const pillColor = overdue ? TONE.red : soon ? TONE.amber : TONE.sage;
          const pillLabel = overdue ? 'Overdue' : soon ? 'Due soon' : 'On track';
          return (
            <div key={i} style={{
              padding: '14px 24px',
              borderBottom: i < predict.length - 1 ? `1px solid ${LINE.soft}` : 'none',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <PillarChip pillar={item.pillar} />
              <span style={{ fontSize: 14, fontWeight: 500, color: TEXT.ink, fontFamily: FONT.body, flex: 1, minWidth: 120 }}>
                {item.name}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600, fontFamily: FONT.mono,
                color: overdue ? TONE.red.text : TEXT.meta,
              }}>
                {overdue ? `${Math.abs(item.daysLeft)}d overdue` : `${item.daysLeft}d`}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '2px 8px', backgroundColor: pillColor.tint, color: pillColor.text, fontFamily: FONT.mono,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: pillColor.dot }} />
                {pillLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 4. What's on file ─────────────────────────────────────── */
function WhatsOnFile({ onFile }) {
  return (
    <div style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}`, marginBottom: 24 }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} style={{ color: TONE.sage.text }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: TEXT.ink, fontFamily: FONT.mono }}>
            What's on file
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
          padding: '3px 10px', backgroundColor: TONE.sage.tint, color: TONE.sage.text, fontFamily: FONT.mono,
        }}>
          Ready for an inspector
        </span>
      </div>
      <div>
        {onFile.map((doc, i) => (
          <div key={i} style={{
            padding: '12px 24px',
            borderBottom: i < onFile.length - 1 ? `1px solid ${LINE.soft}` : 'none',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <PillarChip pillar={doc.pillar} />
            <span style={{ fontSize: 13, fontWeight: 500, color: TEXT.ink, fontFamily: FONT.body, flex: 1, minWidth: 120 }}>
              {doc.name}
            </span>
            <span style={{ fontSize: 11, color: TEXT.meta, fontFamily: FONT.mono }}>
              {doc.issued}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px',
              backgroundColor: TONE.sage.tint, color: TONE.sage.text, fontFamily: FONT.mono,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {doc.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 5. What's measured ────────────────────────────────────── */
function WhatsMeasured({ measured }) {
  return (
    <div style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}`, marginBottom: 24 }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Thermometer size={16} style={{ color: PILLAR.food.bar }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: TEXT.ink, fontFamily: FONT.mono }}>
            What's measured
          </span>
        </div>
      </div>
      <div>
        {measured.map((reading, i) => {
          const pass = reading.temp >= reading.min && reading.temp <= reading.max;
          return (
            <div key={i} style={{
              padding: '12px 24px',
              borderBottom: i < measured.length - 1 ? `1px solid ${LINE.soft}` : 'none',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              backgroundColor: pass ? 'transparent' : TONE.red.tint,
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: TEXT.ink, fontFamily: FONT.body, flex: 1, minWidth: 120 }}>
                {reading.equipment}
              </span>
              <span style={{
                fontSize: TYPE.reading, fontWeight: 600, fontFamily: FONT.display, lineHeight: 1,
                color: pass ? TEXT.ink : TONE.red.text,
              }}>
                {reading.temp}°F
              </span>
              <span style={{ fontSize: 11, color: TEXT.meta, fontFamily: FONT.mono }}>
                {reading.min}–{reading.max}°F
              </span>
              <span style={{ fontSize: 11, color: TEXT.meta, fontFamily: FONT.mono }}>
                {reading.time}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '2px 8px', fontFamily: FONT.mono,
                backgroundColor: pass ? TONE.sage.tint : TONE.red.tint,
                color: pass ? TONE.sage.text : TONE.red.text,
              }}>
                {pass ? 'In range' : 'Out of range'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                  */
/* ══════════════════════════════════════════════════════════════ */

export function EvidLYDashboard({ embedded = false, loc = 'all', orgName = '' }) {
  const data = PREVIEW_DATA[loc] || PREVIEW_DATA.all;

  // Derive pillar "Next:" from the predict list
  const fireNext = data.predict.filter(p => p.pillar === 'fire')[0] || null;
  const foodNext = data.predict.filter(p => p.pillar === 'food')[0] || null;

  return (
    <div>
      {/* 1. Hero: ring + headline */}
      <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <ReadinessRing value={data.ring} />
        <div>
          <h2 style={{ fontSize: TYPE.section, fontWeight: 500, color: TEXT.ink, fontFamily: FONT.display, margin: 0, lineHeight: 1.2 }}>
            {data.headline}
          </h2>
          <p style={{ fontSize: 14, color: TEXT.body, margin: '6px 0 0', fontFamily: FONT.body }}>
            {data.sub}
          </p>
        </div>
      </div>

      {/* 2. Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 1, backgroundColor: LINE.soft, marginBottom: 24 }}>
        {data.stats.map((stat, i) => (
          <div key={i} style={{ padding: '16px 20px', backgroundColor: SURFACE.raised, textAlign: 'center' }}>
            <div style={{ fontSize: TYPE.stat, fontWeight: 600, color: TEXT.ink, fontFamily: FONT.display, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: TEXT.meta, fontFamily: FONT.mono, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Watching banner */}
      <div style={{
        border: `1px solid ${LINE.soft}`, backgroundColor: TONE.sage.tint,
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 24, flexWrap: 'wrap',
      }}>
        <CheckCircle2 size={16} style={{ color: TONE.sage.text }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: TONE.sage.text, fontFamily: FONT.display, flex: 1 }}>
          EvidLY is watching · all clear
        </span>
        <span style={{ fontSize: 12, color: TEXT.muted, fontFamily: FONT.mono, display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={12} /> Active
        </span>
      </div>

      {/* 4. What's at risk */}
      <WhatsAtRisk risk={data.risk} gate={data.gate} />

      {/* 5. Protective Safeguards gate */}
      <PSEGate gate={data.gate} />

      {/* 6–7. Pillar cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
        <PillarPreview
          name="Fire Safety" Icon={Flame} pillarToken={PILLAR.fire}
          proof={data.fire.proof} posture={data.fire.posture} nextItem={fireNext}
        />
        <PillarPreview
          name="Food Safety" Icon={Utensils} pillarToken={PILLAR.food}
          proof={data.food.proof} posture={data.food.posture} nextItem={foodNext}
        />
      </div>

      {/* 8. What's upcoming (Predict layer) */}
      <WhatsUpcoming predict={data.predict} />

      {/* 9. What's on file */}
      <WhatsOnFile onFile={data.onFile} />

      {/* 10. What's measured */}
      <WhatsMeasured measured={data.measured} />
    </div>
  );
}
