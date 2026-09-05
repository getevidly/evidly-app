/**
 * NursingFacilitiesTab — the CMS nursing-facility call tracker.
 *
 * READ + CALL LOG ONLY. It reads cms_facilities and cms_call_log directly
 * through the browser client (both are RLS-gated to @getevidly.com), and
 * the only thing it writes is a call: one INSERT into cms_call_log, then
 * one UPDATE of that facility's call_status and next_step_date. It never
 * refreshes source data — cms-refresh owns that.
 *
 * PostgREST caps a response at 1000 rows, so the 1,165 facilities are
 * paged. An unpaged read would silently return the first 1000 and look
 * like a smaller state.
 *
 * Vocabulary is deliberate throughout: "facility", never "home"; fines are
 * always "Federal fines"; K324 is the kitchen fire-suppression citation and
 * F812 the food-service citation, spelled out wherever they appear.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { KpiMini } from './marketingPrimitives';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_FAINT, EV_LINE, EV_PAPER,
  EV_LIGHT, EV_CREAM, EV_SUCCESS, EV_WARN, EV_DANGER, EV_INK, EV_SLATE,
  DISPLAY, BODY,
} from './marketingTokens';

const PAGE = 1000;
const MAX_PAGES = 20;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** Verified against medicare.gov on CCN 055858 and 555579 — both land on
 *  the correct facility's details page. */
const careCompareUrl = (ccn: string) =>
  `https://www.medicare.gov/care-compare/details/nursing-home/${ccn}`;

interface Facility {
  ccn: string;
  name: string | null;
  city: string | null;
  county: string | null;
  zip: string | null;
  phone: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  chain_name: string | null;
  beds: number | null;
  overall_rating: number | null;
  sff_status: string | null;
  k324: number | null;
  f812: number | null;
  both_same_survey: number | null;
  fines_total: number | null;
  call_status: string | null;
  next_step_date: string | null;
  source_refreshed_at: string | null;
}

interface CallLog {
  id: string;
  ccn: string;
  called_at: string;
  outcome: string | null;
  next_step_date: string | null;
  notes: string | null;
  created_by: string | null;
}

const OUTCOMES = [
  { id: 'vm',         label: 'Left voicemail' },
  { id: 'reached',    label: 'Reached' },
  { id: 'callback',   label: 'Callback set' },
  { id: 'interested', label: 'Interested' },
  { id: 'pilot',      label: 'Pilot' },
  { id: 'no',         label: 'Not interested' },
  { id: 'dnc',        label: 'Do not call' },
] as const;

const outcomeLabel = (id: string | null) =>
  OUTCOMES.find(o => o.id === id)?.label ?? (id === 'notcalled' || !id ? 'Not called' : id);

const STATUS_FILTERS = [
  { id: '',           label: 'All' },
  { id: 'notcalled',  label: 'Not called' },
  ...OUTCOMES.map(o => ({ id: o.id, label: o.label })),
];

const money = (n: number | null | undefined) =>
  '$' + Math.round(Number(n ?? 0)).toLocaleString('en-US');

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US');
};
const fmtDateTime = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

/* ── Display casing ───────────────────────────────────────────────────
 * CMS and CDPH publish names, cities and administrators in ALL CAPS.
 * These are RENDER-TIME ONLY — nothing here is ever written back, so the
 * stored value stays exactly as the source published it.
 */

/**
 * Tokens that stay upper-case: entity suffixes, numerals, known
 * initialisms, and the chain names CMS publishes as acronyms.
 *
 * Matched as WHOLE WORDS only. titleCase splits on whitespace and tests
 * the stripped token against this set, so a substring can never trigger
 * it — "PACIFIC" is compared as PACIFIC, not scanned for "PACS", and so
 * renders "Pacific" rather than "PACSific".
 */
const KEEP_UPPER = new Set([
  // entity suffixes and numerals
  'LLC', 'LP', 'INC', 'II', 'III', 'IV', 'DBA',
  // place and facility-type initialisms
  'LA', 'SF', 'SNF', 'CCRC',
  // chain and organisation initialisms
  'AJC', 'PACS', 'RMG', 'HCSG', 'HHS', 'USA',
]);
/** Lower-cased when they are not the first word. */
const KEEP_LOWER = new Set(['&', 'AND', 'OF', 'AT', 'THE']);

