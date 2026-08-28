/**
 * FollowUpsTab — the finite daily follow-up queue.
 *
 * Everything here derives from existing tables: sales_pipeline,
 * pipeline_touches and marketing_planner_config. No new tables, no new
 * columns. The surface starts empty and shows real records only — the
 * mock's sample rows are illustrative and are not reproduced.
 *
 * "Pipeline moved" is deliberately not computed. Deriving it needs a
 * stage-entered timestamp, and none exists on sales_pipeline (only
 * created_at / updated_at / won_date / lost_date). Approximating from
 * updated_at would report a number that is not the thing it claims to be,
 * so the link renders "—" with the NO LIVE SOURCE tag instead.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, EV_PAPER, DISPLAY, BODY,
} from './marketingTokens';

// ── Mock tokens the console does not already carry ───────────────
const CREAM = '#F7F4EC';
const GREEN = '#3F6B4F';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const TERMINAL_STAGES = '(won,lost,churned)';

/**
 * Come-back ladders, in days, keyed by sales_pipeline.source.
 *
 * Only the door-knock / in-person rungs are specified — 4 → 14 → 45 from the
 * mock. Every other source uses the same rungs until real numbers are supplied
 * for it, rather than inventing a cadence per channel. Past the last rung the
 * default is the 21-day long re-entry.
 */
const LADDERS: Record<string, number[]> = {
  door_knock: [4, 14, 45],
  in_person: [4, 14, 45],
};
const DEFAULT_LADDER = [4, 14, 45];
const LONG_REENTRY_DAYS = 21;

function ladderFor(source: string | null): number[] {
  return (source && LADDERS[source]) || DEFAULT_LADDER;
}

/**
 * pipeline_touches.touch_type is constrained to
 *   call | email | in_person | show | other
 * while sales_pipeline.source is a free vocabulary ('study', 'door_knock',
 * null, ...). Passing source straight through fails the CHECK and the whole
 * save is rejected, so map it and fall back to the permitted 'other'.
 */
const TOUCH_TYPE_BY_SOURCE: Record<string, string> = {
  call: 'call',
  cold_call: 'call',
  outbound_call: 'call',
  phone: 'call',
  email: 'email',
  in_person: 'in_person',
  door_knock: 'in_person',
  field: 'in_person',
  show: 'show',
  trade_show: 'show',
};

function touchTypeFor(source: string | null): string {
  return (source && TOUCH_TYPE_BY_SOURCE[source]) || 'other';
}

const OUTCOMES = [
  { key: 'connected', label: 'Connected' },
  { key: 'no_answer', label: 'No answer' },
  { key: 'not_now', label: 'Not now' },
  { key: 'not_a_fit', label: 'Not a fit' },
] as const;

interface QueueRow {
  id: string;
  org_name: string;
  contact_name: string | null;
  county: string | null;
  source: string | null;
  stage: string;
  notes: string | null;
  next_action_at: string;
  /** Per-row brand. Every record is EvidLY today; other brands can feed in. */
  brand: string;
  touchCount: number;
  lastTouch: { date: string; note: string | null } | null;
}

