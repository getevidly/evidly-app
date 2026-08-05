/**
 * KitchenSafetyStudy — public survey page at /study
 *
 * The California Kitchen Safety Study. Eleven record questions across
 * food and facility safety, branched by a scope question. Saves after
 * every answer via the survey-respond edge function.
 *
 * Route: /study  (tagged: ?from=call|show|email|linkedin|facebook|instagram|youtube|page|cra)
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { QUESTION_META } from '../../../supabase/functions/_shared/study-questions';

/* ── Design tokens (from the approved mock — Instrument Sans, not Fraunces) */
const INK     = '#1C2A3A';
const INK2    = '#4A5566';
const INK3    = '#5F6875';
const MUTED   = '#646D7A';
const STONE   = '#6E675A';
const STONE2  = '#A79E8B';
const GOLD    = '#B24A2E';
const GOLD2   = '#B24A2E';
const EMBER   = '#B24A2E';
const EMBER_SOFT = '#E6B9A4';
const EMBER_DEEP = '#8F3A22';
const SLATE   = '#3E6B8A';
const GREEN   = '#3E5E4B';
const GREEN_BG = '#E3ECE1';
const RED     = '#9E3B32';
const RED_BG  = '#F6E3DF';
const AMBER_BG = '#F7EDD3';
const LINE    = '#E4DBC8';
const LINE2   = '#EEE7D9';
const TRACK   = '#F0EADC';
const PAPER   = '#FFFFFF';
const CREAM   = '#F7F1E6';
const CANVAS  = '#EFE8DA';
const BAND    = '#F1ECE0';
const NAVY    = '#1C2A3A';

const DISPLAY = "'Instrument Sans',system-ui,sans-serif";
const UI      = "'Instrument Sans',system-ui,sans-serif";
const MONO    = "'IBM Plex Mono',monospace";

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Montserrat:wght@800&display=swap';
const CALENDLY   = 'https://calendly.com/founders-getevidly/california-commercial-kitchen-study';

/* ── Edge function helper ─────────────────────────────────────── */
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEdge(payload, fetchOpts) {
  try {
    const res = await fetch(`${SUPA_URL}/functions/v1/survey-respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPA_KEY}`,
      },
      body: JSON.stringify(payload),
      ...fetchOpts,
    });
    return res.json();
  } catch {
    return { ok: false };
  }
}

/* ── Source handling ───────────────────────────────────────────── */
const PLATFORM_MAP = {
  linkedin: 'LinkedIn', li: 'LinkedIn',
  facebook: 'Facebook', fb: 'Facebook',
  instagram: 'Instagram', ig: 'Instagram',
  youtube: 'YouTube', yt: 'YouTube',
};
const VALID_SOURCES = new Set(['call', 'show', 'email', 'social', 'page', 'cra', 'other']);

function parseSourceFromURL() {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get('from') || '').toLowerCase();
  if (!raw) return { source: null, platform: null };
  if (PLATFORM_MAP[raw]) return { source: 'social', platform: PLATFORM_MAP[raw] };
  if (VALID_SOURCES.has(raw)) return { source: raw, platform: null };
  return { source: 'other', platform: null };
}

/* ── Question definitions ─────────────────────────────────────── */
const NA = { v: 'na', l: "That\u2019s not my area \u2014 someone else handles it", sec: true };

function docLadder(who) {
  return [
    { v: 'tracked',   l: "On file \u2014 and I\u2019d know before it expires" },
    { v: 'untracked', l: "On file \u2014 but I\u2019d have to go looking for the date" },
    { v: 'gap',       l: "I\u2019d have to ask " + who + " for it" },
    { v: 'no',        l: "No, or not sure" },
    NA,
  ];
}
const VENDOR = docLadder('the vendor');
const STAFF  = docLadder('my staff');
const LOG = [
  { v: 'tracked',   l: "Logged, and I could pull the last month right now" },
  { v: 'untracked', l: "Logged \u2014 but I\u2019d have to go looking for it" },
  { v: 'gap',       l: "We do it \u2014 but it isn\u2019t documented" },
  { v: 'no',        l: "No, or not sure" },
  NA,
];
const KNOW = [
  { v: 'yes', l: 'Yes' },
  { v: 'no', l: 'No' },
  { v: 'unsure', l: 'Not sure' },
  NA,
];

const SPEED_OPTS = [
  { v: 'minutes', l: 'Within minutes' },
  { v: 'today',   l: 'Same day' },
  { v: 'days',    l: 'A few days' },
  { v: 'chase',   l: "I\u2019d be chasing vendors for it" },
];

const SCOPE_OPTS = [
  { v: 'food', l: 'Food safety' },
  { v: 'fire', l: 'Facility safety \u2014 the fire systems' },
  { v: 'both', l: 'Both' },
];

const TYPES = [
  'Full service restaurant', 'Quick service or fast casual',
  'Bar, brewery or tavern', 'Hotel, banquet or catering',
  'School or campus', 'Hospital or senior living',
  'Grocery, deli or commissary', 'Other',
];

const COUNTS = ['1', '2\u20133', '4\u20139', '10\u201324', '25 or more'];

const FALLBACK_COUNTIES = [
  'Alameda','Alpine','Amador','Butte','Calaveras','Colusa','Contra Costa',
  'Del Norte','El Dorado','Fresno','Glenn','Humboldt','Imperial','Inyo',
  'Kern','Kings','Lake','Lassen','Los Angeles','Madera','Marin','Mariposa',
  'Mendocino','Merced','Modoc','Mono','Monterey','Napa','Nevada','Orange',
  'Placer','Plumas','Riverside','Sacramento','San Benito','San Bernardino',
  'San Diego','San Francisco','San Joaquin','San Luis Obispo','San Mateo',
  'Santa Barbara','Santa Clara','Santa Cruz','Shasta','Sierra','Siskiyou',
  'Solano','Sonoma','Stanislaus','Sutter','Tehama','Trinity','Tulare',
  'Tuolumne','Ventura','Yolo','Yuba',
];

