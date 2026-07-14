/**
 * EvidLYDashboard — preview-only dashboard for the /join/:token signup page.
 *
 * Uses SIMULATED operational data (sanctioned exception, same footing as Guided Tour).
 * This component NEVER touches the live /dashboard route or its data hooks.
 * The boundary is absolute: /join/:token preview = simulated; live app = real data only.
 */

import { Flame, Utensils, CheckCircle2, Calendar, FileText, TrendingUp } from 'lucide-react';
import { FONT, SURFACE, TEXT, LINE, TONE, PILLAR, TYPE } from '../../design/tokens';

/* ── Simulated preview data — sanctioned exception to zero-fake-data rule ── */
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
    fire: {
      posture: 'clear',
      upcoming: [
        { title: 'Hood cleaning', due: 'Due Aug 15' },
        { title: 'Fire suppression inspection', due: 'Due Sep 1' },
      ],
      proof: { filed: 6, total: 7 },
    },
    food: {
      posture: 'clear',
      upcoming: [{ title: 'Health permit renewal', due: 'Due Sep 30' }],
      proof: { filed: 4, total: 4 },
    },
  },
  loc1: {
    ring: 94,
    headline: 'Los Angeles · on track.',
    sub: 'All records current. Nothing overdue.',
    stats: [
      { label: 'Sensors', value: 12 },
      { label: 'Readings', value: 412 },
      { label: 'Requirements', value: 8 },
    ],
    fire: {
      posture: 'clear',
      upcoming: [{ title: 'Hood cleaning', due: 'Due Aug 15' }],
      proof: { filed: 3, total: 3 },
    },
    food: {
      posture: 'clear',
      upcoming: [{ title: 'Health permit renewal', due: 'Due Sep 30' }],
      proof: { filed: 2, total: 2 },
    },
  },
  loc2: {
    ring: 88,
    headline: 'San Diego · 1 alert caught.',
    sub: 'EvidLY caught 1 thing that was overlooked. See below.',
    stats: [
      { label: 'Sensors', value: 6 },
      { label: 'Readings', value: 234 },
      { label: 'Requirements', value: 8 },
    ],
    fire: {
      posture: 'action',
      upcoming: [{ title: 'Fire suppression inspection', due: 'Due Sep 1' }],
      proof: { filed: 2, total: 3 },
    },
    food: {
      posture: 'clear',
      upcoming: [],
      proof: { filed: 2, total: 2 },
    },
  },
  loc3: {
    ring: 91,
    headline: 'Long Beach · on track.',
    sub: 'All records current. Nothing overdue.',
    stats: [
      { label: 'Sensors', value: 8 },
      { label: 'Readings', value: 201 },
      { label: 'Requirements', value: 7 },
    ],
    fire: {
      posture: 'clear',
      upcoming: [{ title: 'Sprinkler inspection', due: 'Due Oct 12' }],
      proof: { filed: 1, total: 1 },
    },
    food: {
      posture: 'clear',
      upcoming: [{ title: 'Food handler certification renewal', due: 'Due Nov 1' }],
      proof: { filed: 2, total: 2 },
    },
  },
};

/* ── ReadinessRing ─────────────────────────────────────────────────── */
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
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={value >= 90 ? TONE.sage.fill : TONE.amber.fill}
          strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: TYPE.ring, fontWeight: 600, color: TEXT.ink,
          fontFamily: FONT.display, lineHeight: 1,
        }}>
          {value}
        </span>
        <span style={{
          fontSize: TYPE.ringPct, color: TEXT.meta,
          fontFamily: FONT.mono, lineHeight: 1,
          alignSelf: 'flex-start', marginTop: 10,
        }}>
          %
        </span>
      </div>
    </div>
  );
}

/* ── StatusPill ─────────────────────────────────────────────────── */
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

