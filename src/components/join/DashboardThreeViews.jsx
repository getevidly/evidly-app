/**
 * DashboardThreeViews — the static three-view sample dashboard.
 *
 * Design source: mocks/evidly-join-dashboard-3views-mock.html. That file is
 * the spec; where this component and the mock disagree, the mock is right.
 *
 * 100% static. No database reads, no pillar_requirements query, no loading
 * gate. This is a worked sample (Pacific Restaurant Group, three kitchens),
 * never the recipient's own data — the recipient's record lives on /gate.
 *
 * Dates derive from TODAY at render time and are expressed as offsets, so
 * the sample never goes stale.
 *
 * Rendered behind ?view=3v from ClientJoin; the live /join path is unchanged.
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ── palette / labels ───────────────────────────────────────────── */
const COL = { crit: '#B3402F', high: '#BE6F35', med: '#B8912F', low: '#67758C', ok: '#3F7D58' };
const LABEL = { crit: 'Critical', high: 'High', med: 'Medium', low: 'Low', ok: 'Sealed' };
const PILLARS = ['Fire Safety', 'Food Safety', 'Business', 'Vendors', 'Incidents'];

/* ── date helpers ───────────────────────────────────────────────── */
const TODAY = new Date();
const pad2 = (x) => String(x).padStart(2, '0');
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function fmt(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function fmt2(d) { return pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + '/' + String(d.getFullYear()).slice(-2); }
function mon(d) { return d.toLocaleDateString('en-US', { month: 'short' }); }
function days(a, b) { return Math.round((b - a) / 86400000); }
function lastLabel(f) { return f.act === 'request' ? 'Last Issued' : f.act === 'cap' ? 'Occurred' : 'Last Serviced'; }

/* ── the sample account ─────────────────────────────────────────── */
const DATA = {
  account: 'Pacific Restaurant Group',
  kitchens: [
    { name: 'Vista Grill', county: 'Sacramento County' },
    { name: 'Harbor House', county: 'Alameda County' },
    { name: 'The Anchor Room', county: 'Kern County' },
  ],
  /* one kitchen's requirements — everyMonths drives the cadence */
  timeline: [
    /* Fire Safety */
    { label: 'Kitchen Exhaust Cleaning', std: 'NFPA 96 · Quarterly', everyMonths: 3, lastAgo: 71, sev: 'high' },
    { label: 'Fire Suppression System', std: 'NFPA 17A · every 6 months', everyMonths: 6, lastAgo: 105, sev: 'high' },
    { label: 'Fire Extinguishers', std: 'NFPA 10 · annual', everyMonths: 12, lastAgo: 186, sev: 'high' },
    { label: 'Sprinkler System', std: 'NFPA 25 · annual', everyMonths: 12, lastAgo: 147, sev: 'high' },
    { label: 'Fire Alarm', std: 'NFPA 72 · annual', everyMonths: 12, lastAgo: 298, sev: 'high' },
    /* Food Safety */
    { label: 'Health Permit', std: '§114381 · annual', everyMonths: 12, lastAgo: 353, sev: 'crit' },
    { label: 'Pest Control', std: '§114259 · Monthly', everyMonths: 1, lastAgo: 58, sev: 'high' },
    { label: 'Grease Trap Service', std: 'Local FOG ordinance · quarterly', everyMonths: 3, lastAgo: 44, sev: 'med' },
    { label: 'Backflow Testing', std: 'CCR Title 17 · annual', everyMonths: 12, lastAgo: 240, sev: 'med' },
    { label: 'Food Handler Cards', std: '§113948 · per employee', everyMonths: 36, lastAgo: 1067, sev: 'med', note: '3 expire' },
    { label: 'Manager Certification', std: '§113947.1 · every 5 years', everyMonths: 60, lastAgo: 1620, sev: 'med' },
    /* Business & Vendors */
    { label: 'General Liability', std: 'Business record · annual', everyMonths: 12, lastAgo: 201, sev: 'med' },
    { label: 'Workers’ Compensation', std: 'Business record · annual', everyMonths: 12, lastAgo: 374, sev: 'crit' },
    { label: 'Cleaning Pros Plus', std: 'Hood cleaning · GL certificate', everyMonths: 12, lastAgo: 344, sev: 'med', vendor: 'Cleaning Pros Plus' },
    { label: 'Valley Pest Control', std: 'Pest control · GL certificate', everyMonths: 12, lastAgo: 281, sev: 'med', vendor: 'Valley Pest Control' },
    { label: 'Sierra Fire Protection', std: 'Suppression · GL + Workers’ Comp', everyMonths: 12, lastAgo: 372, sev: 'crit', vendor: 'Sierra Fire Protection' },
  ],
  /* findings by tab — offsets only */
  predict: [
    { sev: 'crit', cat: 'Food Safety', title: 'Health permit renewal', kitchen: 2, std: '§114381', inDays: 12, act: 'request' },
    { sev: 'med', cat: 'Food Safety', title: 'Three food handler cards expire', kitchen: 0, std: '§113948', inDays: 28, act: 'request' },
    { sev: 'high', cat: 'Fire Safety', title: 'Kitchen Exhaust Cleaning due', kitchen: 1, std: 'NFPA 96 · Quarterly', inDays: 22, act: 'reschedule' },
    { sev: 'high', cat: 'Fire Safety', title: 'Fire suppression semiannual service', kitchen: -1, std: 'NFPA 17A', inDays: 79, act: 'reschedule' },
    { sev: 'med', cat: 'Vendors', title: 'Pest control certificate of insurance', kitchen: -1, std: 'Vendor record', inDays: 21, act: 'request', vendor: 'Valley Pest Control' },
  ],
  reduce: [
    { sev: 'crit', cat: 'Food Safety', title: 'Health permit expired', kitchen: 2, std: '§114381', overdue: 26, act: 'request', last: 391 },
    { sev: 'crit', cat: 'Business', title: 'Workers’ compensation lapsed', kitchen: 2, std: 'Business record', overdue: 9, act: 'request', last: 374 },
    { sev: 'high', cat: 'Fire Safety', title: 'Kitchen Exhaust Cleaning overdue', kitchen: 0, std: 'NFPA 96 · Quarterly', overdue: 71, act: 'reschedule', last: 161 },
    { sev: 'high', cat: 'Food Safety', title: 'Pest control — two services missed', kitchen: 0, std: '§114259 · Monthly', overdue: 58, act: 'reschedule', last: 88 },
    { sev: 'high', cat: 'Incidents', title: 'Injury incident with no corrective action', kitchen: 1, std: 'Drift flag', overdue: 6, act: 'cap', last: 6 },
  ],
  prove: [
    { sev: 'ok', cat: 'Fire Safety', title: 'Kitchen Exhaust Cleaning certificate', kitchen: 1, std: 'NFPA 96 · filed by Cleaning Pros Plus', onFile: 15 },
    { sev: 'ok', cat: 'Food Safety', title: 'Temperature logs — current month', kitchen: -1, std: '§113996 · 5 checkpoints daily', onFile: 1 },
    { sev: 'ok', cat: 'Food Safety', title: 'Health permit', kitchen: 0, std: '§114381', onFile: 56 },
    { sev: 'ok', cat: 'Vendors', title: 'Hood cleaning vendor — insurance certificate', kitchen: -1, std: 'General liability', onFile: 163, vendor: 'Cleaning Pros Plus' },
  ],
  proveCounts: { 'Fire Safety': 14, 'Food Safety': 31, Business: 6, Vendors: 9, Incidents: 3 },
};

const CLEAR = {
  'Fire Safety': { predict: 'Nothing due in 90 days', reduce: '5 of 5 current', prove: '5 of 5 sealed' },
  'Food Safety': { predict: 'Nothing due in 90 days', reduce: '13 of 13 current', prove: '13 of 13 sealed' },
  Business: { predict: 'Nothing due in 90 days', reduce: '6 of 6 on file', prove: '6 of 6 sealed' },
  Vendors: { predict: 'Nothing due in 90 days', reduce: '3 of 3 current', prove: '3 of 3 sealed' },
  Incidents: { predict: 'None scheduled', reduce: 'None open', prove: 'None logged' },
};

const NOTE = {
  predict: 'Everything with a date attached, ordered by how soon it lands.',
  reduce: 'Open right now. An overdue Fire Safety item is never rated below High.',
  prove: 'Sealed on arrival — the document, its date, and who filed it.',
};

/* Tab counts ignore the filters, exactly as the mock's counts() does. */
const TAB_COUNTS = {
  predict: DATA.predict.length,
  reduce: DATA.reduce.length,
  prove: Object.keys(DATA.proveCounts).reduce((a, k) => a + DATA.proveCounts[k], 0),
};
const TABS = [
  { mode: 'predict', name: 'Predict', sub: 'Coming Due · ' + TAB_COUNTS.predict },
  { mode: 'reduce', name: 'Reduce', sub: 'Open Now · ' + TAB_COUNTS.reduce },
  { mode: 'prove', name: 'Prove', sub: 'Sealed · ' + TAB_COUNTS.prove },
];

/* ── filter menus — exactly the options in the mock ─────────────── */
const KIT_INDEX = { 'Vista Grill': 0, 'Harbor House': 1, 'The Anchor Room': 2 };
const SEV_BY_LABEL = { Critical: 'crit', High: 'high', Medium: 'med', Low: 'low', Clear: 'ok' };
const REQ_PILLAR = {
  'Kitchen Exhaust Cleaning': 'Fire Safety', 'Fire Suppression': 'Fire Safety',
  Sprinklers: 'Fire Safety', 'Fire Alarm': 'Fire Safety', Extinguishers: 'Fire Safety',
  'Health Permit': 'Food Safety', 'Temperature Logs': 'Food Safety', 'Pest Control': 'Food Safety',
  'Handler Certifications': 'Food Safety', Insurance: 'Business',
  'Licences & Permits': 'Business', 'Vendor Records': 'Vendors',
};
const sub = (vendor) => (l) => ({ label: l, sub: vendor });

const KITCHEN_MENU = [
  { grp: 'Portfolio', opts: [{ label: 'All Kitchens', tail: '3' }] },
  { grp: 'Sacramento County', opts: [{ label: 'Vista Grill' }] },
  { grp: 'Alameda County', opts: [{ label: 'Harbor House' }] },
  { grp: 'Kern County', opts: [{ label: 'The Anchor Room' }] },
];
const CATEGORY_MENU = [
  { grp: null, opts: [{ label: 'All Categories' }] },
  { grp: 'Fire Safety', opts: ['Kitchen Exhaust Cleaning', 'Fire Suppression', 'Sprinklers', 'Fire Alarm', 'Extinguishers'].map((l) => ({ label: l })) },
  { grp: 'Food Safety', opts: ['Health Permit', 'Temperature Logs', 'Pest Control', 'Handler Certifications'].map((l) => ({ label: l })) },
  { grp: 'Business & Vendors', opts: ['Insurance', 'Licences & Permits', 'Vendor Records'].map((l) => ({ label: l })) },
];
const VENDOR_MENU = [
  { grp: null, opts: [{ label: 'All Vendors', tail: '3' }] },
  { grp: 'Cleaning Pros Plus · Hood Cleaning', opts: [{ label: 'Cleaning Pros Plus', vend: true }]
    .concat(['Insurance Certificate', 'Service Agreement', 'W-9', 'Licence'].map(sub('Cleaning Pros Plus'))) },
  { grp: 'Valley Pest Control · Pest Control', opts: [{ label: 'Valley Pest Control', vend: true }]
    .concat(['Insurance Certificate', 'Service Agreement', 'W-9', 'Licence'].map(sub('Valley Pest Control'))) },
  { grp: 'Sierra Fire Protection · Suppression', opts: [{ label: 'Sierra Fire Protection', vend: true }]
    .concat(['Insurance Certificate', 'Workers’ Compensation', 'Service Agreement', 'W-9'].map(sub('Sierra Fire Protection'))) },
];
const SEVERITY_MENU = [
  { grp: null, opts: [
    { label: 'All Severities' }, { label: 'Critical', dot: 'crit' }, { label: 'High', dot: 'high' },
    { label: 'Medium', dot: 'med' }, { label: 'Low', dot: 'low' }, { label: 'Clear', dot: 'ok' },
  ] },
];
const WINDOW_MENU = [
  { grp: null, opts: [{ label: 'Next 30 Days' }, { label: 'Next 60 Days' }, { label: 'Next 90 Days' }, { label: 'Next 12 Months' }] },
];

const DEFAULT_FILTERS = { kitchen: null, category: null, vendor: null, vrecord: null, severity: null, window: 90 };
const DEFAULT_LABELS = {
  kitchen: 'All Kitchens', category: 'All Categories', vendor: 'All Vendors',
  severity: 'All Severities', window: 'Next 90 Days',
};

/* ── styles — the mock's CSS, scoped under .ev3v so nothing leaks ─ */
const CSS = `
.ev3v{
  --navy:#1E2D4D; --ink:#26313F; --muted:#5B6675; --soft:#8A94A3;
  --paper:#FFFFFF; --cream:#FAF7F0; --line:#E7E1D6; --edge:#D6CFC1;
  --ember:#B24A2E;
  --crit:#B3402F; --crit-bg:#FBEDEA; --high:#BE6F35; --high-bg:#FCF2E8;
  --med:#B8912F; --med-bg:#FBF6E7; --low:#67758C; --low-bg:#EFF1F5;
  --ok:#3F7D58; --ok-bg:#EDF5F0;
  --disp:'Montserrat','Instrument Sans',system-ui,sans-serif;
  --sans:'Instrument Sans',system-ui,sans-serif;
  --mono:'IBM Plex Mono',monospace;
  background:var(--cream);color:var(--ink);font-family:var(--sans);font-size:16px;
  line-height:1.6;-webkit-font-smoothing:antialiased;padding:44px 28px;
}
.ev3v *{box-sizing:border-box}
.ev3v .demo{max-width:1080px;margin:0 auto}

.ev3v .card{background:var(--paper);border:1px solid var(--line);border-radius:8px;overflow:visible;
  box-shadow:0 14px 40px -26px rgba(30,45,77,.35)}
.ev3v .chead{display:flex;align-items:center;gap:13px;padding:18px 24px;border-bottom:1px solid var(--line)}
.ev3v .ctitle{font-family:var(--disp);font-weight:800;font-size:17px;color:var(--navy);letter-spacing:-.02em}
.ev3v .cmeta{font-family:var(--mono);font-size:10px;letter-spacing:.13em;color:var(--soft)}
.ev3v .cdate{margin-left:auto;font-family:var(--mono);font-size:10px;letter-spacing:.13em;color:var(--muted);
  border:1px solid var(--line);border-radius:3px;padding:5px 11px}

.ev3v .tabs{display:flex;background:var(--cream);border-bottom:1px solid var(--line)}
.ev3v .tabs button{flex:1;cursor:pointer;padding:15px 20px 13px;border:0;border-right:1px solid var(--line);
  border-bottom:2px solid transparent;background:transparent;text-align:left;font:inherit}
.ev3v .tabs button:last-child{border-right:0}
.ev3v .tabs button:hover{background:#F4EFE4}
.ev3v .tabs button b{display:block;font-family:var(--disp);font-weight:800;font-size:16px;color:var(--soft);
  letter-spacing:-.015em}
.ev3v .tabs button em{display:block;font-style:normal;font-family:var(--mono);font-size:9.5px;
  letter-spacing:.13em;color:var(--soft);margin-top:5px}
.ev3v .tabs button.on{background:var(--paper);border-bottom-color:var(--ember)}
.ev3v .tabs button.on b{color:var(--navy)}
.ev3v .tabs button.on.predict em{color:var(--med)}
.ev3v .tabs button.on.reduce em{color:var(--crit)}
.ev3v .tabs button.on.prove em{color:var(--ok)}
`;

const CSS2 = `
.ev3v .filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:13px 24px;position:relative;
  z-index:5;background:var(--paper);border-bottom:1px solid var(--line)}
.ev3v .flab{font-family:var(--mono);font-size:9.5px;letter-spacing:.15em;color:var(--soft);margin-right:2px}
.ev3v .fclear{margin-left:auto;font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;
  color:var(--ember);background:none;border:0;cursor:pointer;padding:0}
.ev3v .fdrop{position:relative}
.ev3v .fbtn{appearance:none;font-family:var(--sans);font-size:13px;font-weight:600;color:var(--navy);
  background:var(--cream);border:1px solid var(--line);border-radius:4px;padding:7px 30px 7px 12px;
  cursor:pointer;letter-spacing:-.005em;position:relative}
.ev3v .fbtn:after{content:"";position:absolute;right:11px;top:50%;margin-top:-2px;
  border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--soft)}
.ev3v .fdrop.open .fbtn{background:#fff;border-color:var(--ember);box-shadow:0 0 0 3px rgba(178,74,46,.10)}
.ev3v .fdrop.open .fbtn:after{border-top-color:var(--ember)}
.ev3v .fmenu{display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:60;min-width:230px;
  background:#fff;border:1px solid var(--line);border-radius:6px;padding:7px 0;
  box-shadow:0 18px 44px -18px rgba(30,45,77,.34);max-height:340px;overflow-y:auto}
.ev3v .fdrop.open .fmenu{display:block}
.ev3v .fgrp{font-family:var(--mono);font-size:9px;letter-spacing:.16em;color:var(--soft);
  padding:9px 14px 5px;border-top:1px solid var(--line);margin-top:5px}
.ev3v .fmenu .fgrp:first-child{border-top:0;margin-top:0;padding-top:5px}
.ev3v .fopt{display:flex;align-items:center;gap:9px;padding:7px 14px;font-size:13.5px;color:var(--ink);
  width:100%;text-align:left;background:none;border:0;cursor:pointer;font-family:var(--sans)}
.ev3v .fopt:hover{background:var(--cream)}
.ev3v .fopt.on{color:var(--ember);font-weight:600}
.ev3v .fopt.vend{font-weight:600;color:var(--navy)}
.ev3v .fopt.subopt{padding-left:28px;font-size:12.5px;color:var(--muted)}
.ev3v .fopt.subopt:before{content:"";width:5px;height:1px;background:var(--edge);display:inline-block;
  margin-right:-4px}
.ev3v .fopt em{margin-left:auto;font-style:normal;font-family:var(--mono);font-size:10px;color:var(--soft)}
.ev3v .sd{width:9px;height:9px;border-radius:2px;display:inline-block}
.ev3v .sd.crit{background:var(--crit)}.ev3v .sd.high{background:var(--high)}
.ev3v .sd.med{background:var(--med)}.ev3v .sd.low{background:var(--low)}.ev3v .sd.ok{background:var(--ok)}
`;

const CSS3 = `
.ev3v .sum{width:100%;border-collapse:collapse;border-bottom:1px solid var(--line);background:var(--cream)}
.ev3v .sum td{padding:16px 18px;border-right:1px solid var(--line);width:20%;vertical-align:top}
.ev3v .sum td:last-child{border-right:0}
.ev3v .sum .n{font-family:var(--disp);font-weight:800;font-size:26px;line-height:1;color:var(--navy);
  letter-spacing:-.03em}
.ev3v .sum .n.z{color:var(--edge)}
.ev3v .sum .l{font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;color:var(--muted);margin-top:8px}
.ev3v .sum .b{display:inline-block;width:22px;height:3px;border-radius:2px;margin-top:10px;background:var(--edge)}
.ev3v .b.crit{background:var(--crit)}.ev3v .b.high{background:var(--high)}
.ev3v .b.med{background:var(--med)}.ev3v .b.ok{background:var(--ok)}
.ev3v .cat{display:flex;align-items:center;gap:11px;padding:11px 24px;background:var(--cream);
  border-bottom:1px solid var(--line);border-top:1px solid var(--line)}
.ev3v .cat b{font-family:var(--mono);font-size:9.5px;letter-spacing:.17em;color:var(--muted);font-weight:500}
.ev3v .cat i{width:6px;height:6px;border-radius:1px;background:var(--ember)}
.ev3v .cat .n{margin-left:auto;font-family:var(--mono);font-size:9.5px;letter-spacing:.11em;color:var(--soft)}
.ev3v .iss{display:flex;align-items:center;gap:16px;padding:15px 24px;border-bottom:1px solid var(--line)}
.ev3v .iss:last-child{border-bottom:0}
.ev3v .sev{font-family:var(--mono);font-size:8.5px;letter-spacing:.15em;padding:4px 9px;border-radius:3px;
  white-space:nowrap;flex:0 0 auto}
.ev3v .sev.crit{background:var(--crit-bg);color:var(--crit);border:1px solid #EBCFC8}
.ev3v .sev.high{background:var(--high-bg);color:var(--high);border:1px solid #EDD8C2}
.ev3v .sev.med{background:var(--med-bg);color:var(--med);border:1px solid #EBDFBC}
.ev3v .sev.ok{background:var(--ok-bg);color:var(--ok);border:1px solid #CFE3D8}
.ev3v .txt{min-width:0}
.ev3v .txt b{display:block;font-weight:600;font-size:15.5px;color:var(--navy);line-height:1.3;letter-spacing:-.01em}
.ev3v .txt em{display:block;font-style:normal;font-family:var(--mono);font-size:10.5px;color:var(--muted);
  margin-top:6px;letter-spacing:.03em}
.ev3v .when{margin-left:auto;text-align:center;flex:0 0 auto}
.ev3v .when b{display:block;font-family:var(--disp);font-weight:800;font-size:18px;line-height:1;
  color:var(--navy);letter-spacing:-.02em}
.ev3v .when.predict b{color:var(--med)}
.ev3v .when.reduce b{color:var(--crit)}
.ev3v .when.prove b{color:var(--ok)}
.ev3v .when span{display:block;font-family:var(--mono);font-size:8.5px;letter-spacing:.13em;
  color:var(--soft);margin-top:6px}
.ev3v .m-predict .sum .n:not(.z){color:var(--med)}
.ev3v .m-reduce .sum .n:not(.z){color:var(--crit)}
.ev3v .m-prove .sum .n:not(.z){color:var(--ok)}
.ev3v .m-predict .cat .n{color:var(--med)}
.ev3v .m-reduce .cat .n{color:var(--crit)}
.ev3v .m-prove .cat .n{color:var(--ok)}
.ev3v .txt em .mred{color:var(--crit)}
.ev3v .txt em .mgrn{color:var(--ok);font-weight:500}
.ev3v .txt em .mgold{color:var(--ok);font-weight:500}
`;

const CSS4 = `
.ev3v .hwrap{padding:22px 24px 24px}
.ev3v .hmap{width:100%;border-collapse:separate;border-spacing:6px}
.ev3v .hmap th{font-family:var(--mono);font-size:9.5px;letter-spacing:.15em;color:var(--muted);
  text-align:left;padding:0 0 10px 3px;font-weight:400;vertical-align:bottom}
.ev3v .hk{font-family:var(--sans)!important;font-weight:600!important;font-size:14.5px!important;
  color:var(--navy)!important;letter-spacing:0!important;padding:0 14px 0 12px!important;
  vertical-align:middle!important;border-left:3px solid var(--ember);width:196px}
.ev3v .hk span{display:block;font-family:var(--mono);font-weight:400;font-size:9.5px;
  letter-spacing:.1em;color:var(--soft);margin-top:4px}
.ev3v .hmap td.c{padding:12px 13px;border-radius:4px;vertical-align:top;width:16%;border:1px solid transparent}
.ev3v .hmap td.c b{display:flex;align-items:center;gap:7px;font-family:var(--mono);font-size:9px;
  letter-spacing:.14em;font-weight:500}
.ev3v .hmap td.c b:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}
.ev3v .hmap td.c em{display:block;font-style:normal;font-size:12.5px;margin-top:7px;line-height:1.35;
  color:var(--navy);font-weight:500}
.ev3v td.crit{background:var(--crit-bg);border-color:#EBCFC8}.ev3v td.crit b{color:var(--crit)}
.ev3v td.high{background:var(--high-bg);border-color:#EDD8C2}.ev3v td.high b{color:var(--high)}
.ev3v td.med{background:var(--med-bg);border-color:#EBDFBC}.ev3v td.med b{color:var(--med)}
.ev3v td.low{background:var(--low-bg);border-color:#DCE0E7}.ev3v td.low b{color:var(--low)}
.ev3v td.ok{background:var(--ok-bg);border-color:#CFE3D8}.ev3v td.ok b{color:var(--ok)}
.ev3v td.clr{background:transparent;border:1px dashed var(--edge)}
.ev3v td.clr b{color:var(--soft)}.ev3v td.clr em{color:var(--soft);font-weight:400}
.ev3v .hnote{margin:18px 24px 22px;font-size:13.5px;color:var(--muted);line-height:1.6;
  padding-left:14px;border-left:2px solid var(--ember)}
.ev3v .twrap{padding:20px 22px 6px}
.ev3v .twrap svg{display:block}
.ev3v .tnote{margin:6px 24px 22px;font-size:13.5px;color:var(--muted);line-height:1.6;
  padding-left:14px;border-left:2px solid var(--ember)}
.ev3v .emptyst{padding:34px 24px;text-align:center;border-top:1px solid var(--line)}
.ev3v .emptyst b{display:block;font-family:var(--disp);font-weight:800;font-size:20px;color:#3F7D58}
.ev3v .emptyst span{display:block;font-size:14.5px;color:var(--muted);margin-top:8px}
.ev3v .emptyrow{padding:20px 24px;font-family:var(--mono);font-size:11px;letter-spacing:.1em;
  color:#3F7D58;background:#F7FAF8;border-bottom:1px solid var(--line)}
.ev3v .act{flex:0 0 auto;font-family:var(--sans);font-size:12px;font-weight:500;
  padding:8px 13px;border-radius:6px;cursor:help;white-space:nowrap;
  border:1px solid #A8C2E0;color:#2C6BB0;background:#fff}
.ev3v .act:hover{background:#EFF4FB;border-color:#2C6BB0}
.ev3v .acts{margin-left:14px;display:flex;gap:8px;flex:0 0 auto;align-items:center}
`;

const CSS5 = `
@keyframes ev3vUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes ev3vIn{from{opacity:0}to{opacity:1}}
@keyframes ev3vPop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
@keyframes ev3vSvcPop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
@keyframes ev3vGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.ev3v .anim-up{opacity:0;animation:ev3vUp .5s cubic-bezier(.22,1,.36,1) forwards}
.ev3v .anim-in{opacity:0;animation:ev3vIn .45s ease forwards}
.ev3v .anim-pop{opacity:0;animation:ev3vPop .46s cubic-bezier(.22,1,.36,1) forwards}
.ev3v .svc{opacity:0;transform-box:fill-box;transform-origin:center;
  animation:ev3vSvcPop .40s cubic-bezier(.2,1.3,.4,1) forwards}
.ev3v .gapbar{transform-box:fill-box;transform-origin:left center;transform:scaleX(0);
  animation:ev3vGrow .70s cubic-bezier(.4,0,.2,1) forwards}
.ev3v .duedot{opacity:0;transform-box:fill-box;transform-origin:center;
  animation:ev3vSvcPop .46s cubic-bezier(.2,1.3,.4,1) forwards}
.ev3v .statustx{opacity:0;animation:ev3vIn .5s ease forwards}
.ev3v .todayline{opacity:0;animation:ev3vIn .5s ease forwards;animation-delay:1.05s}
.ev3v .pane{animation:ev3vIn .28s ease}
@media (prefers-reduced-motion:reduce){
  .ev3v .anim-up,.ev3v .anim-in,.ev3v .anim-pop,.ev3v .svc,.ev3v .gapbar,
  .ev3v .duedot,.ev3v .statustx,.ev3v .todayline,.ev3v .pane{
    animation:none!important;opacity:1!important;transform:none!important}
}

.ev3v .stack{display:flex;flex-direction:column;gap:22px;margin-top:22px}
.ev3v .card2{background:var(--paper);border:1px solid var(--line);border-radius:8px;overflow:hidden;
  box-shadow:0 1px 2px rgba(30,45,77,.04)}
.ev3v .ctop{display:flex;align-items:baseline;gap:12px;padding:16px 24px 14px;
  border-bottom:1px solid var(--line);background:var(--cream)}
.ev3v .ctop h3{margin:0;font-family:var(--disp);font-weight:800;font-size:15.5px;color:var(--navy);
  letter-spacing:-.01em}
.ev3v .ctop span{font-family:var(--mono);font-size:10px;letter-spacing:.11em;color:var(--soft)}
.ev3v .dhead{display:flex;align-items:center;gap:13px;padding:2px 2px 16px}
.ev3v .dwm{font-family:var(--disp);font-weight:800;font-size:20px;color:var(--navy);letter-spacing:-.02em}
.ev3v .dwm .em{color:var(--ember)}
.ev3v .dsample{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;color:#fff;background:var(--navy);
  padding:5px 10px;border-radius:5px;text-transform:uppercase}
.ev3v .dctx{font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:var(--muted);margin-left:auto;
  line-height:1.5;text-align:right}
`;

const CSS6 = `
.ev3v [data-tip]{position:relative}
.ev3v [data-tip]:hover::after{content:attr(data-tip);position:absolute;left:14px;bottom:calc(100% + 8px);
  background:var(--navy);color:#fff;font-family:var(--sans);font-size:12px;font-weight:500;
  line-height:1.45;padding:9px 12px;border-radius:8px;width:max-content;max-width:250px;z-index:60;
  box-shadow:0 10px 30px -10px rgba(28,42,58,.6);pointer-events:none;white-space:normal;letter-spacing:0}
.ev3v [data-tip]:hover::before{content:'';position:absolute;left:26px;bottom:calc(100% + 3px);
  border:5px solid transparent;border-top-color:var(--navy);z-index:60;pointer-events:none}
.ev3v .iss[data-tip]{cursor:help}

.ev3v .gobar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:22px;padding:18px 24px;
  background:var(--navy);border-radius:8px}
.ev3v .gobar-t{font-family:var(--sans);font-size:14.5px;color:rgba(255,255,255,.72);line-height:1.5}
.ev3v .gobar-t b{color:#fff;font-weight:600}
.ev3v .gobar-c{margin-left:auto;display:inline-flex;align-items:center;gap:8px;padding:11px 22px;
  background:var(--ember);color:#fff;border-radius:8px;font-family:var(--sans);font-size:14px;
  font-weight:600;text-decoration:none;white-space:nowrap}
.ev3v .gobar-c:hover{background:#9C3F27}
.ev3v .gobar-s{font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;color:rgba(255,255,255,.45)}

@media (max-width:640px){
  .ev3v{padding:20px 12px}
  .ev3v .demo{max-width:100%}
  .ev3v .card{border-radius:7px}
  .ev3v .chead{flex-wrap:wrap;gap:6px 10px;padding:15px 16px}
  .ev3v .cmeta{order:3;flex-basis:100%}
  .ev3v .cdate{margin-left:auto}
  .ev3v .ctop{padding:14px 16px 12px}
  .ev3v .dctx{display:none}
  .ev3v .dhead{flex-wrap:wrap;gap:8px}
  .ev3v .tabs button{padding:13px 8px 11px}
  .ev3v .tabs button b{font-size:14px}
  .ev3v .tabs button em{font-size:8px;letter-spacing:.07em;margin-top:4px}
  .ev3v .filters{padding:11px 16px;gap:8px}
  .ev3v .flab{width:100%;margin:0 0 2px}
  .ev3v .fmenu{min-width:0;width:min(280px,calc(100vw - 40px))}
  .ev3v .sum td{padding:12px 7px}
  .ev3v .sum .n{font-size:21px}
  .ev3v .sum .l{font-size:8px;letter-spacing:.05em;margin-top:6px}
  .ev3v .sum .b{width:18px;margin-top:8px}
  .ev3v .cat{padding:10px 16px;gap:9px}
  .ev3v .iss{gap:11px;padding:13px 16px;flex-wrap:wrap}
  .ev3v .sev{font-size:8px;padding:3px 7px}
  .ev3v .txt b{font-size:14.5px}
  .ev3v .txt em{font-size:9.5px}
  .ev3v .when b{font-size:16px}
  .ev3v .when span{font-size:8px}
  .ev3v .emptyrow{padding:13px 16px}
  .ev3v .acts{margin:9px 0 0 auto;flex-wrap:wrap}
  .ev3v .act{font-size:11px;padding:6px 11px}
  .ev3v .emptyst{padding:28px 16px}
  .ev3v [data-tip]:hover::after{max-width:200px;left:8px}
  .ev3v .gobar-c{margin-left:0}
}
`;

const STYLES = [CSS, CSS2, CSS3, CSS4, CSS5, CSS6].join('');

/* ── filtering — same predicates as the mock ────────────────────── */
function passes(f, mode, F) {
  if (F.kitchen !== null && f.kitchen >= 0 && f.kitchen !== F.kitchen) return false;
  if (F.category && f.cat !== F.category) return false;
  if (F.severity && f.sev !== F.severity) return false;
  if (F.vendor && f.vendor !== F.vendor) return false;
  if (F.vrecord && f.cat !== 'Vendors') return false;
  if (mode === 'predict' && F.window && f.inDays > F.window) return false;
  return true;
}
const view = (mode, F) => DATA[mode].filter((f) => passes(f, mode, F));

function kitchensView(F) {
  return DATA.kitchens
    .map((k, i) => ({ k, i }))
    .filter((o) => F.kitchen === null || o.i === F.kitchen);
}

/* each kitchen runs the same requirements on its own schedule */
function kitchenRows(ki) {
  const shift = [0, 37, -24][ki] || 0;
  return DATA.timeline.map((r) => ({ ...r, lastAgo: Math.max(3, r.lastAgo + shift + ki * 11) }));
}

function pillarOf(r) {
  if (/NFPA/.test(r.std)) return 'Fire Safety';
  if (/§11|CCR|FOG/.test(r.std)) return 'Food Safety';
  return r.vendor ? 'Vendors' : 'Business';
}

const where = (i) => (i < 0 ? 'All three kitchens' : DATA.kitchens[i].name + ' · ' + DATA.kitchens[i].county);

/* ── summary strip ──────────────────────────────────────────────── */
function Strip({ list, mode, F }) {
  const counts = {};
  const worst = {};
  PILLARS.forEach((p) => { counts[p] = 0; worst[p] = ''; });
  if (mode === 'prove') {
    PILLARS.forEach((p) => {
      counts[p] = F.category && p !== F.category ? 0 : DATA.proveCounts[p] || 0;
      worst[p] = counts[p] ? 'ok' : '';
    });
  } else {
    const rank = { crit: 4, high: 3, med: 2, low: 1 };
    list.forEach((f) => {
      counts[f.cat] = (counts[f.cat] || 0) + 1;
      if (!worst[f.cat] || rank[f.sev] > rank[worst[f.cat]]) worst[f.cat] = f.sev;
    });
  }
  return (
    <table className="sum" cellPadding="0" cellSpacing="0"><tbody><tr>
      {PILLARS.map((p, i) => (
        <td key={p} className="anim-up" style={{ animationDelay: (i * 0.06).toFixed(2) + 's' }}>
          <div className={'n' + (counts[p] === 0 ? ' z' : '')}>{counts[p]}</div>
          <div className="l">{p}</div>
          <div className={'b ' + (worst[p] || '')} />
        </td>
      ))}
    </tr></tbody></table>
  );
}

/* ── action chips — display only, never clickable ───────────────── */
function ActBtns({ f, mode }) {
  const predict = mode === 'predict';
  const chip = (key, label, tip) => (
    <span key={key} className={'act act-' + key} data-tip={tip}>{label}</span>
  );
  if (f.cat === 'Incidents' || f.act === 'cap') {
    return <span className="acts">{chip('cap', 'Corrective Action',
      predict ? 'Log a corrective action.' : 'Log a corrective action — root cause, owner, and the fix.')}</span>;
  }
  if (f.act === 'request') {
    return <span className="acts">{chip('request', 'Request Document',
      predict ? 'Request the renewed document before it expires; EvidLY files it on arrival.'
              : 'Request the current document from the holder; EvidLY files it on arrival.')}</span>;
  }
  return (
    <span className="acts">
      {chip('schedule', 'Schedule', predict ? 'Schedule the service before it comes due.' : 'Schedule the overdue service.')}
      {chip('request', 'Request Document', predict
        ? 'Request the resulting certificate once the service is done.'
        : 'Request the resulting certificate; EvidLY files it on arrival.')}
    </span>
  );
}

/* ── issue rows, grouped by category ────────────────────────────── */
function Rows({ list, mode }) {
  const byCat = {};
  list.forEach((f) => { (byCat[f.cat] = byCat[f.cat] || []).push(f); });
  let n = 0;
  const out = [];
  PILLARS.forEach((cat) => {
    if (!byCat[cat]) return;
    const items = byCat[cat];
    out.push(
      <div key={'c-' + cat} className="cat anim-in" style={{ animationDelay: (0.26 + n * 0.07).toFixed(2) + 's' }}>
        <i /><b>{cat}</b>
        <span className="n">{items.length}{mode === 'predict' ? ' Coming Due' : mode === 'reduce' ? ' Open' : ' Sealed'}</span>
      </div>
    );
    items.forEach((f, k) => {
      let num, lab, meta;
      if (mode === 'predict') {
        num = f.inDays; lab = 'Days Until Due';
        meta = <>{f.std} · <span className="mgold">Due {fmt2(addDays(TODAY, f.inDays))}</span></>;
      } else if (mode === 'reduce') {
        num = f.overdue; lab = 'Days Overdue';
        meta = (
          <>
            {f.std}
            {f.last ? <> · <span className="mgrn">{lastLabel(f)} {fmt2(addDays(TODAY, -f.last))}</span></> : null}
            {' · '}<span className="mred">Due {fmt2(addDays(TODAY, -f.overdue))}</span>
          </>
        );
      } else {
        num = f.onFile; lab = f.onFile === 1 ? 'Day on File' : 'Days on File';
        meta = <>{f.std} · Sealed {fmt2(addDays(TODAY, -f.onFile))}</>;
      }
      const tip = mode === 'prove' ? 'Sealed and on file — the record is stored and ready to share.' : null;
      out.push(
        <div key={cat + '-' + k} className="iss anim-up" {...(tip ? { 'data-tip': tip } : {})}
          style={{ animationDelay: (0.30 + n++ * 0.07).toFixed(2) + 's' }}>
          <span className={'sev ' + f.sev}>{LABEL[f.sev]}</span>
          <span className="txt"><b>{f.title}</b><em>{where(f.kitchen)}{' · '}{meta}</em></span>
          <span className={'when ' + mode}><b>{num}</b><span>{lab}</span></span>
          {(mode === 'reduce' || mode === 'predict') ? <ActBtns f={f} mode={mode} /> : null}
        </div>
      );
    });
  });
  return <>{out}</>;
}

/* ── portfolio heatmap ──────────────────────────────────────────── */
function Heat({ list, mode, F }) {
  const grid = {};
  const ks = kitchensView(F);
  ks.forEach((o) => { grid[o.i] = {}; });
  const rank = { crit: 4, high: 3, med: 2, low: 1, ok: 1 };
  list.forEach((f) => {
    const targets = f.kitchen < 0 ? [0, 1, 2] : [f.kitchen];
    targets.forEach((i) => {
      if (!grid[i]) return;
      const cur = grid[i][f.cat];
      const when = mode === 'predict' ? fmt(addDays(TODAY, f.inDays))
        : mode === 'reduce' ? f.overdue + 'd overdue' : 'on file';
      if (!cur || rank[f.sev] > rank[cur.sev]) grid[i][f.cat] = { sev: f.sev, txt: f.title, when };
    });
  });
  return (
    <div className="hwrap">
      <table className="hmap" cellPadding="0" cellSpacing="0">
        <tbody>
          <tr><th />{PILLARS.map((p) => <th key={p}>{p}</th>)}</tr>
          {ks.map(({ k, i }) => (
            <tr key={k.name}>
              <th className="hk anim-in" style={{ animationDelay: (0.28 + i * 0.09).toFixed(2) + 's' }}>
                {k.name}<span>{k.county}</span>
              </th>
              {PILLARS.map((p, j) => {
                const delay = (0.34 + (i + j) * 0.055).toFixed(2) + 's';
                const c = grid[i][p];
                return c ? (
                  <td key={p} className={'c ' + c.sev + ' anim-pop'} style={{ animationDelay: delay }}>
                    <b>{LABEL[c.sev]}</b><em>{c.txt}<br />{c.when}</em>
                  </td>
                ) : (
                  <td key={p} className="c clr anim-pop" style={{ animationDelay: delay }}>
                    <b>Clear</b><em>{CLEAR[p][mode]}</em>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── service timeline (SVG) ─────────────────────────────────────── */
function svgFor(rows, showFuture, keyPrefix) {
  const W = 1180, L = 236, TR = W - 150, SX = W - 140, ROW = 42, TOP = 64, BACK = 12, FWD = 3;
  const NM = BACK + FWD;
  const rowsN = rows.length;
  const H = TOP + rowsN * ROW + 8;
  const BOT = TOP + rowsN * ROW - 16;
  const start = new Date(TODAY.getFullYear(), TODAY.getMonth() - BACK + 1, 1);
  const pos = (d) => (d.getFullYear() * 12 + d.getMonth()) - (start.getFullYear() * 12 + start.getMonth()) + (d.getDate() - 1) / 30;
  const X = (m) => L + (TR - L) * (m / NM);
  const todayX = X(pos(TODAY));
  const el = [];
  let dot = 0;

  el.push(<rect key="bg" x="0" y="0" width={W} height={H} fill="#FFFFFF" />);
  if (showFuture) {
    el.push(<rect key="fut" x={todayX.toFixed(1)} y="52" width={(TR - todayX).toFixed(1)} height={BOT - 52} fill="#FAF7F0" />);
  }
  for (let m = 0; m <= NM; m++) {
    el.push(<line key={'g' + m} x1={X(m).toFixed(1)} y1="52" x2={X(m).toFixed(1)} y2={BOT} stroke="#E7E1D6" />);
  }
  let lastYr = null;
  for (let m = 0; m < NM; m++) {
    const d = addMonths(start, m);
    el.push(<text key={'m' + m} x={X(m + 0.5).toFixed(1)} y="44" textAnchor="middle"
      fontFamily="IBM Plex Mono,monospace" fontSize="10" letterSpacing="1.1" fill="#8A94A3">{mon(d)}</text>);
    if (d.getFullYear() !== lastYr) {
      el.push(<text key={'y' + m} x={X(m + 0.5).toFixed(1)} y="28" textAnchor="middle"
        fontFamily="IBM Plex Mono,monospace" fontSize="9" letterSpacing="1.3" fill="#1E2D4D">{d.getFullYear()}</text>);
      if (m > 0) {
        el.push(<line key={'yl' + m} x1={X(m).toFixed(1)} y1="20" x2={X(m).toFixed(1)} y2={BOT} stroke="#C9C0AE" strokeWidth="1.4" />);
      }
      lastYr = d.getFullYear();
    }
  }
  el.push(<line key="sx" x1={SX - 10} y1="52" x2={SX - 10} y2={BOT} stroke="#E7E1D6" />);

  rows.forEach((r, i) => {
    const y = TOP + i * ROW, cy = y + 6;
    if (i) el.push(<line key={'sep' + i} x1="18" y1={y - 10} x2={W - 18} y2={y - 10} stroke="#E7E1D6" />);
    el.push(<text key={'lb' + i} x="20" y={cy} fontFamily="Instrument Sans,sans-serif" fontWeight="600" fontSize="13.5" fill="#1E2D4D">{r.label}</text>);
    el.push(<text key={'st' + i} x="20" y={cy + 15} fontFamily="IBM Plex Mono,monospace" fontSize="9" letterSpacing=".7" fill="#8A94A3">{r.std}</text>);
    el.push(<line key={'tr' + i} x1={L} y1={cy + 4} x2={TR} y2={cy + 4} stroke="#E7E1D6" strokeWidth="2" />);

    const last = addDays(TODAY, -r.lastAgo);
    const due = addMonths(last, r.everyMonths);
    let s = new Date(last);
    const mk = [];
    while (pos(s) > -1) { if (pos(s) >= 0) mk.push(pos(s)); s = addMonths(s, -r.everyMonths); }
    mk.reverse().forEach((m2, mi) => {
      el.push(<circle key={'sv' + i + '-' + mi} className="svc" cx={X(m2).toFixed(1)} cy={cy + 4} r="4.5"
        fill="#3F7D58" style={{ animationDelay: (0.30 + dot++ * 0.045).toFixed(2) + 's' }} />);
    });

    const over = due < TODAY;
    if (over) {
      const x0 = X(pos(due));
      el.push(<rect key={'gb' + i} className="gapbar" x={x0.toFixed(1)} y={cy} width={Math.max(todayX - x0, 5).toFixed(1)}
        height="8" rx="4" fill={COL[r.sev]} style={{ animationDelay: (0.9 + i * 0.08).toFixed(2) + 's' }} />);
    } else if (showFuture && pos(due) <= NM) {
      el.push(<circle key={'dd' + i} className="duedot" cx={X(pos(due)).toFixed(1)} cy={cy + 4} r="5"
        fill={COL[r.sev]} style={{ animationDelay: (1.0 + i * 0.08).toFixed(2) + 's' }} />);
    }
    const stat = over ? days(due, TODAY) + ' days overdue' : (r.note ? r.note + ' ' + fmt(due) : 'Due ' + fmt(due));
    el.push(<text key={'sx' + i} className="statustx" style={{ animationDelay: (1.2 + i * 0.07).toFixed(2) + 's' }}
      x={W - 18} y={cy + 8} textAnchor="end" fontFamily="IBM Plex Mono,monospace" fontSize="10"
      letterSpacing=".3" fill={COL[r.sev]}>{stat}</text>);
  });

  el.push(<line key="tl" className="todayline" x1={todayX.toFixed(1)} y1="20" x2={todayX.toFixed(1)} y2={BOT}
    stroke="#1E2D4D" strokeWidth="1.2" strokeDasharray="4 4" />);
  el.push(<text key="tt" className="todayline" x={todayX.toFixed(1)} y="14" textAnchor="end"
    fontFamily="IBM Plex Mono,monospace" fontSize="9.5" letterSpacing="1.4" fill="#1E2D4D">Today</text>);

  return (
    <div className="twrap" key={keyPrefix}>
      <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" xmlns="http://www.w3.org/2000/svg">{el}</svg>
    </div>
  );
}

function Timeline({ mode, F }) {
  const out = [];
  kitchensView(F).forEach((o) => {
    let rows = kitchenRows(o.i).filter((r) => {
      if (F.category && pillarOf(r) !== F.category) return false;
      if (F.vendor && r.vendor !== F.vendor) return false;
      if (F.vrecord && !r.vendor) return false;
      if (F.severity && r.sev !== F.severity) return false;
      const due = addMonths(addDays(TODAY, -r.lastAgo), r.everyMonths);
      const d = days(TODAY, due);
      if (mode === 'predict') return d >= 0 && d <= (F.window || 90);
      if (mode === 'reduce') return d < 0;
      return true; /* prove: the whole history */
    });
    if (mode === 'prove') rows = rows.slice(0, 6);
    out.push(
      <div className="cat" key={'k' + o.i}>
        <i /><b>{o.k.name}</b>
        <span className="n">{o.k.county}{' · '}{rows.length}
          {mode === 'predict' ? ' Coming Due' : mode === 'reduce' ? ' Open' : ' Shown'}</span>
      </div>
    );
    out.push(rows.length
      ? svgFor(rows, mode === 'predict', 'svg' + o.i)
      : <div className="emptyrow" key={'e' + o.i}>Nothing {mode === 'predict' ? 'due in this window' : 'open'}</div>);
  });
  return <>{out}</>;
}

function EmptyState({ mode }) {
  const t = mode === 'predict' ? 'Nothing comes due in this window.'
    : mode === 'reduce' ? 'Nothing open. Every requirement in this view is current.'
    : 'No sealed records match this view.';
  return <div className="emptyst"><b>Clear</b><span>{t}</span></div>;
}

/* ── one pane of one card ───────────────────────────────────────── */
function Pane({ kind, mode, F }) {
  const list = view(mode, F);
  return (
    <div className={'pane m-' + mode}>
      <Strip list={list} mode={mode} F={F} />
      {kind === 'summary' && (list.length ? <Rows list={list} mode={mode} /> : <EmptyState mode={mode} />)}
      {kind === 'heatmap' && <><Heat list={list} mode={mode} F={F} /><p className="hnote">{NOTE[mode]}</p></>}
      {kind === 'timeline' && <><Timeline mode={mode} F={F} /><p className="tnote">{NOTE[mode]}</p></>}
    </div>
  );
}

const CARDS = [
  { kind: 'summary', title: 'Risk Summary', sub: 'Issues grouped by category — hover a row for detail' },
  { kind: 'heatmap', title: 'Portfolio Heatmap', sub: 'Every requirement across all three kitchens at a glance' },
  { kind: 'timeline', title: 'Service Timeline', sub: 'What is due and when, plotted across the next window' },
];

/* ── one filter dropdown ────────────────────────────────────────── */
function Drop({ id, menu, label, openId, setOpenId, onPick }) {
  const open = openId === id;
  return (
    <div className={'fdrop' + (open ? ' open' : '')}>
      <button type="button" className="fbtn" aria-expanded={open ? 'true' : 'false'}
        onClick={() => setOpenId(open ? null : id)}>
        {label}
      </button>
      <div className="fmenu">
        {menu.map((g, gi) => (
          <div key={gi}>
            {g.grp ? <div className="fgrp">{g.grp}</div> : null}
            {g.opts.map((o) => (
              <button type="button" key={o.label}
                className={'fopt' + (o.vend ? ' vend' : '') + (o.sub ? ' subopt' : '') + (label === o.label ? ' on' : '')}
                onClick={() => onPick(id, o)}>
                {o.dot ? <i className={'sd ' + o.dot} /> : null}
                {o.label}
                {o.tail ? <em>{o.tail}</em> : null}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export function DashboardThreeViews({ gateToken = null }) {
  const [mode, setMode] = useState('predict');
  const [F, setF] = useState(DEFAULT_FILTERS);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [openId, setOpenId] = useState(null);

  const today = useMemo(
    () => TODAY.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), []);

  /* click anywhere outside an open menu closes it — as the mock does */
  const onRootClick = useCallback((e) => {
    if (!e.target.closest || !e.target.closest('.fdrop')) setOpenId(null);
  }, []);

  const pick = useCallback((id, o) => {
    const v = o.label;
    setF((prev) => {
      const next = { ...prev };
      if (id === 'kitchen') next.kitchen = /^All Kitchens/.test(v) ? null : (KIT_INDEX[v] ?? null);
      else if (id === 'category') next.category = /^All Categories/.test(v) ? null : (REQ_PILLAR[v] || null);
      else if (id === 'severity') next.severity = /^All Severities/.test(v) ? null : (SEV_BY_LABEL[v] || null);
      else if (id === 'vendor') {
        if (/^All Vendors/.test(v)) { next.vendor = null; next.vrecord = null; }
        else if (o.vend) { next.vendor = v; next.vrecord = null; }
        else if (o.sub) { next.vendor = o.sub; next.vrecord = v; }
      } else if (id === 'window') {
        const m = /^Next (\d+) Days/.exec(v);
        next.window = m ? parseInt(m[1], 10) : 365;
      }
      return next;
    });
    setLabels((prev) => ({
      ...prev,
      [id]: o.sub ? o.sub.split(' ')[0] + ' · ' + v : v,
    }));
    setOpenId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setF(DEFAULT_FILTERS);
    setLabels(DEFAULT_LABELS);
    setOpenId(null);
  }, []);

  return (
    <div className="ev3v" onClick={onRootClick}>
      <style>{STYLES}</style>
      <div className="demo">

        {/* ── shared header ── */}
        <div className="dhead">
          <span className="dwm"><span className="em">E</span>vid<span className="em">LY</span></span>
          <span className="dsample">Sample Dashboard</span>
          <span className="dctx">
            A worked sample — Pacific Restaurant Group.<br />
            Your account starts with your hood cleaning certificate.
          </span>
        </div>

        <div className="card">
          <div className="chead">
            <span className="ctitle">{DATA.account}</span>
            <span className="cmeta">{'·  3 Kitchens · 3 Counties'}</span>
            <span className="cdate">{today}</span>
          </div>

          {/* ── Predict / Reduce / Prove ── */}
          <div className="tabs">
            {TABS.map((t) => (
              <button type="button" key={t.mode}
                className={t.mode + (mode === t.mode ? ' on' : '')}
                onClick={() => setMode(t.mode)}>
                <b>{t.name}</b><em>{t.sub}</em>
              </button>
            ))}
          </div>

          {/* ── filter bar ── */}
          <div className="filters">
            <span className="flab">Filter</span>
            <Drop id="kitchen"  menu={KITCHEN_MENU}  label={labels.kitchen}  openId={openId} setOpenId={setOpenId} onPick={pick} />
            <Drop id="category" menu={CATEGORY_MENU} label={labels.category} openId={openId} setOpenId={setOpenId} onPick={pick} />
            <Drop id="vendor"   menu={VENDOR_MENU}   label={labels.vendor}   openId={openId} setOpenId={setOpenId} onPick={pick} />
            <Drop id="severity" menu={SEVERITY_MENU} label={labels.severity} openId={openId} setOpenId={setOpenId} onPick={pick} />
            <Drop id="window"   menu={WINDOW_MENU}   label={labels.window}   openId={openId} setOpenId={setOpenId} onPick={pick} />
            <button type="button" className="fclear" onClick={clearFilters}>Clear Filters</button>
          </div>

          {/* ── the three stacked views ── */}
          <div className="stack">
            {CARDS.map((c) => (
              <div className="card2" key={c.kind}>
                <div className="ctop"><h3>{c.title}</h3><span>{c.sub}</span></div>
                <div className="body">
                  <Pane kind={c.kind} mode={mode} F={F} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── gate CTA ── */}
        {gateToken && (
          <div className="gobar">
            <span className="gobar-t">This is the sample. <b>Your record is ready to view.</b></span>
            <Link className="gobar-c" to={`/gate/${gateToken}`}>See what’s on file →</Link>
            <span className="gobar-s">View-only · no account</span>
          </div>
        )}

      </div>
    </div>
  );
}

export default DashboardThreeViews;