const SYSTEM_OPTS = [
  { v: 'paper',  l: 'Paper and binders' },
  { v: 'sheets', l: 'Spreadsheets or a shared drive' },
  { v: 'app',    l: 'A compliance or checklist app' },
  { v: 'vendor', l: 'We rely on our vendors to hold it' },
  { v: 'none',   l: 'Nothing formal' },
];

const OWNER_OPTS = [
  { v: 'owner',  l: 'The owner' },
  { v: 'gm',     l: 'A general manager' },
  { v: 'chef',   l: 'The chef or kitchen manager' },
  { v: 'admin',  l: 'Office or admin staff' },
  { v: 'nobody', l: 'Nobody in particular' },
];

const ASKERS = [
  'Fire marshal', 'Health inspector', 'Property manager or landlord',
  'Insurance carrier or broker', 'An attorney', 'Nobody has',
];

const SOURCE_OPTS = [
  { v: 'call',   l: 'Someone called me' },
  { v: 'show',   l: 'A QR code at a show or event' },
  { v: 'email',  l: 'An email from EvidLY' },
  { v: 'social', l: 'Social media' },
  { v: 'page',   l: 'A link on the EvidLY website' },
  { v: 'cra',    l: 'The CRA sent it to me' },
  { v: 'other',  l: 'Somewhere else' },
];

/* Record questions — each carries a short name for the gap list */
const FIRE_QS = [
  { id: 'hood',   sh: 'Exhaust & hood cleaning', t: 'Exhaust and hood cleaning \u2014 your most recent record.',            c: QUESTION_META.hood.citation, a: VENDOR },
  { id: 'supp',   sh: 'Hood suppression',        t: 'Hood suppression service \u2014 dated inside the last six months.', c: QUESTION_META.supp.citation, a: VENDOR },
  { id: 'ext',    sh: 'Fire extinguishers',      t: 'Fire extinguisher service \u2014 your most recent record.',         c: QUESTION_META.ext.citation,  a: VENDOR },
  { id: 'sprink', sh: 'Fire sprinklers',         t: 'Fire sprinkler inspection \u2014 your most recent record.',         c: QUESTION_META.sprink.citation, a: VENDOR },
];
const INS_QS = [
  { id: 'pse',  t: 'Does your property policy carry a Protective Safeguards Endorsement?', s: 'The clause that makes coverage conditional on maintaining named fire systems.', a: KNOW },
  { id: 'recs', t: 'If you had a fire tomorrow, could you produce signed service records across the whole policy period?', s: 'Not the last one \u2014 the run of them.', a: KNOW },
];
const FOOD_QS = [
  { id: 'cool',    sh: 'Cooling records',      t: 'Cooling records \u2014 135\u00B0F to 70\u00B0F within two hours, then to 41\u00B0F within six.', c: QUESTION_META.cool.citation, a: LOG },
  { id: 'hold',    sh: 'Holding temperatures',  t: 'Hot and cold holding records \u2014 through the day.',                                          c: QUESTION_META.hold.citation, a: LOG },
  { id: 'sanit',   sh: 'Sanitization records',  t: 'Sanitization records \u2014 how often food-contact surfaces are sanitized.',                    c: QUESTION_META.sanit.citation, a: LOG },
  { id: 'handler', sh: 'Food handler cards',    t: 'Food handler cards \u2014 current, for every food employee including 30-day hires.',            c: QUESTION_META.handler.citation, a: STAFF },
];
const VBIZ_QS = [
  { id: 'vins', sh: 'Vendor insurance certificates', t: 'Insurance certificates \u2014 current, for every company that works in your kitchen.', s: 'Hood, fire systems, pest control, grease trap, backflow \u2014 all of them, not just the fire ones.', a: VENDOR },
];

/* All ladder questions (the ones that produce the snapshot) */
const LADDER = [...FIRE_QS, ...FOOD_QS, ...VBIZ_QS];

/* ── uuid generator ───────────────────────────────────────────── */
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Component                                                      */
/* ═══════════════════════════════════════════════════════════════ */