interface Config {
  goal_count: number;
  goal_period: 'week' | 'month';
  include_enterprise_path: boolean;
  rate_touch_contact: number;
  rate_contact_discovery: number;
  rate_discovery_tour: number;
  rate_tour_won: number;
  rate_tour_proposal: number;
  rate_proposal_negotiation: number;
  rate_negotiation_won: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function safeDiv(n: number, rate: number): number {
  return rate <= 0 ? n * 100 : n / (rate / 100);
}

/** Touches needed per close, from the Planner's own backward math. */
function touchesPerClose(c: Config): number {
  if (c.include_enterprise_path) {
    const negotiation = safeDiv(1, c.rate_negotiation_won);
    const proposal = safeDiv(negotiation, c.rate_proposal_negotiation);
    const tour = safeDiv(proposal, c.rate_tour_proposal);
    const discovery = safeDiv(tour, c.rate_discovery_tour);
    const contact = safeDiv(discovery, c.rate_contact_discovery);
    return Math.ceil(safeDiv(contact, c.rate_touch_contact));
  }
  const tour = safeDiv(1, c.rate_tour_won);
  const discovery = safeDiv(tour, c.rate_discovery_tour);
  const contact = safeDiv(discovery, c.rate_contact_discovery);
  return Math.ceil(safeDiv(contact, c.rate_touch_contact));
}

function periodBounds(period: 'week' | 'month') {
  const now = new Date();
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const total = end.getDate();
    return { start: iso(start), end: iso(end), dayOf: now.getDate(), total };
  }
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const dayOf = Math.round((now.getTime() - mon.getTime()) / 86400000) + 1;
  return { start: iso(mon), end: iso(sun), dayOf, total: 7 };
}

// ── Small presentational pieces ──────────────────────────────────

function Pill({ children, tone }: { children: React.ReactNode; tone?: 'brand' | 'rung' | 'due' | 'over' | 'gray' }) {
  const base: React.CSSProperties = {
    fontSize: 11, padding: '3px 8px', borderRadius: 2,
    border: `1px solid ${EV_LINE}`, color: EV_MUTED, background: CREAM, whiteSpace: 'nowrap',
  };
  const tones: Record<string, React.CSSProperties> = {
    brand: { borderColor: '#C9B8D6', color: '#5B3F73', background: '#F6F1FA' },
    rung: { fontFamily: MONO, letterSpacing: '.02em' },
    due: { borderColor: '#C9D6C4', color: GREEN, background: '#F0F5EE' },
    over: { borderColor: '#E0B4A6', color: '#A03B1C', background: '#FBEDE8' },
    gray: {},
  };
  return <span style={{ ...base, ...(tone ? tones[tone] : {}) }}>{children}</span>;
}

const BTN_PRIMARY: React.CSSProperties = {
  background: EV_EMBER, color: '#FFF', border: `1px solid ${EV_EMBER}`,
  fontWeight: 600, fontSize: 13, borderRadius: 2, padding: '9px 14px',
  cursor: 'pointer', fontFamily: BODY,
};
const BTN_QUIET: React.CSSProperties = {
  background: EV_PAPER, color: EV_NAVY, border: `1px solid ${EV_LINE}`,
  fontSize: 13, borderRadius: 2, padding: '9px 14px', cursor: 'pointer', fontFamily: BODY,
};

// ── Component ────────────────────────────────────────────────────

