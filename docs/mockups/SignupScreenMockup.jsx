import React, { useState, useEffect, useRef } from 'react';
import {
  Flame, Utensils, CheckCircle2, Calendar,
  Eye, Bell, TrendingUp, Zap,
  ArrowRight, Send, Copy, Mail, Smartphone, Lock, Shield, Key, AlertOctagon
} from 'lucide-react';

/* EvidLY design tokens — migrated to the dashboard system.
   In-app these come from src/design/tokens.ts. Names kept as aliases so the
   existing usages below don't have to be rewritten one by one. */
const SERIF = "'Spectral', Georgia, serif";
const SANS  = "'Instrument Sans', system-ui, -apple-system, sans-serif";
const MONO  = "'IBM Plex Mono', ui-monospace, monospace";
const BRAND = "'Montserrat', sans-serif";   // wordmark only — Montserrat 800

const NAVY  = '#1C2A3A';   // ink        (was #1E2D4D)
const CREAM = '#F7F1E6';   // page       (was #FAF7F0)
const LINE  = '#EEE7D9';   // hairline   (was #E6E1D3)
const MUTED = '#5F6875';   // 5.02:1     (was #6B7689 — failed AA)
const META  = '#6E675A';   // 4.98:1     mono meta / eyebrows

/* STATE — the only semantic colors. Red is reserved: overdue · expired · out of range. */
const GREEN = '#3E5E4B';   // handled     (was #3F6B47)
const AMBER = '#8A6412';   // coming due  (was #B08A2E — failed AA)
const RED   = '#9E3B32';   // exposed now (was #A04040)
const SAGE_TINT  = '#E3ECE1';
const AMBER_TINT = '#F7EDD3';
const RED_TINT   = '#F6E3DF';

/* PILLAR — category, never judgment. Fire and food never share a hue. */
const RUST = '#B26A43';    // fire pillar (was #B85D22)
const BLUE = '#3E6B8A';    // food pillar

/* BRAND — accents only. Never a chart fill. */
const GOLD      = '#A08C5A';   // brand-mark accents
const GOLD_TEXT = '#8A6412';   // gold as TEXT — #A08C5A is 2.92:1 and fails AA
const WORDMARK  = '#A17C3B';   // the LY. Nothing else.


/* ============================================================================
   EvidLY — Dashboard  (the real dashboard, rendered as the signup preview)
   React conversion of EvidLY_Dashboard.html (dc-runtime template).
   Markup, copy, colors, data and behavior reproduced as given.

   Props:  pulse (bool, default true) · alertTone ('Advisory' | 'Warning')
============================================================================ */

/* Parses the original inline CSS strings into React style objects, so the
   markup below stays line-for-line comparable to the source template. */