export default function KitchenSafetyStudy() {
  const { source: linkSource, platform: linkPlatform } = useMemo(parseSourceFromURL, []);
  const hasTag = linkSource !== null;

  const [responseId] = useState(() => uuid());
  const startTime = useRef(Date.now());
  const saveFailed = useRef(false);
  const [state, setState] = useState({});
  const [askers, setAskers] = useState({});
  const [askersAnswered, setAskersAnswered] = useState(false);
  const [missing, setMissing] = useState(new Set());
  const [warn, setWarn] = useState('');
  const [phase, setPhase] = useState('form'); // 'form' | 'snap'

  // Contact state
  const [email, setEmail] = useState('');
  const [choices, setChoices] = useState({});
  const [sendNote, setSendNote] = useState('Nothing is sent unless you tick something.');
  const [sendErr, setSendErr] = useState(false);
  const [done, setDone] = useState(false);
  const [counties, setCounties] = useState(FALLBACK_COUNTIES);

  /* Fetch CA counties from the edge function; fall back to hardcoded list */
  useEffect(() => {
    callEdge({ action: 'counties' }).then(r => {
      if (r.counties?.length) setCounties(r.counties.map(c => c.county));
    }).catch(() => {});
  }, []);

  /* Save the initial response row on mount */
  useEffect(() => {
    const patch = { status: 'in_progress', instrument_version: 'v1' };
    if (linkSource) {
      patch.source = linkSource;
      patch.source_method = 'tag';
      if (linkPlatform) patch.source_platform = linkPlatform;
    }
    callEdge({ response_id: responseId, patch })
      .then(r => { if (!r?.ok) saveFailed.current = true; })
      .catch(() => { saveFailed.current = true; });
  }, [responseId, linkSource, linkPlatform]);

  /* ── Derived routing ────────────────────────────────────────── */
  const scope = state.scope || null;
  const wantFire = scope === 'both' || scope === 'fire';
  const wantFood = scope === 'both' || scope === 'food';
  const decided  = scope !== null;

  /* Build the required question list */
  const required = useMemo(() => {
    const r = ['scope', 'county', 'type', 'count'];
    if (!decided) return r;
    if (wantFire) r.push(...FIRE_QS.map(q => q.id), ...INS_QS.map(q => q.id));
    if (wantFood) r.push(...FOOD_QS.map(q => q.id));
    if (wantFire) r.push(...VBIZ_QS.map(q => q.id));
    r.push('system', 'owner', 'speed', 'askers');
    if (!hasTag) r.push('source');
    return r;
  }, [decided, wantFire, wantFood, hasTag]);

  /* Count answered */
  const answered = useCallback((k) => {
    if (k === 'askers') return askersAnswered;
    return state[k] !== undefined;
  }, [state, askersAnswered]);

  const answeredCount = required.filter(answered).length;

  /* Question numbering */
  const qNumbers = useMemo(() => {
    const map = {};
    let n = 0;
    required.forEach(id => { n++; map[id] = n; });
    return map;
  }, [required]);

  /* ── Save after every answer ────────────────────────────────── */
  const saveAnswer = useCallback((key, value, isRecordQ = false) => {
    setState(prev => ({ ...prev, [key]: value }));
    setMissing(prev => { const s = new Set(prev); s.delete(key); return s; });

    const patch = {};
    // Map answer fields to response columns
    if (key === 'type') patch.kitchen_type = value;
    else if (key === 'count') patch.kitchen_count = value;
    else if (key === 'owner') patch.record_owner = value;
    else if (key === 'source' && !hasTag) {
      patch.source = value;
      patch.source_method = 'self_reported';
    }
    else if (!isRecordQ) patch[key] = value;

    // Record questions go to market_research_answers
    const p = isRecordQ
      ? callEdge({ response_id: responseId, patch: { answers: [{ question_id: key, value }] } })
      : callEdge({ response_id: responseId, patch });
    p.then(r => { if (!r?.ok) saveFailed.current = true; })
     .catch(() => { saveFailed.current = true; });
  }, [responseId, hasTag]);

  const saveAskers = useCallback((newAskers, isAnswered) => {
    setAskers(newAskers);
    setAskersAnswered(isAnswered);
    if (isAnswered) setMissing(prev => { const s = new Set(prev); s.delete('askers'); return s; });
    // Convert to array for storage
    const arr = ASKERS.filter((_, i) => newAskers[i]);
    callEdge({ response_id: responseId, patch: { askers: arr } })
      .then(r => { if (!r?.ok) saveFailed.current = true; })
      .catch(() => { saveFailed.current = true; });
  }, [responseId]);

  /* ── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    const miss = required.filter(k => !answered(k));
    if (miss.length) {
      const s = new Set(miss);
      setMissing(s);
      setWarn(miss.length === 1
        ? '1 question still needs an answer.'
        : `${miss.length} questions still need an answer.`);
      const el = document.getElementById('q-' + miss[0]);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setWarn('');
    const dur = Math.round((Date.now() - startTime.current) / 1000);

    // Show snapshot immediately — it renders from local state
    setPhase('snap');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reconcile if any per-answer save failed
    if (saveFailed.current) {
      const reconPatch = {
        instrument_version: 'v1',
        scope: state.scope,
        county: state.county,
        kitchen_type: state.type,
        kitchen_count: state.count,
        system: state.system,
        record_owner: state.owner,
        speed: state.speed,
        askers: ASKERS.filter((_, i) => askers[i]),
        duration_seconds: dur,
      };
      // Source — tag-based or self-reported
      if (hasTag) {
        reconPatch.source = linkSource;
        reconPatch.source_method = 'tag';
        if (linkPlatform) reconPatch.source_platform = linkPlatform;
      } else if (state.source) {
        reconPatch.source = state.source;
        reconPatch.source_method = 'self_reported';
      }
      // All answered record questions
      const allRecordQs = [...FIRE_QS, ...INS_QS, ...FOOD_QS, ...VBIZ_QS];
      reconPatch.answers = allRecordQs
        .filter(q => state[q.id] !== undefined)
        .map(q => ({ question_id: q.id, value: state[q.id] }));

      let reconOk = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await callEdge({ response_id: responseId, patch: reconPatch });
          if (r?.ok) { reconOk = true; break; }
        } catch { /* retry */ }
      }
      if (!reconOk) return; // leave row incomplete — do not stamp completed
    }

    // Stamp completed — keepalive survives tab close; await makes failures visible
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await callEdge({
          response_id: responseId,
          patch: {
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_seconds: dur,
          },
        }, { keepalive: true });
        if (r?.ok) break;
      } catch { /* retry */ }
    }
  }, [required, answered, responseId, state, askers, hasTag, linkSource, linkPlatform]);

  /* ── Send contact ───────────────────────────────────────────── */
  const [sending, setSending] = useState(false);
  const handleSend = useCallback(async () => {
    const picked = Object.keys(choices).filter(k => choices[k]);
    if (!picked.length) {
      setSendNote('Tick at least one thing first, or you are done \u2014 your answers are already in.');
      setSendErr(true);
      return;
    }
    const trimmed = email.trim();
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setSendNote('We need an email address to send those to.');
      setSendErr(true);
      return;
    }
    setSending(true);
    setSendErr(false);
    setSendNote('Saving\u2026');
    try {
      const result = await callEdge({
        response_id: responseId,
        contact: {
          email: trimmed,
          wants_findings: !!choices.c_find,
          wants_county_report: !!choices.c_report,
          wants_referral_link: !!choices.c_refer,
          wants_meeting: !!choices.c_meet,
        },
      });
      if (result.ok) {
        setDone(true);
      } else {
        setSendNote('That didn\u2019t go through \u2014 check your connection and try again.');
        setSendErr(true);
      }
    } catch {
      setSendNote('That didn\u2019t go through \u2014 check your connection and try again.');
      setSendErr(true);
    } finally {
      setSending(false);
    }
  }, [choices, email, responseId]);

  /* ── Snapshot data ──────────────────────────────────────────── */
  const pool = useMemo(() =>
    LADDER.filter(q => required.includes(q.id) && state[q.id] !== 'na'),
  [required, state]);
  const N = pool.length;
  const bandCount = (v) => pool.filter(q => state[q.id] === v).length;
  const tracked   = bandCount('tracked');
  const untracked = bandCount('untracked');
  const gap       = bandCount('gap');
  const none      = bandCount('no');
  const gaps      = untracked + gap + none;
  const skipped   = LADDER.filter(q => required.includes(q.id)).length - N;

  const ORDER = { no: 0, gap: 1, untracked: 2 };
  const LABEL = { no: 'Not on file', gap: 'Not in my hands', untracked: 'Have to find it' };
  const CHIP_CLASS = { no: 'no', gap: 'gap', untracked: 'untracked' };
  const openList = pool
    .filter(q => state[q.id] !== 'tracked')
    .sort((x, y) => ORDER[state[x.id]] - ORDER[state[y.id]]);

  const speedLine = {
    minutes: '<b>Within minutes.</b> That puts you ahead of most kitchens in this study.',
    today:   '<b>Same day.</b> That holds until the day it has to be the same hour.',
    days:    '<b>A few days.</b> An adjuster and a fire marshal both work on shorter clocks than that.',
    chase:   "<b>You\u2019d be chasing vendors.</b> That is the gap this study is measuring.",
  }[state.speed] || '';

  const county = state.county || 'your county';

  const choiceList = useMemo(() => {
    const c = [
      { id: 'c_find',   l: 'Send me the statewide findings when the study closes',
        s: 'One email when the study closes. Your answers stay in the anonymous pool.' },
      { id: 'c_report', l: `Send me a gap report for ${county} County`,
        s: `Your answers read against what ${county} County and your fire authority expect. No meeting, no call.` },
    ];
    if (skipped > 0) c.push({
      id: 'c_refer',
      l: 'Send me a link to forward to whoever holds the rest',
      s: 'Their half, answered by the person who owns it, kept separate from yours. We never ask you for their address.',
    });
    return c;
  }, [county, skipped, gaps]);

  /* Done items for confirmation */
  const doneLines = useMemo(() => {
    const lines = [];
    if (choices.c_find)   lines.push('The statewide findings, one email when the study closes.');
    if (choices.c_report) lines.push(`Your gap report for ${county} County, within two working days.`);
    if (choices.c_refer)  lines.push('A link you can forward to whoever holds the rest.');
    return lines;
  }, [choices, county]);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FONTS_HREF} />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { background: ${CANVAS}; }
      `}</style>

      <div style={{ fontFamily: UI, color: INK, WebkitFontSmoothing: 'antialiased',
        padding: '14px 12px calc(70px + env(safe-area-inset-bottom))', fontSize: 16,
        textSizeAdjust: '100%', WebkitTextSizeAdjust: '100%' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          <div style={{ background: CREAM, border: `1px solid #ded7c8`, borderRadius: 14,
            boxShadow: '0 24px 60px -30px rgba(28,42,58,.5)', overflow: 'visible' }}>

            {/* Header */}
            <div style={{ background: NAVY, padding: '24px 20px 22px', borderRadius: '13px 13px 0 0' }}>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', lineHeight: 1 }}>
                <span style={{ color: EMBER }}>E</span><span style={{ color: '#fff' }}>vid</span><span style={{ color: EMBER }}>LY</span>
              </div>
              <h1 style={{ fontFamily: DISPLAY, fontSize: 23, fontWeight: 700, color: '#fff', lineHeight: 1.22, margin: '15px 0 0', letterSpacing: '-0.028em' }}>
                The California Kitchen Safety Study
              </h1>
              <p style={{ fontSize: 15, color: '#DCE3EA', lineHeight: 1.65, margin: '14px 0 0' }}>
                Eleven questions about the records a California kitchen has to produce on demand. At the end you'll see <b style={{ color: '#fff', fontWeight: 600 }}>which of yours you could hand over today, which you'd be hunting for, and which sit with somebody else</b> — and how that compares with kitchens across the state.
              </p>
              <p style={{ fontSize: 11.5, color: '#8FA6BE', lineHeight: 1.6, marginTop: 13, paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,.12)' }}>
                Conducted by EvidLY, led by an IKECA-certified kitchen exhaust specialist retained as an NFPA 96 expert witness in commercial-kitchen fire litigation.
              </p>
            </div>

            {/* Screener — scope question on its own screen */}
            {!decided && phase === 'form' && (
              <div style={{ padding: '40px 20px 48px', textAlign: 'center' }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, color: INK, letterSpacing: '-0.025em', lineHeight: 1.3 }}>
                  Do you handle food safety, facility safety, or both?
                </div>
                <div style={{ display: 'grid', gap: 10, marginTop: 26, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                  {SCOPE_OPTS.map(o => (
                    <button key={o.v} type="button" onClick={() => saveAnswer('scope', o.v)}
                      style={{
                        fontFamily: UI, fontSize: 16, fontWeight: 600, color: INK,
                        background: PAPER, border: `1px solid ${LINE}`, borderRadius: 10,
                        padding: '16px 18px', cursor: 'pointer',
                        transition: 'background-color .18s, border-color .18s',
                        WebkitTapHighlightColor: 'transparent',
                      }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sticky progress bar — shown after scope is chosen */}
            {decided && (
            <div style={{
              position: 'sticky', top: 0, zIndex: 30, background: PAPER,
              borderBottom: `1px solid ${LINE}`, padding: '11px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: STONE, whiteSpace: 'nowrap' }}>
                <b style={{ color: INK, fontWeight: 600 }}>{answeredCount}</b> of {required.length} answered
              </span>
              <span style={{ flex: 1, height: 5, background: TRACK, borderRadius: 99, overflow: 'hidden' }}>
                <span style={{
                  display: 'block', height: '100%', borderRadius: 99, background: EMBER,
                  width: required.length ? `${(answeredCount / required.length * 100)}%` : '0%',
                  transition: 'width .35s cubic-bezier(.22,1,.36,1)',
                }} />
              </span>
            </div>
            )}

            {/* Body — shown after scope is chosen */}
            <div style={{ padding: '0 20px', display: decided && phase === 'form' ? 'block' : 'none' }}>
              {/* Intro */}
              <div style={{ padding: '26px 0 8px' }}>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: INK2, margin: '0 0 12px' }}>
                  <b>Every question is drawn from what California kitchens are actually cited for, or from a record that decides whether a fire claim gets paid.</b> None of it is a generic checklist.
                </p>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: INK2, margin: '0 0 12px' }}>
                  Each record has four lines under it, plus one for records that are not yours — pick the one that's true. The question is never only whether a record exists. It is whether you'd know before it lapsed, and how fast you could get it to whoever asked.
                </p>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: INK2, margin: 0 }}>
                  There are no right answers and nothing here is graded.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 9, marginTop: 18, padding: 16, background: BAND, borderRadius: 10 }}>
                  <Fact text={<><b>Your result on screen</b> the moment you finish. No email needed to see it.</>} />
                  <Fact text={<><b>Under three minutes.</b> Between 12 and 20 questions, depending on which half is yours. No free text.</>} />
                  <Fact text={<><b>A gap report for your county</b> afterwards, if you want one. Optional.</>} />
                  <Fact text={<><b>Confidential.</b> Reported only as statewide totals. "Not sure" is a real answer, and a real finding.</>} />
                </div>
              </div>

              {/* ── About you and your kitchen ────────────────────────── */}
              <Section title="About you and your kitchen" note="4 questions">
                <QCard id="scope" num={qNumbers.scope} t="Do you handle food safety, facility safety, or both?"
                  s="Answer only for the half that is actually yours. In a larger operation these sit with different people."
                  missing={missing.has('scope')}>
                  <Opts id="scope" opts={SCOPE_OPTS} value={state.scope}
                    onSelect={v => { saveAnswer('scope', v); }} />
                </QCard>
                <QCard id="county" num={qNumbers.county} t="Which county is your kitchen in?"
                  s="If you manage kitchens in more than one, pick the one you spend the most time in."
                  missing={missing.has('county')}>
                  <div style={{ marginTop: 13 }}>
                    <select value={state.county || ''} onChange={e => { if (e.target.value) saveAnswer('county', e.target.value); }}
                      style={selectStyle}>
                      <option value="">Select a county…</option>
                      {counties.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </QCard>
                <QCard id="type" num={qNumbers.type} t="What kind of kitchen is it?"
                  s="The closest one. This is how the county and statewide results get broken out."
                  missing={missing.has('type')}>
                  <Opts id="type" opts={TYPES.map(t => ({ v: t, l: t }))} value={state.type}
                    onSelect={v => saveAnswer('type', v)} />
                </QCard>
                <QCard id="count" num={qNumbers.count} t="How many kitchens do you manage?"
                  missing={missing.has('count')}>
                  <Opts id="count" opts={COUNTS.map(c => ({ v: c, l: c }))} value={state.count}
                    onSelect={v => saveAnswer('count', v)} />
                </QCard>
              </Section>

              {/* ── Facility safety ───────────────────────────────────── */}
              {decided && wantFire && (
                <Section title="Facility safety — the fire systems" note="4 questions">
                  {FIRE_QS.map(q => (
                    <QCard key={q.id} id={q.id} num={qNumbers[q.id]} t={q.t} c={q.c}
                      missing={missing.has(q.id)}>
                      <LadderOpts id={q.id} opts={q.a} value={state[q.id]}
                        onSelect={v => saveAnswer(q.id, v, true)} />
                    </QCard>
                  ))}
                </Section>
              )}

              {/* ── Policy ────────────────────────────────────────────── */}
              {decided && wantFire && (
                <Section title="What your policy requires" note="2 questions">
                  {INS_QS.map(q => (
                    <QCard key={q.id} id={q.id} num={qNumbers[q.id]} t={q.t} s={q.s}
                      missing={missing.has(q.id)}>
                      <Opts id={q.id} opts={q.a} value={state[q.id]}
                        onSelect={v => saveAnswer(q.id, v, true)} />
                    </QCard>
                  ))}
                </Section>
              )}

              {/* ── Food safety ───────────────────────────────────────── */}
              {decided && wantFood && (
                <Section title="Food safety" note="4 questions">
                  {FOOD_QS.map(q => (
                    <QCard key={q.id} id={q.id} num={qNumbers[q.id]} t={q.t} c={q.c}
                      missing={missing.has(q.id)}>
                      <LadderOpts id={q.id} opts={q.a} value={state[q.id]}
                        onSelect={v => saveAnswer(q.id, v, true)} />
                    </QCard>
                  ))}
                </Section>
              )}

              {/* ── Vendor certificates ───────────────────────────────── */}
              {decided && wantFire && (
                <Section title="The companies who work in your kitchen" note="1 question">
                  {VBIZ_QS.map(q => (
                    <QCard key={q.id} id={q.id} num={qNumbers[q.id]} t={q.t} s={q.s}
                      missing={missing.has(q.id)}>
                      <LadderOpts id={q.id} opts={q.a} value={state[q.id]}
                        onSelect={v => saveAnswer(q.id, v, true)} />
                    </QCard>
                  ))}
                </Section>
              )}

              {/* ── How you keep track today ──────────────────────────── */}
              {decided && (
                <Section title="How you keep track today" note="2 questions">
                  <QCard id="system" num={qNumbers.system} t="What do you use to keep all of this together today?"
                    s="The main one, if you use more than one."
                    missing={missing.has('system')}>
                    <Opts id="system" opts={SYSTEM_OPTS} value={state.system}
                      onSelect={v => saveAnswer('system', v)} />
                  </QCard>
                  <QCard id="owner" num={qNumbers.owner} t="Who is responsible for keeping these records current?"
                    s="The person it actually falls to, not the job title on paper."
                    missing={missing.has('owner')}>
                    <Opts id="owner" opts={OWNER_OPTS} value={state.owner}
                      onSelect={v => saveAnswer('owner', v)} />
                  </QCard>
                </Section>
              )}

              {/* ── When someone asks ─────────────────────────────────── */}
              {decided && (
                <Section title="When someone asks" note="2 questions">
                  <QCard id="speed" num={qNumbers.speed}
                    t="If your carrier asked today for proof of the records you hold, how long before you could send it?"
                    missing={missing.has('speed')}>
                    <Opts id="speed" opts={SPEED_OPTS} value={state.speed}
                      onSelect={v => saveAnswer('speed', v)} />
                  </QCard>
                  <QCard id="askers" num={qNumbers.askers}
                    t="Who has asked you for a compliance document in the last year?"
                    s="Tick everyone who has."
                    missing={missing.has('askers')}>
                    <MultiCheck items={ASKERS} values={askers}
                      onChange={(newAskers, isAnswered) => saveAskers(newAskers, isAnswered)} />
                  </QCard>
                </Section>
              )}

              {/* ── Source (only if no tag) ────────────────────────────── */}
              {decided && !hasTag && (
                <Section title="One last thing" note="1 question">
                  <QCard id="source" num={qNumbers.source}
                    t="How did you get to this survey?"
                    s="It tells us which way of asking actually works. Nothing to do with your answers."
                    missing={missing.has('source')}>
                    <Opts id="source" opts={SOURCE_OPTS} value={state.source}
                      onSelect={v => saveAnswer('source', v)} />
                  </QCard>
                </Section>
              )}

              {/* ── Submit ────────────────────────────────────────────── */}
              {decided && (
                <div style={{ margin: '26px 0 30px', textAlign: 'center' }}>
                  <button type="button" onClick={handleSubmit} style={submitBtnStyle}>
                    See my results
                  </button>
                  {warn && <div style={{ fontSize: 13, color: RED, marginTop: 11, minHeight: 18 }}>{warn}</div>}
                  <div style={{ fontSize: 12, color: STONE, marginTop: 10, lineHeight: 1.55 }}>
                    Nothing is sent anywhere until you choose to send it.
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SNAPSHOT                                                */}
            {/* ═══════════════════════════════════════════════════════ */}
            {phase === 'snap' && (
              <div style={{ padding: '26px 20px 30px' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: GOLD }}>
                  Your confidential snapshot
                </div>
                <h2 style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.03em', margin: '11px 0 0' }}>
                  {N > 0
                    ? `You could send ${tracked} of ${N} today without looking anything up.`
                    : 'The records here sit with someone else in your organization.'}
                </h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: INK2, margin: '12px 0 0' }}>
                  These are <b style={{ fontWeight: 600, color: INK }}>your own answers</b> — we have never seen your kitchen. Nothing leaves this page except as part of a statewide total.
                </p>
                {skipped > 0 && (
                  <p style={{ fontSize: 14.5, lineHeight: 1.65, color: INK2, margin: '12px 0 0' }}>
                    <b style={{ fontWeight: 600, color: INK }}>{skipped} of the nine were not yours to answer for.</b> They sit with someone else here, so they are left out of the counts below. In a larger operation that split is the finding, not a gap.
                  </p>
                )}

                {/* Tally */}
                {N > 0 && (
                  <div style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 10,
                    boxShadow: '0 1px 2px rgba(28,42,58,.03), 0 16px 34px -30px rgba(28,42,58,.55)',
                    marginTop: 18, overflow: 'hidden' }}>
                    <TallyRow nm="Ready to send"   y={tracked}   n={N} color={GREEN} />
                    <TallyRow nm="Have to find it"  y={untracked} n={N} color={GOLD2} last={false} />
                    <TallyRow nm="Not in my hands"  y={gap}       n={N} color={EMBER} />
                    <TallyRow nm="Not on file"      y={none}      n={N} color={RED} last />
                  </div>
                )}

                {/* Speed callout */}
                <div style={{ marginTop: 16, background: PAPER, border: `1px solid ${LINE}`,
                  borderLeft: `3px solid ${EMBER}`, borderRadius: '0 10px 10px 0',
                  padding: '15px 18px', boxShadow: '0 1px 2px rgba(28,42,58,.03), 0 16px 34px -30px rgba(28,42,58,.55)' }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: STONE2 }}>
                    Getting it to whoever asked
                  </div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.6, color: INK, marginTop: 7 }}
                    dangerouslySetInnerHTML={{ __html: speedLine }} />
                </div>

                {/* Gap list */}
                <div style={{ marginTop: 16, background: PAPER, border: `1px solid ${LINE}`, borderRadius: 10,
                  boxShadow: '0 1px 2px rgba(28,42,58,.03), 0 16px 34px -30px rgba(28,42,58,.55)', overflow: 'hidden' }}>
                  <h3 style={{ fontFamily: DISPLAY, fontSize: 15.5, fontWeight: 700, margin: 0, color: INK,
                    padding: '16px 18px 13px', borderBottom: `1px solid ${LINE2}` }}>
                    {gaps > 0
                      ? (gaps === 1 ? 'One record you could not send today' : `${gaps} records you could not send today`)
                      : (N > 0 ? 'Nothing open' : 'Nothing to report')}
                  </h3>
                  {openList.length > 0 ? openList.map(q => (
                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 18px', borderBottom: `1px solid ${LINE2}` }}>
                      <span style={{ fontSize: 14.5, color: INK, fontWeight: 500, flex: 1, minWidth: 0, lineHeight: 1.4 }}>
                        {q.sh}
                        {q.c && <i style={{ display: 'block', fontStyle: 'normal', fontFamily: MONO, fontSize: 10.5, color: STONE2, marginTop: 3 }}>{q.c}</i>}
                      </span>
                      <GapChip state={state[q.id]} />
                    </div>
                  )) : (
                    <div style={{ padding: '16px 18px', fontSize: 14.5, color: INK2, lineHeight: 1.6 }}>
                      {N > 0
                        ? "Everything you hold is on file with an expiry you track. That is unusual \u2014 the statewide findings will show how unusual."
                        : "You told us the records sit elsewhere. The link below gets them to the person who holds them."}
                    </div>
                  )}
                </div>

                {/* The ask — one form */}
                {!done ? (
                  <div style={{ marginTop: 18, background: BAND, borderRadius: 10, padding: 18 }}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 16.5, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>
                      Where should we send it?
                    </div>
                    <div style={{ fontSize: 13, color: INK3, lineHeight: 1.6, marginTop: 6 }}>
                      Optional. Your answers are already recorded — this is only where to send things, and what you want.
                    </div>
                    <div style={{ marginTop: 13 }}>
                      <input type="email" placeholder="you@yourkitchen.com" value={email}
                        onChange={e => { setEmail(e.target.value); setSendErr(false); }}
                        style={inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gap: 8, marginTop: 13 }}>
                      {choiceList.map(ch => (
                        <ChoiceBox key={ch.id} {...ch} checked={!!choices[ch.id]}
                          onToggle={() => {
                            setChoices(prev => ({ ...prev, [ch.id]: !prev[ch.id] }));
                            setSendErr(false);
                            setSendNote('Nothing is sent unless you tick something.');
                          }} />
                      ))}
                    </div>
                    <button type="button" onClick={handleSend} disabled={sending}
                      style={{ ...askBtnStyle, opacity: sending ? 0.6 : 1, cursor: sending ? 'wait' : 'pointer' }}>
                      {sending ? 'Saving\u2026' : 'Send it over'}
                    </button>
                    <div style={{ fontSize: 12.5, color: sendErr ? RED : STONE, marginTop: 9, textAlign: 'center' }}>
                      {sendNote}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 10,
                      padding: '20px 18px', boxShadow: '0 1px 2px rgba(28,42,58,.03), 0 16px 34px -30px rgba(28,42,58,.55)' }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: GREEN }}>
                        Recorded
                      </div>
                      <div style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 700, color: INK, marginTop: 9, letterSpacing: '-0.02em' }}>
                        That's everything — nothing else needed from you.
                      </div>
                      <ul style={{ margin: '13px 0 0', paddingLeft: 18 }}>
                        {doneLines.map((l, i) => (
                          <li key={i} style={{ fontSize: 14, lineHeight: 1.6, color: INK2, marginBottom: 5 }}>{l}</li>
                        ))}
                      </ul>
                      <p style={{ fontSize: 12.5, color: STONE, lineHeight: 1.6, margin: '13px 0 0' }}>
                        Sending to {email.trim()}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Meeting block — shown when gaps exist */}
                {gaps > 0 && (
                  <div style={{ marginTop: 18, background: PAPER, border: `1px solid ${LINE}`,
                    borderLeft: `3px solid ${EMBER}`, borderRadius: '0 10px 10px 0',
                    padding: '18px 18px', boxShadow: '0 1px 2px rgba(28,42,58,.03), 0 16px 34px -30px rgba(28,42,58,.55)' }}>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: STONE2 }}>
                      One more thing
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: INK, marginTop: 9 }}>
                      {gaps} of these would mean going to look, or asking someone else.
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: STONE, marginTop: 7 }}>
                      {openList.slice(0, 3).map(q => q.sh).join(' \u00b7 ')}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: INK2, marginTop: 10 }}>
                      That is the conversation worth having. Thirty minutes with the Founder, Arthur {'\u2014'} nothing to prepare. Booking links your answers to you so we can see them; otherwise they stay anonymous.
                    </div>
                    <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', textAlign: 'center', marginTop: 14,
                        background: EMBER, color: '#fff', textDecoration: 'none',
                        fontWeight: 600, fontSize: 15.5, padding: 15, borderRadius: 9 }}>
                      Book a meeting {'\u2192'}
                    </a>
                  </div>
                )}

                <p style={{ fontSize: 12, color: STONE, lineHeight: 1.6, marginTop: 16 }}>
                  These eleven are where California kitchens are most often cited and where fire claims are most often denied — not the full set a kitchen carries. The complete list is on the requirements page.
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{ background: BAND, borderTop: `1px solid ${LINE}`, padding: '16px 20px',
              fontSize: 11.5, color: STONE, lineHeight: 1.65, borderRadius: '0 0 13px 13px' }}>
              Answers are held anonymously and reported only as aggregates above a minimum count. Contact details, if given, are kept separately and used only to send the findings.<br />
              EvidLY · Commercial Kitchen Risk Management · © 2026 · a Cleaning Pros Plus, LLC company
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function Fact({ text }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.55, color: INK2 }}>
      <i style={{ color: EMBER_DEEP, fontStyle: 'normal', fontWeight: 700, flex: 'none' }}>·</i>
      <span>{text}</span>
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <div style={{ margin: '30px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: INK }}>
          {title}
        </h2>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.13em', textTransform: 'uppercase', color: STONE2 }}>
          {note}
        </span>
        <span style={{ flex: 1, height: 1, background: LINE, minWidth: 20 }} />
      </div>
      {children}
    </div>
  );
}