/** Title-case a source string that may be ALL CAPS. */
function titleCase(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  // Already mixed case in the source — leave it alone.
  if (s !== s.toUpperCase()) return s;

  return s.split(/\s+/).map((word, i) => {
    const bare = word.replace(/[^A-Za-z&]/g, '');
    const upper = bare.toUpperCase();
    if (KEEP_UPPER.has(upper)) return word.toUpperCase();
    if (i > 0 && KEEP_LOWER.has(upper)) return word.toLowerCase();
    // Capitalise after internal punctuation too: O'BRIEN -> O'Brien.
    return word.toLowerCase().replace(/(^|[^A-Za-z'])([a-z])/g, (_m, p, c) => p + c.toUpperCase());
  }).join(' ');
}

/** "LAST, FIRST M" -> "First M Last". No comma: title-case as-is. */
function displayAdmin(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  if (!s.includes(',')) return titleCase(s);
  const [last, rest] = s.split(',');
  const given = (rest ?? '').trim();
  return titleCase(`${given} ${last.trim()}`.trim());
}

/** (209) 745-1537 for a 10-digit number; anything else is shown as given. */
function displayPhone(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  const d = s.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return s;
}

/** Administrator first name, title-cased, from "LAST, FIRST" or "First Last". */
function firstName(admin: string | null): string {
  const s = (admin ?? '').trim();
  if (!s) return 'the administrator';
  const shown = displayAdmin(s);
  const first = shown.split(/\s+/)[0];
  return first || 'the administrator';
}

/** Next weekday name, skipping the weekend. */
function nextWeekday(): string {
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

/** Federal-fine tier drives both the bar colour and the card badge. */
function fineTier(n: number | null | undefined): { label: string; color: string } | null {
  const v = Number(n ?? 0);
  if (v <= 0) return null;
  if (v >= 100000) return { label: '$100k+', color: EV_EMBER };
  if (v >= 25000) return { label: '$25k+', color: EV_WARN };
  return { label: 'Under $25k', color: EV_FAINT };
}

export default function NursingFacilitiesTab() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);

  // filters
  const [fChain, setFChain] = useState('');
  const [fCounty, setFCounty] = useState('');
  const [fFines, setFFines] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [sort, setSort] = useState<'fines' | 'pain' | 'company' | 'name'>('fines');
  const [search, setSearch] = useState('');

  // ── Resizable divider ────────────────────────────────────────────
  // Card width is the operator's, so it persists. Min 420 keeps the
  // scripts readable; max 60% of the container keeps the list usable.
  const CARD_DEFAULT = 520;
  const CARD_MIN = 420;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('nf_card_width'));
      return Number.isFinite(v) && v >= CARD_MIN ? v : CARD_DEFAULT;
    } catch { return CARD_DEFAULT; }
  });
  const [dragging, setDragging] = useState(false);
  const [handleHot, setHandleHot] = useState(false);

  const maxCard = () => {
    const w = containerRef.current?.clientWidth ?? 1200;
    return Math.max(CARD_MIN, Math.round(w * 0.6));
  };
  const clampCard = useCallback((px: number) => {
    return Math.min(maxCard(), Math.max(CARD_MIN, Math.round(px)));
  }, []);
  const commitWidth = useCallback((px: number) => {
    const v = clampCard(px);
    setCardWidth(v);
    try { localStorage.setItem('nf_card_width', String(v)); } catch { /* private mode */ }
  }, [clampCard]);

  // Drag listeners live on the window so the pointer can leave the handle.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const box = containerRef.current?.getBoundingClientRect();
      if (!box) return;
      commitWidth(box.right - e.clientX);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = prev;
    };
  }, [dragging, commitWidth]);

  // call form
  const [outcome, setOutcome] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      setUserEmail(u?.user?.email ?? null);

      // PostgREST returns at most 1000 rows; 1,165 facilities need paging.
      const facs: Facility[] = [];
      for (let i = 0; i < MAX_PAGES; i++) {
        const { data, error: e } = await supabase
          .from('cms_facilities')
          .select('ccn,name,city,county,zip,phone,admin_name,admin_email,admin_phone,chain_name,beds,overall_rating,sff_status,k324,f812,both_same_survey,fines_total,call_status,next_step_date,source_refreshed_at')
          .order('ccn', { ascending: true })
          .range(i * PAGE, i * PAGE + PAGE - 1);
        if (e) throw new Error(e.message);
        const rows = (data ?? []) as Facility[];
        facs.push(...rows);
        if (rows.length < PAGE) break;
      }

      const logs: CallLog[] = [];
      for (let i = 0; i < MAX_PAGES; i++) {
        const { data, error: e } = await supabase
          .from('cms_call_log')
          .select('id,ccn,called_at,outcome,next_step_date,notes,created_by')
          .order('called_at', { ascending: false })
          .range(i * PAGE, i * PAGE + PAGE - 1);
        if (e) throw new Error(e.message);
        const rows = (data ?? []) as CallLog[];
        logs.push(...rows);
        if (rows.length < PAGE) break;
      }

      setFacilities(facs);
      setCalls(logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The facilities could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const callsByCcn = useMemo(() => {
    const m = new Map<string, CallLog[]>();
    for (const c of calls) {
      if (!m.has(c.ccn)) m.set(c.ccn, []);
      m.get(c.ccn)!.push(c);
    }
    return m;
  }, [calls]);

  /** Parent companies by facility count, biggest first. */
  const chains = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of facilities) {
      const k = (f.chain_name ?? '').trim();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([k, n]) => ({
        value: k === '' ? '__none__' : k,
        label: `${k === '' ? 'Independent (no chain)' : titleCase(k)} (${n})`,
      }));
  }, [facilities]);

  const counties = useMemo(
    () => [...new Set(facilities.map(f => (f.county ?? '').trim()).filter(Boolean))].sort(),
    [facilities],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = facilities.filter(f => {
      if (fChain) {
        const c = (f.chain_name ?? '').trim();
        if (fChain === '__none__' ? c !== '' : c !== fChain) return false;
      }
      if (fCounty && (f.county ?? '').trim() !== fCounty) return false;

      const fines = Number(f.fines_total ?? 0);
      if (fFines === 'high' && fines < 100000) return false;
      if (fFines === 'mid' && !(fines >= 25000 && fines < 100000)) return false;
      if (fFines === 'low' && !(fines > 0 && fines < 25000)) return false;
      if (fFines === 'none' && fines !== 0) return false;
      if (fFines === 'any' && fines <= 0) return false;

      if (fStatus) {
        const s = f.call_status ?? 'notcalled';
        if (s !== fStatus) return false;
      }
      if (q) {
        const hay = `${f.name ?? ''} ${f.city ?? ''} ${f.admin_name ?? ''} ${f.chain_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const n = (v: number | null | undefined) => Number(v ?? 0);
    out = [...out].sort((a, b) => {
      if (sort === 'fines') return n(b.fines_total) - n(a.fines_total);
      if (sort === 'pain') {
        return n(b.both_same_survey) - n(a.both_same_survey)
          || n(b.k324) - n(a.k324)
          || n(b.fines_total) - n(a.fines_total)
          || n(b.f812) - n(a.f812);
      }
      if (sort === 'company') {
        return (a.chain_name ?? 'zzz').localeCompare(b.chain_name ?? 'zzz')
          || (a.name ?? '').localeCompare(b.name ?? '');
      }
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    return out;
  }, [facilities, fChain, fCounty, fFines, fStatus, search, sort]);

  const maxFines = useMemo(
    () => Math.max(1, ...facilities.map(f => Number(f.fines_total ?? 0))),
    [facilities],
  );

  const kpis = useMemo(() => {
    const shownFines = filtered.reduce((s, f) => s + Number(f.fines_total ?? 0), 0);
    const st = (id: string) => facilities.filter(f => (f.call_status ?? 'notcalled') === id).length;
    const today = new Date().toISOString().slice(0, 10);
    return {
      showing: filtered.length,
      total: facilities.length,
      shownFines,
      parents: new Set(facilities.map(f => (f.chain_name ?? '').trim()).filter(Boolean)).size,
      notCalled: st('notcalled'),
      callsLogged: calls.length,
      callbacksDue: facilities.filter(f => f.next_step_date && f.next_step_date <= today).length,
      interested: st('interested'),
      pilots: st('pilot'),
      dataAsOf: facilities.reduce<string | null>(
        (m, f) => (f.source_refreshed_at && (!m || f.source_refreshed_at > m) ? f.source_refreshed_at : m),
        null,
      ),
    };
  }, [facilities, filtered, calls]);

  const sel = useMemo(
    () => facilities.find(f => f.ccn === selected) ?? null,
    [facilities, selected],
  );
  const selCalls = useMemo(
    () => (selected ? (callsByCcn.get(selected) ?? []) : []),
    [callsByCcn, selected],
  );

  /** Save = INSERT the call, then UPDATE the facility. Never the reverse:
   *  the log is the record of truth and must land first. */
  const saveCall = async () => {
    if (!sel || !outcome) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error: insErr } = await supabase.from('cms_call_log').insert({
        ccn: sel.ccn,
        outcome,
        notes: notes.trim() || null,
        next_step_date: nextStep || null,
        created_by: userEmail,
      });
      if (insErr) throw new Error(insErr.message);

      const { error: updErr } = await supabase
        .from('cms_facilities')
        .update({ call_status: outcome, next_step_date: nextStep || null })
        .eq('ccn', sel.ccn);
      if (updErr) throw new Error(updErr.message);

      setOutcome(''); setNotes(''); setNextStep('');
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'The call could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const sortBtn = (col: typeof sort, label: string) => (
    <button
      onClick={() => setSort(col)}
      className="text-[10px] font-bold tracking-wider cursor-pointer border-none bg-transparent p-0"
      style={{ color: sort === col ? EV_EMBER : EV_MUTED, fontFamily: BODY }}
    >
      {label} {sort === col ? '▼' : ''}
    </button>
  );

  // ── Card content ───────────────────────────────────────────────────
  const first = firstName(sel?.admin_name ?? null);
  const adminFull = displayAdmin(sel?.admin_name) || 'the administrator';
  const both = Number(sel?.both_same_survey ?? 0);
  const k = Number(sel?.k324 ?? 0);
  const f = Number(sel?.f812 ?? 0);
  const fines = Number(sel?.fines_total ?? 0);
  const tie = both > 0 ? 'both the fire side and the food side in the same visit'
    : k > 0 ? 'the kitchen fire-suppression side'
    : f > 0 ? 'the food side' : '';
  const which = both > 0 ? 'fire and food' : k > 0 ? 'fire-suppression' : 'food';

  let leadWith = '';
  if (sel) {
    if (both > 0) leadWith = `Lead with: cited on both fire and food in the same survey (${both}×). One kitchen, one surveyor, two departments that don't share a file.`;
    else if (k > 0) leadWith = 'Lead with: a kitchen fire-suppression citation (K324) — a hood/Ansul records question.';
    else if (f > 0) leadWith = `Lead with: ${f} food-service citation(s), no fire tag. Open on food; fire is the add-on.`;
    else leadWith = 'Lead with: clean file — prevention conversation, not a post-mortem.';
    if (fines > 0) leadWith += ` They paid ${money(fines)} in federal fines — a board-visible loss.`;
    if (Number(sel.overall_rating ?? 99) <= 1) leadWith += ' 1-star — under scrutiny, be sympathetic.';
    if (sel.sff_status) leadWith += ' Special Focus — normally skip; if calling, fact-find about the parent.';
  }

  const objections: [string, string][] = sel ? [
    ['We already have a compliance system.', "Those run Facilities or Dietary — not both. The kitchen is the one room where the same surveyor cites both in one visit, and nothing spans that gap. That's the only thing EvidLY does."],
    ['Our hood vendor keeps those records.', "That's exactly the problem — the record lives in the vendor's truck. The surveyor asks you, not your vendor. EvidLY has the vendor upload it the day they finish, so it's in your file, not theirs."],
    ['Are you trying to sell me hood cleaning?', "No. Keep every vendor you have. EvidLY sits over whoever you use — it's the record, not the service."],
    ["We just had our survey / we're not due for a while.", "Surveys are unannounced — you can't get ready for a date you don't know. The file has to be right all the time, not the week before. And the tags from your last survey stay on your record through the next cycle."],
    ["We've never had a records problem.", `One question and I'll let you go: if a surveyor asked for your last hood and suppression report right now, how long to put it in their hands?${tie ? ` Your last survey wrote up the kitchen on ${tie}. That's almost never a dirty kitchen — it's the record not being there.` : ''}`],
    ["It's not in the budget.", `One F-tag fine runs anywhere from about $2,700 to $27,000 per instance.${fines > 0 ? ` You've already paid ${money(fines)} in federal fines — that's the budget conversation.` : ''} This is a risk line, not a compliance line — it belongs with whoever owns survey exposure.`],
    ['What does it cost?', "It's priced per kitchen, and for one facility it's a fraction of a single citation. Let me show you the file on a screen and give you the exact number for your building — fifteen minutes."],
    ['Corporate decides that.', "Understood. Who at corporate owns survey readiness? I'd rather come in through you than around you — would you make the introduction? I'll send you the portfolio view first so you're the one bringing it."],
    ['Just send me something.', "Happy to — what's the best email? And let's put fifteen minutes on the calendar so it doesn't sit in the inbox. Tuesday or Thursday?"],
    ['Not interested.', "Fair enough. Before I go — how long would it take you to get that last hood report? … Okay. I'll leave you my number in case that ever gets asked of you. Thanks for the time."],
  ] : [];

  const box = (label: string, value: string | number, accent?: string, badge?: string) => (
    <div className="border rounded-md px-3 py-2" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <div className="text-[9.5px] font-bold tracking-wider" style={{ color: EV_MUTED }}>{label}</div>
      <div className="text-lg font-bold mt-0.5" style={{ color: accent ?? EV_NAVY, fontFamily: DISPLAY }}>{value}</div>
      {badge && <div className="text-[9.5px] font-semibold mt-0.5" style={{ color: accent ?? EV_MUTED }}>{badge}</div>}
    </div>
  );

  const scriptBlock = (title: string, lines: string[], hint: string) => (
    <div className="border rounded-md mb-2" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <div className="px-3 py-2 border-b text-[11px] font-bold tracking-wider"
        style={{ borderColor: EV_LINE, color: EV_NAVY }}>{title}</div>
      <div className="px-3 py-2">
        {lines.filter(Boolean).map((l, i) => (
          <p key={i} className="text-[12px] mb-1.5 leading-relaxed" style={{ color: EV_INK }}>“{l}”</p>
        ))}
        <p className="text-[11px] mt-2 italic" style={{ color: EV_MUTED }}>{hint}</p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: BODY }}>
      {/* ── KPI strip ────────────────────────────────────────────── */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <KpiMini l="Showing"                 v={kpis.showing.toLocaleString()} sub={`of ${kpis.total.toLocaleString()}`} />
        <KpiMini l="Facilities in California" v={kpis.total.toLocaleString()} />
        <KpiMini l="Parent companies"        v={kpis.parents.toLocaleString()} />
        <KpiMini l="Not called"              v={kpis.notCalled.toLocaleString()} />
        <KpiMini l="Calls logged"            v={kpis.callsLogged.toLocaleString()} accent={EV_EMBER} />
        <KpiMini l="Callbacks due"           v={kpis.callbacksDue.toLocaleString()} accent={EV_WARN} />
        <KpiMini l="Interested"              v={kpis.interested.toLocaleString()} accent={EV_SUCCESS} />
        <KpiMini l="Pilots"                  v={kpis.pilots.toLocaleString()} accent={EV_SUCCESS} />
      </div>
      <div className="text-[11px] mb-3" style={{ color: EV_MUTED }}>
        Data as of {kpis.dataAsOf ? fmtDate(kpis.dataAsOf) : '—'}
      </div>

      {error && (
        <div className="border rounded-md px-4 py-3 mb-3 text-[12px]"
          style={{ borderColor: EV_DANGER, color: EV_DANGER, backgroundColor: EV_CREAM }}>
          {error}
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-3 border rounded-md mb-3"
        style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <select value={fChain} onChange={e => setFChain(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, maxWidth: 260 }}>
          <option value="">All parent companies</option>
          {chains.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select value={fCounty} onChange={e => setFCounty(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY }}>
          <option value="">All counties</option>
          {counties.map(c => <option key={c} value={c}>{titleCase(c)}</option>)}
        </select>

        <select value={fFines} onChange={e => setFFines(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY }}>
          <option value="">Federal fines: any</option>
          <option value="high">$100,000 and up</option>
          <option value="mid">$25,000–$99,999</option>
          <option value="low">Under $25,000</option>
          <option value="none">No fines</option>
          <option value="any">Has fines (any)</option>
        </select>

        <select value={fStatus} onChange={e => setFStatus(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY }}>
          {STATUS_FILTERS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY }}>
          <option value="fines">Federal fines highest first</option>
          <option value="pain">Most pain first</option>
          <option value="company">Company A–Z</option>
          <option value="name">Name A–Z</option>
        </select>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, city, administrator, company"
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, minWidth: 260 }} />

        <span className="ml-auto text-[12px] font-semibold" style={{ color: EV_MUTED }}>
          Showing {kpis.showing.toLocaleString()} of {kpis.total.toLocaleString()} · {money(kpis.shownFines)} in federal fines shown
        </span>
      </div>

      {/* ── Two columns ──────────────────────────────────────────── */}
      <div ref={containerRef} className="flex items-start" style={{ gap: 0 }}>
        {/* LIST */}
        <div className="flex-1 border rounded-lg overflow-hidden" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          {loading ? (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading facilities…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: EV_MUTED }}>No facilities match these filters.</div>
          ) : (
            <div className="overflow-x-auto" style={{ maxHeight: 760, overflowY: 'auto' }}>
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0" style={{ backgroundColor: EV_LIGHT }}>
                  <tr className="border-b" style={{ borderColor: EV_LINE }}>
                    <th className="py-2 px-3 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>Facility</th>
                    <th className="py-2 px-3 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>Administrator</th>
                    <th className="py-2 px-3">{sortBtn('pain', 'Kitchen fire-suppression (K324)')}</th>
                    <th className="py-2 px-3">{sortBtn('pain', 'Food-service (F812)')}</th>
                    <th className="py-2 px-3">{sortBtn('pain', 'Both')}</th>
                    <th className="py-2 px-3">{sortBtn('fines', 'Federal fines')}</th>
                    <th className="py-2 px-3 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>Status</th>
                    <th className="py-2 px-3 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(fac => {
                    const isSel = fac.ccn === selected;
                    const tier = fineTier(fac.fines_total);
                    const pct = Math.min(100, (Number(fac.fines_total ?? 0) / maxFines) * 100);
                    const nCalls = callsByCcn.get(fac.ccn)?.length ?? 0;
                    return (
                      <tr key={fac.ccn}
                        onClick={() => { setSelected(fac.ccn); setSaveError(null); }}
                        className="border-b last:border-b-0 cursor-pointer"
                        style={{
                          borderColor: EV_LINE,
                          backgroundColor: isSel ? EV_CREAM : fac.sff_status ? '#FCF4F1' : undefined,
                          boxShadow: isSel ? `inset 3px 0 0 0 ${EV_EMBER}` : undefined,
                        }}>
                        <td className="py-2.5 px-3">
                          <div className="text-[13px] font-semibold" style={{ color: EV_NAVY }}>
                            {titleCase(fac.name) || '—'}
                            {fac.sff_status && (
                              <span className="ml-2 text-[9.5px] font-bold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: EV_DANGER, color: '#fff' }}>Special Focus</span>
                            )}
                          </div>
                          <div className="text-[11px]" style={{ color: EV_MUTED }}>
                            {titleCase(fac.city) || '—'} · {titleCase(fac.county) || '—'}
                          </div>
                          <div className="text-[11px]" style={{ color: EV_FAINT }}>
                            {titleCase(fac.chain_name) || 'Independent (no chain)'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[12px]" style={{ color: EV_INK }}>{displayAdmin(fac.admin_name) || '—'}</div>
                          <div className="text-[11px]" style={{ color: EV_MUTED, fontFamily: MONO }}>{displayPhone(fac.phone) || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[13px]" style={{ color: EV_NAVY, fontFamily: MONO }}>{fac.k324 ?? 0}</td>
                        <td className="py-2.5 px-3 text-[13px]" style={{ color: EV_NAVY, fontFamily: MONO }}>{fac.f812 ?? 0}</td>
                        <td className="py-2.5 px-3 text-[13px] font-bold"
                          style={{ color: both > 0 && isSel ? EV_EMBER : EV_NAVY, fontFamily: MONO }}>
                          {fac.both_same_survey ?? 0}
                        </td>
                        <td className="py-2.5 px-3" style={{ minWidth: 120 }}>
                          {Number(fac.fines_total ?? 0) === 0 ? (
                            <span className="text-[13px]" style={{ color: EV_FAINT }}>—</span>
                          ) : (
                            <>
                              <div className="text-[13px]" style={{ color: EV_NAVY, fontFamily: MONO }}>{money(fac.fines_total)}</div>
                              <div style={{ height: 3, backgroundColor: EV_LINE, borderRadius: 2, marginTop: 3 }}>
                                <div style={{ height: 3, width: `${pct}%`, backgroundColor: tier?.color ?? EV_FAINT, borderRadius: 2 }} />
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11.5px]" style={{ color: EV_MUTED }}>
                          {outcomeLabel(fac.call_status)}
                        </td>
                        <td className="py-2.5 px-3 text-[13px]" style={{ color: nCalls ? EV_EMBER : EV_FAINT, fontFamily: MONO }}>
                          {nCalls}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RESIZE HANDLE — drag to size the card, double-click to reset,
            Left/Right arrows to nudge it 16px when focused. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the call card"
          tabIndex={0}
          onMouseDown={e => { e.preventDefault(); setDragging(true); }}
          onMouseEnter={() => setHandleHot(true)}
          onMouseLeave={() => setHandleHot(false)}
          onFocus={() => setHandleHot(true)}
          onBlur={() => setHandleHot(false)}
          onDoubleClick={() => commitWidth(CARD_DEFAULT)}
          onKeyDown={e => {
            if (e.key === 'ArrowLeft')  { e.preventDefault(); commitWidth(cardWidth + 16); }
            if (e.key === 'ArrowRight') { e.preventDefault(); commitWidth(cardWidth - 16); }
          }}
          title="Drag to resize · double-click to reset"
          style={{
            width: 8, flexShrink: 0, alignSelf: 'stretch', minHeight: 200,
            cursor: 'col-resize', display: 'flex', alignItems: 'center',
            justifyContent: 'center', outline: 'none', background: 'transparent',
          }}
        >
          <div style={{
            width: dragging || handleHot ? 3 : 2, height: '100%', borderRadius: 2,
            backgroundColor: dragging ? EV_EMBER : handleHot ? EV_MUTED : EV_LINE,
            transition: dragging ? undefined : 'background-color 120ms, width 120ms',
          }} />
        </div>

        {/* CALL CARD */}
        <div className="border rounded-lg" style={{
          borderColor: EV_LINE, backgroundColor: EV_PAPER,
          width: cardWidth, flexShrink: 0, maxHeight: 760, overflowY: 'auto',
        }}>
          {!sel ? (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: EV_MUTED }}>
              Select a facility to open the call card.
            </div>
          ) : (
            <div className="p-4">
              <h2 className="text-xl font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{titleCase(sel.name) || '—'}</h2>
              <div className="text-[12px] mt-0.5" style={{ color: EV_MUTED }}>
                {titleCase(sel.chain_name) || 'Independent (no chain)'} · {titleCase(sel.city) || '—'}, {titleCase(sel.county) || '—'} · {sel.beds ?? '—'} beds
              </div>

              <div className="mt-3 pb-3 border-b" style={{ borderColor: EV_LINE }}>
                <a href={`tel:${(sel.phone ?? '').replace(/[^0-9+]/g, '')}`}
                  className="text-xl font-bold no-underline" style={{ color: EV_EMBER, fontFamily: MONO }}>
                  {displayPhone(sel.phone) || '—'}
                </a>
                <div className="text-[11px] mt-1" style={{ color: EV_MUTED }}>Administrator</div>
                <div className="text-[13px]" style={{ color: EV_INK }}>{displayAdmin(sel.admin_name) || '—'}</div>
                {sel.admin_email && (
                  <a href={`mailto:${sel.admin_email}`} className="text-[12px]" style={{ color: EV_SLATE }}>
                    {sel.admin_email}
                  </a>
                )}
                <div className="mt-2">
                  <a href={careCompareUrl(sel.ccn)} target="_blank" rel="noreferrer"
                    className="text-[12px] font-semibold" style={{ color: EV_NAVY }}>
                    Verify on Care Compare →
                  </a>
                </div>
              </div>

              {/* Current */}
              <div className="flex items-center gap-2 flex-wrap py-3 border-b" style={{ borderColor: EV_LINE }}>
                <span className="text-[11px] font-bold px-2 py-1 rounded"
                  style={{
                    backgroundColor: sel.sff_status && selCalls.length === 0 ? EV_DANGER : EV_LIGHT,
                    color: sel.sff_status && selCalls.length === 0 ? '#fff' : EV_NAVY,
                  }}>
                  {sel.sff_status && selCalls.length === 0 ? `Skip · ${sel.sff_status}` : outcomeLabel(sel.call_status)}
                </span>
                <span className="text-[11.5px]" style={{ color: EV_MUTED }}>{selCalls.length} calls logged</span>
                {selCalls[0] && (
                  <span className="text-[11.5px]" style={{ color: EV_MUTED }}>
                    last: {outcomeLabel(selCalls[0].outcome)} {fmtDate(selCalls[0].called_at)}
                  </span>
                )}
                {sel.next_step_date && (
                  <span className="text-[11.5px] font-semibold" style={{ color: EV_WARN }}>
                    next step {fmtDate(sel.next_step_date)}
                  </span>
                )}
              </div>

              {/* Number boxes */}
              <div className="grid gap-2 py-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                {box('Kitchen fire-suppression (K324)', k, k > 0 ? EV_EMBER : undefined)}
                {box('Food-service (F812)', f, f > 0 ? EV_EMBER : undefined)}
                {box('Both, same survey', both, both > 0 ? EV_EMBER : undefined)}
                {box('Federal fines', fines === 0 ? '—' : money(fines), fineTier(fines)?.color, fineTier(fines)?.label)}
                {box('Rating', sel.overall_rating ? '★'.repeat(sel.overall_rating) : '—')}
              </div>

              <p className="text-[11px] leading-relaxed pb-3 border-b" style={{ color: EV_MUTED, borderColor: EV_LINE }}>
                K324 = hood, duct and kitchen suppression system kept to NFPA 96, and their service records on hand — usually a records-weren't-there finding.
                F812 = food stored, prepared and served sanitarily; temp logs, handling — the most-cited nursing-facility tag in this region.
                Both = a fire tag and a food tag written up in one survey visit.
              </p>

              <div className="my-3 px-3 py-2 rounded-md text-[12px] font-semibold leading-relaxed"
                style={{ backgroundColor: EV_CREAM, color: EV_NAVY, borderLeft: `3px solid ${EV_EMBER}` }}>
                {leadWith}
              </div>

              {/* Scripts */}
              <h3 className="text-[12px] font-bold tracking-wider mt-4 mb-2" style={{ color: EV_NAVY }}>Scripts</h3>
              {scriptBlock(`They answer — ${adminFull}`, [
                `Hi ${first}, Arthur Haggerty, founder of EvidLY — Commercial Kitchen Risk Management. I built it after years running a hood-cleaning company doing 350-plus services a year in California kitchens — I was the guy emailing reports nobody could ever find.`,
                'If a surveyor asked for your last hood and suppression report right now — how long to put it in their hands?',
                tie ? `Your last survey wrote up the kitchen on ${tie}. That's almost never a dirty kitchen — it's the record not being there.` : '',
                "I'm putting three California operators in a pilot this fall. Fifteen minutes on a screen — when's good?",
              ], 'Let them answer the clock question. “I’d have to call my guy” is the gap — you didn’t say it, they did.')}

              {scriptBlock('Gatekeeper — front desk / receptionist', [
                `Hi, this is Arthur Haggerty with EvidLY — is ${adminFull} available?`,
                tie
                  ? `It's about the kitchen survey records — the ${which} findings from the last survey. Takes two minutes.`
                  : 'It’s about survey readiness for the kitchen. Takes two minutes.',
                `If not now — what's a good time, and is it still ${first} I should ask for?`,
              ], 'Confirm the name — administrators turn over fast. Get a time, not “call back later.”')}

              {scriptBlock('Voicemail', [
                `${first}, Arthur Haggerty with EvidLY — Commercial Kitchen Risk Management.`,
                tie
                  ? `Calling about the ${which} findings on your last survey — most of the time that's a records problem, and it's fixable.`
                  : 'Calling about keeping your kitchen survey records in one place.',
                `Call me at 855-384-3591. I'll try you again ${nextWeekday()}.`,
              ], 'Under 25 seconds. Number twice if you have room.')}

              {/* Objections */}
              <h3 className="text-[12px] font-bold tracking-wider mt-4 mb-2" style={{ color: EV_NAVY }}>If they push back</h3>
              {objections.map(([q, a], i) => (
                <div key={i} className="mb-2 pb-2 border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                  <div className="text-[12px] font-semibold" style={{ color: EV_NAVY }}>{i + 1}. “{q}”</div>
                  <div className="text-[12px] mt-0.5 leading-relaxed" style={{ color: EV_INK }}>{a}</div>
                </div>
              ))}

              {/* Log this call */}
              <h3 className="text-[12px] font-bold tracking-wider mt-4 mb-2" style={{ color: EV_NAVY }}>Log this call</h3>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {OUTCOMES.map(o => (
                  <button key={o.id} onClick={() => setOutcome(o.id)}
                    className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md cursor-pointer"
                    style={{
                      border: `1px solid ${outcome === o.id ? EV_EMBER : EV_LINE}`,
                      backgroundColor: outcome === o.id ? EV_EMBER : '#fff',
                      color: outcome === o.id ? '#fff' : EV_NAVY,
                    }}>
                    {o.label}
                  </button>
                ))}
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Notes"
                className="w-full text-[12px] border rounded-md px-2 py-1.5 outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <label className="text-[11.5px]" style={{ color: EV_MUTED }}>Next step date</label>
                <input type="date" value={nextStep} onChange={e => setNextStep(e.target.value)}
                  className="text-[12px] border rounded-md px-2 py-1 outline-none"
                  style={{ borderColor: EV_LINE, color: EV_NAVY }} />
                <button onClick={saveCall} disabled={!outcome || saving}
                  className="ml-auto text-[12px] font-bold px-3 py-2 rounded-md border-none"
                  style={{
                    backgroundColor: !outcome || saving ? EV_LINE : EV_EMBER,
                    color: !outcome || saving ? EV_MUTED : '#fff',
                    cursor: !outcome || saving ? 'not-allowed' : 'pointer',
                  }}>
                  {saving ? 'Saving…' : 'Save call — stamps date & time'}
                </button>
              </div>
              {saveError && (
                <div className="mt-2 text-[11.5px]" style={{ color: EV_DANGER }}>{saveError}</div>
              )}

              {/* History */}
              <h3 className="text-[12px] font-bold tracking-wider mt-4 mb-2" style={{ color: EV_NAVY }}>Call history</h3>
              {selCalls.length === 0 ? (
                <div className="text-[12px]" style={{ color: EV_MUTED }}>No calls logged yet.</div>
              ) : selCalls.map(c => (
                <div key={c.id} className="border rounded-md px-3 py-2 mb-2" style={{ borderColor: EV_LINE }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11.5px] font-bold" style={{ color: EV_NAVY }}>{outcomeLabel(c.outcome)}</span>
                    <span className="text-[11px]" style={{ color: EV_MUTED }}>{fmtDateTime(c.called_at)}</span>
                    {c.next_step_date && (
                      <span className="text-[11px] font-semibold" style={{ color: EV_WARN }}>
                        next step {fmtDate(c.next_step_date)}
                      </span>
                    )}
                  </div>
                  {c.notes && (
                    <div className="text-[12px] mt-1" style={{ color: EV_INK, whiteSpace: 'pre-wrap' }}>{c.notes}</div>
                  )}
                  {c.created_by && (
                    <div className="text-[10.5px] mt-1" style={{ color: EV_FAINT }}>{c.created_by}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