/* ── PillarPreview ─────────────────────────────────────────────── */
function PillarPreview({ name, Icon, pillarToken, upcoming, proof, posture }) {
  return (
    <div style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}` }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px', borderBottom: `1px solid ${LINE.soft}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 8, backgroundColor: pillarToken.tint }}>
            <Icon size={18} style={{ color: pillarToken.bar }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: TEXT.ink, fontFamily: FONT.display }}>
            {name}
          </span>
        </div>
        <StatusPill posture={posture} />
      </div>

      {/* Two columns: Upcoming | Prove */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {/* Upcoming */}
        <div className="sm:border-r" style={{ padding: 20, borderColor: LINE.soft }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calendar size={13} style={{ color: TEXT.ink }} />
            <span style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
              fontWeight: 700, color: TEXT.ink, fontFamily: FONT.mono,
            }}>
              Upcoming
            </span>
          </div>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 14, color: TEXT.muted, padding: '12px 0', fontFamily: FONT.body }}>
              Nothing due in the next 30 days.
            </div>
          ) : upcoming.map((item, i) => (
            <div key={i} style={{
              paddingBottom: 12, marginBottom: i < upcoming.length - 1 ? 12 : 0,
              borderBottom: i < upcoming.length - 1 ? `1px solid ${LINE.soft}` : 'none',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT.ink, fontFamily: FONT.body }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, marginTop: 2, color: TEXT.muted, fontFamily: FONT.mono }}>
                {item.due}
              </div>
            </div>
          ))}
        </div>

        {/* Prove */}
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FileText size={13} style={{ color: TONE.sage.text }} />
            <span style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
              fontWeight: 700, color: TONE.sage.text, fontFamily: FONT.mono,
            }}>
              Prove
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: TYPE.figure, fontWeight: 700, color: TEXT.ink, fontFamily: FONT.display, lineHeight: 1,
            }}>
              {proof.filed}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: TEXT.muted, fontFamily: FONT.body }}>
              of {proof.total} required
            </span>
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
    </div>
  );
}

/* ── Main export ───────────────────────────────────────────────── */
export function EvidLYDashboard({ embedded = false, loc = 'all', orgName = '' }) {
  const data = PREVIEW_DATA[loc] || PREVIEW_DATA.all;

  return (
    <div>
      {/* Hero: ring + headline */}
      <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <ReadinessRing value={data.ring} />
        <div>
          <h2 style={{
            fontSize: TYPE.section, fontWeight: 500, color: TEXT.ink,
            fontFamily: FONT.display, margin: 0, lineHeight: 1.2,
          }}>
            {data.headline}
          </h2>
          <p style={{ fontSize: 14, color: TEXT.body, margin: '6px 0 0', fontFamily: FONT.body }}>
            {data.sub}
          </p>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 1, backgroundColor: LINE.soft, marginBottom: 24 }}>
        {data.stats.map((stat, i) => (
          <div key={i} style={{
            padding: '16px 20px', backgroundColor: SURFACE.raised, textAlign: 'center',
          }}>
            <div style={{
              fontSize: TYPE.stat, fontWeight: 600, color: TEXT.ink,
              fontFamily: FONT.display, lineHeight: 1,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: 11, color: TEXT.meta, fontFamily: FONT.mono,
              marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Watching banner */}
      <div style={{
        border: `1px solid ${LINE.soft}`, backgroundColor: TONE.sage.tint,
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 24, flexWrap: 'wrap',
      }}>
        <CheckCircle2 size={16} style={{ color: TONE.sage.text }} />
        <span style={{
          fontSize: 14, fontWeight: 600, color: TONE.sage.text,
          fontFamily: FONT.display, flex: 1,
        }}>
          EvidLY is watching · all clear
        </span>
        <span style={{
          fontSize: 12, color: TEXT.muted, fontFamily: FONT.mono,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <TrendingUp size={12} /> Active
        </span>
      </div>

      {/* Pillar cards: Fire + Food */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
        <PillarPreview
          name="Fire Safety"
          Icon={Flame}
          pillarToken={PILLAR.fire}
          upcoming={data.fire.upcoming}
          proof={data.fire.proof}
          posture={data.fire.posture}
        />
        <PillarPreview
          name="Food Safety"
          Icon={Utensils}
          pillarToken={PILLAR.food}
          upcoming={data.food.upcoming}
          proof={data.food.proof}
          posture={data.food.posture}
        />
      </div>
    </div>
  );
}