function QCard({ id, num, t, s, c, missing: isMissing, children }) {
  return (
    <div id={`q-${id}`} style={{
      background: isMissing ? '#FEFAF9' : PAPER,
      border: `1px solid ${isMissing ? RED : LINE}`,
      borderRadius: 10, padding: '16px 16px 14px', marginBottom: 10,
      boxShadow: '0 1px 2px rgba(28,42,58,.03), 0 16px 34px -30px rgba(28,42,58,.55)',
      scrollMarginTop: 64, transition: 'border-color .2s, background-color .2s',
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: STONE2 }}>
        {num ? `Question ${num}` : ''}
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.45, color: INK, marginTop: 7 }}>{t}</div>
      {s && <div style={{ fontSize: 13, lineHeight: 1.55, color: MUTED, marginTop: 6 }}>{s}</div>}
      {c && <div style={{ fontFamily: MONO, fontSize: 10.5, color: STONE, marginTop: 7 }}>{c}</div>}
      {children}
    </div>
  );
}

function Opts({ id, opts, value, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 7, marginTop: 13 }}>
      {opts.map(o => (
        <button key={o.v} type="button" onClick={() => onSelect(o.v)}
          style={{
            fontFamily: UI, fontSize: 14.5, fontWeight: value === o.v ? 600 : 500,
            textAlign: 'left', color: value === o.v ? '#fff' : INK2,
            background: value === o.v ? NAVY : PAPER,
            border: `1px solid ${value === o.v ? NAVY : LINE}`,
            borderStyle: o.sec ? (value === o.v ? 'solid' : 'dashed') : 'solid',
            borderRadius: 8, padding: '13px 14px', cursor: 'pointer',
            minHeight: 48, transition: 'background-color .18s, border-color .18s, color .18s',
            WebkitTapHighlightColor: 'transparent', userSelect: 'none', touchAction: 'manipulation',
          }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function LadderOpts({ id, opts, value, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 7, marginTop: 13 }}>
      {opts.map(o => (
        <button key={o.v} type="button" onClick={() => onSelect(o.v)}
          style={{
            fontFamily: UI,
            fontSize: o.sec ? 13.5 : 14.5,
            fontWeight: value === o.v ? 600 : 500,
            textAlign: 'left',
            color: value === o.v ? '#fff' : (o.sec ? MUTED : INK2),
            background: value === o.v ? NAVY : PAPER,
            border: `1px solid ${value === o.v ? NAVY : LINE}`,
            borderStyle: o.sec ? (value === o.v ? 'solid' : 'dashed') : 'solid',
            borderRadius: 8, padding: '13px 14px', cursor: 'pointer',
            minHeight: o.sec ? 42 : 48,
            transition: 'background-color .18s, border-color .18s, color .18s',
            WebkitTapHighlightColor: 'transparent', userSelect: 'none', touchAction: 'manipulation',
          }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function MultiCheck({ items, values, onChange }) {
  const toggle = (i) => {
    const isNone = i === items.length - 1;
    const next = { ...values };
    next[i] = !next[i];

    if (next[i] && isNone) {
      // "Nobody has" clears everything else
      Object.keys(next).forEach(k => { if (String(k) !== String(i)) next[k] = false; });
    } else if (next[i]) {
      // Any real answer clears "Nobody has"
      next[items.length - 1] = false;
    }

    const isAnswered = Object.values(next).some(Boolean);
    onChange(next, isAnswered);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 7, marginTop: 13 }}>
      {items.map((item, i) => {
        const on = !!values[i];
        return (
          <label key={i} tabIndex={0} onClick={() => toggle(i)}
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(i); } }}
            style={{
              display: 'flex', alignItems: 'center', gap: 11, fontSize: 14.5, color: INK2,
              border: `1px solid ${on ? NAVY : LINE}`,
              borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
              background: on ? '#FBF8F1' : PAPER, minHeight: 48,
              transition: 'background-color .18s, border-color .18s',
              WebkitTapHighlightColor: 'transparent', userSelect: 'none', touchAction: 'manipulation',
            }}>
            <span style={{
              width: 19, height: 19, border: `1.5px solid ${on ? NAVY : STONE2}`,
              borderRadius: 4, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? NAVY : 'transparent', transition: 'background-color .18s, border-color .18s',
            }}>
              {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
            </span>
            <span>{item}</span>
          </label>
        );
      })}
    </div>
  );
}

function TallyRow({ nm, y, n, color, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px',
      borderBottom: last ? 'none' : `1px solid ${LINE2}` }}>
      <span style={{ fontSize: 14.5, fontWeight: 600, color: INK, flex: 'none', minWidth: 112 }}>{nm}</span>
      <span style={{ flex: 1, height: 9, background: TRACK, borderRadius: 99, overflow: 'hidden', minWidth: 50 }}>
        <span style={{ display: 'block', height: '100%', borderRadius: 99, background: color,
          width: n > 0 ? `${y / n * 100}%` : '0%',
          transition: 'width .8s cubic-bezier(.22,1,.36,1)' }} />
      </span>
      <span style={{ fontFamily: MONO, fontSize: 12, color: STONE, whiteSpace: 'nowrap' }}>
        <b style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 700, color: INK }}>{y}</b> of {n}
      </span>
    </div>
  );
}