export default function FollowUpsTab() {
  const navigate = useNavigate();
  const today = iso(new Date());

  const [config, setConfig] = useState<Config | null>(null);
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [banked, setBanked] = useState(0);
  const [doneToday, setDoneToday] = useState(0);
  const [streakPct, setStreakPct] = useState<number | null>(null);
  const [adh, setAdh] = useState({ dayDone: 0, dayTotal: 0, weekDone: 0, weekTotal: 0, nos: 0, noNextAction: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Log panel
  const [openId, setOpenId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string>('not_now');
  const [days, setDays] = useState(LONG_REENTRY_DAYS);
  const [exactDate, setExactDate] = useState('');
  const [note, setNote] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [saving, setSaving] = useState(false);
  /** Save failure, shown in the panel footer rather than at the page top. */
  const [saveErr, setSaveErr] = useState<string | null>(null);
  /** Close-out reveals the reason field without requiring the chip first. */
  const [closingOut, setClosingOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    const { data: cfg, error: cfgErr } = await supabase
      .from('marketing_planner_config')
      .select('goal_count, goal_period, include_enterprise_path, rate_touch_contact, rate_contact_discovery, rate_discovery_tour, rate_tour_won, rate_tour_proposal, rate_proposal_negotiation, rate_negotiation_won')
      .maybeSingle();
    if (cfgErr) { setErr(cfgErr.message); setLoading(false); return; }
    const conf = (cfg as Config) ?? null;
    setConfig(conf);

    const { data: due, error: dueErr } = await supabase
      .from('sales_pipeline')
      .select('id, org_name, contact_name, county, source, stage, notes, next_action_at')
      .not('stage', 'in', TERMINAL_STAGES)
      .lte('next_action_at', today)
      .order('next_action_at', { ascending: true });
    if (dueErr) { setErr(dueErr.message); setLoading(false); return; }

    const dueRows = (due || []) as Omit<QueueRow, 'brand' | 'touchCount' | 'lastTouch'>[];
    const ids = dueRows.map(r => r.id);

    // Touch history for the rows on screen — rung position and last-touch line.
    let touchesByRow = new Map<string, { count: number; last: { date: string; note: string | null } | null }>();
    if (ids.length > 0) {
      const { data: th } = await supabase
        .from('pipeline_touches')
        .select('pipeline_id, touch_date, note')
        .in('pipeline_id', ids)
        .order('touch_date', { ascending: false });
      touchesByRow = new Map();
      for (const t of (th || []) as { pipeline_id: string; touch_date: string; note: string | null }[]) {
        const cur = touchesByRow.get(t.pipeline_id);
        if (!cur) touchesByRow.set(t.pipeline_id, { count: 1, last: { date: t.touch_date, note: t.note } });
        else cur.count++;
      }
    }

    setRows(dueRows.map(r => ({
      ...r,
      brand: 'EvidLY',
      touchCount: touchesByRow.get(r.id)?.count ?? 0,
      lastTouch: touchesByRow.get(r.id)?.last ?? null,
    })));

    // Touches banked this period.
    if (conf) {
      const { start, end } = periodBounds(conf.goal_period);
      const { count } = await supabase
        .from('pipeline_touches')
        .select('id', { count: 'exact', head: true })
        .gte('touch_date', start)
        .lte('touch_date', end);
      setBanked(count ?? 0);
    }

    // Due rows already touched today.
    if (ids.length > 0) {
      const { data: doneRows } = await supabase
        .from('pipeline_touches')
        .select('pipeline_id')
        .eq('touch_date', today)
        .in('pipeline_id', ids);
      setDoneToday(new Set((doneRows || []).map((r: { pipeline_id: string }) => r.pipeline_id)).size);
    } else {
      setDoneToday(0);
    }

    // ── Adherence, using AdherenceCards' own definitions ──────────
    const mon = new Date();
    mon.setDate(mon.getDate() + (mon.getDay() === 0 ? -6 : 1 - mon.getDay()));
    const mondayStr = iso(mon);
    const nextMon = new Date(mon); nextMon.setDate(mon.getDate() + 7);
    const nextMondayStr = iso(nextMon);

    const { count: weekDone } = await supabase
      .from('pipeline_touches')
      .select('pipeline_id', { count: 'exact', head: true })
      .gte('touch_date', mondayStr).lt('touch_date', nextMondayStr)
      .not('was_due_on', 'is', null).lte('was_due_on', today);

    let stillDue = 0;
    if (ids.length > 0) {
      const { data: touchedRows } = await supabase
        .from('pipeline_touches')
        .select('pipeline_id')
        .gte('touch_date', mondayStr).lt('touch_date', nextMondayStr)
        .in('pipeline_id', ids);
      const touched = new Set((touchedRows || []).map((r: { pipeline_id: string }) => r.pipeline_id));
      stillDue = ids.filter(i => !touched.has(i)).length;
    }

    const { count: nos } = await supabase
      .from('pipeline_touches')
      .select('id', { count: 'exact', head: true })
      .gte('touch_date', mondayStr).lt('touch_date', nextMondayStr)
      .in('outcome', ['not_now', 'not_a_fit']);

    const { count: noNa } = await supabase
      .from('sales_pipeline')
      .select('id', { count: 'exact', head: true })
      .not('stage', 'in', TERMINAL_STAGES)
      .is('next_action_at', null);

    const wd = weekDone ?? 0;

    // Streak: same adherence measure over the trailing 14 days.
    const back14 = new Date(); back14.setDate(back14.getDate() - 13);
    const { count: done14 } = await supabase
      .from('pipeline_touches')
      .select('id', { count: 'exact', head: true })
      .gte('touch_date', iso(back14)).lte('touch_date', today)
      .not('was_due_on', 'is', null).lte('was_due_on', today);
    const { count: due14 } = await supabase
      .from('pipeline_touches')
      .select('id', { count: 'exact', head: true })
      .gte('was_due_on', iso(back14)).lte('was_due_on', today);
    setStreakPct(due14 && due14 > 0 ? Math.round(((done14 ?? 0) / due14) * 100) : null);

    setAdh({
      dayDone: 0, dayTotal: 0,
      weekDone: wd, weekTotal: wd + stillDue,
      nos: nos ?? 0, noNextAction: noNa ?? 0,
    });
    setLoading(false);
  }, [today]);

  useEffect(() => { void load(); }, [load]);

  const dueTotal = rows.length;
  const leftToday = Math.max(dueTotal - doneToday, 0);
  const perClose = config ? touchesPerClose(config) : 0;
  const required = config ? config.goal_count * perClose : 0;
  const bounds = config ? periodBounds(config.goal_period) : null;
  const toNextYes = perClose > 0 ? perClose - (banked % perClose) : 0;

  const openRow = useMemo(() => rows.find(r => r.id === openId) || null, [rows, openId]);

  /** The date the next action will be set to — exact date wins over the count. */
  const computedNextDate = exactDate || iso(new Date(Date.now() + days * 86400000));

  /**
   * The gate the panel copy promises: no save without an outcome and a next
   * action, and no close-out without a reason.
   */
  const canSave = !saving && !!outcome && !!computedNextDate && (!closingOut || !!lostReason.trim());

  function beginLog(row: QueueRow) {
    const ladder = ladderFor(row.source);
    const rung = row.touchCount; // 0-based index of the rung being set now
    setOpenId(row.id);
    setOutcome('not_now');
    setDays(rung < ladder.length ? ladder[rung] : LONG_REENTRY_DAYS);
    setExactDate('');
    setNote('');
    setLostReason('');
    setSaveErr(null);
    setClosingOut(false);
  }

  async function save(closeOut: boolean) {
    if (!openRow) return;
    if (closeOut && !lostReason.trim()) return;
    setSaving(true);
    setSaveErr(null);

    const nextAt = closeOut
      ? null
      : exactDate || iso(new Date(Date.now() + days * 86400000));

    const { error: tErr } = await supabase.from('pipeline_touches').insert({
      pipeline_id: openRow.id,
      touch_type: touchTypeFor(openRow.source),
      outcome: closeOut ? 'not_a_fit' : outcome,
      was_due_on: openRow.next_action_at,
      touch_date: today,
      note: note.trim() || null,
      next_action_set: nextAt,
    });
    if (tErr) { setSaveErr(tErr.message); setSaving(false); return; }

    const patch: Record<string, unknown> = closeOut
      ? { stage: 'lost', lost_reason: lostReason.trim(), next_action_at: null }
      : { next_action_at: nextAt };
    if (note.trim()) {
      patch.notes = [openRow.notes, `${today}: ${note.trim()}`].filter(Boolean).join('\n');
    }

    const { error: pErr } = await supabase.from('sales_pipeline').update(patch).eq('id', openRow.id);
    if (pErr) { setSaveErr(pErr.message); setSaving(false); return; }

    const idx = rows.findIndex(r => r.id === openRow.id);
    const next = rows[idx + 1] || null;
    setSaving(false);
    await load();
    if (next) beginLog(next); else setOpenId(null);
  }

  if (loading) {
    return <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED, fontFamily: BODY }}>Loading…</div>;
  }

  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div style={{ fontFamily: BODY, color: EV_NAVY }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-.015em' }}>
            Follow-ups
          </h1>
          <p style={{ color: EV_MUTED, fontSize: 14, margin: 0 }}>{dateLine} · Arthur · All three motions</p>
        </div>
        <div style={{ border: `1px solid ${EV_LINE}`, background: EV_PAPER, borderRadius: 2, padding: '8px 14px', fontSize: 13, color: EV_MUTED }}>
          Cadence adherence, last 14 days&nbsp;&nbsp;
          <b style={{ color: EV_EMBER, fontFamily: MONO, fontSize: 15 }}>
            {streakPct === null ? '—' : `${streakPct}%`}
          </b>
        </div>
      </div>

      {/* ── The chain ──────────────────────────────────────────── */}
      <section style={{ background: EV_NAVY, color: '#FFF', borderRadius: 3, padding: '22px 24px', marginBottom: 26 }}>
        <p style={{ fontSize: 12, color: '#A9B4C9', margin: '0 0 16px', letterSpacing: '.02em' }}>
          From the planner goal to the money — one chain
        </p>
        <div style={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap' }}>
          {[
            {
              k: `Close goal, this ${config?.goal_period ?? 'week'}`,
              v: config ? String(config.goal_count) : '—',
              n: 'Set in the Planner',
            },
            {
              k: 'Touches required',
              v: required > 0 ? String(required) : '—',
              n: perClose > 0 ? `${perClose} per close, from your funnel` : 'Set a goal in the Planner',
            },
            {
              k: 'Touches banked',
              v: String(banked),
              n: required > 0 && bounds
                ? `${Math.round((banked / required) * 100)}% of the goal, day ${bounds.dayOf} of ${bounds.total}`
                : '—',
            },
            {
              k: 'Due today',
              v: String(dueTotal),
              n: `${doneToday} done, ${leftToday} left`,
            },
            {
              k: 'Pipeline moved',
              v: '—',
              n: 'NO LIVE SOURCE',
              noSource: true,
            },
          ].map((l, i) => (
            <div
              key={l.k}
              style={{
                flex: '1 1 150px', minWidth: 140, paddingRight: 20,
                paddingLeft: i === 0 ? 0 : 20,
                borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,.14)',
              }}
            >
              <p style={{ fontSize: 12, color: '#A9B4C9', margin: '0 0 6px' }}>{l.k}</p>
              <p style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, lineHeight: 1, margin: '0 0 4px', color: l.noSource ? '#8C99B2' : '#FFF' }}>
                {l.v}
              </p>
              {l.noSource ? (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: '#8C99B2', background: 'rgba(255,255,255,.10)', borderRadius: 2, padding: '2px 5px' }}>
                  NO LIVE SOURCE
                </span>
              ) : (
                <p style={{ fontSize: 12, color: '#8C99B2', margin: 0 }}>{l.n}</p>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.14)', display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, color: '#FFF', margin: 0 }}>
            {perClose > 0 ? `${toNextYes} more touches to the next yes.` : 'Set a close goal in the Planner.'}
          </p>
          <p style={{ fontSize: 13, color: '#A9B4C9', margin: 0 }}>
            Every no you logged today moved that number down. That is the whole job.
          </p>
        </div>
      </section>

      {/* ── Today's queue ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, margin: '0 0 12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-.01em' }}>Today's queue</h2>
        <p style={{ fontFamily: MONO, fontSize: 13, color: EV_MUTED, margin: 0 }}>
          {leftToday} remaining · {doneToday} completed
        </p>
      </div>

      {err && (
        <div style={{ fontSize: 13, color: '#A03B1C', background: '#FBEDE8', border: '1px solid #E0B4A6', borderRadius: 3, padding: '10px 14px', marginBottom: 12 }}>
          {err}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: '34px 20px', textAlign: 'center', border: `1px dashed ${EV_LINE}`, borderRadius: 3, background: EV_PAPER, marginTop: 14 }}>
          <p style={{ margin: '0 0 6px', fontFamily: DISPLAY, fontSize: 18, fontWeight: 600 }}>
            When this list is empty, you are done for the day.
          </p>
          <span style={{ color: EV_MUTED, fontSize: 14 }}>No scrolling for more. The queue is finite on purpose.</span>
        </div>
      ) : (
        <div style={{ border: `1px solid ${EV_LINE}`, background: EV_PAPER, borderRadius: 3, overflow: 'hidden' }}>
          {rows.map((r, i) => {
            const overdueDays = Math.max(
              0,
              Math.round((new Date(today).getTime() - new Date(r.next_action_at).getTime()) / 86400000),
            );
            const ladder = ladderFor(r.source);
            const isLast = r.touchCount + 1 >= ladder.length;
            return (
              <div key={r.id}>
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, padding: '16px 18px',
                    borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${EV_LINE}`,
                    alignItems: 'start',
                    background: overdueDays > 0 ? '#FDF6F3' : undefined,
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 3px' }}>{r.contact_name || 'No contact name'}</p>
                    <p style={{ color: EV_MUTED, fontSize: 13, margin: '0 0 8px' }}>
                      {r.org_name}{r.county ? ` · ${r.county}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                      <Pill tone="brand">{r.brand}</Pill>
                      {r.source && <Pill>{r.source.replace(/_/g, ' ')}</Pill>}
                      <Pill tone="rung">
                        Touch {r.touchCount + 1} of {ladder.length}{isLast ? ' — last rung' : ''}
                      </Pill>
                      {overdueDays > 0
                        ? <Pill tone="over">Overdue {overdueDays} day{overdueDays === 1 ? '' : 's'}</Pill>
                        : <Pill tone="due">Due today</Pill>}
                    </div>
                    <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>
                      {r.lastTouch ? (
                        <>
                          <span style={{ color: EV_MUTED }}>Last touch, {r.lastTouch.date}:</span>{' '}
                          {r.lastTouch.note || 'No note recorded.'}
                        </>
                      ) : (
                        <span style={{ color: EV_MUTED }}>No touches logged yet.</span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 132 }}>
                    <button type="button" style={BTN_PRIMARY} onClick={() => beginLog(r)}>Log outcome</button>
                    <button type="button" style={BTN_QUIET} onClick={() => navigate(`/admin/sales?id=${r.id}`)}>Open thread</button>
                  </div>
                </div>

                {/* ── Log-outcome panel, inline under its row ──────── */}
                {openId === r.id && (
                  <section style={{ border: `1px solid ${EV_NAVY}`, background: EV_PAPER, borderRadius: 3, margin: '0 18px 18px', overflow: 'hidden' }}>
                    <div style={{ background: EV_NAVY, color: '#FFF', padding: '14px 18px' }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#A9B4C9' }}>
                        Logging touch {r.touchCount + 1} of {ladder.length} · {r.contact_name || 'No contact name'} · {r.org_name}
                      </p>
                      <h3 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, margin: '2px 0 0' }}>What happened?</h3>
                    </div>
                    <div style={{ padding: '20px 18px' }}>
                      <div style={{ marginBottom: 22 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 9 }}>Outcome</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {OUTCOMES.map(o => (
                            <button
                              key={o.key}
                              type="button"
                              onClick={() => setOutcome(o.key)}
                              style={{
                                border: `1px solid ${outcome === o.key ? EV_EMBER : EV_LINE}`,
                                background: outcome === o.key ? '#FBEDE8' : CREAM,
                                color: outcome === o.key ? EV_EMBER : EV_NAVY,
                                fontWeight: outcome === o.key ? 600 : 400,
                                borderRadius: 2, padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: BODY,
                              }}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ borderLeft: `3px solid ${EV_EMBER}`, background: '#FBEDE8', padding: '14px 16px', marginBottom: 20 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#7A3520' }}>
                          <b style={{ color: EV_EMBER }}>This lead cannot be saved without a next action.</b> Choose a
                          date to come back, or close it out to "Not a fit" with a reason. There is no third option — a
                          lead with no next step is not a record this system will hold.
                        </p>
                      </div>

                      <div style={{ marginBottom: 22 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 9 }}>
                          Come back in <span style={{ fontSize: 12, color: EV_MUTED, fontWeight: 400, marginLeft: 6 }}>or pick an exact date</span>
                        </label>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${EV_LINE}`, borderRadius: 2, background: EV_PAPER }}>
                            <button
                              type="button"
                              aria-label="Fewer days"
                              onClick={() => { setDays(d => Math.max(1, d - 1)); setExactDate(''); }}
                              style={{ padding: '9px 12px', border: 'none', borderRight: `1px solid ${EV_LINE}`, background: 'transparent', color: EV_MUTED, cursor: 'pointer', fontSize: 15, fontFamily: BODY }}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={days}
                              onChange={e => { setDays(Math.max(1, parseInt(e.target.value) || 1)); setExactDate(''); }}
                              style={{ padding: '9px 10px', fontFamily: MONO, fontSize: 14, width: 62, border: 'none', outline: 'none', background: 'transparent', color: EV_NAVY, textAlign: 'center' }}
                            />
                            <button
                              type="button"
                              aria-label="More days"
                              onClick={() => { setDays(d => d + 1); setExactDate(''); }}
                              style={{ padding: '9px 12px', border: 'none', borderLeft: `1px solid ${EV_LINE}`, background: 'transparent', color: EV_MUTED, cursor: 'pointer', fontSize: 15, fontFamily: BODY }}
                            >
                              +
                            </button>
                            <em style={{ fontStyle: 'normal', padding: '9px 12px', fontSize: 13, color: EV_MUTED, borderLeft: `1px solid ${EV_LINE}` }}>days</em>
                          </div>
                          <span style={{ color: EV_MUTED, fontSize: 13 }}>or</span>
                          <input
                            type="date"
                            value={exactDate}
                            onChange={e => setExactDate(e.target.value)}
                            style={{ ...BTN_QUIET, padding: '8px 12px' }}
                            aria-label="Pick a date"
                          />
                        </div>
                        <p style={{ fontSize: 12, color: EV_NAVY, margin: '10px 0 0' }}>
                          Next action lands on{' '}
                          <b style={{ fontFamily: MONO, fontWeight: 500 }}>{computedNextDate || '—'}</b>
                          {exactDate && <span style={{ color: EV_MUTED }}> (exact date overrides the day count)</span>}
                        </p>
                        <p style={{ fontSize: 12, color: EV_MUTED, margin: '6px 0 0' }}>
                          Ladder for {r.source ? r.source.replace(/_/g, ' ') : 'this source'}:{' '}
                          <b style={{ color: EV_NAVY, fontFamily: MONO, fontWeight: 500 }}>{ladder.join(' → ')} days</b>.
                          {isLast
                            ? ` This was the last rung, so the default moved to the long re-entry at ${LONG_REENTRY_DAYS} days.`
                            : ` You are on rung ${r.touchCount + 1}.`}
                          {' '}Change it if you have a reason; you do not have to decide from scratch.
                        </p>
                      </div>

                      <div style={{ marginBottom: 22 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 9 }}>
                          Note for future you <span style={{ fontSize: 12, color: EV_MUTED, fontWeight: 400, marginLeft: 6 }}>one line, what you would want to know</span>
                        </label>
                        <input
                          value={note}
                          onChange={e => setNote(e.target.value)}
                          style={{ width: '100%', border: `1px solid ${EV_LINE}`, background: CREAM, borderRadius: 2, padding: '9px 14px', fontSize: 13, color: EV_NAVY, fontFamily: BODY, outline: 'none' }}
                        />
                      </div>

                      {(outcome === 'not_a_fit' || closingOut) && (
                        <div style={{ marginBottom: 22 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 9 }}>
                            Reason <span style={{ fontSize: 12, color: EV_MUTED, fontWeight: 400, marginLeft: 6 }}>required to close out</span>
                          </label>
                          <input
                            value={lostReason}
                            onChange={e => setLostReason(e.target.value)}
                            style={{ width: '100%', border: `1px solid ${EV_LINE}`, background: CREAM, borderRadius: 2, padding: '9px 14px', fontSize: 13, color: EV_NAVY, fontFamily: BODY, outline: 'none' }}
                          />
                        </div>
                      )}
                    </div>
                    <div style={{ borderTop: `1px solid ${EV_LINE}`, padding: '16px 18px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: CREAM }}>
                      <button
                        type="button"
                        style={{ ...BTN_PRIMARY, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
                        disabled={!canSave}
                        onClick={() => save(false)}
                      >
                        {saving ? 'Saving…' : 'Save and go to next'}
                      </button>
                      <button
                        type="button"
                        style={BTN_QUIET}
                        disabled={saving}
                        onClick={() => {
                          // First press reveals the reason field; it is required
                          // before the close-out can be written.
                          if (!closingOut) { setClosingOut(true); setOutcome('not_a_fit'); return; }
                          if (lostReason.trim()) void save(true);
                        }}
                      >
                        {closingOut && !lostReason.trim() ? 'Reason required to close out' : 'Close out as "Not a fit"'}
                      </button>
                      <span style={{ fontSize: 12, color: EV_MUTED }}>{leftToday} left in today's queue</span>
                      {saveErr && (
                        <span style={{ fontSize: 12, color: '#A03B1C', flexBasis: '100%' }}>
                          Not saved — {saveErr}
                        </span>
                      )}
                    </div>
                  </section>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Adherence ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, margin: '34px 0 12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-.01em' }}>The number you are graded on</h2>
        <p style={{ fontFamily: MONO, fontSize: 13, color: EV_MUTED, margin: 0 }}>Adherence, not closes</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {[
          {
            k: "Today's adherence",
            v: dueTotal > 0 ? `${Math.round((doneToday / dueTotal) * 100)}%` : '—',
            bar: dueTotal > 0 ? Math.round((doneToday / dueTotal) * 100) : null,
            n: `${doneToday} of ${dueTotal} due follow-ups done`,
          },
          {
            k: 'This week',
            v: adh.weekTotal > 0 ? `${Math.round((adh.weekDone / adh.weekTotal) * 100)}%` : '—',
            bar: adh.weekTotal > 0 ? Math.round((adh.weekDone / adh.weekTotal) * 100) : null,
            n: `${adh.weekDone} of ${adh.weekTotal}`,
          },
          {
            k: 'Nos logged this week',
            v: String(adh.nos),
            bar: null,
            n: perClose > 0
              ? `Each one is 1/${perClose}th of a close. This is throughput.`
              : 'This is throughput.',
          },
          {
            k: 'Leads with no next action',
            v: String(adh.noNextAction),
            bar: null,
            n: 'The system will not let this rise above zero',
            green: adh.noNextAction === 0,
          },
        ].map(c => (
          <div key={c.k} style={{ border: `1px solid ${EV_LINE}`, background: EV_PAPER, borderRadius: 3, padding: '16px 18px' }}>
            <p style={{ fontSize: 12, color: EV_MUTED, margin: '0 0 8px' }}>{c.k}</p>
            <p style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, margin: '0 0 4px', lineHeight: 1, color: c.green ? GREEN : EV_NAVY }}>
              {c.v}
            </p>
            {c.bar !== null && (
              <div style={{ height: 5, background: EV_LINE, borderRadius: 2, margin: '10px 0 8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.bar}%`, background: c.bar >= 90 ? GREEN : EV_EMBER }} />
              </div>
            )}
            <p style={{ fontSize: 12, color: EV_MUTED, margin: 0 }}>{c.n}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
