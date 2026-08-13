import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

/* ═══════════════════════════════════════════════════════════════════
   EvidLYDashboard — the /join prospect sample dashboard.
   Source of truth: evidly-join-mock.html.html
   Fonts: Instrument Sans 700 display · 400/500 body · IBM Plex Mono · Montserrat 800 wordmark only.
   Catalog: queried from pillar_requirements where state_code='CA'.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Tab definitions — exported for ClientJoin.tsx ─────────────── */
export const LOC_TABS = [
  ['all', 'Pacific Restaurant Group'],
  ['vista', 'Vista Grill'],
  ['harbor', 'Harbor House'],
  ['anchor', 'The Anchor Room'],
];

/* ── Action-type → explore next-step label ─────────────────────── */
const ACTION_LABEL = {
  route_out: 'Request from vendor',
  upload: 'Upload document',
  confirm: 'Confirm',
  invite: 'Add to team',
  identify_vendor: 'Identify vendor',
};

/* ── Pillar column → short key ─────────────────────────────────── */
const P_KEY = { fire_safety: 'fire', food_safety: 'food', business_records: 'business', vendor_business: 'vendor' };

/* ── Fallback catalog — CA rows from migration c26c10e5 ────────── */
/* Used when the pillar_requirements query returns nothing (e.g.
   unauthenticated visitor — RLS blocks anon reads).  Sorted by
   pillar (alpha) then sort_order, matching .order('pillar').order('sort_order'). */
const FALLBACK_CATALOG = [
  // ── business_records (8) ──
  { requirement_code: 'general_liability_insurance', label: 'General Liability Insurance', pillar: 'business_records', is_conditional: false, counts_toward_total: true, sort_order: 1, action_type: 'upload', citation: 'Business practice' },
  { requirement_code: 'food_contamination_insurance', label: 'Food Contamination / Spoilage Insurance', pillar: 'business_records', is_conditional: false, counts_toward_total: true, sort_order: 2, action_type: 'upload', citation: 'Business practice' },
  { requirement_code: 'lease_agreement', label: 'Lease Agreement', pillar: 'business_records', is_conditional: true, counts_toward_total: false, sort_order: 3, action_type: 'upload', citation: 'Business practice' },
  { requirement_code: 'business_license', label: 'Business License', pillar: 'business_records', is_conditional: false, counts_toward_total: true, sort_order: 4, action_type: 'upload', citation: 'CA Bus. & Prof. Code' },
  { requirement_code: 'sellers_permit', label: "Seller's Permit", pillar: 'business_records', is_conditional: false, counts_toward_total: true, sort_order: 5, action_type: 'upload', citation: 'CDTFA' },
  { requirement_code: 'operator_w9', label: 'W-9', pillar: 'business_records', is_conditional: false, counts_toward_total: true, sort_order: 6, action_type: 'upload', citation: 'IRS 26 USC 3406' },
  { requirement_code: 'certificate_of_occupancy', label: 'Certificate of Occupancy', pillar: 'business_records', is_conditional: false, counts_toward_total: true, sort_order: 7, action_type: 'upload', citation: 'CA Building Code' },
  { requirement_code: 'liquor_license', label: 'Liquor License', pillar: 'business_records', is_conditional: true, counts_toward_total: false, sort_order: 8, action_type: 'upload', citation: 'ABC Act' },
  // ── fire_safety (6) ──
  { requirement_code: 'hood_cleaning', label: 'Hood Cleaning Schedule', pillar: 'fire_safety', is_conditional: false, counts_toward_total: true, sort_order: 1, action_type: 'identify_vendor', citation: 'NFPA 96' },
  { requirement_code: 'fire_suppression', label: 'Fire Suppression Inspection', pillar: 'fire_safety', is_conditional: false, counts_toward_total: true, sort_order: 2, action_type: 'identify_vendor', citation: 'NFPA 17A' },
  { requirement_code: 'fire_extinguishers', label: 'Fire Extinguisher Service', pillar: 'fire_safety', is_conditional: false, counts_toward_total: true, sort_order: 3, action_type: 'identify_vendor', citation: 'NFPA 10' },
  { requirement_code: 'fire_alarm', label: 'Fire Alarm Monitoring', pillar: 'fire_safety', is_conditional: false, counts_toward_total: true, sort_order: 4, action_type: 'identify_vendor', citation: 'NFPA 72' },
  { requirement_code: 'sprinkler_system', label: 'Sprinkler Inspection', pillar: 'fire_safety', is_conditional: false, counts_toward_total: true, sort_order: 5, action_type: 'identify_vendor', citation: 'NFPA 25' },
  { requirement_code: 'ahj_inspection', label: 'AHJ Fire Inspection', pillar: 'fire_safety', is_conditional: false, counts_toward_total: false, sort_order: 6, action_type: 'confirm', citation: 'CFC Chapter 1' },
  // ── food_safety (16) ──
  { requirement_code: 'health_permit', label: 'Health Permit', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 1, action_type: 'upload', citation: 'CalCode 114381' },
  { requirement_code: 'food_manager_cert', label: 'Food Manager Certification', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 2, action_type: 'upload', citation: 'CalCode 113947.1' },
  { requirement_code: 'food_handler_cards', label: 'Food Handler Cards', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 3, action_type: 'confirm', citation: 'CalCode 113948' },
  { requirement_code: 'haccp_plan', label: 'HACCP Plan', pillar: 'food_safety', is_conditional: true, counts_toward_total: false, sort_order: 4, action_type: 'route_out', citation: 'CalCode 114419' },
  { requirement_code: 'temp_receiving', label: 'Receiving Logs', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 5, action_type: 'route_out', citation: 'CalCode 113996' },
  { requirement_code: 'temp_hot_holding', label: 'Hot Holding', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 6, action_type: 'route_out', citation: 'CalCode 113996' },
  { requirement_code: 'temp_cold_holding', label: 'Cold Holding', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 7, action_type: 'route_out', citation: 'CalCode 113996' },
  { requirement_code: 'temp_cooldown', label: 'Cooldown', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 8, action_type: 'route_out', citation: 'CalCode 114002' },
  { requirement_code: 'temp_reheating', label: 'Re-Heating', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 9, action_type: 'route_out', citation: 'CalCode 114014' },
  { requirement_code: 'pest_control', label: 'Pest Control Contract', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 10, action_type: 'identify_vendor', citation: 'CalCode 114259.1' },
  { requirement_code: 'person_in_charge', label: 'Person-in-Charge Documentation', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 11, action_type: 'confirm', citation: 'CalCode 113945' },
  { requirement_code: 'employee_health_policy', label: 'Employee Health Policy', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 12, action_type: 'upload', citation: 'CalCode 113949' },
  { requirement_code: 'allergen_management', label: 'Allergen Management', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 13, action_type: 'upload', citation: 'CalCode \u00a7113947, \u00a7113948' },
  { requirement_code: 'warewash_sanitizer', label: 'Warewash & Sanitizer', pillar: 'food_safety', is_conditional: false, counts_toward_total: true, sort_order: 14, action_type: 'route_out', citation: 'CalCode \u00a7114099, \u00a7114125' },
  { requirement_code: 'grease_trap', label: 'Grease Trap Service', pillar: 'food_safety', is_conditional: true, counts_toward_total: false, sort_order: 15, action_type: 'identify_vendor', citation: 'Local FOG ordinance' },
  { requirement_code: 'backflow_prevention', label: 'Backflow Prevention Test', pillar: 'food_safety', is_conditional: true, counts_toward_total: false, sort_order: 16, action_type: 'identify_vendor', citation: 'California Plumbing Code' },
  // ── vendor_business (6) ──
  { requirement_code: 'vendor_gl_coi', label: 'Vendor General Liability COI', pillar: 'vendor_business', is_conditional: false, counts_toward_total: true, sort_order: 1, action_type: 'upload', citation: 'Business practice' },
  { requirement_code: 'vendor_wc_coi', label: "Vendor Workers' Comp COI", pillar: 'vendor_business', is_conditional: false, counts_toward_total: true, sort_order: 2, action_type: 'upload', citation: 'CA Labor Code 3700' },
  { requirement_code: 'vendor_professional_license', label: 'Vendor Professional License', pillar: 'vendor_business', is_conditional: false, counts_toward_total: true, sort_order: 3, action_type: 'upload', citation: 'CA Bus. & Prof. Code' },
  { requirement_code: 'vendor_business_license', label: 'Vendor Business License', pillar: 'vendor_business', is_conditional: false, counts_toward_total: true, sort_order: 4, action_type: 'upload', citation: 'CA Bus. & Prof. Code' },
  { requirement_code: 'vendor_w9', label: 'Vendor W-9', pillar: 'vendor_business', is_conditional: false, counts_toward_total: true, sort_order: 5, action_type: 'upload', citation: 'IRS 26 USC 3406' },
  { requirement_code: 'vendor_auto_coi', label: 'Vendor Commercial Auto COI', pillar: 'vendor_business', is_conditional: true, counts_toward_total: false, sort_order: 6, action_type: 'upload', citation: 'Business practice' },
];

/* ── Per-kitchen data ────────────────────────────────────────────── */
const KITCHENS = [
  { key: 'vista',  name: 'Vista Grill',     onfile: ['hood_cleaning'],
    base: { fire: [1400, 5600], food: [3100, 12000] },
    temps: [
      { cat: 'Cold Holding', nm: 'Walk-in Cooler',  v: '38\u00b0',  src: 'Sensor',      st: 'In range' },
      { cat: 'Hot Holding',  nm: 'Steam Table',     v: '151\u00b0', src: 'Sensor',      st: 'In range' },
      { cat: 'Cold Holding', nm: 'Prep Line Rail',  v: '40\u00b0',  src: 'Staff entry', st: 'In range' },
    ] },
  { key: 'harbor', name: 'Harbor House',    onfile: ['hood_cleaning'],
    base: { fire: [1100, 4200], food: [2400, 9200] },
    temps: [
      { cat: 'Cold Holding', nm: 'Walk-in Freezer', v: '2\u00b0',   src: 'Staff entry', st: 'In range' },
      { cat: 'Hot Holding',  nm: 'Soup Well',       v: '147\u00b0', src: 'Staff entry', st: 'In range' },
      { cat: 'Cooldown',     nm: 'Chicken Stock',   v: '68\u00b0',  src: 'Staff entry', st: 'Cooling' },
    ] },
  { key: 'anchor', name: 'The Anchor Room', onfile: ['hood_cleaning'],
    base: { fire: [900, 3400], food: [1900, 7300] },
    temps: [
      { cat: 'Cold Holding', nm: 'Reach-in Cooler', v: '41\u00b0',  src: 'Staff entry', st: 'In range' },
      { cat: 'Cooldown',     nm: 'Braised Pork',    v: '71\u00b0',  src: 'Staff entry', st: 'Cooling' },
      { cat: 'Re-Heating',   nm: 'Marinara',        v: '168\u00b0', src: 'Staff entry', st: 'In range' },
    ] },
];

/* ── Risk breakdown proportions (USDA ERS · NFPA · CDC basis) ──── */
const FIRE_LINES = [
  { label: 'Fire damage & equipment', ctx: 'NFPA 96 \u00b7 17A \u00b7 25 \u00b7 72', lo: 0.46, hi: 0.46 },
  { label: 'Shutdown & rebuild', ctx: '', lo: 0.34, hi: 0.35 },
  { label: 'Reputation recovery', ctx: '', lo: 0.20, hi: 0.19 },
];
const FOOD_LINES = [
  { label: 'Foodborne illness', ctx: 'logs \u00b7 HACCP', lo: 0.44, hi: 0.51 },
  { label: 'Shutdown & reinspection', ctx: 'health dept', lo: 0.33, hi: 0.26 },
  { label: 'Reputation recovery', ctx: '', lo: 0.23, hi: 0.23 },
];

/* ── SVG ring math ───────────────────────────────────────────────── */
const R = 54;
const CIRC = 2 * Math.PI * R;