function GapChip({ state: val }) {
  const bg = val === 'no' ? RED_BG : val === 'gap' ? '#F6E9E3' : AMBER_BG;
  const fg = val === 'no' ? RED : val === 'gap' ? EMBER_DEEP : GOLD;
  const label = val === 'no' ? 'Not on file' : val === 'gap' ? 'Not in my hands' : 'Have to find it';
  return (
    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: '.1em',
      textTransform: 'uppercase', padding: '5px 9px', borderRadius: 4, whiteSpace: 'nowrap',
      flex: 'none', background: bg, color: fg }}>
      {label}
    </span>
  );
}

function ChoiceBox({ id, l, s, meet, checked, onToggle }) {
  return (
    <label tabIndex={0} onClick={onToggle}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(); } }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 11,
        background: checked ? '#FBF8F1' : PAPER,
        border: `1px solid ${checked ? NAVY : LINE}`,
        borderLeft: meet ? `3px solid ${EMBER}` : undefined,
        borderRadius: 8, padding: '13px 14px', cursor: 'pointer', minHeight: 48,
        transition: 'background-color .18s, border-color .18s',
        WebkitTapHighlightColor: 'transparent', userSelect: 'none', touchAction: 'manipulation',
      }}>
      <span style={{
        width: 19, height: 19, border: `1.5px solid ${checked ? NAVY : STONE2}`,
        borderRadius: 4, flex: 'none', marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? NAVY : 'transparent',
        transition: 'background-color .18s, border-color .18s',
      }}>
        {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
      </span>
      <span style={{ display: 'block', minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14.5, color: INK, fontWeight: 500, lineHeight: 1.4 }}>{l}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: MUTED, lineHeight: 1.5, marginTop: 5 }}>{s}</span>
      </span>
    </label>
  );
}