const s = (css) => {
  const o = {};
  String(css).split(';').forEach((d) => {
    const i = d.indexOf(':');
    if (i < 0) return;
    const prop = d.slice(0, i).trim();
    const val = d.slice(i + 1).trim();
    if (!prop || !val) return;
    const key = prop
      .replace(/^-webkit-/, 'Webkit-')
      .replace(/^-moz-/, 'Moz-')
      .replace(/^-ms-/, 'ms-')
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    o[key] = val;
  });
  return o;
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Spectral:wght@300;400;500;600&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
@keyframes evPulse { 0% { box-shadow: 0 0 0 0 rgba(84,122,98,.5); } 70% { box-shadow: 0 0 0 7px rgba(84,122,98,0); } 100% { box-shadow: 0 0 0 0 rgba(84,122,98,0); } }
@keyframes evRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.ev-tab:hover { opacity: .82; }
.ev-breakdown:hover { color: #83612A !important; }
.ev-dark:hover { background: #2A3A4E !important; }
.ev-soft:hover { background: #FBF7EF !important; }
.ev-close:hover { background: #EFE8DA !important; }
.ev-card:hover { transform: translateY(-3px); box-shadow: 0 1px 2px rgba(28,42,58,.04), 0 30px 55px -30px rgba(28,42,58,.6); }
`;

/* --------------------------------------------------------------- data ----- */
const K = {
  all:        { name: 'Pacific Restaurant Group', city: null,          days: 0,   checks: 2830, records: 256, logs: 1126, sensors: 3, total: 63 },
  losangeles: { name: 'Vista Grill',              city: 'Los Angeles', days: 96,  checks: 1240, records: 96,  logs: 742,  sensors: 2, total: 21 },
  sandiego:   { name: 'Harbor House',             city: 'San Diego',   days: 214, checks: 980,  records: 88,  logs: 384,  sensors: 1, total: 21 },
  longbeach:  { name: 'The Anchor Room',          city: 'Long Beach',  days: 71,  checks: 610,  records: 72,  logs: 0,    sensors: 0, total: 21 },
};

/* ---- COLOR SYSTEM -------------------------------------------------------
   STATE owns color. PILLAR owns category. They never borrow from each other.
   Red is reserved: out of range · overdue · expired. Nothing else may use it.
   Gold #A08C5A stays a brand-mark accent and is never a chart fill.        */
const TONE = {
  sage:  { fill: '#7FA98B', tint: '#E3ECE1', text: '#3E5E4B', dot: '#547A62' },  // handled
  amber: { fill: '#D8A93A', tint: '#F7EDD3', text: '#8A6412', dot: '#D8A93A' },  // coming due
  red:   { fill: '#9E3B32', tint: '#F6E3DF', text: '#8E332B', dot: '#9E3B32' },  // exposed now
};
const PILLAR = {
  fire: { bar: '#B26A43', tint: '#F4E5DA', text: '#8A4A28' },
  food: { bar: '#3E6B8A', tint: '#E2ECF2', text: '#2C5570' },
};

const ALL_EQ = [
  { name: 'Walk-in Cooler',   loc: 'losangeles', locName: 'Vista Grill', temp: '38°F', lo: 33, hi: 40, val: 38 },
  { name: 'Reach-in Freezer', loc: 'losangeles', locName: 'Vista Grill', temp: '2°F',  lo: 0,  hi: 10, val: 2  },
  { name: 'Prep Cooler',      loc: 'sandiego', locName: 'Harbor House',  temp: '40°F', lo: 33, hi: 41, val: 40 },
].map((e) => {
  /* Tone is DERIVED, not hardcoded — so a reading that goes out of range turns
     red on its own instead of quietly rendering as "nearing limit". */
  const span = e.hi - e.lo;
  const out  = e.val < e.lo || e.val > e.hi;
  const near = !out && Math.min(e.val - e.lo, e.hi - e.val) / span < 0.15;
  const t    = out ? TONE.red : near ? TONE.amber : TONE.sage;
  return { ...e,
    state: out ? 'Out of range' : near ? 'Nearing limit' : 'In range',
    pos: Math.max(6, Math.min(94, Math.round(((e.val - e.lo) / span) * 100))),
    bar: t.fill, bg: t.tint, fg: t.text };
});

const PROOF = [
  { title: 'Hood suppression inspection', meta: 'Filed Mar 3 · Vista Grill · valid 12 months',
    detail: 'Semi-annual inspection by ACME Fire Protection. Certificate #FS-2291 is on file. EvidLY will remind you 60 days before the September 3 renewal.', doc: 'FS-2291.pdf' },
  { title: 'Cold-holding temperature logs', meta: '30 days complete · all kitchens',
    detail: '742 automated readings this month, 100% within the 33–40°F safe range. One tap hands a health inspector the complete record.', doc: 'ColdHold-Jul.pdf' },
  { title: 'Food handler certifications', meta: '8 of 8 staff current',
    detail: 'Every handler is certified through 2026. EvidLY tracks each renewal and warns you before any card lapses.', doc: 'Handlers-2026.pdf' },
];

/* Predict layer — what's coming, soonest first. Every item stays tagged to its
   own pillar. Nothing is blended, aggregated or scored. */
const UPCOMING = [
  { pillar: 'Fire safety', loc: 'losangeles', title: 'Health Department permit renewal',        days: 12, meta: 'Los Angeles County · $412',  status: 'renew now',    p: 'food' },
  { pillar: 'Food safety', loc: 'sandiego',   title: 'Pest control service',                    days: 18, meta: 'Ecolab',                      status: 'schedule now', p: 'food' },
  { pillar: 'Fire safety', loc: 'sandiego',   title: 'Fire extinguisher tag renewal',           days: 21, meta: 'Kidde',                       status: 'scheduled',    p: 'fire' },
  { pillar: 'Fire safety', loc: 'longbeach',  title: 'Hood cleaning',                           days: 27, meta: 'Cleaning Pros Plus',          status: 'scheduled',    p: 'fire' },
  { pillar: 'Fire safety', loc: 'losangeles', title: 'Hood cleaning',                           days: 32, meta: 'Cleaning Pros Plus',          status: 'schedule now', p: 'fire' },
  { pillar: 'Food safety', loc: 'longbeach',  title: 'Certified Food Protection Manager cert',  days: 34, meta: 'Emma Rodriguez',              status: 'in progress',  p: 'food' },
  { pillar: 'Fire safety', loc: 'losangeles', title: 'Semi-annual suppression inspection',      days: 45, meta: 'Fire Systems Co',             status: 'schedule now', p: 'fire' },
].map((u) => ({ ...u,
  pillar:  u.p === 'fire' ? 'Fire safety' : 'Food safety',
  action:  /now|assign|renew|submit|start/i.test(u.status),
  locName: { losangeles: 'Vista Grill', sandiego: 'Harbor House', longbeach: 'The Anchor Room' }[u.loc],
}));

const TEAM = [
  { name: 'María Osuna',  role: 'Kitchen manager' },
  { name: 'Devin Cho',    role: 'Sous chef' },
  { name: 'Lauren Pratt', role: 'Shift lead' },
];

/* The four locations. Shared so a host page can drive them from its own header
   instead of nesting a second scrolling window inside the page. */
const LOC_TABS = [
  ['all', 'Pacific Restaurant Group'], ['losangeles', 'Los Angeles'],
  ['sandiego', 'San Diego'], ['longbeach', 'Long Beach'],
];

const FIRE_TIP = 'California Fire Code requirements — hood suppression (NFPA 17A), extinguishers (NFPA 10), sprinklers (NFPA 25), alarms (NFPA 72) and hood cleaning (NFPA 96). EvidLY tracks every inspection and due date.';
const FOOD_TIP = 'California Retail Food Code requirements — receiving, the temperature and logging lifecycle, sanitation and handler certifications. EvidLY flags any gap the moment it appears.';
const RING_TIP = 'Inspection-ready = requirements with current, on-file evidence ÷ all requirements tracked. The open receiving-log gap is the only item without evidence right now.';

/* "What's at Risk" — cost-of-inaction surface, NOT a score.
   Placeholder casual-dining figures; illustrative until report-reconciled. */
/* Protective Safeguards (CP 04 11). The policy names these conditions. If ANY one
   lacks a current record, the insurer keeps that ground for denial — proving three
   of four earns nothing. This is a condition precedent, not a progress bar.
   Real build reads pl_pse_conditions (policy) + coi_benchmarks (segment). */
const PSE_CONDITIONS = [
  { id: 'kec',   name: 'Kitchen exhaust cleaning', current: true  },
  { id: 'sup',   name: 'Fire suppression',         current: true  },
  { id: 'alarm', name: 'Fire alarm',               current: true  },
  { id: 'sprk',  name: 'Fire sprinkler',           current: false },
];

const riskData = (loc) => {
  const n = loc === 'all' ? 3 : 1;
  const money = (v) => '$' + v.toLocaleString('en-US');
  const rng = (l, h) => money(l * n) + '–' + money(h * n);
  const food = {
    label: 'Food safety', typ: rng(900, 3500),
    lines: [
      { label: 'Foodborne illness', ctx: 'logs · HACCP', range: rng(400, 1800) },
      { label: 'Shutdown & reinspection', ctx: 'health dept', range: rng(300, 900) },
      { label: 'Reputation recovery', ctx: '', range: rng(200, 800) },
    ],
    worst: '$250K–$2M+', worstDesc: 'A severe outbreak, with a lawsuit.',
    covers: 'Covers: receiving, holding & cooling logs · checklists · HACCP',
  };
  const fire = {
    label: 'Fire safety', typ: rng(600, 2600),
    lines: [
      { label: 'Fire damage & equipment', ctx: 'NFPA 96 · 17A · 25 · 72', range: rng(300, 1200) },
      { label: 'Shutdown & rebuild', ctx: '', range: rng(200, 900) },
      { label: 'Reputation recovery', ctx: '', range: rng(100, 500) },
    ],
    worst: '$150K–$500K+', worstDesc: "A fire your insurance won't cover.",
    covers: 'Covers: hood cleaning · suppression, alarm & sprinkler checks',
  };
  const kn = loc === 'all' ? 'Pacific Restaurant Group' : K[loc].name;

  /* compact money — $900 · $3.5k */
  const k = (v) => (v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k' : '$' + v);
  const krng = (l, h) => k(l * n) + '–' + k(h * n);

  food.annual  = krng(900, 3500);
  food.live    = krng(450, 1800) + ' live · 2 overdue';
  food.reduced = '↓' + krng(450, 1700) + ' reduced by your work';
  food.ceilingLabel = 'An outbreak';
  food.ceiling = '$250k–$2m+';

  fire.annual  = krng(600, 2600);
  fire.live    = krng(200, 900) + ' live · 1 overdue';
  fire.reduced = '↓' + krng(400, 1700) + ' reduced by your work';
  fire.ceilingLabel = "A fire your insurance won't cover";
  fire.ceiling = '$150k–$500k+';

  return {
    pillars: [food, fire],
    food, fire,
    tileFood: food.typ + '/yr', tileFire: fire.typ + '/yr', tileTotal: rng(1500, 6100) + '/yr',
    totalCompact: krng(1500, 6100),
    totalTyp: rng(1500, 6100),
    equation: `Food safety (${rng(900, 3500)}) + fire safety (${rng(600, 2600)})`,
    typeChip: 'Casual dining · ' + kn,
    segment: 'Casual dining',
    foodPct: '57%', firePct: '43%',
  };
};

/* ================================================================ component */
function EvidLYDashboard({ pulse = true, alertTone = 'Advisory',
                          loc: locProp, onLocChange, embedded = false }) {
  /* Controlled when a host drives the tabs; self-managed otherwise. */
  const [locSelf, setLocSelf]       = useState('all');
  const loc    = locProp ?? locSelf;
  const setLoc = onLocChange ?? setLocSelf;
  const [ack, setAck]               = useState(false);
  const [open, setOpen]             = useState(null);
  const [tip, setTip]               = useState(null);
  const [riskOpen, setRiskOpen]     = useState(false);
  const [pse, setPse]               = useState(PSE_CONDITIONS);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState(null);
  const [disp, setDisp] = useState({ score: 0, days: 0, checks: 0, records: 0, logs: 0 });
  const timer = useRef(null);
  const dispRef = useRef(disp);
  dispRef.current = disp;

  const k       = K[loc];
  const hasGap  = loc === 'all' || loc === 'losangeles';
  const openN   = hasGap && !ack ? 1 : 0;
  const covered = k.total - openN;
  const score   = Math.round((covered / k.total) * 100);

  /* 700ms cubic-ease count-up, as the original animateIn() */
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const from = { ...dispRef.current };
    const to = { score, days: k.days, checks: k.checks, records: k.records, logs: k.logs };
    const start = Date.now(), dur = 700;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setDisp({
        score:   Math.round(from.score   + (to.score   - from.score)   * e),
        days:    Math.round(from.days    + (to.days    - from.days)    * e),
        checks:  Math.round(from.checks  + (to.checks  - from.checks)  * e),
        records: Math.round(from.records + (to.records - from.records) * e),
        logs:    Math.round(from.logs    + (to.logs    - from.logs)    * e),
      });
      if (t < 1) timer.current = setTimeout(tick, 16); else timer.current = null;
    };
    tick();
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, ack]);

  /* The date is today's, not a date frozen in a mockup. */
  const todayLabel = 'Today · ' + new Date().toLocaleDateString('en-US',
    { weekday: 'long', month: 'long', day: 'numeric' });

  const fmt = (n) => Number(n).toLocaleString('en-US');
  const offTip = () => setTip(null);

  const locTabs = LOC_TABS
    .map(([id, label]) => {
      const a = loc === id;
      return { id, label, onClick: () => setLoc(id),
        style: `font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:${a ? 600 : 500};cursor:pointer;border:none;border-radius:999px;padding:8px 16px;transition:background .16s ease,color .16s ease;background:${a ? '#1C2A3A' : 'transparent'};color:${a ? '#F5EFE4' : '#6A7280'};` };
    });

  const base = [
    { big: fmt(disp.checks),  label: 'compliance checks', sub: 'this week · automatic',
      tipText: 'Automated compliance checks EvidLY ran across your kitchens this week — every requirement, continuously.' },
    { big: fmt(disp.records), label: 'records on file', sub: 'signed, dated, ready',
      tipText: 'Signed inspections, logs and certificates on file and ready to hand an inspector at any moment.' },
    { big: k.sensors > 0 ? fmt(disp.logs) : '0', label: 'temp logs captured',
      sub: k.sensors > 0 ? 'from sensors · this week' : 'no sensors · manual only',
      tipText: 'Temperature readings captured automatically from connected sensors — the backbone of your cold-holding evidence.' },
  ];
  const daysStat = { big: fmt(disp.days), label: 'days covered', sub: 'zero missed requirements',
    tipText: 'Consecutive days this kitchen has gone with zero missed requirements — EvidLY tracks each kitchen’s streak separately, so it is shown per kitchen, not across all.' };
  const statsRaw  = loc === 'all' ? base : [daysStat, ...base];
  const nStats    = statsRaw.length;
  const stats     = statsRaw.map((st, i) => ({ ...st, onTip: () => setTip(i) }));
  const gridCols  = `repeat(${nStats}, 1fr)`;
  const statLefts = statsRaw.map((_, i) => (((i + 0.5) / nStats) * 100).toFixed(2) + '%');
  const statTipOpen = typeof tip === 'number' && !!stats[tip];

  const heroTail = openN > 0
    ? 'A receiving-log gap at Vista Grill needs your attention today — everything else is handled.'
    : 'Everything is handled — nothing needs your attention today.';
  const ringBg = `conic-gradient(from -90deg, #547A62 0 ${disp.score}%, #E7E0D2 ${disp.score}% 100%)`;

  const food = openN > 0
    ? { status: '1 needs your attention', pillBg: '#F7EDD3', pillFg: '#8A6412', dot: '#D8A93A', bar: '#D8A93A', width: '92%',  current: '11 of 12 requirements current', next: 'Next: receiving log · today',      nextColor: '#9A7B33' }
    : { status: 'On track',    pillBg: '#E3ECE1', pillFg: '#3E5E4B', dot: '#547A62', bar: '#7FA98B', width: '100%', current: '12 of 12 requirements current', next: null, nextColor: '#5F6875' };

  const equipment    = loc === 'all' ? ALL_EQ : ALL_EQ.filter((e) => e.loc === loc);
  const hasSensors   = k.sensors > 0;
  const sensorLabel  = k.sensors > 0 ? `${k.sensors} SENSOR${k.sensors === 1 ? '' : 'S'} · LIVE` : 'MANUAL LOGGING';
  const programScope = loc === 'all' ? '2 PROGRAMS · 3 KITCHENS' : '2 PROGRAMS · ' + k.name.toUpperCase();
  const risk         = riskData(loc);
  const pseTotal     = pse.length;
  const pseProven    = pse.filter((c) => c.current).length;
  const pseUnproven  = pseTotal - pseProven;
  const gateOpen     = pseProven === pseTotal;   // condition precedent — all, or nothing
  const togglePse    = (id) => setPse((prev) => prev.map((c) => (c.id === id ? { ...c, current: !c.current } : c)));
  const alertT       = String(alertTone).toLowerCase() === 'warning' ? TONE.red : TONE.amber;

  const upcoming      = loc === 'all' ? UPCOMING : UPCOMING.filter((u) => u.loc === loc);
  const upcomingScope = `${upcoming.length} IN THE NEXT 60 DAYS`;
  /* The pillar cards' "Next" reads the real soonest item for that pillar, so a card
     can never name a requirement that Upcoming doesn't have. */
  const nextFire      = upcoming.find((u) => u.p === 'fire');
  const nextFood      = upcoming.find((u) => u.p === 'food');

  const proof = PROOF.map((p, i) => ({ ...p, n: String(i + 1).padStart(2, '0'), open: open === i,
    chev: open === i ? '–' : '+', onToggle: () => setOpen(open === i ? null : i) }));

  return (
    <div style={s(`${embedded ? '' : 'min-height:100vh;'}background:#F7F1E6;font-family:'Instrument Sans',system-ui,sans-serif;color:#1C2A3A;position:relative;`)}>
      <style>{CSS}</style>

      {!embedded && <div style={s('height:6px;background:#CFE3D7;')} />}

      {/* ------------------------------------------------------------- nav */}
      {!embedded && (
      <nav style={s('background:#fff;border-bottom:1px solid #EEE7D9;display:flex;align-items:center;justify-content:space-between;padding:0 40px;height:58px;')}>
        <div style={s('display:flex;align-items:center;gap:10px;')}>
          <span style={s('width:24px;height:24px;border-radius:7px;background:#1C2A3A;display:inline-flex;align-items:center;justify-content:center;color:#CFE3D7;font-size:12px;')}>◆</span>
          <span style={s("font-family:'Montserrat',sans-serif;font-weight:800;font-size:20px;letter-spacing:-.01em;")}><span style={s('color:#A08C5A;')}>E</span><span style={s('color:#1C2A3A;')}>vid</span><span style={s('color:#A08C5A;')}>LY</span></span>
          <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;color:#6E675A;margin-left:8px;")}>DASHBOARD</span>
        </div>
        <div style={s('display:flex;align-items:center;gap:12px;')}>
          <span style={s('display:inline-flex;align-items:center;gap:7px;padding:6px 12px;background:#EEF3EC;border-radius:999px;')}>
            <span style={{ ...s('width:7px;height:7px;border-radius:50%;background:#547A62;'), animation: pulse ? 'evPulse 2.4s infinite' : 'none' }} />
            <span style={s("font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.1em;color:#3E5E4B;")}>LIVE</span>
          </span>
          <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.06em;color:#6E675A;")}>Owner view</span>
          <span style={s('width:30px;height:30px;border-radius:50%;background:#E3ECE1;color:#3E5E4B;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;')}>AR</span>
        </div>
      </nav>
      )}

      <div style={s(embedded
        ? 'padding:22px 22px 30px;display:flex;flex-direction:column;gap:24px;'
        : 'max-width:1180px;margin:0 auto;padding:34px 40px 90px;display:flex;flex-direction:column;gap:30px;animation:evRise .6s ease-out both;')}>

        {/* -------- tabs · hidden when the host drives them from its header -- */}
        {!embedded && (
          <div style={s('display:flex;gap:12px;')}>
            <div style={s('display:flex;gap:4px;background:#EFE7D7;border:1px solid #E4DBC8;border-radius:999px;padding:4px;')}>
              {locTabs.map((l) => (
                <button key={l.id} className="ev-tab" onClick={l.onClick} style={s(l.style)}>{l.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- hero */}
        <div style={s('display:grid;grid-template-columns:1fr auto;gap:52px;align-items:center;')}>
          <div>
            <div style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8A6412;")}>{todayLabel}</div>
            <h1 style={s("font-family:'Spectral',serif;font-weight:600;font-size:66px;line-height:1;color:#1C2A3A;margin:16px 0 0;letter-spacing:-.02em;")}>You're covered.</h1>
            <p style={s("font-family:'Spectral',serif;font-weight:300;font-size:21px;line-height:1.45;color:#4A5566;max-width:560px;margin:16px 0 0;")}>
              EvidLY is tracking <span style={s('color:#1C2A3A;font-weight:500;')}>{k.total} requirements</span>. {heroTail}
            </p>
            <div style={s('display:flex;flex-wrap:wrap;margin-top:26px;max-width:660px;border:1px solid #E7DFCE;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55);')}>
              <div style={s('flex:1 1 240px;background:#F1ECE0;padding:15px 18px;')}>
                <div style={s("font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6E675A;")}>The old way</div>
                <div style={s('font-size:14px;color:#9E3B32;text-decoration:line-through;margin-top:6px;')}>Binders, spreadsheets and sticky notes nobody looked at until the inspector did.</div>
              </div>
              <div style={s('flex:1 1 240px;background:#EAF1E8;padding:15px 18px;border-left:1px solid #DBE3D6;')}>
                <div style={s('display:flex;align-items:center;gap:7px;')}>
                  <span style={s('width:15px;height:15px;border-radius:50%;background:#547A62;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:9px;')}>✓</span>
                  <span style={s("font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#4E7059;")}>With EvidLY</span>
                </div>
                <div style={s('font-size:14px;color:#1C2A3A;font-weight:600;margin-top:6px;')}>Every requirement watched, every record on file.</div>
              </div>
            </div>
          </div>

          <div style={s('display:flex;flex-direction:column;align-items:center;gap:14px;')}>
            <div style={s('position:relative;width:224px;height:224px;')}>
              <div style={s('position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(from -90deg, #BEB49C 0deg 0.7deg, transparent 0.7deg 6deg);-webkit-mask:radial-gradient(circle at center, transparent 0 100px, #000 100px 109px, transparent 110px);mask:radial-gradient(circle at center, transparent 0 100px, #000 100px 109px, transparent 110px);')} />
              <div style={{ ...s('position:absolute;inset:24px;border-radius:50%;box-shadow:0 22px 48px -28px rgba(84,122,98,.75);'), background: ringBg }}>
                <div style={s('position:absolute;inset:19px;background:#F7F1E6;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;')}>
                  <div style={s("font-family:'Spectral',serif;font-weight:500;color:#1C2A3A;line-height:1;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:2px;")}>
                    <span style={s('font-size:52px;')}>{disp.score}</span>
                    <span style={s('font-size:24px;')}>%</span>
                  </div>
                  <div style={s('position:relative;display:inline-flex;align-items:center;gap:4px;margin-top:6px;white-space:nowrap;max-width:118px;')}
                       onMouseEnter={() => setTip('ring')} onMouseLeave={offTip}>
                    <span style={s("font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:#3E5E4B;")}>inspection-ready</span>
                    <span style={s("width:13px;height:13px;border-radius:50%;border:1px solid #B9C7BC;color:#3E5E4B;font-size:8px;display:inline-flex;align-items:center;justify-content:center;cursor:help;font-family:'IBM Plex Mono',monospace;flex-shrink:0;")}>i</span>
                    {tip === 'ring' && (
                      <div style={s('position:absolute;top:calc(100% + 12px);left:50%;transform:translateX(-50%);z-index:30;width:250px;background:#1C2A3A;color:#EDE7DA;font-size:12px;font-weight:400;line-height:1.55;padding:13px 15px;border-radius:10px;box-shadow:0 18px 40px -18px rgba(28,42,58,.7);text-align:left;text-transform:none;letter-spacing:normal;')}>{RING_TIP}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6E675A;letter-spacing:.03em;")}>{covered} of {k.total} covered</div>
          </div>
        </div>

        {/* ------------------------------------------------- what's at risk */}
        <div style={s('background:#fff;border:1px solid #EEE7D9;border-top:2px solid #A08C5A;border-radius:16px;padding:22px 26px;box-shadow:0 1px 2px rgba(28,42,58,.03),0 18px 40px -36px rgba(28,42,58,.5);')}>
          <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;')}>
            <span style={s("font-family:'Spectral',serif;font-size:19px;font-weight:600;color:#1C2A3A;")}>What's at risk</span>
            <span style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.04em;"), color: gateOpen ? TONE.sage.text : '#6E675A' }}>
              {gateOpen ? `ALL ${pseTotal} CONDITIONS CURRENT` : `${pseProven} OF ${pseTotal} CONDITIONS CURRENT`}
            </span>
          </div>
          <div style={s('font-size:12px;color:#6E675A;margin-top:4px;')}>{risk.segment} · based on your restaurant type</div>

          {/* per-pillar: annual · what's live now · what your work already took off */}
          {[risk.food, risk.fire].map((p) => (
            <div key={p.label} style={s('border-top:1px solid #F0EADC;padding:13px 0;margin-top:12px;')}>
              <div style={s('display:flex;justify-content:space-between;align-items:baseline;')}>
                <span style={s('font-size:13.5px;color:#4A5566;')}>{p.label}</span>
                <span style={s("font-family:'Spectral',serif;font-size:20px;font-weight:500;color:#1C2A3A;")}>
                  {p.annual}<span style={s('font-size:12px;color:#6E675A;font-weight:400;')}>/yr</span>
                </span>
              </div>
              <div style={s('display:flex;justify-content:space-between;gap:12px;margin-top:5px;')}>
                <span style={{ ...s('font-size:12px;'), color: TONE.red.text }}>{p.live}</span>
                <span style={{ ...s('font-size:12px;text-align:right;'), color: TONE.sage.text }}>{p.reduced}</span>
              </div>
            </div>
          ))}

          <div style={s('border-top:1px solid #D6CFC0;padding-top:13px;margin-top:2px;display:flex;justify-content:space-between;align-items:baseline;')}>
            <span style={s('font-size:13.5px;font-weight:600;color:#1C2A3A;')}>Total at risk</span>
            <span style={s("font-family:'Spectral',serif;font-size:24px;font-weight:600;color:#1C2A3A;")}>
              {risk.totalCompact}<span style={s('font-size:12px;color:#6E675A;font-weight:400;')}>/yr</span>
            </span>
          </div>

          {/* THE GATE — CP 04 11 is a condition precedent. All four, or none of it counts. */}
          <div style={{ ...s('margin-top:16px;border-radius:10px;padding:14px 16px;'),
                        background: gateOpen ? TONE.sage.tint : TONE.red.tint,
                        border: `1px solid ${gateOpen ? '#BDD3C1' : '#E5B9B2'}` }}>
            <div style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:11px;"),
                          color: gateOpen ? TONE.sage.text : TONE.red.text }}>
              If things go wrong once
            </div>

            {/* FIRE — a coverage condition. Prove every safeguard and this ground closes. */}
            <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:10px;')}>
              <span style={{ ...s('font-size:13px;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>{risk.fire.ceilingLabel}</span>
              <span style={{ ...s('font-size:15px;font-weight:600;white-space:nowrap;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>
                {gateOpen ? (
                  <>
                    <span style={s('text-decoration:line-through;font-weight:400;opacity:.6;')}>{risk.fire.ceiling}</span>
                    &nbsp;&nbsp;Closed
                  </>
                ) : risk.fire.ceiling}
              </span>
            </div>
            <div style={{ ...s('margin-top:6px;font-size:12px;line-height:1.5;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>
              {gateOpen
                ? 'Every safeguard your policy names has a current, sealed record. This ground for denial is closed.'
                : `${pseUnproven === 1 ? "One safeguard your policy names doesn't have a current record" : `${pseUnproven} safeguards your policy names don't have a current record`} — so this stands in full. Three of four earns nothing.`}
            </div>

            {/* FOOD — a defense, not a coverage condition. It never comes off. */}
            <div style={{ ...s('margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;align-items:baseline;'),
                          borderTop: `1px solid ${gateOpen ? '#BDD3C1' : '#E5B9B2'}` }}>
              <span style={{ ...s('font-size:13px;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>{risk.food.ceilingLabel}</span>
              <span style={{ ...s('font-size:15px;font-weight:600;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>{risk.food.ceiling}</span>
            </div>
            <div style={{ ...s('margin-top:6px;font-size:12px;line-height:1.5;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>
              Your records are your defense here. They don't take this off the table.
            </div>
          </div>

          <div style={s('margin-top:13px;font-size:11px;line-height:1.5;color:#6E675A;')}>
            Illustrative figures, conservative basis. “If things go wrong once” is a one-time ceiling — not a yearly cost.
            EvidLY reads and identifies what your policy requires. It does not determine coverage.
          </div>

          <div style={s('margin-top:10px;font-size:11px;line-height:1.5;color:#6E675A;')}>
            Basis: USDA ERS · CDC NORS · Bartsch et al. (food) · NFPA / Campbell · ISO CP 04 11 (fire). Figures shown at the conservative end.
          </div>

          <button className="ev-breakdown" onClick={() => setRiskOpen(true)} style={s("margin-top:12px;background:none;border:none;padding:0;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:600;color:#1C2A3A;cursor:pointer;")}>See the breakdown →</button>
        </div>

        {/* ---- PREVIEW CONTROL · demo toggle, not shipped ------------------- */}
        <div style={s('background:#fff;border:1px dashed #D8CDB4;border-radius:14px;padding:16px 20px;')}>
          <div style={s("font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6E675A;")}>Preview control · not in the live dashboard</div>
          <div style={s('font-size:12.5px;color:#1C2A3A;margin:6px 0 12px;line-height:1.5;')}>
            Toggle a safeguard to watch the gate. Any single unproven condition holds the full ceiling — proving three of four earns nothing.
          </div>
          {pse.map((c) => (
            <label key={c.id} style={s('display:flex;align-items:center;gap:10px;padding:7px 0;cursor:pointer;font-size:13px;color:#1C2A3A;')}>
              <input type="checkbox" checked={c.current} onChange={() => togglePse(c.id)}
                     style={{ width: 15, height: 15, accentColor: '#1C2A3A', cursor: 'pointer' }} />
              <span>{c.name}</span>
              <span style={{ ...s('margin-left:auto;font-size:11px;'), color: c.current ? TONE.sage.text : TONE.red.text }}>
                {c.current ? 'current record' : 'no current record'}
              </span>
            </label>
          ))}
        </div>

        {/* --------------------------------------------------- risk drawer */}
        {riskOpen && (
          <div onClick={() => setRiskOpen(false)} style={s('position:fixed;inset:0;z-index:100;background:rgba(28,42,58,.5);display:flex;align-items:flex-start;justify-content:center;padding:44px 20px;overflow:auto;')}>
            <div onClick={(e) => e.stopPropagation()} style={s('width:100%;max-width:720px;background:#F7F1E6;border-radius:20px;box-shadow:0 40px 90px -30px rgba(28,42,58,.65);overflow:hidden;')}>
              <div style={s('padding:26px 30px 20px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:1px solid #E7DFCE;')}>
                <div>
                  <h2 style={s("font-family:'Spectral',serif;font-weight:600;font-size:27px;color:#1C2A3A;margin:0;")}>What's at Risk</h2>
                  <p style={s('font-size:14px;color:#5F6875;margin:6px 0 0;')}>What's on the line behind the required work</p>
                </div>
                <div style={s('display:flex;align-items:flex-start;gap:14px;')}>
                  <div style={s('text-align:right;')}>
                    <div style={s('display:inline-block;font-size:12px;font-weight:600;color:#3E5E4B;background:#E3ECE1;padding:5px 11px;border-radius:999px;')}>{risk.typeChip}</div>
                    <div style={s('font-size:11px;color:#646D7A;margin-top:5px;')}>Based on your restaurant type</div>
                  </div>
                  <button className="ev-close" onClick={() => setRiskOpen(false)} style={s('background:none;border:1px solid #E4DBC8;border-radius:8px;width:32px;height:32px;font-size:16px;color:#6E675A;cursor:pointer;line-height:1;')}>×</button>
                </div>
              </div>
              <div style={s('padding:22px 30px 30px;display:flex;flex-direction:column;gap:18px;')}>
                <div style={s('background:#F3EAD6;border-radius:10px;padding:12px 15px;font-size:12.5px;line-height:1.5;color:#7A6A45;')}>
                  Illustrative figures, conservative basis. “Worst case” is a one-time ceiling if things go wrong — not a yearly cost.
                </div>
                {risk.pillars.map((p) => (
                  <div key={p.label} style={s('background:#fff;border:1px solid #EEE7D9;border-radius:16px;padding:22px 24px;')}>
                    <div style={s("font-family:'Spectral',serif;font-size:17px;font-weight:600;color:#1C2A3A;")}>{p.label}</div>
                    <div style={s("font-family:'Spectral',serif;font-size:34px;font-weight:500;color:#1C2A3A;line-height:1;margin-top:10px;")}>{p.typ}</div>
                    <div style={s('font-size:12px;color:#5F6875;margin-top:4px;')}>In a typical year</div>
                    <div style={s('margin-top:16px;border-top:1px solid #F0EADC;')}>
                      {p.lines.map((ln) => (
                        <div key={ln.label} style={s('display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-bottom:1px solid #F5EFE2;')}>
                          <span style={s('font-size:13.5px;color:#4A5566;')}>
                            {ln.label}
                            {ln.ctx && <span style={s("color:#6E675A;font-size:11px;font-family:'IBM Plex Mono',monospace;")}> · {ln.ctx}</span>}
                          </span>
                          <span style={s('font-size:13.5px;color:#1C2A3A;white-space:nowrap;')}>{ln.range}</span>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const closed = p.label === 'Fire safety' && gateOpen;   // CP 04 11 gate
                      return (
                        <div style={{ ...s('margin-top:16px;border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;'),
                                      background: closed ? TONE.sage.tint : '#F4F1E8',
                                      border: `1px solid ${closed ? '#BDD3C1' : '#E7E0D2'}` }}>
                          <div>
                            <div style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;"), color: closed ? TONE.sage.text : '#6E675A' }}>Worst case</div>
                            <div style={{ ...s('font-size:13px;margin-top:3px;font-style:italic;'), color: closed ? TONE.sage.text : '#6E6656' }}>
                              {closed ? 'Every safeguard your policy names has a current record. This ground for denial is closed.' : p.worstDesc}
                            </div>
                          </div>
                          <div style={{ ...s("font-family:'Spectral',serif;font-size:22px;font-weight:500;white-space:nowrap;"), color: closed ? TONE.sage.text : '#1C2A3A' }}>
                            {closed ? <><span style={s('text-decoration:line-through;font-weight:400;opacity:.6;')}>{p.worst}</span>&nbsp;&nbsp;Closed</> : p.worst}
                          </div>
                        </div>
                      );
                    })()}
                    <div style={s('font-size:12px;color:#646D7A;margin-top:14px;')}>{p.covers}</div>
                  </div>
                ))}
                <div style={s('background:#1C2A3A;border-radius:16px;padding:24px 26px;color:#EDE7DA;')}>
                  <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;')}>
                    <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#CFE3D7;")}>Total at risk</span>
                    <span style={s("font-family:'Spectral',serif;font-size:34px;font-weight:600;color:#fff;line-height:1;")}>{risk.totalTyp}</span>
                  </div>
                  <div style={s("font-size:13px;color:#AEB6C2;margin-top:12px;font-family:'IBM Plex Mono',monospace;")}>{risk.equation}</div>
                  <div style={s('font-size:12px;line-height:1.55;color:#9AA6B4;margin-top:14px;border-top:1px solid rgba(255,255,255,.12);padding-top:14px;')}>
                    This is money at risk, added up. It's not a verdict on your kitchen, and it doesn't replace your county's inspection. Worst-case figures are shown separately for each area and aren't added together.
                  </div>
                </div>
                <div style={s('font-size:11.5px;line-height:1.5;color:#6E675A;')}>
                  Basis: USDA ERS · CDC NORS · Bartsch et al. (food) · NFPA / Campbell · ISO CP 04 11 (fire). Figures shown at the conservative end.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------- stat grid */}
        <div style={s('position:relative;')}>
          <div style={s('border:1px solid #EEE7D9;border-radius:16px;overflow:hidden;background:#EFE8DA;box-shadow:0 1px 2px rgba(28,42,58,.03),0 18px 40px -36px rgba(28,42,58,.5);')}>
            <div style={{ ...s('display:grid;gap:1px;'), gridTemplateColumns: gridCols }}>
              {stats.map((st, i) => (
                <div key={i} style={s('background:#fff;padding:24px 26px;')}>
                  <div style={s("font-family:'Spectral',serif;font-weight:500;font-size:42px;color:#1C2A3A;line-height:1;letter-spacing:-.01em;font-variant-numeric:tabular-nums;")}>{st.big}</div>
                  <div style={s('display:flex;align-items:center;gap:6px;margin-top:12px;')}>
                    <span style={s('font-size:13px;font-weight:600;color:#1C2A3A;')}>{st.label}</span>
                    <span onMouseEnter={st.onTip} onMouseLeave={offTip} style={s("width:15px;height:15px;border-radius:50%;border:1px solid #C9BFA8;color:#6E675A;font-size:9px;display:inline-flex;align-items:center;justify-content:center;cursor:help;font-family:'IBM Plex Mono',monospace;")}>i</span>
                  </div>
                  <div style={s('font-size:12px;color:#5F6875;margin-top:3px;')}>{st.sub}</div>
                </div>
              ))}
            </div>
          </div>
          {statTipOpen && (
            <div style={{ ...s('position:absolute;top:calc(100% + 8px);transform:translateX(-50%);z-index:30;width:262px;background:#1C2A3A;color:#EDE7DA;font-size:12px;line-height:1.55;padding:13px 15px;border-radius:10px;box-shadow:0 18px 40px -18px rgba(28,42,58,.7);'), left: statLefts[tip] }}>
              {stats[tip].tipText}
            </div>
          )}
        </div>

        {/* ------------------------------------------- one thing to look at */}
        <div style={s('display:flex;flex-direction:column;gap:14px;')}>
          <div style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8A6412;")}>One thing to look at</div>

          {openN > 0 && (
            <div style={{ ...s('display:flex;background:#FCFAF4;border:1px solid #E9E0CC;border-radius:14px;overflow:hidden;'), borderLeft: `3px solid ${alertT.fill}` }}>
              <div style={s('padding:24px 26px;flex:1;')}>
                <div style={s('display:flex;align-items:center;gap:9px;flex-wrap:wrap;')}>
                  <span style={{ ...s('font-size:11px;font-weight:600;letter-spacing:.04em;padding:4px 10px;border-radius:999px;'), background: alertT.tint, color: alertT.text }}>{String(alertTone).toUpperCase()}</span>
                  <span style={{ ...s('font-size:11px;font-weight:600;letter-spacing:.04em;padding:4px 10px;border-radius:999px;'), background: PILLAR.food.tint, color: PILLAR.food.text }}>FOOD SAFETY</span>
                  <span style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:11px;"), color: alertT.text }}>2 days open · Vista Grill</span>
                </div>
                <h3 style={s("font-family:'Spectral',serif;font-weight:600;font-size:23px;color:#1C2A3A;margin:14px 0 0;")}>Receiving log gap</h3>
                <p style={s('font-size:14.5px;line-height:1.6;color:#4A5566;margin:9px 0 0;max-width:560px;')}>
                  A receiving log hasn't been recorded at Vista Grill since Thursday. EvidLY flagged it and routed it to you. Log today's delivery to close it — or hand it to a team member.
                </p>
              </div>
              <div style={s('padding:24px 26px;display:flex;flex-direction:column;gap:10px;justify-content:center;border-left:1px solid #EFE8DA;background:#FBF6EC;')}>
                <button className="ev-dark" onClick={() => setAck(true)} style={s("background:#1C2A3A;color:#F5EFE4;border:none;border-radius:9px;padding:12px 18px;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;")}>Acknowledge as owner →</button>
                <div>
                  {!assignedTo && (
                    <>
                      <button className="ev-soft" onClick={() => setAssignOpen(!assignOpen)} style={s("width:100%;background:#fff;color:#4A5566;border:1px solid #E4DBC8;border-radius:9px;padding:12px 18px;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:8px;")}>
                        Assign to a team member <span style={s('font-size:10px;color:#646D7A;')}>▾</span>
                      </button>
                      {assignOpen && (
                        <div style={s('margin-top:8px;background:#fff;border:1px solid #E4DBC8;border-radius:11px;box-shadow:0 16px 34px -22px rgba(28,42,58,.5);overflow:hidden;')}>
                          {TEAM.map((m) => (
                            <button key={m.name} className="ev-soft" onClick={() => { setAssignedTo(m.name); setAssignOpen(false); }}
                              style={s("width:100%;text-align:left;background:none;border:none;padding:10px 14px;cursor:pointer;font-family:'Instrument Sans',sans-serif;display:flex;flex-direction:column;gap:1px;")}>
                              <span style={s('font-size:13px;font-weight:600;color:#1C2A3A;')}>{m.name}</span>
                              <span style={s("font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#646D7A;")}>{m.role}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {assignedTo && (
                    <div style={s('display:flex;align-items:center;gap:8px;background:#EEF3EC;border:1px solid #D3E1CE;border-radius:9px;padding:11px 14px;')}>
                      <span style={s('width:18px;height:18px;border-radius:50%;background:#547A62;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;')}>✓</span>
                      <span style={s('font-size:12.5px;color:#2C4636;')}>Routed to <span style={s('font-weight:600;')}>{assignedTo}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasGap && ack && (
            <div style={s('display:flex;align-items:center;gap:16px;background:#EEF3EC;border:1px solid #D3E1CE;border-radius:14px;padding:22px 26px;')}>
              <span style={s('width:34px;height:34px;border-radius:50%;background:#547A62;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;')}>✓</span>
              <div>
                <div style={s('font-size:15px;font-weight:600;color:#2C4636;')}>Handled by you · just now</div>
                <div style={s('font-size:13.5px;color:#4E6553;margin-top:2px;')}>EvidLY logged your acknowledgement to Vista Grill's record and closed the alert. Inspection-ready is back to 100%.</div>
              </div>
            </div>
          )}

          {!hasGap && (
            <div style={s('display:flex;align-items:center;gap:16px;background:#EEF3EC;border:1px solid #D3E1CE;border-radius:14px;padding:22px 26px;')}>
              <span style={s('width:34px;height:34px;border-radius:50%;background:#547A62;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;')}>✓</span>
              <div>
                <div style={s('font-size:15px;font-weight:600;color:#2C4636;')}>Nothing needs your attention at {k.name}</div>
                <div style={s('font-size:13.5px;color:#4E6553;margin-top:2px;')}>Every requirement is current and its evidence is on file. EvidLY will alert you the moment that changes.</div>
              </div>
            </div>
          )}
        </div>

        {/* -------------------------------------------------- what's monitored */}
        <div style={s('display:flex;flex-direction:column;gap:16px;')}>
          <div style={s('display:flex;justify-content:space-between;align-items:baseline;')}>
            <h2 style={s("font-family:'Spectral',serif;font-weight:600;font-size:27px;color:#1C2A3A;margin:0;")}>What's monitored</h2>
            <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;color:#646D7A;")}>{programScope}</span>
          </div>
          <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:22px;')}>

            <div className="ev-card" style={s('background:#fff;border:1px solid #EEE7D9;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 1px 2px rgba(28,42,58,.03),0 18px 40px -36px rgba(28,42,58,.5);transition:transform .18s ease,box-shadow .18s ease;')}>
              <div style={s('display:flex;justify-content:space-between;align-items:flex-start;')}>
                <div style={s('display:flex;align-items:center;gap:11px;')}>
                  <span style={{ ...s('width:34px;height:34px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;'), background: PILLAR.fire.tint }}>🔥</span>
                  <div>
                    <div style={s('display:flex;align-items:center;gap:6px;')}>
                      <span style={s("font-family:'Spectral',serif;font-size:18px;font-weight:600;color:#1C2A3A;")}>Fire Safety</span>
                      <span onMouseEnter={() => setTip('fire')} onMouseLeave={offTip} style={s("position:relative;width:15px;height:15px;border-radius:50%;border:1px solid #C9BFA8;color:#6E675A;font-size:9px;display:inline-flex;align-items:center;justify-content:center;cursor:help;font-family:'IBM Plex Mono',monospace;")}>
                        i
                        {tip === 'fire' && (
                          <span style={s("position:absolute;top:calc(100% + 9px);left:-10px;z-index:30;width:280px;background:#1C2A3A;color:#EDE7DA;font-size:12px;font-weight:400;line-height:1.55;padding:13px 15px;border-radius:10px;box-shadow:0 18px 40px -18px rgba(28,42,58,.7);text-align:left;font-family:'Instrument Sans',sans-serif;")}>{FIRE_TIP}</span>
                        )}
                      </span>
                    </div>
                    <div style={s('font-size:12px;color:#5F6875;margin-top:1px;')}>California Fire Code</div>
                  </div>
                </div>
                <span style={s('display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;background:#E3ECE1;color:#3E5E4B;padding:5px 11px;border-radius:999px;')}>
                  <span style={s('width:6px;height:6px;border-radius:50%;background:#547A62;')} />On track
                </span>
              </div>
              <div style={s('display:flex;flex-wrap:wrap;gap:6px;')}>
                {['NFPA 10', '17A', '25', '72', '96'].map((c) => (
                  <span key={c} style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:10.5px;padding:3px 8px;border-radius:6px;"), background: PILLAR.fire.tint, color: PILLAR.fire.text }}>{c}</span>
                ))}
              </div>
              <div style={s('height:6px;border-radius:999px;background:#F0EADC;overflow:hidden;')}>
                <div style={s('height:100%;width:100%;background:#7FA98B;')} />
              </div>
              <div style={s('display:flex;justify-content:space-between;font-size:12.5px;color:#5F6875;')}>
                <span style={s('color:#4A5566;font-weight:500;')}>9 of 9 requirements current</span>
                <span>{nextFire ? `Next: ${nextFire.title.toLowerCase()} · ${nextFire.days} days` : 'Nothing due'}</span>
              </div>
            </div>

            <div className="ev-card" style={s('background:#fff;border:1px solid #EEE7D9;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 1px 2px rgba(28,42,58,.03),0 18px 40px -36px rgba(28,42,58,.5);transition:transform .18s ease,box-shadow .18s ease;')}>
              <div style={s('display:flex;justify-content:space-between;align-items:flex-start;')}>
                <div style={s('display:flex;align-items:center;gap:11px;')}>
                  <span style={{ ...s('width:34px;height:34px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;'), background: PILLAR.food.tint }}>🍴</span>
                  <div>
                    <div style={s('display:flex;align-items:center;gap:6px;')}>
                      <span style={s("font-family:'Spectral',serif;font-size:18px;font-weight:600;color:#1C2A3A;")}>Food Safety</span>
                      <span onMouseEnter={() => setTip('food')} onMouseLeave={offTip} style={s("position:relative;width:15px;height:15px;border-radius:50%;border:1px solid #C9BFA8;color:#6E675A;font-size:9px;display:inline-flex;align-items:center;justify-content:center;cursor:help;font-family:'IBM Plex Mono',monospace;")}>
                        i
                        {tip === 'food' && (
                          <span style={s("position:absolute;top:calc(100% + 9px);left:-10px;z-index:30;width:280px;background:#1C2A3A;color:#EDE7DA;font-size:12px;font-weight:400;line-height:1.55;padding:13px 15px;border-radius:10px;box-shadow:0 18px 40px -18px rgba(28,42,58,.7);text-align:left;font-family:'Instrument Sans',sans-serif;")}>{FOOD_TIP}</span>
                        )}
                      </span>
                    </div>
                    <div style={s('font-size:12px;color:#5F6875;margin-top:1px;')}>California Retail Food Code</div>
                  </div>
                </div>
                <span style={{ ...s('display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;padding:5px 11px;border-radius:999px;'), background: food.pillBg, color: food.pillFg }}>
                  <span style={{ ...s('width:6px;height:6px;border-radius:50%;'), background: food.dot }} />{food.status}
                </span>
              </div>
              <div style={s('display:flex;flex-wrap:wrap;gap:6px;')}>
                {['Receiving', 'Temperature & logging lifecycle', 'Sanitation', 'Handlers'].map((c) => (
                  <span key={c} style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:10.5px;padding:3px 8px;border-radius:6px;"), background: PILLAR.food.tint, color: PILLAR.food.text }}>{c}</span>
                ))}
              </div>
              <div style={s('height:6px;border-radius:999px;background:#F0EADC;overflow:hidden;')}>
                <div style={{ ...s('height:100%;'), width: food.width, background: food.bar }} />
              </div>
              <div style={s('display:flex;justify-content:space-between;font-size:12.5px;color:#5F6875;')}>
                <span style={s('color:#4A5566;font-weight:500;')}>{food.current}</span>
                <span style={{ color: food.nextColor }}>{food.next ?? (nextFood ? `Next: ${nextFood.title.toLowerCase()} · ${nextFood.days} days` : 'Nothing due')}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ---------------------------------------------------- what's upcoming */}
        <div style={s('display:flex;flex-direction:column;gap:6px;')}>
          <div style={s('display:flex;justify-content:space-between;align-items:flex-end;gap:16px;')}>
            <div>
              <h2 style={s("font-family:'Spectral',serif;font-weight:600;font-size:27px;color:#1C2A3A;margin:0;")}>What's upcoming</h2>
              <p style={s('font-size:13px;color:#5F6875;margin:6px 0 0;')}>Predicted from your inspection cycles, vendor schedules and permit dates.</p>
            </div>
            <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;color:#646D7A;white-space:nowrap;")}>{upcomingScope}</span>
          </div>
          <div style={s('margin-top:8px;')}>
            {upcoming.map((u, i) => (
              <div key={i} style={s('border-top:1px solid #E4DBC8;')}>
                <div style={s('padding:15px 4px;display:flex;align-items:center;gap:16px;')}>
                  <span style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:12px;width:40px;font-weight:500;"), color: u.days <= 14 ? '#8A6412' : '#6E675A' }}>{u.days}d</span>
                  <span style={s('flex:1;display:flex;flex-direction:column;gap:2px;')}>
                    <span style={s('font-size:15px;font-weight:600;color:#1C2A3A;')}>{u.title}</span>
                    <span style={s('font-size:12.5px;color:#5F6875;')}>{u.meta} · {u.locName}</span>
                  </span>
                  <span style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.06em;padding:4px 9px;border-radius:6px;white-space:nowrap;"), background: PILLAR[u.p].tint, color: PILLAR[u.p].text }}>{u.pillar.toUpperCase()}</span>
                  <span style={{ ...s('font-size:11px;font-weight:600;padding:4px 11px;border-radius:999px;white-space:nowrap;'), background: u.action ? '#F7EDD3' : '#E3ECE1', color: u.action ? '#8A6412' : '#3E5E4B' }}>{u.status}</span>
                </div>
              </div>
            ))}
            <div style={s('border-top:1px solid #E4DBC8;')} />
          </div>
        </div>

        {/* ---------------------------------------------------- what's on file */}
        <div style={s('display:flex;flex-direction:column;gap:6px;')}>
          <div style={s('display:flex;justify-content:space-between;align-items:baseline;')}>
            <h2 style={s("font-family:'Spectral',serif;font-weight:600;font-size:27px;color:#1C2A3A;margin:0;")}>What's on file</h2>
            <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;color:#646D7A;")}>READY FOR AN INSPECTOR</span>
          </div>
          <div style={s('margin-top:8px;')}>
            {proof.map((p, i) => (
              <div key={i} style={s('border-top:1px solid #E4DBC8;')}>
                <button className="ev-soft" onClick={p.onToggle} style={s("width:100%;text-align:left;background:none;border:none;padding:17px 4px;display:flex;align-items:center;gap:16px;cursor:pointer;font-family:'Instrument Sans',sans-serif;")}>
                  <span style={s("font-family:'IBM Plex Mono',monospace;font-size:12px;color:#836839;width:22px;")}>{p.n}</span>
                  <span style={s('flex:1;display:flex;flex-direction:column;gap:2px;')}>
                    <span style={s('font-size:15px;font-weight:600;color:#1C2A3A;')}>{p.title}</span>
                    <span style={s('font-size:12.5px;color:#5F6875;')}>{p.meta}</span>
                  </span>
                  <span style={s('display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:#3E5E4B;background:#E3ECE1;padding:4px 11px;border-radius:999px;white-space:nowrap;')}>✓ On file</span>
                  <span style={s("font-family:'IBM Plex Mono',monospace;font-size:18px;color:#6E675A;width:16px;text-align:center;")}>{p.chev}</span>
                </button>
                {p.open && (
                  <div style={s('padding:0 4px 20px 42px;display:flex;flex-direction:column;gap:13px;')}>
                    <p style={s('margin:0;font-size:14px;line-height:1.65;color:#4A5566;max-width:640px;')}>{p.detail}</p>
                    <div style={s('display:flex;align-items:center;gap:12px;')}>
                      <span style={s("font-family:'IBM Plex Mono',monospace;font-size:12px;color:#5F6875;background:#F1EADC;padding:5px 10px;border-radius:6px;")}>{p.doc}</span>
                      <a href="#" style={s('font-size:13px;font-weight:600;')}>Download evidence →</a>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div style={s('border-top:1px solid #E4DBC8;')} />
          </div>
        </div>

        {/* --------------------------------------------------- what's measured */}
        <div style={s('display:flex;flex-direction:column;gap:16px;')}>
          <div style={s('display:flex;justify-content:space-between;align-items:flex-end;gap:16px;')}>
            <div>
              <h2 style={s("font-family:'Spectral',serif;font-weight:600;font-size:27px;color:#1C2A3A;margin:0;")}>What's measured</h2>
              <p style={s('font-size:13px;color:#5F6875;margin:6px 0 0;')}>Live from connected temperature sensors — kitchens without sensors log manually.</p>
            </div>
            <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;color:#646D7A;white-space:nowrap;")}>{sensorLabel}</span>
          </div>

          {hasSensors && (
            <div style={s('display:grid;grid-template-columns:repeat(3,1fr);gap:16px;')}>
              {equipment.map((e) => (
                <div key={e.name} style={s('background:#fff;border:1px solid #EEE7D9;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:15px;')}>
                  <div style={s('display:flex;justify-content:space-between;align-items:flex-start;')}>
                    <div>
                      <div style={s('font-size:14px;font-weight:600;color:#1C2A3A;')}>{e.name}</div>
                      <div style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;color:#646D7A;margin-top:3px;")}>{e.locName}</div>
                    </div>
                    <div style={s("font-family:'Spectral',serif;font-size:30px;font-weight:500;color:#1C2A3A;line-height:1;font-variant-numeric:tabular-nums;")}>{e.temp}</div>
                  </div>
                  <div style={s('display:flex;justify-content:space-between;align-items:center;')}>
                    <span style={s("display:inline-flex;align-items:center;gap:5px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.05em;color:#3E5E4B;")}>
                      <span style={s('width:5px;height:5px;border-radius:50%;background:#547A62;')} />Sensor
                    </span>
                    <span style={{ ...s('font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;'), background: e.bg, color: e.fg }}>{e.state}</span>
                  </div>
                  <div>
                    <div style={s('position:relative;height:6px;border-radius:999px;background:#F0EADC;')}>
                      <div style={{ ...s('position:absolute;top:50%;transform:translate(-50%,-50%);width:13px;height:13px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(28,42,58,.3);'), left: `${e.pos}%`, background: e.bar }} />
                    </div>
                    <div style={s("display:flex;justify-content:space-between;margin-top:9px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6E675A;")}>
                      <span>{e.lo}°</span><span>{e.hi}°</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasSensors && (
            <div style={s('background:#fff;border:1px dashed #DDD2BB;border-radius:16px;padding:46px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;')}>
              <span style={s('width:46px;height:46px;border-radius:12px;background:#F3EAD6;display:inline-flex;align-items:center;justify-content:center;font-size:20px;')}>🌡️</span>
              <div style={s("font-family:'Spectral',serif;font-size:21px;font-weight:600;color:#1C2A3A;")}>No sensors at {k.name} yet</div>
              <div style={s('font-size:14px;color:#5F6875;max-width:440px;line-height:1.55;')}>Staff are logging temperatures manually. Connect sensors to watch them live here and auto-build your cold-holding evidence.</div>
              <button className="ev-dark" style={s("margin-top:8px;background:#1C2A3A;color:#F5EFE4;border:none;border-radius:9px;padding:11px 18px;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;")}>Connect sensors →</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ================= MAIN SIGNUP SCREEN =================
export default function SignupScreenMockup() {
  const [showShare, setShowShare] = useState(false);
  const [previewLoc, setPreviewLoc] = useState('all');
  const [showPreviewOnMobile, setShowPreviewOnMobile] = useState(false);
  const [showSenderEdit, setShowSenderEdit] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const rules = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <div style={{ backgroundColor: CREAM, minHeight: '100vh', fontFamily: SANS }} className="py-8 px-4">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Spectral:wght@300;400;500;600&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" />

      <div className="max-w-6xl mx-auto">

        {/* editable context line — written per send, appears above the design */}
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1.5" style={{ color: GOLD_TEXT }}>
            A note to this kitchen &middot; written per invite
          </div>
          <textarea
            defaultValue=""
            placeholder="Add a short line of context for this kitchen — e.g. 'Marco, great meeting you at the Fresno expo. Here's your account.'"
            className="w-full text-sm border px-4 py-3"
            style={{ borderColor: LINE, minHeight: 64, resize: 'vertical', fontFamily: SANS, color: NAVY, backgroundColor: '#fff' }}
          />
        </div>

        <div className="bg-white shadow-2xl" style={{ borderRadius: 4 }}>

          {/* ============ TOP HEADER — TABS IN HEADER ============ */}
          <div className="border-b" style={{ borderColor: LINE, backgroundColor: NAVY }}>
            <div className="px-8 py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="font-black tracking-tight text-2xl" style={{ fontFamily: BRAND, fontWeight: 800 }}>
                  <span style={{ color: GOLD }}>E</span>
                  <span style={{ color: 'white' }}>vid</span>
                  <span style={{ color: GOLD }}>LY</span>
                </div>
                <div className="border-l border-white/20 pl-4 hidden md:block">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Preview what EvidLY looks like</div>
                  <div className="text-[10px] tracking-wide text-white/40 mt-0.5" style={{ fontFamily: MONO }}>A Cleaning Pros Plus Company</div>
                </div>
              </div>

              {/* Location tabs live HERE, in the header — not inside a nested
                  scrolling panel. One window, one scrollbar. */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1 border border-white/20 overflow-x-auto"
                     style={{ scrollbarWidth: 'none' }}>
                  {LOC_TABS.map(([id, label]) => {
                    const a = previewLoc === id;
                    return (
                      <button key={id} onClick={() => { setPreviewLoc(id); setShowPreviewOnMobile(true); }}
                        className="text-xs px-3.5 py-2 font-semibold transition whitespace-nowrap"
                        style={{
                          backgroundColor: a ? GOLD : 'transparent',
                          color: a ? 'white' : 'rgba(255,255,255,0.7)',
                          fontFamily: a ? SERIF : 'inherit',
                        }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setShowShare(!showShare)}
                  className="inline-flex items-center gap-1.5 border px-3 py-2 transition"
                  style={{
                    borderColor: showShare ? GOLD : 'rgba(255,255,255,0.2)',
                    backgroundColor: showShare ? GOLD : 'transparent',
                    color: showShare ? 'white' : 'rgba(255,255,255,0.7)',
                  }}
                  title="Forward this invite">
                  <Send size={13} />
                  <span className="text-[10px] uppercase tracking-widest font-semibold hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* ============ LEFT NAVY RAIL ============ */}
            <div className="lg:col-span-4 p-8" style={{ backgroundColor: NAVY, color: 'white' }}>
              <h1 className="text-2xl mb-3 leading-tight" style={{ fontFamily: SERIF, fontWeight: 600 }}>
                Everything's ready for<br />Pacific Restaurant Group
              </h1>
              <p className="text-sm text-white/70 mb-8 leading-relaxed">
                You already trust Cleaning Pros Plus with hood cleaning. Those records now live in EvidLY — alongside everything else your kitchen needs to prove compliance.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(160,140,90,0.15)' }}>
                    <Zap size={15} style={{ color: '#D8A93A' }} fill="#D8A93A" />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: SERIF }}>Intelligence</div>
                    <div className="text-xs text-white/60 leading-relaxed">Real-time alerts, predictive reminders, automated escalation, regulation cross-referencing, and sealed proof on demand</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(160,140,90,0.15)' }}>
                    <Flame size={15} style={{ color: '#E8763A' }} fill="#E8763A" />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: SERIF }}>Fire Safety</div>
                    <div className="text-xs text-white/60 leading-relaxed">Hood cleaning (NFPA 96), fire suppression (17A), sprinklers (25), alarms (72), extinguisher tags (10), and employee fire safety training</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(160,140,90,0.15)' }}>
                    <Utensils size={15} style={{ color: '#5B8AAD' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: SERIF }}>Food Safety</div>
                    <div className="text-xs text-white/60 leading-relaxed">Employee Food Handler Cards, Certified Food Protection Manager certifications, daily temperature logs, HACCP, receiving inspections, pest control, and health inspection history</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: GOLD_TEXT, fontFamily: SERIF }}>Predict</div>
                  <div className="text-[10px] text-white/60">what's expiring</div>
                </div>
                <div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: GOLD_TEXT, fontFamily: SERIF }}>Reduce</div>
                  <div className="text-[10px] text-white/60">the cost</div>
                </div>
                <div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: GOLD_TEXT, fontFamily: SERIF }}>Prove</div>
                  <div className="text-[10px] text-white/60">on demand</div>
                </div>
              </div>
            </div>

            {/* ============ RIGHT PANEL ============ */}
            <div className="lg:col-span-8 p-8">
              {/* Inline Share panel — appears when Share button in header is active */}
              {showShare && (
                <div className="mb-6 border p-5" style={{ borderColor: LINE, borderLeftWidth: 3, borderLeftColor: GOLD, backgroundColor: '#FBF9F2' }}>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: GOLD_TEXT }}>Forward this invite</div>
                      <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: SERIF }}>Share with a kitchen decision maker or facility manager</h3>
                      <p className="text-xs mt-1" style={{ color: MUTED }}>They'll see the same preview and get their own invite to view records.</p>
                    </div>
                    <button onClick={() => setShowShare(false)}
                      className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0" style={{ color: MUTED }}>
                      ✕ Close
                    </button>
                  </div>

                  {/* Sending as — compact summary, expand to edit */}
                  <div className="mb-4 pb-4 border-b" style={{ borderColor: LINE }}>
                    <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                      <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: MUTED }}>Sending as · auto-populated from your account</div>
                      <button onClick={() => setShowSenderEdit(!showSenderEdit)}
                        className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: NAVY }}>
                        {showSenderEdit ? '✕ Cancel' : 'Edit →'}
                      </button>
                    </div>

                    {!showSenderEdit ? (
                      <div>
                        <div className="text-sm font-bold" style={{ color: NAVY, fontFamily: SERIF }}>Marco Ferrara · Pacific Restaurant Group</div>
                        <div className="text-[11px]" style={{ color: MUTED }}>(559) 555-0187 · marco@pacificrg.com</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Your name</label>
                          <input type="text" className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE }} defaultValue="Marco Ferrara" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Your restaurant</label>
                          <input type="text" className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE }} defaultValue="Pacific Restaurant Group" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Your phone</label>
                          <input type="tel" className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE }} defaultValue="(559) 555-0187" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Your email</label>
                          <input type="email" className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE }} defaultValue="marco@pacificrg.com" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold" style={{ color: NAVY }}>Your message</label>
                      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: GOLD_TEXT }}>Edit to make it yours</span>
                    </div>
                    <textarea className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE, minHeight: 120, resize: 'vertical' }}
                      defaultValue={`Hi,

Arthur at EvidLY just set my kitchen up — hood cleaning records from Cleaning Pros Plus, health inspections, fire suppression, food safety, all in one place. It catches what I'd miss and knows what's coming next. Thought you'd want to see it firsthand.

Reach EvidLY: founders@getevidly.com · (855) 384-3591 ext. 1`} />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <button className="text-sm px-4 py-2 font-semibold inline-flex items-center gap-2" style={{ backgroundColor: NAVY, color: 'white' }}>
                        <Send size={13} /> Send now
                      </button>
                      <button onClick={() => setShowShare(false)} className="text-sm font-semibold" style={{ color: MUTED }}>
                        Cancel
                      </button>
                    </div>
                    <div className="text-[11px]" style={{ color: MUTED }}>
                      Sent from EvidLY on your behalf. We track opens to credit you.
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile-only: expand button (visible when collapsed) */}
              {!showPreviewOnMobile && (
                <button onClick={() => setShowPreviewOnMobile(true)}
                  className="md:hidden w-full text-sm py-3 mb-4 border font-semibold inline-flex items-center justify-center gap-2"
                  style={{ borderColor: LINE, color: NAVY, backgroundColor: '#FBF9F2' }}>
                  <span style={{ color: GOLD_TEXT }}>★</span> See what EvidLY looks like <ArrowRight size={13} />
                </button>
              )}

              {/* Preview area — always shown on desktop, mobile only when expanded */}
              <div className={`mb-8 p-4 border ${showPreviewOnMobile ? 'block' : 'hidden md:block'}`} style={{ borderColor: LINE, backgroundColor: '#FBF9F2' }}>
                {/* Mobile-only: hide button at top of expanded preview */}
                {showPreviewOnMobile && (
                  <div className="md:hidden mb-3 pb-3 border-b flex items-center justify-between" style={{ borderColor: LINE }}>
                    <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: NAVY }}>Preview · {LOC_TABS.find(([id]) => id === previewLoc)?.[1]}</span>
                    <button onClick={() => setShowPreviewOnMobile(false)}
                      className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: MUTED }}>
                      Hide
                    </button>
                  </div>
                )}
                {/* The real dashboard, flowing inline. No nested window, no second
                    scrollbar. Its tabs are in the header above, driving `loc`. */}
                <div style={{ border: `1px solid ${LINE}`, background: '#F7F1E6' }}>
                  <EvidLYDashboard embedded loc={previewLoc} onLocChange={setPreviewLoc} />
                </div>
              </div>

              {/* View Account section */}
              <div className="mb-5">
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1" style={{ color: GOLD_TEXT }}>
                  Access your records
                </div>
                <h2 className="text-2xl mb-1" style={{ color: NAVY, fontFamily: SERIF, fontWeight: 600 }}>View Account</h2>
                <p className="text-xs" style={{ color: MUTED }}>Your Cleaning Pros Plus hood cleaning record is ready to view. Set a password to open your account.</p>
              </div>

              {/* Pre-populated account details (readonly) — only what CPP knows */}
              <div className="mb-6 border p-5" style={{ borderColor: LINE, backgroundColor: '#FBF9F2' }}>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={13} style={{ color: GREEN }} />
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: GREEN }}>Set up for you</span>
                </div>

                {/* Owner & Business */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase font-semibold mb-2 pb-1 border-b" style={{ color: GOLD_TEXT, letterSpacing: '0.15em', borderColor: LINE }}>Owner & Business</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Owner name</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>Marco Ferrara</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Business name</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>Pacific Restaurant Group</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Cleaning Pros Plus customer since</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>March 2023</div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase font-semibold mb-2 pb-1 border-b" style={{ color: GOLD_TEXT, letterSpacing: '0.15em', borderColor: LINE }}>Contact</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Primary email</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>marco@pacificrg.com</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Business phone</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>(559) 555-0142</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Mobile</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>(559) 555-0187</div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <div className="text-[10px] uppercase font-semibold mb-2 pb-1 border-b" style={{ color: GOLD_TEXT, letterSpacing: '0.15em', borderColor: LINE }}>Location</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Address</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>1420 Kettner Blvd</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>City · State · ZIP</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>San Diego, California 92101</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>County</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>San Diego County</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t text-[11px]" style={{ borderColor: LINE, color: MUTED }}>
                  Something not right? <a href="mailto:arthur@getevidly.com?subject=Pacific%20Restaurant%20Group%20account%20correction" className="font-semibold underline" style={{ color: NAVY }}>Message Arthur</a> — he set this up personally.
                </div>
              </div>

              {/* Set your access — only editable section */}
              <div className="mb-6 border p-5" style={{ borderColor: LINE, borderLeftWidth: 3, borderLeftColor: GOLD }}>
                <div className="flex items-center gap-2 mb-4">
                  <Key size={13} style={{ color: GOLD_TEXT }} />
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: NAVY }}>Set your access</span>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Create a password</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                    <input type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-sm border pl-9 pr-9 py-2.5" style={{ borderColor: LINE }}
                      placeholder="Enter password" />
                    <Eye size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px]">
                    <div className="inline-flex items-center gap-1" style={{ color: rules.length ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> 12+ characters
                    </div>
                    <div className="inline-flex items-center gap-1" style={{ color: rules.upper ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> Uppercase
                    </div>
                    <div className="inline-flex items-center gap-1" style={{ color: rules.lower ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> Lowercase
                    </div>
                    <div className="inline-flex items-center gap-1" style={{ color: rules.number ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> Number
                    </div>
                    <div className="inline-flex items-center gap-1" style={{ color: rules.special ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> Special character
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Confirm password</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                    <input type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-sm border pl-9 pr-9 py-2.5" style={{ borderColor: LINE }}
                      placeholder="Re-enter password" />
                    {passwordsMatch && (
                      <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: GREEN }} />
                    )}
                  </div>
                  {passwordsMatch && (
                    <div className="text-[11px] mt-1.5 inline-flex items-center gap-1" style={{ color: GREEN }}>
                      <CheckCircle2 size={11} /> Passwords match
                    </div>
                  )}
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <div className="text-[11px] mt-1.5" style={{ color: RED }}>
                      Passwords don't match yet
                    </div>
                  )}
                </div>

                {/* MFA coming soon — reduce initial friction */}
                <div className="pt-3 border-t text-[11px] inline-flex items-start gap-2" style={{ borderColor: LINE, color: MUTED }}>
                  <Shield size={11} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span><strong style={{ color: NAVY }}>Two-factor authentication coming soon.</strong> We'll notify you when it's ready — an extra layer of protection for your compliance records.</span>
                </div>
              </div>

              {/* 60 days FREE callout — no pricing language */}
              <div className="border p-4 mb-3" style={{ borderColor: LINE, borderLeftWidth: 3, borderLeftColor: GREEN, backgroundColor: '#F0F4EF' }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 font-bold" style={{ backgroundColor: GREEN, color: 'white', fontFamily: MONO }}>
                    No credit card needed
                  </span>
                  <div className="flex-1 text-xs" style={{ color: NAVY }}>
                    <div className="font-bold mb-0.5" style={{ fontFamily: SERIF }}>Set a password. View your records.</div>
                    <div style={{ color: MUTED }}>No card to see what's already yours. One is only needed when you begin — and nothing is charged for 60 days.</div>
                  </div>
                </div>
              </div>

              {/* Primary CTA */}
              <button className="w-full text-base py-3 font-semibold inline-flex items-center justify-center gap-2" style={{ backgroundColor: NAVY, color: 'white' }}>
                View My Records <ArrowRight size={15} />
              </button>
              <div className="text-center text-[11px] mt-2" style={{ color: MUTED }}>
                → Your Cleaning Pros Plus hood cleaning record
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