/* ── Tooltip text ────────────────────────────────────────────────── */
const TIP_UPCOMING = "Read from each requirement\u2019s next due date \u2014 vendor service cadence, permit expiry, certification renewal. Anything falling inside the next 30 days appears here.";
const TIP_ACTION = "A requirement that is overdue, expired, or inside its warning window with no current record on file. These are what EvidLY routes an alert for.";
const TIP_PROVE = "Requirements with a current, sealed record on file, out of what this county requires for this kitchen. Conditional items are listed but never counted.";

/* ── CSS ─────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.ev-ltabs{background:#fff;border-bottom:1px solid #E4DBC8;padding:0 22px;display:flex;overflow-x:auto}
.ev-ltab{position:relative;font-family:'Instrument Sans',system-ui,sans-serif;font-size:13.5px;font-weight:500;
  color:#646D7A;padding:16px;white-space:nowrap;display:flex;align-items:center;gap:8px;cursor:pointer;
  border:none;background:none;transition:color .22s cubic-bezier(.4,0,.2,1),background-color .22s cubic-bezier(.4,0,.2,1)}
.ev-ltab::after{content:'';position:absolute;left:50%;right:50%;bottom:0;height:2px;background:#B24A2E;
  border-radius:2px 2px 0 0;transition:left .28s cubic-bezier(.4,0,.2,1),right .28s cubic-bezier(.4,0,.2,1)}
.ev-ltab:hover{color:#1C2A3A;background:#FBF8F1}
.ev-ltab:hover::after{left:14px;right:14px;background:#E4DBC8}
.ev-ltab.on{color:#1C2A3A;font-weight:600}
.ev-ltab.on::after{left:0;right:0;background:#B24A2E}

.ev-hero{display:flex;align-items:center;justify-content:space-between;gap:48px;padding:38px 0 34px}
.ev-hero-l{min-width:0;flex:1}
.ev-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#B24A2E}
.ev-h1{font-family:'Instrument Sans',system-ui,sans-serif;font-size:34px;font-weight:700;line-height:1.2;
  color:#1C2A3A;margin:13px 0 0;letter-spacing:-.028em}
.ev-h1 .ev-sep{color:#A79E8B;font-weight:300;padding:0 3px}
.ev-sub{font-family:'Instrument Sans',system-ui,sans-serif;font-size:15.5px;font-weight:400;line-height:1.6;
  color:#4A5566;margin:12px 0 0;max-width:60ch}
.ev-sub b{font-weight:500;color:#1C2A3A}

.ev-rings-w{display:flex;flex-direction:column;align-items:center;gap:15px;flex:none}
.ev-rings-h{position:relative;display:inline-flex;align-items:center;gap:6px;cursor:default;
  font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6E675A}
.ev-qmark{width:13px;height:13px;border-radius:50%;border:1px solid #A79E8B;color:#A79E8B;
  font-size:9px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;line-height:1;
  font-family:'Instrument Sans',system-ui,sans-serif;transition:border-color .2s,color .2s}
.ev-rings-h:hover .ev-qmark{border-color:#1C2A3A;color:#1C2A3A}
.ev-tip{position:absolute;top:calc(100% + 9px);left:50%;transform:translateX(-50%) translateY(-4px);
  background:#1C2A3A;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.04em;text-transform:none;
  padding:9px 12px;border-radius:7px;white-space:nowrap;pointer-events:none;opacity:0;
  transition:opacity .18s ease,transform .18s ease;z-index:20;box-shadow:0 8px 22px -10px rgba(28,42,58,.55)}
.ev-tip::before{content:'';position:absolute;bottom:100%;left:50%;transform:translateX(-50%);
  border:5px solid transparent;border-bottom-color:#1C2A3A}
.ev-rings-h:hover .ev-tip{opacity:1;transform:translateX(-50%) translateY(0)}
.ev-rings{display:flex;gap:28px}
.ev-ring-w{display:flex;flex-direction:column;align-items:center;gap:11px;cursor:default}
.ev-ring{position:relative;width:124px;height:124px;transition:transform .3s cubic-bezier(.34,1.4,.64,1)}
.ev-ring svg{display:block;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.ev-arc{transition:stroke-dashoffset 1.15s cubic-bezier(.22,1,.36,1) .15s,stroke-width .3s ease}
.ev-halo{opacity:0;transition:opacity .3s ease}
.ev-ring-w:hover .ev-ring{transform:scale(1.045)}
.ev-ring-w:hover .ev-arc{stroke-width:9}
.ev-ring-w:hover .ev-halo{opacity:1}
.ev-in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ev-pct{font-family:'Instrument Sans',system-ui,sans-serif;font-size:26px;font-weight:700;color:#1C2A3A;line-height:1;
  letter-spacing:-.02em;transition:transform .3s cubic-bezier(.34,1.4,.64,1)}
.ev-ring-w:hover .ev-pct{transform:translateY(-2px)}
.ev-of{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6E675A;margin-top:6px;transition:color .25s ease}
.ev-ring-w:hover .ev-of{color:#4A5566}
.ev-ring-meta{display:flex;flex-direction:column;align-items:center;gap:7px}
.ev-ring-name{font-family:'Instrument Sans',system-ui,sans-serif;font-size:14px;font-weight:700;color:#1C2A3A;letter-spacing:-.01em}
.ev-ring-state{font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:500;letter-spacing:.13em;text-transform:uppercase;
  padding:4px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:6px;transition:background-color .3s,color .3s}
.ev-ring-state .ev-d{width:5px;height:5px;border-radius:50%;background:currentColor}
.ev-ring-state.ready{background:#E3ECE1;color:#3E5E4B}
.ev-ring-state.notready{background:#F6E3DF;color:#9E3B32}

.ev-watch{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #E4DBC8;
  border-radius:10px;padding:15px 20px;box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55)}
.ev-watch-t{font-size:13.5px;font-weight:600;color:#1C2A3A}
.ev-watch-t span{font-weight:400;color:#646D7A}
.ev-watch-r{margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.06em;color:#547A62;
  display:flex;align-items:center;gap:7px;white-space:nowrap}

.ev-sh{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:36px 0 14px}
.ev-sh h2{font-family:'Instrument Sans',system-ui,sans-serif;font-size:19px;font-weight:700;color:#1C2A3A;margin:0;letter-spacing:-.02em}
.ev-sh .ev-pill{font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:500;letter-spacing:.13em;text-transform:uppercase;
  background:#F1ECE0;color:#B24A2E;padding:5px 10px;border-radius:5px}
.ev-sh .ev-r{margin-left:auto;display:flex;align-items:center;gap:16px}
.ev-sh .ev-cnt{font-size:12.5px}
.ev-sh .ev-auto{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#A79E8B}

.ev-alert{background:#fff;border:1px solid #E4DBC8;border-left:3px solid #A79E8B;
  border-radius:0 10px 10px 0;padding:17px 20px;display:flex;align-items:center;gap:16px;
  box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55)}
.ev-alert-ic{width:34px;height:34px;border-radius:9px;background:#F1ECE0;color:#6E675A;
  display:flex;align-items:center;justify-content:center;flex:none}
.ev-alert-m{flex:1;min-width:0}
.ev-alert-t{font-size:15px;font-weight:600;color:#1C2A3A;line-height:1.35}
.ev-alert-s{font-size:13px;color:#646D7A;margin-top:4px;display:block}

.ev-chip{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.11em;text-transform:uppercase;
  padding:5px 9px;border-radius:4px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;transition:background-color .3s,color .3s}
.ev-chip .ev-d{width:5px;height:5px;border-radius:50%;background:currentColor;flex:none}
.ev-chip.ok{background:#E3ECE1;color:#3E5E4B}
.ev-chip.no{background:#F6E3DF;color:#9E3B32}
.ev-chip.na{background:#F1ECE0;color:#A79E8B}

.ev-pillars{display:grid;grid-template-columns:1fr;gap:18px}
.ev-pcard{background:#fff;border:1px solid #E4DBC8;border-radius:10px;box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55)}
.ev-pc-head{padding:20px 26px;display:flex;align-items:center;gap:16px;border-bottom:1px solid #EEE7D9;border-radius:10px 10px 0 0}
.ev-pc-ic{width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:none}
.ev-pc-id{flex:1;min-width:0;display:flex;flex-direction:column}
.ev-pc-n{font-family:'Instrument Sans',system-ui,sans-serif;font-size:18px;font-weight:700;color:#1C2A3A;line-height:1.2;letter-spacing:-.02em}
.ev-pc-c{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:#A79E8B;margin-top:8px}
.ev-pc-pill{font-size:11px;font-weight:600;padding:6px 12px;border-radius:99px;white-space:nowrap;flex:none;display:flex;align-items:center;gap:7px;transition:background-color .3s,color .3s}
.ev-pc-pill.ok{background:#E3ECE1;color:#3E5E4B}
.ev-pc-pill.act{background:#F7EDD3;color:#B24A2E}
.ev-pc-pill .ev-d{width:6px;height:6px;border-radius:50%;background:currentColor}
.ev-coderow{padding:12px 26px;border-bottom:1px solid #EEE7D9;background:#FDFBF7}
.ev-codes{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ev-pc-cols{display:grid;grid-template-columns:1fr 1fr 1fr;border-radius:0 0 10px 10px}
.ev-pcol{padding:20px 26px 22px;border-right:1px solid #EEE7D9;display:flex;flex-direction:column;min-height:132px;position:relative}
.ev-pcol:last-child{border-right:none}
.ev-pcol.hot{background:#FDF8EE}
.ev-pcol-k{font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;
  color:#6E675A;display:flex;align-items:center;gap:7px;margin-bottom:14px;position:relative;cursor:default}
.ev-pcol-k .ev-qmark{width:12px;height:12px;font-size:8px}
.ev-pcol-tip{position:absolute;top:calc(100% + 8px);left:0;background:#1C2A3A;color:#fff;font-family:'Instrument Sans',system-ui,sans-serif;
  font-size:11.5px;font-weight:400;letter-spacing:0;text-transform:none;line-height:1.55;padding:11px 13px;
  border-radius:8px;width:250px;pointer-events:none;opacity:0;transform:translateY(-4px);z-index:30;
  transition:opacity .18s ease,transform .18s ease;box-shadow:0 10px 26px -12px rgba(28,42,58,.6)}
.ev-pcol-tip::before{content:'';position:absolute;bottom:100%;left:14px;border:5px solid transparent;border-bottom-color:#1C2A3A}
.ev-pcol:last-child .ev-pcol-tip{left:auto;right:0}
.ev-pcol:last-child .ev-pcol-tip::before{left:auto;right:14px}
.ev-pcol:nth-child(2) .ev-pcol-tip{left:50%;transform:translateX(-50%) translateY(-4px)}
.ev-pcol:nth-child(2) .ev-pcol-k:hover .ev-pcol-tip{transform:translateX(-50%) translateY(0)}
.ev-pcol:nth-child(2) .ev-pcol-tip::before{left:50%;margin-left:-5px}
.ev-pcol-k:hover .ev-pcol-tip{opacity:1;transform:translateY(0)}
.ev-pcol.hot .ev-pcol-k{color:#B24A2E}
.ev-pcol-body{flex:1}
.ev-pcol-v{font-size:14px;color:#4A5566;line-height:1.55}
.ev-pcol-n{font-family:'Instrument Sans',system-ui,sans-serif;font-size:29px;font-weight:700;color:#1C2A3A;line-height:1;letter-spacing:-.02em}
.ev-pcol-n em{font-style:normal;font-size:15px;font-weight:400;color:#646D7A;font-family:'Instrument Sans',system-ui,sans-serif}
.ev-pcol-sub{font-size:12.5px;color:#646D7A;margin-top:7px}
.ev-pcol-bar{height:4px;border-radius:99px;background:#F0EADC;margin-top:12px;overflow:hidden}
.ev-pcol-bar i{display:block;height:100%;border-radius:99px}

.ev-gobar{display:flex;align-items:center;gap:18px;flex-wrap:wrap;background:#1C2A3A;border-radius:12px;
  padding:20px 24px;margin-top:24px;box-shadow:0 18px 40px -26px rgba(28,42,58,.7)}
.ev-gobar-t{font-size:15px;color:#AFBBCA;flex:1;min-width:220px;line-height:1.5}
.ev-gobar-t b{color:#fff;font-weight:600}
.ev-gobar-c{background:#B24A2E;color:#fff;text-decoration:none;font-weight:600;font-size:14.5px;
  padding:13px 24px;border-radius:9px;white-space:nowrap;transition:opacity .18s;display:inline-block}
.ev-gobar-c:hover{opacity:.9}
.ev-gobar-s{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8FA6BE;white-space:nowrap}

.ev-risk{background:#fff;border:1px solid #E4DBC8;border-top:3px solid #B24A2E;border-radius:10px;padding:20px 22px;
  box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55)}
.ev-risk-top{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
.ev-risk-h{font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;font-weight:600;color:#4A5566}
.ev-risk-n{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#646D7A}
.ev-risk-line{border-top:1px solid #EEE7D9;padding:13px 0;margin-top:11px}
.ev-risk-l1{display:flex;justify-content:space-between;align-items:baseline}
.ev-risk-l1>span:first-child{font-size:14px;color:#4A5566}
.ev-risk-amt{font-family:'Instrument Sans',system-ui,sans-serif;font-size:19px;font-weight:700;color:#1C2A3A}
.ev-yr{font-size:12px;color:#646D7A;font-weight:400}
.ev-risk-l2{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:12.5px}
.ev-risk-l2 .lo{color:#8E332B}
.ev-risk-l2 .hi{color:#3E5E4B;text-align:right}
.ev-risk-total{border-top:1px solid #D6CFC0;padding-top:13px;display:flex;justify-content:space-between;align-items:baseline}
.ev-risk-total>span:first-child{font-size:14px;font-weight:600;color:#1C2A3A}
.ev-risk-tamt{font-family:'Instrument Sans',system-ui,sans-serif;font-size:23px;font-weight:700;color:#1C2A3A}
.ev-ceil{margin-top:16px;border-radius:10px;padding:15px 17px}
.ev-ceil-k{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
.ev-ceil-r{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.ev-ceil-r>span:first-child{font-size:13.5px}
.ev-ceil-a{font-size:16px;font-weight:700;white-space:nowrap}
.ev-ceil-n{font-size:12.5px;line-height:1.55}
.ev-risk-fine{margin-top:13px;font-size:11px;line-height:1.6;color:#646D7A}
.ev-breakdown{margin-top:12px;background:none;border:none;padding:0;font-family:'Instrument Sans',system-ui,sans-serif;
  font-size:13px;font-weight:600;color:#1C2A3A;cursor:pointer}
.ev-breakdown:hover{text-decoration:underline}

.ev-sens{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ev-sens-c{background:#fff;border:1px solid #E4DBC8;border-radius:10px;padding:16px 18px;
  box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55)}
.ev-sens-cat{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;color:#B24A2E}
.ev-sens-row{display:flex;justify-content:space-between;align-items:flex-start;margin-top:9px}
.ev-sens-nm{font-size:14px;font-weight:600;color:#1C2A3A}
.ev-sens-loc{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#646D7A;margin-top:3px}
.ev-sens-v{font-family:'Instrument Sans',system-ui,sans-serif;font-size:24px;font-weight:700;color:#1C2A3A;line-height:1}
.ev-sens-b{display:flex;justify-content:space-between;align-items:center;margin-top:12px}
.ev-sens-src{font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:#547A62;display:flex;align-items:center;gap:6px}
.ev-sens-src .ev-d{width:5px;height:5px;border-radius:50%;background:currentColor}
.ev-sens-st{font-size:10.5px;font-weight:600;padding:4px 10px;border-radius:99px;background:#E3ECE1;color:#3E5E4B}

.ev-recs{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.ev-rcard{background:#fff;border:1px solid #E4DBC8;border-radius:10px;overflow:hidden;
  box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55)}
.ev-rc-head{padding:20px 22px;display:flex;align-items:center;gap:15px;border-bottom:1px solid #EEE7D9}
.ev-rc-id{flex:1;min-width:0;display:flex;flex-direction:column}
.ev-rc-n{font-family:'Instrument Sans',system-ui,sans-serif;font-size:18px;font-weight:700;color:#1C2A3A;letter-spacing:-.02em}
.ev-rc-c{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:#A79E8B;margin-top:7px}
.ev-rc-count{font-family:'Instrument Sans',system-ui,sans-serif;font-size:24px;font-weight:700;color:#1C2A3A;flex:none;letter-spacing:-.02em}
.ev-rc-count em{font-style:normal;font-size:14px;font-weight:400;color:#646D7A;font-family:'Instrument Sans',system-ui,sans-serif}
.ev-rlist{padding:6px 22px 18px}
.ev-rrow{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #EEE7D9}
.ev-rrow:last-child{border-bottom:none}
.ev-rdot{width:7px;height:7px;border-radius:50%;flex:none}
.ev-rdot.no{background:#9E3B32}
.ev-rdot.ok{background:#547A62}
.ev-rdot.na{background:#E4DBC8}
.ev-rname{flex:1;min-width:0;font-size:13.5px;color:#1C2A3A}
.ev-rtag{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#A79E8B;flex:none}
.ev-vnote{font-size:12.5px;line-height:1.6;color:#646D7A;padding:12px 0 4px}

.ev-explore{background:#fff;border:1px solid #E4DBC8;border-top:2px solid #3E6B8A;
  border-radius:14px;padding:18px 22px;margin-top:26px;box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55)}
.ev-ex-head{display:flex;align-items:center;gap:9px;flex-wrap:wrap;cursor:pointer;user-select:none}
.ev-ex-k{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#2C5570;font-weight:700}
.ev-ex-n{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:#9AA7B0}
.ev-ex-chev{margin-left:auto;color:#3E6B8A;font-size:13px;transition:transform .25s cubic-bezier(.4,0,.2,1)}
.ev-ex-head.open .ev-ex-chev{transform:rotate(180deg)}
.ev-ex-body{max-height:0;overflow:hidden;transition:max-height .32s cubic-bezier(.4,0,.2,1)}
.ev-ex-body.open{max-height:1600px}
.ev-ex-p{font-size:12.5px;color:#1C2A3A;margin:8px 0 12px;line-height:1.5}
.ev-ex-grid{display:block}
.ev-ex-h{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#B24A2E;
  margin:16px 0 4px;padding-top:12px;border-top:1px solid #EEE7D9}
.ev-ex-h:first-child{margin-top:4px;padding-top:0;border-top:none}
.ev-ex-sub{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E675A;
  margin:12px 0 2px;padding-left:25px}
.ev-ex-row{display:flex;align-items:center;gap:11px;padding:8px 0;cursor:pointer;font-size:13.5px;color:#1C2A3A;
  border-bottom:1px solid #F5F0E6}
.ev-ex-row:last-child{border-bottom:none}
.ev-ex-row:hover{background:#FCFAF5}
.ev-ex-row input[type=checkbox]{width:15px;height:15px;accent-color:#1C2A3A;cursor:pointer;flex:none}
.ev-ex-nm{flex:1;min-width:0}
.ev-ex-cond{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:#A79E8B;
  background:#F1ECE0;padding:3px 7px;border-radius:4px;margin-left:8px;white-space:nowrap}
.ev-ex-st{flex:none;font-size:11.5px;white-space:nowrap;text-align:right;min-width:150px}
.ev-ex-st.file{color:#547A62;font-weight:600}
.ev-ex-st.act{color:#2C5570;font-weight:500;opacity:.75}
.ev-ex-row:hover .ev-ex-st.act{opacity:1}

.ev-modal-bg{position:fixed;inset:0;z-index:100;background:rgba(28,42,58,.5);display:flex;align-items:flex-start;justify-content:center;padding:44px 20px;overflow:auto}
.ev-modal{width:100%;max-width:720px;background:#F7F1E6;border-radius:20px;box-shadow:0 40px 90px -30px rgba(28,42,58,.65);overflow:hidden}
.ev-modal-hd{padding:26px 30px 20px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:1px solid #E7DFCE}
.ev-modal-bd{padding:22px 30px 30px;display:flex;flex-direction:column;gap:18px}
.ev-modal-x{background:none;border:1px solid #E4DBC8;border-radius:8px;width:32px;height:32px;font-size:16px;color:#6E675A;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center}
.ev-modal-x:hover{background:#EFE8DA}
.ev-modal-note{background:#F3EAD6;border-radius:10px;padding:12px 15px;font-size:12.5px;line-height:1.5;color:#7A6A45}
.ev-modal-pill{background:#fff;border:1px solid #EEE7D9;border-radius:16px;padding:22px 24px}
.ev-modal-total{background:#1C2A3A;border-radius:16px;padding:24px 26px;color:#EDE7DA}

@media(max-width:1040px){
  .ev-hero{flex-direction:column;align-items:flex-start;gap:32px}
  .ev-pillars,.ev-recs{grid-template-columns:1fr}
  .ev-sens{grid-template-columns:1fr}
}
@media(max-width:600px){
  .ev-h1{font-size:27px}
  .ev-pc-cols{grid-template-columns:1fr}
  .ev-pcol{border-right:none;border-bottom:1px solid #EEE7D9;min-height:0}
  .ev-pcol:last-child{border-bottom:none}
  .ev-gobar{flex-direction:column;align-items:stretch;text-align:center}
  .ev-risk-l2{flex-direction:column;gap:4px}
  .ev-risk-l2 .hi{text-align:left}
  .ev-rings{gap:18px}
  .ev-ring{width:104px;height:104px}
  .ev-modal{border-radius:12px}
  .ev-modal-hd{padding:20px 18px 16px}
  .ev-modal-bd{padding:16px 18px 24px}
}
.ev-askers{display:grid;grid-template-columns:1fr;gap:12px}
.ev-ask{background:#fff;border:1px solid #E4DBC8;border-left:3px solid #B24A2E;
  border-radius:0 10px 10px 0;padding:17px 18px;
  box-shadow:0 1px 2px rgba(28,42,58,.03),0 16px 34px -30px rgba(28,42,58,.55)}
.ev-ask-adj{border-left-color:#8F3A22}
.ev-ask-fire{border-left-color:#B24A2E}
.ev-ask-food{border-left-color:#3E6B8A}
.ev-ask-w{font-family:'Instrument Sans',system-ui,sans-serif;font-size:15.5px;font-weight:700;color:#1C2A3A;letter-spacing:-.015em}
.ev-ask-when{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;color:#A79E8B;margin-top:5px}
.ev-ask-p{font-size:13.5px;line-height:1.6;color:#4A5566;margin:10px 0 0}
.ev-ask-p b{font-weight:600;color:#1C2A3A}
.ev-ask-tail{margin-top:11px;padding-top:11px;border-top:1px solid #EEE7D9;font-size:13px;line-height:1.6;color:#5F6875}
.ev-ask-tail b{font-weight:600;color:#1C2A3A}
@media(min-width:900px){.ev-askers{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1180px){.ev-askers{grid-template-columns:repeat(4,1fr)}}

/* ── Navy hero (mobile) ────────────────────────────────── */
.ev-hero-navy{background:#1C2A3A;padding:28px 20px 32px;color:#fff}
.ev-hero-back{font-size:13px;color:rgba(255,255,255,.45);text-decoration:none;display:inline-block;margin-bottom:14px}
.ev-hero-back:hover{color:#fff}
.ev-hero-brand{margin-bottom:20px}
.ev-hero-org{background:none;border:none;color:#fff;font-family:'Instrument Sans',system-ui,sans-serif;
  font-size:20px;font-weight:700;cursor:pointer;padding:0;letter-spacing:-.02em;text-align:left;
  display:block;width:100%;margin-bottom:4px;line-height:1.3}
.ev-hero-org.active{text-decoration:underline;text-decoration-color:rgba(255,255,255,.3);text-underline-offset:3px}
.ev-hero-sub{font-size:13px;color:rgba(255,255,255,.5);margin:0 0 16px;line-height:1.5}
.ev-pill-row{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
.ev-kpill{font-family:'Instrument Sans',system-ui,sans-serif;font-size:13px;font-weight:500;
  padding:7px 14px;border-radius:99px;border:1px solid rgba(255,255,255,.18);
  background:transparent;color:rgba(255,255,255,.65);cursor:pointer;white-space:nowrap;
  transition:background .2s,color .2s,border-color .2s}
.ev-kpill:hover{border-color:rgba(255,255,255,.35);color:#fff}
.ev-kpill.on{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.35);color:#fff;font-weight:600}

/* ── Hero risk + CTA (mobile) ──────────────────────────── */
.ev-hero-risk{text-align:center;margin-top:22px;font-size:13px;color:rgba(255,255,255,.55)}
.ev-hero-risk b{color:#fff;font-family:'Instrument Sans',system-ui,sans-serif;font-size:18px;font-weight:700}

/* ── Collapsible cards (mobile) ──────────────────────── */
.ev-cards{padding:16px 16px 80px}
.ev-card{background:#fff;border:1px solid #E4DBC8;border-radius:12px;margin:0 0 12px;
  box-shadow:0 1px 2px rgba(28,42,58,.03)}
.ev-card>summary{display:flex;align-items:center;gap:12px;
  padding:16px 20px;cursor:pointer;list-style:none;
  font-family:'Instrument Sans',system-ui,sans-serif}
.ev-card>summary::-webkit-details-marker{display:none}
.ev-card>summary::marker{display:none}
.ev-card-title{font-size:16px;font-weight:700;color:#1C2A3A;flex:1}
.ev-card-meta{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#646D7A;white-space:nowrap}
.ev-card-chev{color:#A79E8B;font-size:14px;transition:transform .25s ease;flex:none;margin-left:4px}
.ev-card[open] .ev-card-chev{transform:rotate(180deg)}
.ev-card-body{padding:4px 20px 20px;border-top:1px solid #EEE7D9}

/* ── Navy-scoped ring overrides ──────────────────────── */
.ev-hero-navy .ev-rings-w{margin-top:8px}
.ev-hero-navy .ev-rings{justify-content:center}
.ev-hero-navy .ev-rings-h{color:rgba(255,255,255,.5)}
.ev-hero-navy .ev-qmark{border-color:rgba(255,255,255,.35);color:rgba(255,255,255,.5)}
.ev-hero-navy .ev-rings-h:hover .ev-qmark{border-color:#fff;color:#fff}
.ev-hero-navy .ev-tip{background:#fff;color:#1C2A3A}
.ev-hero-navy .ev-tip::before{border-bottom-color:#fff}
.ev-hero-navy .ev-pct{color:#fff}
.ev-hero-navy .ev-of{color:rgba(255,255,255,.55)}
.ev-hero-navy .ev-ring-w:hover .ev-of{color:rgba(255,255,255,.75)}
.ev-hero-navy .ev-ring-name{color:#fff}
.ev-hero-navy .ev-ring-state.ready{background:rgba(62,94,75,.45);color:#BFD6C0}
.ev-hero-navy .ev-ring-state.notready{background:rgba(158,59,50,.35);color:#E5B9B2}

@media(prefers-reduced-motion:reduce){
  .ev-arc{transition:none!important}
  .ev-ring{transition:none!important}
  .ev-ring-w:hover .ev-ring{transform:none}
  .ev-ring-w:hover .ev-pct{transform:none}
  .ev-halo{display:none}
  .ev-ltab::after{transition:none!important}
  .ev-ex-body{transition:none!important}
  .ev-ex-chev{transition:none!important}
}
`;

/* ── Helpers ─────────────────────────────────────────────────────── */
function money(n) { return n >= 1000 ? '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + Math.round(n); }
function range(a, b) { return money(Math.round(a)) + '\u2013' + money(Math.round(b)); }
const WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
function word(n) { return WORDS[n] || String(n); }

/* ── Icon helpers (inline SVG) ───────────────────────────────────── */
const EyeIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1C2A3A" strokeWidth="1.7"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const TrendIcon = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>;
const CheckIcon = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M20 6 9 17l-5-5" /></svg>;
const FireIcon = () => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#B24A2E" strokeWidth="1.7"><path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5S9 11 10 11c0-3 2-8 2-8z" /></svg>;
const FoodIcon = () => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#3E6B8A" strokeWidth="1.7"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10" /><path d="M17 3c-1.5 2-2 4-2 6s1 2 2 2 2 0 2-2-.5-4-2-6zM17 11v10" /></svg>;
const CalIcon = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>;
const WarnIcon = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>;
const DocIcon = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>;
const BldgIcon = () => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#6E675A" strokeWidth="1.7"><path d="M4 21V7l8-4 8 4v14" /><path d="M9 21v-6h6v6" /></svg>;
const TruckIcon = () => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#6E675A" strokeWidth="1.7"><path d="M1 3h13v13H1z" /><path d="M14 8h4l3 3v5h-7" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" /></svg>;

/* ────────────────────────────────────────────────────────────────── */
function EvidLYDashboard({ loc: locProp, onLocChange, embedded = false, gateToken = null }) {
  const [locSelf, setLocSelf] = useState('all');
  const loc = locProp ?? locSelf;
  const setLoc = onLocChange ?? setLocSelf;
  const [exploreOpen, setExploreOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);

  /* ── Fetch requirement catalog from pillar_requirements ─────── */
  const [rawCatalog, setRawCatalog] = useState([]);
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('pillar_requirements')
        .select('requirement_code, label, pillar, is_conditional, counts_toward_total, sort_order, action_type, citation')
        .eq('state_code', 'CA')
        .order('pillar')
        .order('sort_order');
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        if (error) console.error('pillar_requirements fetch failed, using fallback catalog:', error);
        setRawCatalog(FALLBACK_CATALOG);
      } else {
        setRawCatalog(data);
      }
      setCatalogReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Derive arrays from catalog ──────────────────────────────── */
  const derived = useMemo(() => {
    const norm = rawCatalog.map(r => ({
      c: r.requirement_code,
      n: r.label,
      p: P_KEY[r.pillar] || r.pillar,
      pillar: r.pillar,
      cond: r.is_conditional,
      counts: r.counts_toward_total,
      act: r.action_type,
      cite: r.citation,
      g: r.requirement_code.startsWith('temp_') ? 'Temperature Logs' : null,
    }));

    const fire = norm.filter(r => r.pillar === 'fire_safety');
    const food = norm.filter(r => r.pillar === 'food_safety');
    const biz  = norm.filter(r => r.pillar === 'business_records');
    const vend = norm.filter(r => r.pillar === 'vendor_business');
    const cat  = [...fire, ...food];

    const fc = fire.filter(r => r.counts).length;
    const fdc = food.filter(r => r.counts).length;

    const chips = fire
      .map(r => {
        const m = r.cite?.match(/NFPA\s+(\S+)/);
        return m ? { req: r.c, label: m[1] } : null;
      })
      .filter(Boolean);

    return {
      cat, fire, food, biz, vend,
      fireCounted: fc,
      foodCounted: fdc,
      nfpaChips: chips,
      bizCounting: biz.filter(r => r.counts).length,
      vendorCounting: vend.filter(r => r.counts).length,
    };
  }, [rawCatalog]);

  const { cat, fire: fireItems, food: foodItems, biz: bizRecords, vend: vendorRecords,
          fireCounted, foodCounted, nfpaChips, bizCounting, vendorCounting } = derived;

  /* ── Per-kitchen requirement state ──────────────────────────── */
  const [kState, setKState] = useState({});
  const [kReady, setKReady] = useState(false);

  useEffect(() => {
    if (!catalogReady || cat.length === 0 || kReady) return;
    const s = {};
    KITCHENS.forEach((k) => {
      s[k.key] = {};
      cat.forEach((r) => { s[k.key][r.c] = k.onfile.includes(r.c); });
    });
    setKState(s);
    setKReady(true);
  }, [catalogReady, cat, kReady]);

  const active = loc === 'all' ? KITCHENS : KITCHENS.filter((k) => k.key === loc);

  /* ── Counts ──────────────────────────────────────────────────── */
  const counts = (() => {
    let f = 0, fd = 0;
    active.forEach((k) => {
      cat.forEach((r) => {
        if (!r.counts || !kState[k.key]?.[r.c]) return;
        if (r.p === 'fire') f++; else fd++;
      });
    });
    return { fire: [f, fireCounted * active.length], food: [fd, foodCounted * active.length] };
  })();

  const total = counts.fire[1] + counts.food[1];
  const proven = counts.fire[0] + counts.food[0];
  const firePct = counts.fire[1] > 0 ? counts.fire[0] / counts.fire[1] : 0;
  const foodPct = counts.food[1] > 0 ? counts.food[0] / counts.food[1] : 0;
  const fireReady = counts.fire[1] > 0 && counts.fire[0] >= counts.fire[1];
  const foodReady = counts.food[1] > 0 && counts.food[0] >= counts.food[1];

  /* ── Ring counter animation ──────────────────────────────────── */
  const [dispFire, setDispFire] = useState(0);
  const [dispFood, setDispFood] = useState(0);
  const fireTarget = Math.round(firePct * 100);
  const foodTarget = Math.round(foodPct * 100);
  const animRef = useRef(null);
  const fromRef = useRef({ fire: 0, food: 0 });

  useEffect(() => {
    fromRef.current = { fire: dispFire, food: dispFood };
    const start = performance.now();
    const from = { ...fromRef.current };
    function tick() {
      const t = Math.min(1, (performance.now() - start) / 1150);
      const e = 1 - Math.pow(1 - t, 3);
      setDispFire(Math.round(from.fire + (fireTarget - from.fire) * e));
      setDispFood(Math.round(from.food + (foodTarget - from.food) * e));
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fireTarget, foodTarget]);

  /* ── Risk ────────────────────────────────────────────────────── */
  const risk = (() => {
    const out = { fire: { lo: 0, hi: 0, liveLo: 0, liveHi: 0, open: 0 }, food: { lo: 0, hi: 0, liveLo: 0, liveHi: 0, open: 0 } };
    active.forEach((k) => {
      ['fire', 'food'].forEach((p) => {
        const ct = p === 'fire' ? fireCounted : foodCounted;
        let pr = 0;
        cat.forEach((r) => { if (r.counts && r.p === p && kState[k.key]?.[r.c]) pr++; });
        const open = ct - pr;
        const frac = ct > 0 ? open / ct : 0;
        out[p].lo += k.base[p][0]; out[p].hi += k.base[p][1];
        out[p].liveLo += k.base[p][0] * frac; out[p].liveHi += k.base[p][1] * frac;
        out[p].open += open;
      });
    });
    return out;
  })();

  const fireClosed = risk.fire.open === 0;

  /* ── Derived text ────────────────────────────────────────────── */
  const todayLabel = 'Today \u00b7 ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const kw = loc === 'all' ? 'Pacific Restaurant Group' : active[0]?.name || '';
  const open = total - proven;
  const chipOn = (req) => active.every((k) => kState[k.key]?.[req]);
  const fireAllCurrent = counts.fire[0] === counts.fire[1];
  const foodAllCurrent = counts.food[0] === counts.food[1];
  const perKitchen = fireCounted + foodCounted;
  const reqContext = loc === 'all'
    ? `${perKitchen} per kitchen \u00d7 ${word(active.length)} kitchens \u00b7 fire ${counts.fire[1]} + food ${counts.food[1]}`
    : `${perKitchen} at ${active[0]?.name} \u00b7 fire ${counts.fire[1]} + food ${counts.food[1]}`;
  const temps = active.flatMap((k) => k.temps.map((t) => ({ ...t, kitchen: k.name })));
  const sensLabel = active.length > 1
    ? `${active.length} kitchens \u00b7 sensors and staff entries, both logged in EvidLY`
    : 'Sensors and staff entries \u00b7 both logged in EvidLY';

  const toggleReq = useCallback((code) => {
    setKState((prev) => {
      const next = {};
      KITCHENS.forEach((k) => { next[k.key] = { ...prev[k.key] }; });
      if (loc === 'all') {
        const newVal = !prev[KITCHENS[0].key]?.[code];
        KITCHENS.forEach((k) => { next[k.key][code] = newVal; });
      } else {
        next[loc][code] = !prev[loc]?.[code];
      }
      return next;
    });
  }, [loc]);

  const vendorNotCounting = vendorRecords.filter(r => !r.counts).length;

  /* ── Loading ────────────────────────────────────────────────── */
  if (!catalogReady || (cat.length > 0 && !kReady)) {
    return (
      <div style={{ padding: embedded ? '40px 28px' : '40px', textAlign: 'center', color: '#6E675A', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        Loading requirements\u2026
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", color: '#1C2A3A', position: 'relative' }}>
      <style>{CSS}</style>

      {/* ══════ DESKTOP LAYOUT (≥640 px) ══════ */}
      <div className="hidden sm:block" style={{ padding: embedded ? '0 28px 30px' : '34px 40px 90px' }}>

      {/* HERO */}
      <div className="ev-hero">
        <div className="ev-hero-l">
          <div className="ev-eyebrow">{todayLabel}</div>
          <h1 className="ev-h1">
            {kw} <span className="ev-sep">{'\u00b7'}</span>{' '}
            {open === 0
              ? `all ${total} compliance records current.`
              : `${proven} of ${total} compliance records on file.`}
          </h1>
          <p className="ev-sub">
            {open === 0
              ? <>Every requirement has a current record. EvidLY is tracking <b>{total}</b>{loc === 'all' ? ` across ${word(active.length)} kitchens.` : ` at ${active[0]?.name}.`}</>
              : <>EvidLY is tracking <b>{total} requirements</b>{loc === 'all' ? ` across ${word(active.length)} kitchens.` : ` at ${active[0]?.name}.`}</>}
          </p>
        </div>

        <div className="ev-rings-w">
          <div className="ev-rings-h">
            Compliance Status
            <span className="ev-qmark">?</span>
            <span className="ev-tip">{reqContext}</span>
          </div>
          <div className="ev-rings">
            {/* Fire ring */}
            <div className="ev-ring-w">
              <div className="ev-ring">
                <svg width="124" height="124" viewBox="0 0 124 124">
                  <circle className="ev-halo" cx="62" cy="62" r={R} fill="none" stroke="#B24A2E" strokeWidth="16" opacity="0" style={{ filter: 'blur(9px)' }} />
                  <circle cx="62" cy="62" r={R} fill="none" stroke="#E4DBC8" strokeWidth="7" />
                  <circle className="ev-arc" cx="62" cy="62" r={R} fill="none" stroke="#B24A2E" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - firePct)} />
                </svg>
                <div className="ev-in">
                  <span className="ev-pct">{dispFire}%</span>
                  <span className="ev-of">{counts.fire[0]} of {counts.fire[1]}</span>
                </div>
              </div>
              <div className="ev-ring-meta">
                <span className="ev-ring-name">Fire</span>
                <span className={`ev-ring-state ${fireReady ? 'ready' : 'notready'}`}>
                  <span className="ev-d" />{fireReady ? 'Ready' : 'Not ready'}
                </span>
              </div>
            </div>

            {/* Food ring */}
            <div className="ev-ring-w">
              <div className="ev-ring">
                <svg width="124" height="124" viewBox="0 0 124 124">
                  <circle className="ev-halo" cx="62" cy="62" r={R} fill="none" stroke="#3E6B8A" strokeWidth="16" opacity="0" style={{ filter: 'blur(9px)' }} />
                  <circle cx="62" cy="62" r={R} fill="none" stroke="#E4DBC8" strokeWidth="7" />
                  <circle className="ev-arc" cx="62" cy="62" r={R} fill="none" stroke="#3E6B8A" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - foodPct)} />
                </svg>
                <div className="ev-in">
                  <span className="ev-pct">{dispFood}%</span>
                  <span className="ev-of">{counts.food[0]} of {counts.food[1]}</span>
                </div>
              </div>
              <div className="ev-ring-meta">
                <span className="ev-ring-name">Food</span>
                <span className={`ev-ring-state ${foodReady ? 'ready' : 'notready'}`}>
                  <span className="ev-d" />{foodReady ? 'Ready' : 'Not ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WATCHING */}
      <div className="ev-watch">
        <EyeIcon />
        <span className="ev-watch-t">EvidLY is watching <span>{'\u00b7'} real-time alerts routed automatically</span></span>
        <span className="ev-watch-r"><TrendIcon /> Active monitoring</span>
      </div>

      {/* ALERTS */}
      <div className="ev-sh">
        <h2>Alerts</h2>
        <span className="ev-r">
          <span className="ev-cnt" style={{ color: '#646D7A' }}>None yet</span>
          <span className="ev-auto">Routed automatically</span>
        </span>
      </div>
      <div className="ev-alert">
        <span className="ev-alert-ic"><CheckIcon /></span>
        <span className="ev-alert-m">
          <span className="ev-alert-t">No alerts yet</span>
          <span className="ev-alert-s">Alerts start once records are on file {'\u2014'} EvidLY raises one the moment a requirement is about to lapse.</span>
        </span>
        <span className="ev-chip na"><span className="ev-d" />None yet</span>
      </div>

      {/* FOUR PEOPLE WHO CAN ASK */}
      <div className="ev-sh">
        <h2>Four People Who Can Ask</h2>
        <span className="ev-pill">Each asks for a different part, on a different schedule</span>
      </div>
      <div className="ev-askers">
        <article className="ev-ask ev-ask-adj">
          <div className="ev-ask-w">The Insurance Broker</div>
          <div className="ev-ask-when">At renewal {'\u00b7'} and whenever underwriting asks</div>
          <p className="ev-ask-p">Proof that the fire systems named in your policy are being maintained {'\u2014'} often a <b>Protective Safeguards Endorsement</b>. Underwriting asks at renewal, and a broker who cannot produce it is quoting you blind.</p>
          <div className="ev-ask-tail">And the <b>adjuster only if it goes wrong</b> {'\u2014'} after a loss the same records decide whether the claim is paid, and whatever is missing becomes the argument.</div>
        </article>
        <article className="ev-ask">
          <div className="ev-ask-w">The Property Manager</div>
          <div className="ev-ask-when">Day to day {'\u00b7'} and every renewal</div>
          <p className="ev-ask-p">A certificate naming them as additional insured, and proof of the maintenance the lease covenants {'\u2014'} <b>your hood cleaning is a standard one</b>. Grease trap service if the building has an interceptor.</p>
          <div className="ev-ask-tail">The one who asks most often, and the lease is usually <b>where the insurance and fire clauses come from in the first place</b>.</div>
        </article>
        <article className="ev-ask ev-ask-fire">
          <div className="ev-ask-w">The Fire Marshal</div>
          <div className="ev-ask-when">On inspection {'\u00b7'} by schedule</div>
          <p className="ev-ask-p">Hood cleaning record, suppression and sprinkler inspections, alarm test, extinguisher tags {'\u2014'} <b>five systems, five separate service records</b>, whether one company services them or five do.</p>
        </article>
        <article className="ev-ask ev-ask-food">
          <div className="ev-ask-w">The Health Inspector</div>
          <div className="ev-ask-when">Unannounced {'\u00b7'} during service</div>
          <p className="ev-ask-p">Permit, handler cards, manager certificate, pest reports, and the temperature logs <b>for the days they choose</b>. Acts on what{'\u2019'}s shown that day.</p>
        </article>
      </div>

      {/* WHAT SOMEONE CAN ASK FOR */}
      <div className="ev-sh"><h2>What Someone Can Ask For</h2></div>
      <div className="ev-pillars">
        {/* Fire */}
        <div className="ev-pcard">
          <div className="ev-pc-head">
            <span className="ev-pc-ic" style={{ background: '#F6E9E3' }}><FireIcon /></span>
            <span className="ev-pc-id">
              <span className="ev-pc-n">Fire Safety</span>
              <span className="ev-pc-c">California Fire Code</span>
            </span>
            <span className={`ev-pc-pill ${fireAllCurrent ? 'ok' : 'act'}`}>
              <span className="ev-d" />{fireAllCurrent ? 'On Track' : 'Action Needed'}
            </span>
          </div>
          {nfpaChips.length > 0 && (
            <div className="ev-coderow">
              <span className="ev-codes">
                {nfpaChips.map((ch) => (
                  <span key={ch.req} className={`ev-chip ${chipOn(ch.req) ? 'ok' : 'no'}`}>
                    <span className="ev-d" />{ch.label}
                  </span>
                ))}
              </span>
            </div>
          )}
          <div className="ev-pc-cols">
            <div className="ev-pcol">
              <div className="ev-pcol-k"><CalIcon /> Upcoming <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_UPCOMING}</span></div>
              <div className="ev-pcol-body"><div className="ev-pcol-v">Nothing due in the next 30 days.</div></div>
            </div>
            <div className="ev-pcol hot">
              <div className="ev-pcol-k"><WarnIcon /> Action Needed <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_ACTION}</span></div>
              <div className="ev-pcol-body"><div className="ev-pcol-v">Nothing needs action.</div></div>
            </div>
            <div className="ev-pcol">
              <div className="ev-pcol-k"><DocIcon /> Prove <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_PROVE}</span></div>
              <div className="ev-pcol-body">
                <div className="ev-pcol-n">{counts.fire[0]} <em>of {counts.fire[1]} required</em></div>
                <div className="ev-pcol-bar"><i style={{ width: `${counts.fire[1] ? (counts.fire[0] / counts.fire[1]) * 100 : 0}%`, background: '#B24A2E' }} /></div>
                <div className="ev-pcol-sub">{counts.fire[1] - counts.fire[0]} pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Food */}
        <div className="ev-pcard">
          <div className="ev-pc-head">
            <span className="ev-pc-ic" style={{ background: '#E2ECF2' }}><FoodIcon /></span>
            <span className="ev-pc-id">
              <span className="ev-pc-n">Food Safety</span>
              <span className="ev-pc-c">California Retail Food Code</span>
            </span>
            <span className={`ev-pc-pill ${foodAllCurrent ? 'ok' : 'act'}`}>
              <span className="ev-d" />{foodAllCurrent ? 'On Track' : 'Action Needed'}
            </span>
          </div>
          <div className="ev-pc-cols">
            <div className="ev-pcol">
              <div className="ev-pcol-k"><CalIcon /> Upcoming <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_UPCOMING}</span></div>
              <div className="ev-pcol-body"><div className="ev-pcol-v">Nothing due in the next 30 days.</div></div>
            </div>
            <div className="ev-pcol hot">
              <div className="ev-pcol-k"><WarnIcon /> Action Needed <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_ACTION}</span></div>
              <div className="ev-pcol-body"><div className="ev-pcol-v">Nothing needs action.</div></div>
            </div>
            <div className="ev-pcol">
              <div className="ev-pcol-k"><DocIcon /> Prove <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_PROVE}</span></div>
              <div className="ev-pcol-body">
                <div className="ev-pcol-n">{counts.food[0]} <em>of {counts.food[1]} required</em></div>
                <div className="ev-pcol-bar"><i style={{ width: `${counts.food[1] ? (counts.food[0] / counts.food[1]) * 100 : 0}%`, background: '#3E6B8A' }} /></div>
                <div className="ev-pcol-sub">{counts.food[1] - counts.food[0]} pending</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GATE CTA */}
      {gateToken && (
        <div className="ev-gobar">
          <span className="ev-gobar-t">This is the sample. <b>Your record is ready to view.</b></span>
          <a className="ev-gobar-c" href={`/gate/${gateToken}`}>See what{'\u2019'}s on file {'\u2192'}</a>
          <span className="ev-gobar-s">View-only {'\u00b7'} no account</span>
        </div>
      )}

      {/* WHAT'S AT RISK */}
      <div className="ev-sh">
        <h2>What{'\u2019'}s at Risk</h2>
        <span className="ev-r"><span className="ev-auto">Casual dining</span></span>
      </div>
      <div className="ev-risk">
        <div className="ev-risk-top">
          <span className="ev-risk-h">Based on your restaurant type</span>
          <span className="ev-risk-n">{proven} of {total} requirements proven</span>
        </div>
        <div className="ev-risk-line">
          <div className="ev-risk-l1"><span>Fire safety</span><span className="ev-risk-amt">{range(risk.fire.lo, risk.fire.hi)}<span className="ev-yr">/yr</span></span></div>
          <div className="ev-risk-l2">
            <span className="lo">{risk.fire.open > 0 ? `${range(risk.fire.liveLo, risk.fire.liveHi)} still exposed \u00b7 ${risk.fire.open} not on file` : '$0 exposed \u00b7 all current'}</span>
            <span className="hi">{(() => { const cl = risk.fire.lo - risk.fire.liveLo, ch = risk.fire.hi - risk.fire.liveHi; return ch > 0 ? `\u2193${range(cl, ch)} removed by your records` : ''; })()}</span>
          </div>
        </div>
        <div className="ev-risk-line">
          <div className="ev-risk-l1"><span>Food safety</span><span className="ev-risk-amt">{range(risk.food.lo, risk.food.hi)}<span className="ev-yr">/yr</span></span></div>
          <div className="ev-risk-l2">
            <span className="lo">{risk.food.open > 0 ? `${range(risk.food.liveLo, risk.food.liveHi)} still exposed \u00b7 ${risk.food.open} not on file` : '$0 exposed \u00b7 all current'}</span>
            <span className="hi">{(() => { const cl = risk.food.lo - risk.food.liveLo, ch = risk.food.hi - risk.food.liveHi; return ch > 0 ? `\u2193${range(cl, ch)} removed by your records` : ''; })()}</span>
          </div>
        </div>
        <div className="ev-risk-total">
          <span>Total at risk</span>
          <span className="ev-risk-tamt">{range(risk.fire.lo + risk.food.lo, risk.fire.hi + risk.food.hi)}<span className="ev-yr">/yr</span></span>
        </div>
        <div className="ev-ceil" style={{ background: fireClosed ? '#E3ECE1' : '#F6E3DF', border: `1px solid ${fireClosed ? '#BDD3C1' : '#E5B9B2'}` }}>
          <div className="ev-ceil-k" style={{ color: fireClosed ? '#3E5E4B' : '#8E332B', marginBottom: fireClosed ? 0 : 11 }}>
            {fireClosed ? 'Closed' : 'If things go wrong once'}
          </div>
          {!fireClosed && (
            <div className="ev-ceil-r" style={{ color: '#8E332B' }}>
              <span>A fire your insurance won{'\u2019'}t cover</span>
              <span className="ev-ceil-a">$150k{'\u2013'}$500k+</span>
            </div>
          )}
          <div className="ev-ceil-n" style={{ color: fireClosed ? '#3E5E4B' : '#8E332B', marginTop: fireClosed ? 0 : 7 }}>
            {fireClosed
              ? 'Every safeguard your policy names has a current, sealed record. This ground for denial is closed.'
              : `${risk.fire.open === 1 ? "One safeguard your policy names doesn\u2019t have a current record" : `${risk.fire.open} safeguards your policy names don\u2019t have a current record`} ${loc === 'all' ? 'across your kitchens' : 'at this kitchen'} \u2014 so this stands in full. ${counts.fire[0]} of ${counts.fire[1]} earns nothing.`}
          </div>
        </div>
        <div className="ev-risk-fine" style={{ marginBottom: 0 }}>Illustrative figures, conservative basis. {'\u201c'}If things go wrong once{'\u201d'} is a one-time ceiling {'\u2014'} not a yearly cost. EvidLY reads and identifies what your policy requires. It does not determine coverage.</div>
        <button className="ev-breakdown" onClick={() => setRiskOpen(true)}>See the breakdown {'\u2192'}</button>
      </div>

      {/* EXPLORE */}
      <div className="ev-explore">
        <div className={`ev-ex-head ${exploreOpen ? 'open' : ''}`} onClick={() => setExploreOpen(!exploreOpen)}>
          <span className="ev-ex-k">Explore</span>
          <span className="ev-ex-n">what-if {'\u00b7'} doesn{'\u2019'}t change your account</span>
          <span className="ev-ex-chev">{'\u25be'}</span>
        </div>
        <div className={`ev-ex-body ${exploreOpen ? 'open' : ''}`}>
          <p className="ev-ex-p">Turn on a requirement to see exactly how it moves your readiness and lowers your risk. Each one you turn on shows the real step to make it true {'\u2014'} EvidLY walks you through every one.</p>
          <div className="ev-ex-grid">
            <div className="ev-ex-h">Fire Safeguards</div>
            {fireItems.map((r) => {
              const on = chipOn(r.c);
              return (
                <label key={r.c} className="ev-ex-row">
                  <input type="checkbox" checked={on} onChange={() => toggleReq(r.c)} />
                  <span className="ev-ex-nm">{r.n}</span>
                  {r.cond && <span className="ev-ex-cond">not applicable</span>}
                  <span className={`ev-ex-st ${on ? 'file' : 'act'}`}>{on ? '\u2713 on file' : `${ACTION_LABEL[r.act] || 'Add record'} \u2192`}</span>
                </label>
              );
            })}
            <div className="ev-ex-h">Food Safety</div>
            {(() => {
              let tempShown = false;
              return foodItems.map((r) => {
                const on = chipOn(r.c);
                const showTempSub = r.g === 'Temperature Logs' && !tempShown;
                if (showTempSub) tempShown = true;
                return (
                  <React.Fragment key={r.c}>
                    {showTempSub && <div className="ev-ex-sub">Temperature Logs</div>}
                    <label className="ev-ex-row">
                      <input type="checkbox" checked={on} onChange={() => toggleReq(r.c)} />
                      <span className="ev-ex-nm">{r.n}</span>
                      {r.cond && <span className="ev-ex-cond">not applicable</span>}
                      <span className={`ev-ex-st ${on ? 'file' : 'act'}`}>{on ? '\u2713 on file' : `${ACTION_LABEL[r.act] || 'Add record'} \u2192`}</span>
                    </label>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* WHAT'S MEASURED */}
      <div className="ev-sh">
        <h2>What{'\u2019'}s Measured</h2>
        <span className="ev-r"><span className="ev-auto">{sensLabel}</span></span>
      </div>
      <div className="ev-sens">
        {temps.map((t, i) => {
          const warm = t.st !== 'In range';
          return (
            <div key={i} className="ev-sens-c">
              <div className="ev-sens-cat">{t.cat}</div>
              <div className="ev-sens-row">
                <div><div className="ev-sens-nm">{t.nm}</div><div className="ev-sens-loc">{t.kitchen}</div></div>
                <div className="ev-sens-v">{t.v}</div>
              </div>
              <div className="ev-sens-b">
                <span className="ev-sens-src" style={t.src !== 'Sensor' ? { color: '#3E6B8A' } : undefined}>
                  <span className="ev-d" />{t.src}
                </span>
                <span className="ev-sens-st" style={warm ? { background: '#F7EDD3', color: '#B24A2E' } : undefined}>{t.st}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BUSINESS RECORDS — KITCHEN AND VENDOR */}
      <div className="ev-sh"><h2>Business Records {'\u2014'} Kitchen and Vendor</h2></div>
      <div className="ev-recs">
        <div className="ev-rcard">
          <div className="ev-rc-head">
            <span className="ev-pc-ic" style={{ background: '#F1ECE0' }}><BldgIcon /></span>
            <span className="ev-rc-id">
              <span className="ev-rc-n">Kitchen Business Records</span>
              <span className="ev-rc-c">Per organization {'\u00b7'} not per kitchen</span>
            </span>
            <span className="ev-rc-count">0 <em>of {bizCounting}</em></span>
          </div>
          <div className="ev-rlist">
            {bizRecords.map((r) => (
              <div key={r.c} className="ev-rrow">
                <span className={`ev-rdot ${r.counts ? 'no' : 'na'}`} />
                <span className="ev-rname">{r.n}</span>
                {!r.counts && <span className="ev-rtag">Not applicable</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="ev-rcard">
          <div className="ev-rc-head">
            <span className="ev-pc-ic" style={{ background: '#F1ECE0' }}><TruckIcon /></span>
            <span className="ev-rc-id">
              <span className="ev-rc-n">Vendor Business Records</span>
              <span className="ev-rc-c">{vendorCounting} required per vendor {'\u00b7'} {vendorNotCounting} not applicable</span>
            </span>
            <span className="ev-rc-count">0 <em>of {vendorCounting}</em></span>
          </div>
          <div className="ev-rlist">
            <div className="ev-vnote">No vendors identified yet. Each vendor who works in your kitchen carries its own set {'\u2014'} an uninsured or unlicensed vendor is your liability, not theirs.</div>
            {vendorRecords.map((r) => (
              <div key={r.c} className="ev-rrow">
                <span className="ev-rdot na" />
                <span className="ev-rname">{r.n}</span>
                {!r.counts && <span className="ev-rtag">Not applicable</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      </div>{/* end DESKTOP LAYOUT */}

      {/* ══════ MOBILE LAYOUT (<640 px) ══════ */}
      <div className="sm:hidden">
        {/* ── Navy hero ── */}
        <div className="ev-hero-navy">
          <a href="https://getevidly.com" className="ev-hero-back"
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.45)')}>
            &larr; Back
          </a>
          <div className="ev-hero-brand">
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '-0.01em' }}>
              <span style={{ color: '#B24A2E' }}>E</span>
              <span style={{ color: 'white' }}>vid</span>
              <span style={{ color: '#B24A2E' }}>LY</span>
            </span>
          </div>

          <button className={`ev-hero-org${loc === 'all' ? ' active' : ''}`} onClick={() => setLoc('all')}>
            Pacific Restaurant Group
          </button>
          <div className="ev-hero-sub">Sample dashboard {'\u00b7'} {word(active.length)} kitchen{active.length !== 1 ? 's' : ''}</div>

          <div className="ev-pill-row">
            {LOC_TABS.filter(([id]) => id !== 'all').map(([id, label]) => (
              <button key={id} className={`ev-kpill${loc === id ? ' on' : ''}`} onClick={() => setLoc(id)}>
                {label}
              </button>
            ))}
          </div>

          <div className="ev-rings-w">
            <div className="ev-rings-h">
              Compliance status
              <span className="ev-qmark">?</span>
              <span className="ev-tip">{reqContext}</span>
            </div>
            <div className="ev-rings">
              {/* Fire ring */}
              <div className="ev-ring-w">
                <div className="ev-ring">
                  <svg width="124" height="124" viewBox="0 0 124 124">
                    <circle className="ev-halo" cx="62" cy="62" r={R} fill="none" stroke="#B24A2E" strokeWidth="16" opacity="0" style={{ filter: 'blur(9px)' }} />
                    <circle cx="62" cy="62" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
                    <circle className="ev-arc" cx="62" cy="62" r={R} fill="none" stroke="#B24A2E" strokeWidth="7"
                      strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - firePct)} />
                  </svg>
                  <div className="ev-in">
                    <span className="ev-pct">{dispFire}%</span>
                    <span className="ev-of">{counts.fire[0]} of {counts.fire[1]}</span>
                  </div>
                </div>
                <div className="ev-ring-meta">
                  <span className="ev-ring-name">Fire</span>
                  <span className={`ev-ring-state ${fireReady ? 'ready' : 'notready'}`}>
                    <span className="ev-d" />{fireReady ? 'Ready' : 'Not ready'}
                  </span>
                </div>
              </div>
              {/* Food ring */}
              <div className="ev-ring-w">
                <div className="ev-ring">
                  <svg width="124" height="124" viewBox="0 0 124 124">
                    <circle className="ev-halo" cx="62" cy="62" r={R} fill="none" stroke="#3E6B8A" strokeWidth="16" opacity="0" style={{ filter: 'blur(9px)' }} />
                    <circle cx="62" cy="62" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
                    <circle className="ev-arc" cx="62" cy="62" r={R} fill="none" stroke="#3E6B8A" strokeWidth="7"
                      strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - foodPct)} />
                  </svg>
                  <div className="ev-in">
                    <span className="ev-pct">{dispFood}%</span>
                    <span className="ev-of">{counts.food[0]} of {counts.food[1]}</span>
                  </div>
                </div>
                <div className="ev-ring-meta">
                  <span className="ev-ring-name">Food</span>
                  <span className={`ev-ring-state ${foodReady ? 'ready' : 'notready'}`}>
                    <span className="ev-d" />{foodReady ? 'Ready' : 'Not ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="ev-hero-risk">
            <b>{range(risk.fire.lo + risk.food.lo, risk.fire.hi + risk.food.hi)}</b>/yr at risk
          </div>

        </div>

        {/* ── Collapsible cards ── */}
        <div className="ev-cards">
          {/* Card 1: Who can ask */}
          <details className="ev-card">
            <summary>
              <span className="ev-card-title">Who can ask</span>
              <span className="ev-card-meta">4 people, each on a different schedule</span>
              <span className="ev-card-chev">{'\u25be'}</span>
            </summary>
            <div className="ev-card-body">
              <div className="ev-askers">
                <article className="ev-ask ev-ask-adj">
                  <div className="ev-ask-w">The Insurance Broker</div>
                  <div className="ev-ask-when">At renewal {'\u00b7'} and whenever underwriting asks</div>
                  <p className="ev-ask-p">Proof that the fire systems named in your policy are being maintained {'\u2014'} often a <b>Protective Safeguards Endorsement</b>. Underwriting asks at renewal, and a broker who cannot produce it is quoting you blind.</p>
                  <div className="ev-ask-tail">And the <b>adjuster only if it goes wrong</b> {'\u2014'} after a loss the same records decide whether the claim is paid, and whatever is missing becomes the argument.</div>
                </article>
                <article className="ev-ask">
                  <div className="ev-ask-w">The Property Manager</div>
                  <div className="ev-ask-when">Day to day {'\u00b7'} and every renewal</div>
                  <p className="ev-ask-p">A certificate naming them as additional insured, and proof of the maintenance the lease covenants {'\u2014'} <b>your hood cleaning is a standard one</b>. Grease trap service if the building has an interceptor.</p>
                  <div className="ev-ask-tail">The one who asks most often, and the lease is usually <b>where the insurance and fire clauses come from in the first place</b>.</div>
                </article>
                <article className="ev-ask ev-ask-fire">
                  <div className="ev-ask-w">The Fire Marshal</div>
                  <div className="ev-ask-when">On inspection {'\u00b7'} by schedule</div>
                  <p className="ev-ask-p">Hood cleaning record, suppression and sprinkler inspections, alarm test, extinguisher tags {'\u2014'} <b>five systems, five separate service records</b>, whether one company services them or five do.</p>
                </article>
                <article className="ev-ask ev-ask-food">
                  <div className="ev-ask-w">The Health Inspector</div>
                  <div className="ev-ask-when">Unannounced {'\u00b7'} during service</div>
                  <p className="ev-ask-p">Permit, handler cards, manager certificate, pest reports, and the temperature logs <b>for the days they choose</b>. Acts on what{'\u2019'}s shown that day.</p>
                </article>
              </div>
            </div>
          </details>

          {/* Card 2: What's required */}
          <details className="ev-card">
            <summary>
              <span className="ev-card-title">What{'\u2019'}s required</span>
              <span className="ev-card-meta">{proven} of {total} on file</span>
              <span className="ev-card-chev">{'\u25be'}</span>
            </summary>
            <div className="ev-card-body">
              <div className="ev-pillars">
                <div className="ev-pcard">
                  <div className="ev-pc-head">
                    <span className="ev-pc-ic" style={{ background: '#F6E9E3' }}><FireIcon /></span>
                    <span className="ev-pc-id">
                      <span className="ev-pc-n">Fire Safety</span>
                      <span className="ev-pc-c">California Fire Code</span>
                    </span>
                    <span className={`ev-pc-pill ${fireAllCurrent ? 'ok' : 'act'}`}>
                      <span className="ev-d" />{fireAllCurrent ? 'On Track' : 'Action Needed'}
                    </span>
                  </div>
                  {nfpaChips.length > 0 && (
                    <div className="ev-coderow">
                      <span className="ev-codes">
                        {nfpaChips.map((ch) => (
                          <span key={ch.req} className={`ev-chip ${chipOn(ch.req) ? 'ok' : 'no'}`}>
                            <span className="ev-d" />{ch.label}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                  <div className="ev-pc-cols">
                    <div className="ev-pcol">
                      <div className="ev-pcol-k"><CalIcon /> Upcoming <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_UPCOMING}</span></div>
                      <div className="ev-pcol-body"><div className="ev-pcol-v">Nothing due in the next 30 days.</div></div>
                    </div>
                    <div className="ev-pcol hot">
                      <div className="ev-pcol-k"><WarnIcon /> Action Needed <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_ACTION}</span></div>
                      <div className="ev-pcol-body"><div className="ev-pcol-v">Nothing needs action.</div></div>
                    </div>
                    <div className="ev-pcol">
                      <div className="ev-pcol-k"><DocIcon /> Prove <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_PROVE}</span></div>
                      <div className="ev-pcol-body">
                        <div className="ev-pcol-n">{counts.fire[0]} <em>of {counts.fire[1]} required</em></div>
                        <div className="ev-pcol-bar"><i style={{ width: `${counts.fire[1] ? (counts.fire[0] / counts.fire[1]) * 100 : 0}%`, background: '#B24A2E' }} /></div>
                        <div className="ev-pcol-sub">{counts.fire[1] - counts.fire[0]} pending</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ev-pcard">
                  <div className="ev-pc-head">
                    <span className="ev-pc-ic" style={{ background: '#E2ECF2' }}><FoodIcon /></span>
                    <span className="ev-pc-id">
                      <span className="ev-pc-n">Food Safety</span>
                      <span className="ev-pc-c">California Retail Food Code</span>
                    </span>
                    <span className={`ev-pc-pill ${foodAllCurrent ? 'ok' : 'act'}`}>
                      <span className="ev-d" />{foodAllCurrent ? 'On Track' : 'Action Needed'}
                    </span>
                  </div>
                  <div className="ev-pc-cols">
                    <div className="ev-pcol">
                      <div className="ev-pcol-k"><CalIcon /> Upcoming <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_UPCOMING}</span></div>
                      <div className="ev-pcol-body"><div className="ev-pcol-v">Nothing due in the next 30 days.</div></div>
                    </div>
                    <div className="ev-pcol hot">
                      <div className="ev-pcol-k"><WarnIcon /> Action Needed <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_ACTION}</span></div>
                      <div className="ev-pcol-body"><div className="ev-pcol-v">Nothing needs action.</div></div>
                    </div>
                    <div className="ev-pcol">
                      <div className="ev-pcol-k"><DocIcon /> Prove <span className="ev-qmark">?</span><span className="ev-pcol-tip">{TIP_PROVE}</span></div>
                      <div className="ev-pcol-body">
                        <div className="ev-pcol-n">{counts.food[0]} <em>of {counts.food[1]} required</em></div>
                        <div className="ev-pcol-bar"><i style={{ width: `${counts.food[1] ? (counts.food[0] / counts.food[1]) * 100 : 0}%`, background: '#3E6B8A' }} /></div>
                        <div className="ev-pcol-sub">{counts.food[1] - counts.food[0]} pending</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explore what-if */}
              <div className="ev-explore">
                <div className={`ev-ex-head ${exploreOpen ? 'open' : ''}`} onClick={() => setExploreOpen(!exploreOpen)}>
                  <span className="ev-ex-k">Explore</span>
                  <span className="ev-ex-n">what-if {'\u00b7'} doesn{'\u2019'}t change your account</span>
                  <span className="ev-ex-chev">{'\u25be'}</span>
                </div>
                <div className={`ev-ex-body ${exploreOpen ? 'open' : ''}`}>
                  <p className="ev-ex-p">Turn on a requirement to see exactly how it moves your readiness and lowers your risk. Each one you turn on shows the real step to make it true {'\u2014'} EvidLY walks you through every one.</p>
                  <div className="ev-ex-grid">
                    <div className="ev-ex-h">Fire Safeguards</div>
                    {fireItems.map((r) => {
                      const on = chipOn(r.c);
                      return (
                        <label key={r.c} className="ev-ex-row">
                          <input type="checkbox" checked={on} onChange={() => toggleReq(r.c)} />
                          <span className="ev-ex-nm">{r.n}</span>
                          {r.cond && <span className="ev-ex-cond">not applicable</span>}
                          <span className={`ev-ex-st ${on ? 'file' : 'act'}`}>{on ? '\u2713 on file' : `${ACTION_LABEL[r.act] || 'Add record'} \u2192`}</span>
                        </label>
                      );
                    })}
                    <div className="ev-ex-h">Food Safety</div>
                    {(() => {
                      let tempShown = false;
                      return foodItems.map((r) => {
                        const on = chipOn(r.c);
                        const showTempSub = r.g === 'Temperature Logs' && !tempShown;
                        if (showTempSub) tempShown = true;
                        return (
                          <React.Fragment key={r.c}>
                            {showTempSub && <div className="ev-ex-sub">Temperature Logs</div>}
                            <label className="ev-ex-row">
                              <input type="checkbox" checked={on} onChange={() => toggleReq(r.c)} />
                              <span className="ev-ex-nm">{r.n}</span>
                              {r.cond && <span className="ev-ex-cond">not applicable</span>}
                              <span className={`ev-ex-st ${on ? 'file' : 'act'}`}>{on ? '\u2713 on file' : `${ACTION_LABEL[r.act] || 'Add record'} \u2192`}</span>
                            </label>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </details>

          {/* Card 3: What's at risk */}
          <details className="ev-card">
            <summary>
              <span className="ev-card-title">What{'\u2019'}s at risk</span>
              <span className="ev-card-meta">{range(risk.fire.lo + risk.food.lo, risk.fire.hi + risk.food.hi)}/yr</span>
              <span className="ev-card-chev">{'\u25be'}</span>
            </summary>
            <div className="ev-card-body">
              <div className="ev-risk">
                <div className="ev-risk-top">
                  <span className="ev-risk-h">Based on your restaurant type</span>
                  <span className="ev-risk-n">{proven} of {total} requirements proven</span>
                </div>
                <div className="ev-risk-line">
                  <div className="ev-risk-l1"><span>Fire safety</span><span className="ev-risk-amt">{range(risk.fire.lo, risk.fire.hi)}<span className="ev-yr">/yr</span></span></div>
                  <div className="ev-risk-l2">
                    <span className="lo">{risk.fire.open > 0 ? `${range(risk.fire.liveLo, risk.fire.liveHi)} still exposed \u00b7 ${risk.fire.open} not on file` : '$0 exposed \u00b7 all current'}</span>
                    <span className="hi">{(() => { const cl = risk.fire.lo - risk.fire.liveLo, ch = risk.fire.hi - risk.fire.liveHi; return ch > 0 ? `\u2193${range(cl, ch)} removed by your records` : ''; })()}</span>
                  </div>
                </div>
                <div className="ev-risk-line">
                  <div className="ev-risk-l1"><span>Food safety</span><span className="ev-risk-amt">{range(risk.food.lo, risk.food.hi)}<span className="ev-yr">/yr</span></span></div>
                  <div className="ev-risk-l2">
                    <span className="lo">{risk.food.open > 0 ? `${range(risk.food.liveLo, risk.food.liveHi)} still exposed \u00b7 ${risk.food.open} not on file` : '$0 exposed \u00b7 all current'}</span>
                    <span className="hi">{(() => { const cl = risk.food.lo - risk.food.liveLo, ch = risk.food.hi - risk.food.liveHi; return ch > 0 ? `\u2193${range(cl, ch)} removed by your records` : ''; })()}</span>
                  </div>
                </div>
                <div className="ev-risk-total">
                  <span>Total at risk</span>
                  <span className="ev-risk-tamt">{range(risk.fire.lo + risk.food.lo, risk.fire.hi + risk.food.hi)}<span className="ev-yr">/yr</span></span>
                </div>
                <div className="ev-ceil" style={{ background: fireClosed ? '#E3ECE1' : '#F6E3DF', border: `1px solid ${fireClosed ? '#BDD3C1' : '#E5B9B2'}` }}>
                  <div className="ev-ceil-k" style={{ color: fireClosed ? '#3E5E4B' : '#8E332B', marginBottom: fireClosed ? 0 : 11 }}>
                    {fireClosed ? 'Closed' : 'If things go wrong once'}
                  </div>
                  {!fireClosed && (
                    <div className="ev-ceil-r" style={{ color: '#8E332B' }}>
                      <span>A fire your insurance won{'\u2019'}t cover</span>
                      <span className="ev-ceil-a">$150k{'\u2013'}$500k+</span>
                    </div>
                  )}
                  <div className="ev-ceil-n" style={{ color: fireClosed ? '#3E5E4B' : '#8E332B', marginTop: fireClosed ? 0 : 7 }}>
                    {fireClosed
                      ? 'Every safeguard your policy names has a current, sealed record. This ground for denial is closed.'
                      : `${risk.fire.open === 1 ? "One safeguard your policy names doesn\u2019t have a current record" : `${risk.fire.open} safeguards your policy names don\u2019t have a current record`} ${loc === 'all' ? 'across your kitchens' : 'at this kitchen'} \u2014 so this stands in full. ${counts.fire[0]} of ${counts.fire[1]} earns nothing.`}
                  </div>
                </div>
                <div className="ev-risk-fine" style={{ marginBottom: 0 }}>Illustrative figures, conservative basis. {'\u201c'}If things go wrong once{'\u201d'} is a one-time ceiling {'\u2014'} not a yearly cost. EvidLY reads and identifies what your policy requires. It does not determine coverage.</div>
                <button className="ev-breakdown" onClick={() => setRiskOpen(true)}>See the breakdown {'\u2192'}</button>
              </div>
            </div>
          </details>

          {/* Card 4: What's measured */}
          <details className="ev-card">
            <summary>
              <span className="ev-card-title">What{'\u2019'}s measured</span>
              <span className="ev-card-meta">{temps.length} readings</span>
              <span className="ev-card-chev">{'\u25be'}</span>
            </summary>
            <div className="ev-card-body">
              <div className="ev-sens">
                {temps.map((t, i) => {
                  const warm = t.st !== 'In range';
                  return (
                    <div key={i} className="ev-sens-c">
                      <div className="ev-sens-cat">{t.cat}</div>
                      <div className="ev-sens-row">
                        <div><div className="ev-sens-nm">{t.nm}</div><div className="ev-sens-loc">{t.kitchen}</div></div>
                        <div className="ev-sens-v">{t.v}</div>
                      </div>
                      <div className="ev-sens-b">
                        <span className="ev-sens-src" style={t.src !== 'Sensor' ? { color: '#3E6B8A' } : undefined}>
                          <span className="ev-d" />{t.src}
                        </span>
                        <span className="ev-sens-st" style={warm ? { background: '#F7EDD3', color: '#B24A2E' } : undefined}>{t.st}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>

          {/* Card 5: Records on file */}
          <details className="ev-card">
            <summary>
              <span className="ev-card-title">Records on file</span>
              <span className="ev-card-meta">Kitchen + vendor</span>
              <span className="ev-card-chev">{'\u25be'}</span>
            </summary>
            <div className="ev-card-body">
              <div className="ev-recs">
                <div className="ev-rcard">
                  <div className="ev-rc-head">
                    <span className="ev-pc-ic" style={{ background: '#F1ECE0' }}><BldgIcon /></span>
                    <span className="ev-rc-id">
                      <span className="ev-rc-n">Kitchen Business Records</span>
                      <span className="ev-rc-c">Per organization {'\u00b7'} not per kitchen</span>
                    </span>
                    <span className="ev-rc-count">0 <em>of {bizCounting}</em></span>
                  </div>
                  <div className="ev-rlist">
                    {bizRecords.map((r) => (
                      <div key={r.c} className="ev-rrow">
                        <span className={`ev-rdot ${r.counts ? 'no' : 'na'}`} />
                        <span className="ev-rname">{r.n}</span>
                        {!r.counts && <span className="ev-rtag">Not applicable</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ev-rcard">
                  <div className="ev-rc-head">
                    <span className="ev-pc-ic" style={{ background: '#F1ECE0' }}><TruckIcon /></span>
                    <span className="ev-rc-id">
                      <span className="ev-rc-n">Vendor Business Records</span>
                      <span className="ev-rc-c">{vendorCounting} required per vendor {'\u00b7'} {vendorNotCounting} not applicable</span>
                    </span>
                    <span className="ev-rc-count">0 <em>of {vendorCounting}</em></span>
                  </div>
                  <div className="ev-rlist">
                    <div className="ev-vnote">No vendors identified yet. Each vendor who works in your kitchen carries its own set {'\u2014'} an uninsured or unlicensed vendor is your liability, not theirs.</div>
                    {vendorRecords.map((r) => (
                      <div key={r.c} className="ev-rrow">
                        <span className="ev-rdot na" />
                        <span className="ev-rname">{r.n}</span>
                        {!r.counts && <span className="ev-rtag">Not applicable</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>{/* end MOBILE LAYOUT */}

      {/* RISK DETAIL MODAL */}
      {riskOpen && (
        <div className="ev-modal-bg" onClick={() => setRiskOpen(false)}>
          <div className="ev-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ev-modal-hd">
              <div>
                <h2 style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 27, color: '#1C2A3A', margin: 0, letterSpacing: '-.02em' }}>What{'\u2019'}s at Risk</h2>
                <p style={{ fontSize: 14, color: '#5F6875', margin: '6px 0 0' }}>What{'\u2019'}s on the line behind the required work</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#3E5E4B', background: '#E3ECE1', padding: '5px 11px', borderRadius: 999 }}>Casual dining</div>
                  <div style={{ fontSize: 11, color: '#646D7A', marginTop: 5 }}>Based on your restaurant type</div>
                </div>
                <button className="ev-modal-x" onClick={() => setRiskOpen(false)}>{'\u00d7'}</button>
              </div>
            </div>
            <div className="ev-modal-bd">
              <div className="ev-modal-note">
                Illustrative figures, conservative basis. {'\u201c'}Worst case{'\u201d'} is a one-time ceiling if things go wrong {'\u2014'} not a yearly cost.
              </div>

              {/* Fire pillar */}
              <div className="ev-modal-pill">
                <div style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: 17, fontWeight: 700, color: '#1C2A3A' }}>Fire safety</div>
                <div style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: 34, fontWeight: 700, color: '#1C2A3A', lineHeight: 1, marginTop: 10 }}>{range(risk.fire.lo, risk.fire.hi)}</div>
                <div style={{ fontSize: 12, color: '#5F6875', marginTop: 4 }}>In a typical year</div>
                <div style={{ marginTop: 16, borderTop: '1px solid #F0EADC' }}>
                  {FIRE_LINES.map((ln) => (
                    <div key={ln.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 0', borderBottom: '1px solid #F5EFE2' }}>
                      <span style={{ fontSize: 13.5, color: '#4A5566' }}>
                        {ln.label}
                        {ln.ctx && <span style={{ color: '#6E675A', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}> {'\u00b7'} {ln.ctx}</span>}
                      </span>
                      <span style={{ fontSize: 13.5, color: '#1C2A3A', whiteSpace: 'nowrap' }}>{range(risk.fire.lo * ln.lo, risk.fire.hi * ln.hi)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                              background: fireClosed ? '#E3ECE1' : '#F4F1E8', border: `1px solid ${fireClosed ? '#BDD3C1' : '#E7E0D2'}` }}>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: fireClosed ? '#3E5E4B' : '#6E675A' }}>Worst case</div>
                    <div style={{ fontSize: 13, marginTop: 3, fontStyle: 'italic', color: fireClosed ? '#3E5E4B' : '#6E6656' }}>
                      {fireClosed ? 'Every safeguard your policy names has a current record. This ground for denial is closed.' : 'If a fire occurs while your named safeguards lack current records, an insurer can deny the entire claim.'}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: 22, fontWeight: 700, whiteSpace: 'nowrap', color: fireClosed ? '#3E5E4B' : '#1C2A3A' }}>
                    {fireClosed
                      ? <><span style={{ textDecoration: 'line-through', fontWeight: 400, color: '#9E3B32', opacity: 0.8 }}>$150k{'\u2013'}$500k+</span>&nbsp;&nbsp;Closed</>
                      : '$150k\u2013$500k+'}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#646D7A', marginTop: 14 }}>Covers: hood cleaning {'\u00b7'} suppression, alarm & sprinkler inspections</div>
              </div>

              {/* Food pillar */}
              <div className="ev-modal-pill">
                <div style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: 17, fontWeight: 700, color: '#1C2A3A' }}>Food safety</div>
                <div style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: 34, fontWeight: 700, color: '#1C2A3A', lineHeight: 1, marginTop: 10 }}>{range(risk.food.lo, risk.food.hi)}</div>
                <div style={{ fontSize: 12, color: '#5F6875', marginTop: 4 }}>In a typical year</div>
                <div style={{ marginTop: 16, borderTop: '1px solid #F0EADC' }}>
                  {FOOD_LINES.map((ln) => (
                    <div key={ln.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 0', borderBottom: '1px solid #F5EFE2' }}>
                      <span style={{ fontSize: 13.5, color: '#4A5566' }}>
                        {ln.label}
                        {ln.ctx && <span style={{ color: '#6E675A', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}> {'\u00b7'} {ln.ctx}</span>}
                      </span>
                      <span style={{ fontSize: 13.5, color: '#1C2A3A', whiteSpace: 'nowrap' }}>{range(risk.food.lo * ln.lo, risk.food.hi * ln.hi)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, borderRadius: 12, padding: '14px 16px', background: '#F4F1E8', border: '1px solid #E7E0D2' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6E675A' }}>Worst case</div>
                  <div style={{ fontSize: 13, marginTop: 3, fontStyle: 'italic', color: '#6E6656' }}>
                    Your records are your defense here. They don{'\u2019'}t take this off the table.
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#646D7A', marginTop: 14 }}>Covers: receiving, holding & cooling logs {'\u00b7'} certifications {'\u00b7'} HACCP</div>
              </div>

              {/* Total */}
              <div className="ev-modal-total">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#CFE3D7' }}>Total at risk</span>
                  <span style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{range(risk.fire.lo + risk.food.lo, risk.fire.hi + risk.food.hi)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#AEB6C2', marginTop: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Food safety ({range(risk.food.lo, risk.food.hi)}) + fire safety ({range(risk.fire.lo, risk.fire.hi)})
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.55, color: '#9AA6B4', marginTop: 14, borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 14 }}>
                  This is money at risk, added up. It{'\u2019'}s not a verdict on your kitchen, and it doesn{'\u2019'}t replace your county{'\u2019'}s inspection. Worst-case figures are shown separately for each area and aren{'\u2019'}t added together.
                </div>
              </div>

              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#6E675A' }}>
                Basis: USDA ERS {'\u00b7'} CDC NORS {'\u00b7'} Bartsch et al. (food) {'\u00b7'} NFPA / Campbell {'\u00b7'} ISO CP 04 11 (fire). Figures shown at the conservative end.
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 34 }} />
    </div>
  );
}

export { EvidLYDashboard };
export default EvidLYDashboard;