/* ── Shared styles ────────────────────────────────────────────── */
const selectStyle = {
  width: '100%', fontFamily: UI, fontSize: 16, color: INK,
  background: PAPER, border: `1px solid ${LINE}`, borderRadius: 8,
  padding: '12px 36px 12px 13px', minHeight: 48,
  WebkitAppearance: 'none', appearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236E675A' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
};

const inputStyle = {
  width: '100%', fontFamily: UI, fontSize: 16, color: INK,
  background: PAPER, border: `1px solid ${LINE}`, borderRadius: 8,
  padding: '12px 13px', minHeight: 48, boxSizing: 'border-box',
  WebkitAppearance: 'none', appearance: 'none',
};

const submitBtnStyle = {
  width: '100%', maxWidth: 320, background: EMBER, color: '#fff', border: 'none',
  fontFamily: UI, fontSize: 16, fontWeight: 600, padding: '16px 20px',
  borderRadius: 9, cursor: 'pointer', transition: 'opacity .18s',
};

const askBtnStyle = {
  marginTop: 13, width: '100%', background: EMBER, color: '#fff', border: 'none',
  fontFamily: UI, fontSize: 15.5, fontWeight: 600, padding: 15,
  borderRadius: 9, cursor: 'pointer', transition: 'opacity .18s',
};
