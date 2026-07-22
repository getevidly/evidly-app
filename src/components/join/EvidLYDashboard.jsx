import React, { useState, useEffect, useRef } from 'react';

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
.ev-share-btn:hover { background: rgba(255,255,255,0.1) !important; }
.ev-share-item:hover { background: #F7F4ED !important; }
.ev-cta:hover { background: #2A3A4E !important; }
@media (max-width: 768px) {
  .ev-nav { padding: 0 16px !important; }
  .ev-content { padding: 24px 16px 60px !important; max-width: 100% !important; }
  .ev-hero { grid-template-columns: 1fr !important; gap: 24px !important; text-align: center; }
  .ev-hero-ring { order: -1; margin: 0 auto; }
  .ev-stats-grid { grid-template-columns: 1fr 1fr !important; }
  .ev-pillar-grid { grid-template-columns: 1fr !important; }
  .ev-sensor-grid { grid-template-columns: 1fr !important; }
  .ev-tabs-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .ev-tabs-inner { white-space: nowrap; }
  .ev-alert-card { flex-direction: column !important; }
  .ev-h1 { font-size: 42px !important; }
  .ev-section-head { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
}
@media (max-width: 480px) {
  .ev-stats-grid { grid-template-columns: 1fr !important; }
  .ev-h1 { font-size: 32px !important; }
  .ev-hero-ring { flex-direction: column !important; align-items: center !important; }
}
`;

/* --------------------------------------------------------------- data ----- */
const K = {
  all:        { name: 'Pacific Restaurant Group', city: null,          days: 0, checks: 0, records: 3, logs: 0, sensors: 0, total: 51, fireTotal: 15, fireCurrent: 3, foodTotal: 36, foodCurrent: 0 },
  losangeles: { name: 'Vista Grill',              city: 'Los Angeles', days: 0, checks: 0, records: 1, logs: 0, sensors: 0, total: 17, fireTotal: 5,  fireCurrent: 1, foodTotal: 12, foodCurrent: 0 },
  sandiego:   { name: 'Harbor House',             city: 'San Diego',   days: 0, checks: 0, records: 1, logs: 0, sensors: 0, total: 17, fireTotal: 5,  fireCurrent: 1, foodTotal: 12, foodCurrent: 0 },
  longbeach:  { name: 'The Anchor Room',          city: 'Long Beach',  days: 0, checks: 0, records: 1, logs: 0, sensors: 0, total: 17, fireTotal: 5,  fireCurrent: 1, foodTotal: 12, foodCurrent: 0 },
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
  { title: 'Hood cleaning certificate', meta: 'Filed \u00b7 Vista Grill \u00b7 valid 12 months',
    detail: 'Hood cleaning certificate is on file for Vista Grill. EvidLY will remind you 60 days before renewal.', doc: 'Hood-VG.pdf' },
  { title: 'Hood cleaning certificate', meta: 'Filed \u00b7 Harbor House \u00b7 valid 12 months',
    detail: 'Hood cleaning certificate is on file for Harbor House. EvidLY will remind you 60 days before renewal.', doc: 'Hood-HH.pdf' },
  { title: 'Hood cleaning certificate', meta: 'Filed \u00b7 The Anchor Room \u00b7 valid 12 months',
    detail: 'Hood cleaning certificate is on file for The Anchor Room. EvidLY will remind you 60 days before renewal.', doc: 'Hood-AR.pdf' },
];

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

export const LOC_TABS = [
  ['all', 'Pacific Restaurant Group'], ['losangeles', 'Los Angeles'],
  ['sandiego', 'San Diego'], ['longbeach', 'Long Beach'],
];

const FIRE_TIP = 'California Fire Code requirements — hood suppression (NFPA 17A), extinguishers (NFPA 10), sprinklers (NFPA 25), alarms (NFPA 72) and hood cleaning (NFPA 96). EvidLY tracks every inspection and due date.';
const FOOD_TIP = 'California Retail Food Code requirements — receiving, the temperature and logging lifecycle, sanitation and handler certifications. EvidLY flags any gap the moment it appears.';
const FIRE_RING_TIP = 'Fire coverage = fire-safety requirements with current, on-file evidence \u00f7 all fire requirements tracked. Hood cleaning certificates are the first step.';
const FOOD_RING_TIP = 'Food coverage = food-safety requirements with current, on-file evidence \u00f7 all food requirements tracked. No food-safety documentation is on file yet.';

const PSE_CONDITIONS = [
  { id: 'kec',   name: 'Kitchen exhaust cleaning', current: true  },
  { id: 'sup',   name: 'Fire suppression',         current: false },
  { id: 'alarm', name: 'Fire alarm',               current: false },
  { id: 'sprk',  name: 'Fire sprinkler',           current: false },
];

const riskData = (loc, pseProven, hoodProven) => {
  const n = loc === 'all' ? 3 : 1;
  const money = (v) => '$' + v.toLocaleString('en-US');
  const rng = (l, h) => money(l * n) + '\u2013' + money(h * n);
  const k = (v) => (v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k' : '$' + v);
  const krng = (l, h) => k(l * n) + '\u2013' + k(h * n);
  const kn = loc === 'all' ? 'Pacific Restaurant Group' : K[loc].name;

  /* ---- FIRE: scales with unproven safeguards (all 4 count) ----
     Anchored so 1 unproven (default 3/4) = baseline $600\u2013$2,600/loc.
     Each additional unproven adds ~35% fire risk.                       */
  const fireUnproven = 4 - pseProven;
  const fireScale = Math.max(0.4, 1 + (fireUnproven - 1) * 0.35);
  const fireLo = Math.round(600 * fireScale);
  const fireHi = Math.round(2600 * fireScale);

  const fire = {
    label: 'Fire safety', typ: rng(fireLo, fireHi),
    lines: [
      { label: 'Fire damage & equipment', ctx: 'NFPA 96 \u00b7 17A \u00b7 25 \u00b7 72', range: rng(Math.round(300 * fireScale), Math.round(1200 * fireScale)) },
      { label: 'Shutdown & rebuild', ctx: '', range: rng(Math.round(200 * fireScale), Math.round(900 * fireScale)) },
      { label: 'Reputation recovery', ctx: '', range: rng(Math.round(100 * fireScale), Math.round(500 * fireScale)) },
    ],
    worst: '$150K\u2013$500K+', worstDesc: "A fire your insurance won't cover.",
    covers: 'Covers: hood cleaning \u00b7 suppression, alarm & sprinkler checks',
  };
  fire.annual       = krng(fireLo, fireHi);
  fire.live         = krng(Math.round(fireLo * 0.333), Math.round(fireHi * 0.346)) + ' live \u00b7 ' + fireUnproven + ' overdue';
  fire.reduced      = '\u2193' + krng(Math.round(fireLo * 0.667), Math.round(fireHi * 0.654)) + ' reduced by your work';
  fire.ceilingLabel = "A fire your insurance won't cover";
  fire.ceiling      = '$150k\u2013$500k+';

  /* ---- FOOD: base + hood contamination (CalCode cross-pillar) ----
     Hood unproven adds $400\u2013$1,500/loc + a breakdown line.
     The other three safeguards are fire-only and never touch food.
     Food CEILING never moves (records are a defense, not coverage).  */
  const foodLo = 900 + (hoodProven ? 0 : 400);
  const foodHi = 3500 + (hoodProven ? 0 : 1500);
  const foodOverdue = hoodProven ? 2 : 3;

  const foodLines = [
    { label: 'Foodborne illness', ctx: 'logs \u00b7 HACCP', range: rng(400, 1800) },
    { label: 'Shutdown & reinspection', ctx: 'health dept', range: rng(300, 900) },
    { label: 'Reputation recovery', ctx: '', range: rng(200, 800) },
  ];
  if (!hoodProven) {
    foodLines.push({ label: 'Hood grease contamination', ctx: 'CalCode \u00b7 grease into food', range: rng(400, 1500) });
  }

  const food = {
    label: 'Food safety', typ: rng(foodLo, foodHi),
    lines: foodLines,
    worst: '$250K\u2013$2M+', worstDesc: 'A severe outbreak, with a lawsuit.',
    covers: 'Covers: receiving, holding & cooling logs \u00b7 checklists \u00b7 HACCP',
  };
  food.annual       = krng(foodLo, foodHi);
  food.live         = krng(Math.round(foodLo * 0.5), Math.round(foodHi * 0.514)) + ' live \u00b7 ' + foodOverdue + ' overdue';
  food.reduced      = '\u2193' + krng(Math.round(foodLo * 0.5), Math.round(foodHi * 0.486)) + ' reduced by your work';
  food.ceilingLabel = 'An outbreak';
  food.ceiling      = '$250k\u2013$2m+';

  /* ---- TOTALS ---- */
  const totalLo = foodLo + fireLo;
  const totalHi = foodHi + fireHi;
  const foodPctVal = Math.round(((foodLo + foodHi) / 2) / ((totalLo + totalHi) / 2) * 100);

  return {
    pillars: [food, fire],
    food, fire,
    tileFood: food.typ + '/yr', tileFire: fire.typ + '/yr', tileTotal: rng(totalLo, totalHi) + '/yr',
    totalCompact: krng(totalLo, totalHi),
    totalTyp: rng(totalLo, totalHi),
    equation: `Food safety (${rng(foodLo, foodHi)}) + fire safety (${rng(fireLo, fireHi)})`,
    typeChip: 'Casual dining \u00b7 ' + kn,
    segment: 'Casual dining',
    foodPct: foodPctVal + '%', firePct: (100 - foodPctVal) + '%',
  };
};

/* ================================================================ component */
function EvidLYDashboard({ pulse = true, alertTone = 'Advisory',
                          loc: locProp, onLocChange, embedded = false }) {
  const [locSelf, setLocSelf]       = useState('all');
  const loc    = locProp ?? locSelf;
  const setLoc = onLocChange ?? setLocSelf;
  const [open, setOpen]             = useState(null);
  const [tip, setTip]               = useState(null);
  const [riskOpen, setRiskOpen]     = useState(false);
  const [pse, setPse]               = useState(PSE_CONDITIONS);
  const [shareOpen, setShareOpen]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [disp, setDisp] = useState({ fireScore: 0, foodScore: 0, days: 0, checks: 0, records: 0, logs: 0 });
  const timer = useRef(null);
  const dispRef = useRef(disp);
  dispRef.current = disp;

  const k         = K[loc];
  const fireScore = k.fireTotal > 0 ? Math.round((k.fireCurrent / k.fireTotal) * 100) : 0;
  const foodScore = k.foodTotal > 0 ? Math.round((k.foodCurrent / k.foodTotal) * 100) : 0;
  const remaining = k.total - (k.fireCurrent + k.foodCurrent);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const from = { ...dispRef.current };
    const to = { fireScore, foodScore, days: k.days, checks: k.checks, records: k.records, logs: k.logs };
    const start = Date.now(), dur = 700;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setDisp({
        fireScore: Math.round(from.fireScore + (to.fireScore - from.fireScore) * e),
        foodScore: Math.round(from.foodScore + (to.foodScore - from.foodScore) * e),
        days:      Math.round(from.days      + (to.days      - from.days)      * e),
        checks:    Math.round(from.checks    + (to.checks    - from.checks)    * e),
        records:   Math.round(from.records   + (to.records   - from.records)   * e),
        logs:      Math.round(from.logs      + (to.logs      - from.logs)      * e),
      });
      if (t < 1) timer.current = setTimeout(tick, 16); else timer.current = null;
    };
    tick();
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  const todayLabel = 'Today \u00b7 ' + new Date().toLocaleDateString('en-US',
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
    { big: fmt(disp.checks),  label: 'compliance checks', sub: 'this week \u00b7 automatic',
      tipText: 'Automated compliance checks EvidLY ran across your kitchens this week \u2014 every requirement, continuously.' },
    { big: fmt(disp.records), label: 'records on file', sub: 'signed, dated, ready',
      tipText: 'Signed inspections, logs and certificates on file and ready to hand an inspector at any moment.' },
    { big: k.sensors > 0 ? fmt(disp.logs) : '0', label: 'temp logs captured',
      sub: k.sensors > 0 ? 'from sensors \u00b7 this week' : 'no sensors \u00b7 manual only',
      tipText: 'Temperature readings captured automatically from connected sensors \u2014 the backbone of your cold-holding evidence.' },
  ];
  const daysStat = { big: fmt(disp.days), label: 'days covered', sub: 'zero missed requirements',
    tipText: 'Consecutive days this kitchen has gone with zero missed requirements \u2014 EvidLY tracks each kitchen\u2019s streak separately, so it is shown per kitchen, not across all.' };
  const statsRaw  = loc === 'all' ? base : [daysStat, ...base];
  const nStats    = statsRaw.length;
  const stats     = statsRaw.map((st, i) => ({ ...st, onTip: () => setTip(i) }));
  const gridCols  = `repeat(${nStats}, 1fr)`;
  const statLefts = statsRaw.map((_, i) => (((i + 0.5) / nStats) * 100).toFixed(2) + '%');
  const statTipOpen = typeof tip === 'number' && !!stats[tip];

  const heroTail = `${remaining} still need documentation.`;
  const fireRingBg = `conic-gradient(from -90deg, ${RUST} 0 ${disp.fireScore}%, #E7E0D2 ${disp.fireScore}% 100%)`;
  const foodRingBg = `conic-gradient(from -90deg, ${BLUE} 0 ${disp.foodScore}%, #E7E0D2 ${disp.foodScore}% 100%)`;

  const foodDone = k.foodCurrent === k.foodTotal;
  const food = {
    status: foodDone ? 'On track' : `${k.foodTotal - k.foodCurrent} to document`,
    pillBg: foodDone ? '#E3ECE1' : '#F7EDD3', pillFg: foodDone ? '#3E5E4B' : '#8A6412',
    dot: foodDone ? '#547A62' : '#D8A93A', bar: foodDone ? '#7FA98B' : '#D8A93A',
    width: `${k.foodTotal > 0 ? Math.round((k.foodCurrent / k.foodTotal) * 100) : 0}%`,
    current: `${k.foodCurrent} of ${k.foodTotal} requirements documented`,
    next: null, nextColor: '#5F6875',
  };

  const fireDone = k.fireCurrent === k.fireTotal;
  const fireObj = {
    status: fireDone ? 'On track' : `${k.fireTotal - k.fireCurrent} to document`,
    pillBg: fireDone ? '#E3ECE1' : '#F7EDD3', pillFg: fireDone ? '#3E5E4B' : '#8A6412',
    dot: fireDone ? '#547A62' : '#D8A93A', bar: fireDone ? '#7FA98B' : '#D8A93A',
    width: `${k.fireTotal > 0 ? Math.round((k.fireCurrent / k.fireTotal) * 100) : 0}%`,
    current: `${k.fireCurrent} of ${k.fireTotal} requirements documented`,
    next: null, nextColor: '#5F6875',
  };

  const equipment    = loc === 'all' ? ALL_EQ : ALL_EQ.filter((e) => e.loc === loc);
  const hasSensors   = k.sensors > 0;
  const sensorLabel  = k.sensors > 0 ? `${k.sensors} SENSOR${k.sensors === 1 ? '' : 'S'} \u00b7 LIVE` : 'MANUAL LOGGING';
  const programScope = loc === 'all' ? '2 PROGRAMS \u00b7 3 KITCHENS' : '2 PROGRAMS \u00b7 ' + k.name.toUpperCase();
  const pseTotal     = pse.length;
  const pseProven    = pse.filter((c) => c.current).length;
  const pseUnproven  = pseTotal - pseProven;
  const gateOpen     = pseProven === pseTotal;
  const hoodProven   = pse.find((c) => c.id === 'kec')?.current ?? true;
  const risk         = riskData(loc, pseProven, hoodProven);
  const togglePse    = (id) => setPse((prev) => prev.map((c) => (c.id === id ? { ...c, current: !c.current } : c)));
  const upcoming      = loc === 'all' ? UPCOMING : UPCOMING.filter((u) => u.loc === loc);
  const upcomingScope = `${upcoming.length} IN THE NEXT 60 DAYS`;
  const nextFire      = upcoming.find((u) => u.p === 'fire');
  const nextFood      = upcoming.find((u) => u.p === 'food');

  const proof = PROOF.map((p, i) => ({ ...p, n: String(i + 1).padStart(2, '0'), open: open === i,
    chev: open === i ? '\u2013' : '+', onToggle: () => setOpen(open === i ? null : i) }));

  return (
    <div style={s(`${embedded ? '' : 'min-height:100vh;'}background:#F7F1E6;font-family:'Instrument Sans',system-ui,sans-serif;color:#1C2A3A;position:relative;`)}>
      <style>{CSS}</style>

      {!embedded && <div style={s('height:6px;background:#CFE3D7;')} />}

      {!embedded && (
      <nav className="ev-nav" style={s('background:#fff;border-bottom:1px solid #EEE7D9;display:flex;align-items:center;justify-content:space-between;padding:0 40px;height:58px;')}>
        <div style={s('display:flex;align-items:center;gap:10px;')}>
          <span style={s('width:24px;height:24px;border-radius:7px;background:#1C2A3A;display:inline-flex;align-items:center;justify-content:center;color:#CFE3D7;font-size:12px;')}>{'\u25C6'}</span>
          <span style={s("font-family:'Montserrat',sans-serif;font-weight:800;font-size:20px;letter-spacing:-.01em;")}><span style={s('color:#A08C5A;')}>E</span><span style={s('color:#1C2A3A;')}>vid</span><span style={s('color:#A08C5A;')}>LY</span></span>
          <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;color:#6E675A;margin-left:8px;")}>DASHBOARD</span>
        </div>
        <div style={s('display:flex;align-items:center;gap:12px;')}>
          <span style={s('display:inline-flex;align-items:center;gap:7px;padding:6px 12px;background:#EEF3EC;border-radius:999px;')}>
            <span style={{ ...s('width:7px;height:7px;border-radius:50%;background:#547A62;'), animation: pulse ? 'evPulse 2.4s infinite' : 'none' }} />
            <span style={s("font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.1em;color:#3E5E4B;")}>LIVE</span>
          </span>
          <div style={s('position:relative;')}>
            <button className="ev-share-btn" onClick={() => setShareOpen(!shareOpen)}
              style={s("display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid #E4DBC8;border-radius:8px;background:transparent;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.08em;color:#6E675A;")}>
              {'\u2197'} SHARE
            </button>
            {shareOpen && (
              <div style={s('position:absolute;top:calc(100% + 8px);right:0;z-index:50;min-width:220px;background:#fff;border:1px solid #EEE7D9;border-radius:12px;box-shadow:0 18px 40px -18px rgba(28,42,58,.6);overflow:hidden;')}>
                <button className="ev-share-item" onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }} style={s("width:100%;text-align:left;background:none;border:none;padding:13px 16px;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:13px;color:#1C2A3A;display:flex;align-items:center;gap:10px;")}>
                  <span style={s('font-size:15px;')}>{copied ? '\u2713' : '\ud83d\udccb'}</span>
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
                <button className="ev-share-item" onClick={() => {
                  const subject = encodeURIComponent('See what EvidLY looks like \u2014 Pacific Restaurant Group');
                  const body = encodeURIComponent(
                    'I wanted to share this EvidLY dashboard preview with you.\n\n' +
                    'Open this link to see what it looks like:\n' + window.location.href + '\n\n' +
                    'It tracks fire safety, food safety, and compliance \u2014 all in one place.'
                  );
                  window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
                  setShareOpen(false);
                }} style={s("width:100%;text-align:left;background:none;border:none;border-top:1px solid #F0EADC;padding:13px 16px;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:13px;color:#1C2A3A;display:flex;align-items:center;gap:10px;")}>
                  <span style={s('font-size:15px;')}>{'\u2709\ufe0f'}</span>
                  Email this demo
                </button>
              </div>
            )}
          </div>
          <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.06em;color:#6E675A;")}>Owner view</span>
          <span style={s('width:30px;height:30px;border-radius:50%;background:#E3ECE1;color:#3E5E4B;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;')}>AR</span>
        </div>
      </nav>
      )}

      <div className={embedded ? '' : 'ev-content'} style={s(embedded
        ? 'padding:22px 22px 30px;display:flex;flex-direction:column;gap:24px;'
        : 'max-width:1180px;margin:0 auto;padding:34px 40px 90px;display:flex;flex-direction:column;gap:30px;animation:evRise .6s ease-out both;')}>

        {!embedded && (
          <div className="ev-tabs-wrap" style={s('display:flex;gap:12px;')}>
            <div className="ev-tabs-inner" style={s('display:flex;gap:4px;background:#EFE7D7;border:1px solid #E4DBC8;border-radius:999px;padding:4px;')}>
              {locTabs.map((l) => (
                <button key={l.id} className="ev-tab" onClick={l.onClick} style={s(l.style)}>{l.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- hero */}
        <div className="ev-hero" style={s('display:grid;grid-template-columns:1fr auto;gap:52px;align-items:center;')}>
          <div>
            <div style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8A6412;")}>{todayLabel}</div>
            <h1 className="ev-h1" style={s("font-family:'Spectral',serif;font-weight:600;font-size:66px;line-height:1;color:#1C2A3A;margin:16px 0 0;letter-spacing:-.02em;")}>Your hood cleaning is on file.</h1>
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
                  <span style={s('width:15px;height:15px;border-radius:50%;background:#547A62;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:9px;')}>{'\u2713'}</span>
                  <span style={s("font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#4E7059;")}>With EvidLY</span>
                </div>
                <div style={s('font-size:14px;color:#1C2A3A;font-weight:600;margin-top:6px;')}>Every requirement watched, every record on file.</div>
              </div>
            </div>
          </div>

          <div className="ev-hero-ring" style={s('display:flex;gap:24px;align-items:flex-start;')}>
            {/* FIRE ring */}
            <div style={s('display:flex;flex-direction:column;align-items:center;gap:10px;')}>
              <div style={s('position:relative;width:170px;height:170px;')}>
                <div style={s('position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(from -90deg, #BEB49C 0deg 0.7deg, transparent 0.7deg 6deg);-webkit-mask:radial-gradient(circle at center, transparent 0 76px, #000 76px 83px, transparent 84px);mask:radial-gradient(circle at center, transparent 0 76px, #000 76px 83px, transparent 84px);')} />
                <div style={{ ...s('position:absolute;inset:18px;border-radius:50%;box-shadow:0 18px 40px -24px rgba(178,106,67,.6);'), background: fireRingBg }}>
                  <div style={s('position:absolute;inset:15px;background:#F7F1E6;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;')}>
                    <div style={s("font-family:'Spectral',serif;font-weight:500;color:#1C2A3A;line-height:1;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:1px;")}>
                      <span style={s('font-size:38px;')}>{disp.fireScore}</span>
                      <span style={s('font-size:18px;')}>%</span>
                    </div>
                    <div style={s('position:relative;display:inline-flex;align-items:center;gap:3px;margin-top:4px;white-space:nowrap;')}
                         onMouseEnter={() => setTip('fireRing')} onMouseLeave={offTip}>
                      <span style={s("font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:#8A4A28;")}>fire</span>
                      <span style={s("width:12px;height:12px;border-radius:50%;border:1px solid #D4B9A3;color:#8A4A28;font-size:7px;display:inline-flex;align-items:center;justify-content:center;cursor:help;font-family:'IBM Plex Mono',monospace;flex-shrink:0;")}>i</span>
                      {tip === 'fireRing' && (
                        <div style={s('position:absolute;top:calc(100% + 12px);left:50%;transform:translateX(-50%);z-index:30;width:240px;background:#1C2A3A;color:#EDE7DA;font-size:12px;font-weight:400;line-height:1.55;padding:13px 15px;border-radius:10px;box-shadow:0 18px 40px -18px rgba(28,42,58,.7);text-align:left;text-transform:none;letter-spacing:normal;')}>{FIRE_RING_TIP}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6E675A;letter-spacing:.03em;")}>{k.fireCurrent} of {k.fireTotal} covered</div>
            </div>

            {/* FOOD ring */}
            <div style={s('display:flex;flex-direction:column;align-items:center;gap:10px;')}>
              <div style={s('position:relative;width:170px;height:170px;')}>
                <div style={s('position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(from -90deg, #BEB49C 0deg 0.7deg, transparent 0.7deg 6deg);-webkit-mask:radial-gradient(circle at center, transparent 0 76px, #000 76px 83px, transparent 84px);mask:radial-gradient(circle at center, transparent 0 76px, #000 76px 83px, transparent 84px);')} />
                <div style={{ ...s('position:absolute;inset:18px;border-radius:50%;box-shadow:0 18px 40px -24px rgba(62,107,138,.6);'), background: foodRingBg }}>
                  <div style={s('position:absolute;inset:15px;background:#F7F1E6;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;')}>
                    <div style={s("font-family:'Spectral',serif;font-weight:500;color:#1C2A3A;line-height:1;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:1px;")}>
                      <span style={s('font-size:38px;')}>{disp.foodScore}</span>
                      <span style={s('font-size:18px;')}>%</span>
                    </div>
                    <div style={s('position:relative;display:inline-flex;align-items:center;gap:3px;margin-top:4px;white-space:nowrap;')}
                         onMouseEnter={() => setTip('foodRing')} onMouseLeave={offTip}>
                      <span style={s("font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:#2C5570;")}>food</span>
                      <span style={s("width:12px;height:12px;border-radius:50%;border:1px solid #A3C0D4;color:#2C5570;font-size:7px;display:inline-flex;align-items:center;justify-content:center;cursor:help;font-family:'IBM Plex Mono',monospace;flex-shrink:0;")}>i</span>
                      {tip === 'foodRing' && (
                        <div style={s('position:absolute;top:calc(100% + 12px);left:50%;transform:translateX(-50%);z-index:30;width:240px;background:#1C2A3A;color:#EDE7DA;font-size:12px;font-weight:400;line-height:1.55;padding:13px 15px;border-radius:10px;box-shadow:0 18px 40px -18px rgba(28,42,58,.7);text-align:left;text-transform:none;letter-spacing:normal;')}>{FOOD_RING_TIP}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6E675A;letter-spacing:.03em;")}>{k.foodCurrent} of {k.foodTotal} covered</div>
            </div>
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
          <div style={s('font-size:12px;color:#6E675A;margin-top:4px;')}>{risk.segment} {'\u00b7'} based on your restaurant type</div>

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

            <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:10px;')}>
              <span style={{ ...s('font-size:13px;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>{risk.fire.ceilingLabel}</span>
              <span style={{ ...s('font-size:15px;font-weight:600;white-space:nowrap;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>
                {gateOpen ? (
                  <>
                    <span style={{ ...s('text-decoration:line-through;font-weight:400;'), color: TONE.red.text, opacity: 0.8 }}>{risk.fire.ceiling}</span>
                    &nbsp;&nbsp;Closed
                  </>
                ) : risk.fire.ceiling}
              </span>
            </div>
            <div style={{ ...s('margin-top:6px;font-size:12px;line-height:1.5;'), color: gateOpen ? TONE.sage.text : TONE.red.text }}>
              {gateOpen
                ? 'Every safeguard your policy names has a current, sealed record. This ground for denial is closed.'
                : `${pseUnproven === 1 ? "One safeguard your policy names doesn't have a current record" : `${pseUnproven} safeguards your policy names don't have a current record`} \u2014 so this stands in full. Three of four earns nothing.`}
            </div>

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
            Illustrative figures, conservative basis. "If things go wrong once" is a one-time ceiling {'\u2014'} not a yearly cost.
            EvidLY reads and identifies what your policy requires. It does not determine coverage.
          </div>

          <button className="ev-breakdown" onClick={() => setRiskOpen(true)} style={s("margin-top:12px;background:none;border:none;padding:0;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:600;color:#1C2A3A;cursor:pointer;")}>See the breakdown {'\u2192'}</button>
        </div>

        {/* ---- PREVIEW CONTROL · demo toggle ---- */}
        <div style={s('background:#fff;border:1px dashed #D8CDB4;border-radius:14px;padding:16px 20px;')}>
          <div style={s("font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6E675A;")}>Preview control {'\u00b7'} not in the live dashboard</div>
          <div style={s('font-size:12.5px;color:#1C2A3A;margin:6px 0 12px;line-height:1.5;')}>
            Toggle a safeguard to watch the gate. Any single unproven condition holds the full ceiling {'\u2014'} proving three of four earns nothing.
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
                  <button className="ev-close" onClick={() => setRiskOpen(false)} style={s('background:none;border:1px solid #E4DBC8;border-radius:8px;width:32px;height:32px;font-size:16px;color:#6E675A;cursor:pointer;line-height:1;')}>{'\u00d7'}</button>
                </div>
              </div>
              <div style={s('padding:22px 30px 30px;display:flex;flex-direction:column;gap:18px;')}>
                <div style={s('background:#F3EAD6;border-radius:10px;padding:12px 15px;font-size:12.5px;line-height:1.5;color:#7A6A45;')}>
                  Illustrative figures, conservative basis. "Worst case" is a one-time ceiling if things go wrong {'\u2014'} not a yearly cost.
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
                            {ln.ctx && <span style={s("color:#6E675A;font-size:11px;font-family:'IBM Plex Mono',monospace;")}> {'\u00b7'} {ln.ctx}</span>}
                          </span>
                          <span style={s('font-size:13.5px;color:#1C2A3A;white-space:nowrap;')}>{ln.range}</span>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const closed = p.label === 'Fire safety' && gateOpen;
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
                            {closed ? <><span style={{ ...s('text-decoration:line-through;font-weight:400;'), color: TONE.red.text, opacity: 0.8 }}>{p.worst}</span>&nbsp;&nbsp;Closed</> : p.worst}
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
                  Basis: USDA ERS {'\u00b7'} CDC NORS {'\u00b7'} Bartsch et al. (food) {'\u00b7'} NFPA / Campbell {'\u00b7'} ISO CP 04 11 (fire). Figures shown at the conservative end.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------- stat grid */}
        <div style={s('position:relative;')}>
          <div style={s('border:1px solid #EEE7D9;border-radius:16px;overflow:hidden;background:#EFE8DA;box-shadow:0 1px 2px rgba(28,42,58,.03),0 18px 40px -36px rgba(28,42,58,.5);')}>
            <div className="ev-stats-grid" style={{ ...s('display:grid;gap:1px;'), gridTemplateColumns: gridCols }}>
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

        {/* ------------------------------------------- where to start */}
        <div style={s('display:flex;flex-direction:column;gap:14px;')}>
          <div style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8A6412;")}>Where to start</div>

          <div style={s('background:#FCFAF4;border:1px solid #E9E0CC;border-radius:14px;padding:24px 26px;')}>
            <div style={s('display:flex;align-items:center;gap:9px;flex-wrap:wrap;')}>
              <span style={s('font-size:11px;font-weight:600;letter-spacing:.04em;padding:4px 10px;border-radius:999px;background:#F7EDD3;color:#8A6412;')}>GET STARTED</span>
            </div>
            <h3 style={s("font-family:'Spectral',serif;font-weight:600;font-size:23px;color:#1C2A3A;margin:14px 0 0;")}>{remaining} requirements still need documentation</h3>
            <p style={s('font-size:14.5px;line-height:1.6;color:#4A5566;margin:9px 0 0;max-width:560px;')}>
              Your hood cleaning certificates are on file {'\u2014'} that{'\u2019'}s a great start. EvidLY is tracking the remaining fire-safety and food-safety requirements across your kitchens. Upload documentation as you have it, and watch your coverage grow.
            </p>
            <div style={s('display:flex;gap:16px;margin-top:18px;')}>
              <div style={s('flex:1;background:#F4E5DA;border-radius:10px;padding:14px 16px;')}>
                <div style={s("font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8A4A28;")}>Fire safety</div>
                <div style={s("font-family:'Spectral',serif;font-size:22px;font-weight:500;color:#1C2A3A;margin-top:6px;")}>{k.fireTotal - k.fireCurrent} remaining</div>
                <div style={s('font-size:12px;color:#5F6875;margin-top:3px;')}>{k.fireCurrent} of {k.fireTotal} documented</div>
              </div>
              <div style={s('flex:1;background:#E2ECF2;border-radius:10px;padding:14px 16px;')}>
                <div style={s("font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#2C5570;")}>Food safety</div>
                <div style={s("font-family:'Spectral',serif;font-size:22px;font-weight:500;color:#1C2A3A;margin-top:6px;")}>{k.foodTotal - k.foodCurrent} remaining</div>
                <div style={s('font-size:12px;color:#5F6875;margin-top:3px;')}>{k.foodCurrent} of {k.foodTotal} documented</div>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------- what's monitored */}
        <div style={s('display:flex;flex-direction:column;gap:16px;')}>
          <div className="ev-section-head" style={s('display:flex;justify-content:space-between;align-items:baseline;')}>
            <h2 style={s("font-family:'Spectral',serif;font-weight:600;font-size:27px;color:#1C2A3A;margin:0;")}>What's monitored</h2>
            <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;color:#646D7A;")}>{programScope}</span>
          </div>
          <div className="ev-pillar-grid" style={s('display:grid;grid-template-columns:1fr 1fr;gap:22px;')}>

            <div className="ev-card" style={s('background:#fff;border:1px solid #EEE7D9;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 1px 2px rgba(28,42,58,.03),0 18px 40px -36px rgba(28,42,58,.5);transition:transform .18s ease,box-shadow .18s ease;')}>
              <div style={s('display:flex;justify-content:space-between;align-items:flex-start;')}>
                <div style={s('display:flex;align-items:center;gap:11px;')}>
                  <span style={{ ...s('width:34px;height:34px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;'), background: PILLAR.fire.tint }}>{'\ud83d\udd25'}</span>
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
                <span style={{ ...s('display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;padding:5px 11px;border-radius:999px;'), background: fireObj.pillBg, color: fireObj.pillFg }}>
                  <span style={{ ...s('width:6px;height:6px;border-radius:50%;'), background: fireObj.dot }} />{fireObj.status}
                </span>
              </div>
              <div style={s('display:flex;flex-wrap:wrap;gap:6px;')}>
                {['NFPA 10', '17A', '25', '72', '96'].map((c) => (
                  <span key={c} style={{ ...s("font-family:'IBM Plex Mono',monospace;font-size:10.5px;padding:3px 8px;border-radius:6px;"), background: PILLAR.fire.tint, color: PILLAR.fire.text }}>{c}</span>
                ))}
              </div>
              <div style={s('height:6px;border-radius:999px;background:#F0EADC;overflow:hidden;')}>
                <div style={{ ...s('height:100%;'), width: fireObj.width, background: fireObj.bar }} />
              </div>
              <div style={s('display:flex;justify-content:space-between;font-size:12.5px;color:#5F6875;')}>
                <span style={s('color:#4A5566;font-weight:500;')}>{fireObj.current}</span>
                <span>{nextFire ? `Next: ${nextFire.title.toLowerCase()} \u00b7 ${nextFire.days} days` : 'Nothing due'}</span>
              </div>
            </div>

            <div className="ev-card" style={s('background:#fff;border:1px solid #EEE7D9;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 1px 2px rgba(28,42,58,.03),0 18px 40px -36px rgba(28,42,58,.5);transition:transform .18s ease,box-shadow .18s ease;')}>
              <div style={s('display:flex;justify-content:space-between;align-items:flex-start;')}>
                <div style={s('display:flex;align-items:center;gap:11px;')}>
                  <span style={{ ...s('width:34px;height:34px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;'), background: PILLAR.food.tint }}>{'\ud83c\udf74'}</span>
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
                <span style={{ color: food.nextColor }}>{food.next ?? (nextFood ? `Next: ${nextFood.title.toLowerCase()} \u00b7 ${nextFood.days} days` : 'Nothing due')}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ---------------------------------------------------- what's upcoming */}
        <div style={s('display:flex;flex-direction:column;gap:6px;')}>
          <div className="ev-section-head" style={s('display:flex;justify-content:space-between;align-items:flex-end;gap:16px;')}>
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
                    <span style={s('font-size:12.5px;color:#5F6875;')}>{u.meta} {'\u00b7'} {u.locName}</span>
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
                  <span style={s('display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:#3E5E4B;background:#E3ECE1;padding:4px 11px;border-radius:999px;white-space:nowrap;')}>{'\u2713'} On file</span>
                  <span style={s("font-family:'IBM Plex Mono',monospace;font-size:18px;color:#6E675A;width:16px;text-align:center;")}>{p.chev}</span>
                </button>
                {p.open && (
                  <div style={s('padding:0 4px 20px 42px;display:flex;flex-direction:column;gap:13px;')}>
                    <p style={s('margin:0;font-size:14px;line-height:1.65;color:#4A5566;max-width:640px;')}>{p.detail}</p>
                    <div style={s('display:flex;align-items:center;gap:12px;')}>
                      <span style={s("font-family:'IBM Plex Mono',monospace;font-size:12px;color:#5F6875;background:#F1EADC;padding:5px 10px;border-radius:6px;")}>{p.doc}</span>
                      <a href="#" style={s('font-size:13px;font-weight:600;')}>Download evidence {'\u2192'}</a>
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
          <div className="ev-section-head" style={s('display:flex;justify-content:space-between;align-items:flex-end;gap:16px;')}>
            <div>
              <h2 style={s("font-family:'Spectral',serif;font-weight:600;font-size:27px;color:#1C2A3A;margin:0;")}>What's measured</h2>
              <p style={s('font-size:13px;color:#5F6875;margin:6px 0 0;')}>Live from connected temperature sensors {'\u2014'} kitchens without sensors log manually.</p>
            </div>
            <span style={s("font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;color:#646D7A;white-space:nowrap;")}>{sensorLabel}</span>
          </div>

          {hasSensors && (
            <div className="ev-sensor-grid" style={s('display:grid;grid-template-columns:repeat(3,1fr);gap:16px;')}>
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
                      <span>{e.lo}{'\u00b0'}</span><span>{e.hi}{'\u00b0'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasSensors && (
            <div style={s('background:#fff;border:1px dashed #DDD2BB;border-radius:16px;padding:46px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;')}>
              <span style={s('width:46px;height:46px;border-radius:12px;background:#F3EAD6;display:inline-flex;align-items:center;justify-content:center;font-size:20px;')}>{'\ud83c\udf21\ufe0f'}</span>
              <div style={s("font-family:'Spectral',serif;font-size:21px;font-weight:600;color:#1C2A3A;")}>No sensors at {k.name} yet</div>
              <div style={s('font-size:14px;color:#5F6875;max-width:440px;line-height:1.55;')}>Staff are logging temperatures manually. Connect sensors to watch them live here and auto-build your cold-holding evidence.</div>
              <button className="ev-dark" style={s("margin-top:8px;background:#1C2A3A;color:#F5EFE4;border:none;border-radius:9px;padding:11px 18px;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;")}>Connect sensors {'\u2192'}</button>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- CTA */}
        {!embedded && (
          <div style={s('text-align:center;margin-top:10px;')}>
            <a className="ev-cta" href="/onboarding"
              style={s("display:inline-flex;align-items:center;gap:10px;background:#1C2A3A;color:#F5EFE4;border:none;border-radius:12px;padding:16px 36px;font-family:'Instrument Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .16s ease;")}>
              Check your records {'\u2192'}
            </a>
            <div style={s("margin-top:10px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6E675A;letter-spacing:.04em;")}>
              Free to view {'\u00b7'} no card required
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export { EvidLYDashboard };
export default EvidLYDashboard;
