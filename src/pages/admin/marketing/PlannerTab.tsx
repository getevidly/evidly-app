/**
 * PlannerTab — backward-math funnel planner.
 *
 * Reads the marketing_planner_config singleton and live
 * sales_pipeline counts to show target vs actual at each
 * funnel stage.  Touches and Contacts show "—" (no live source).
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, EV_PAPER,
  DISPLAY, BODY,
} from './marketingTokens';

// The mock's --track, plus the three block styles it repeats.
const EV_TRACK = '#EFECE5';

const CARD: React.CSSProperties = {
  background: EV_PAPER,
  border: `1px solid ${EV_LINE}`,
  borderRadius: 12,
  padding: '20px 22px',
  marginBottom: 20,
};

const EYEBROW: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: EV_MUTED,
  marginBottom: 16,
};

const TAG: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '.04em',
  color: EV_EMBER,
  background: '#F6E4DC',
  borderRadius: 4,
  padding: '2px 5px',
  marginLeft: 6,
  verticalAlign: 'middle',
};

// ── Types ──────────────────────────────────────────────────────

interface PlannerConfig {
  id: string;
  goal_count: number;
  goal_period: 'week' | 'month';
  include_enterprise_path: boolean;
  attribution_channel: string;
  rate_touch_contact: number;
  rate_contact_discovery: number;
  rate_discovery_tour: number;
  rate_tour_won: number;
  rate_tour_proposal: number;
  rate_proposal_negotiation: number;
  rate_negotiation_won: number;
}

interface FunnelRow {
  label: string;
  target: number;
  actual: number | null; // null = no live source
  stage: string | null;
}

// Maps planner funnel stage → sales_pipeline.stage value
const STAGE_MAP: Record<string, string> = {
  discovery: 'tour_scheduled',
  tour: 'tour_completed',
  proposal: 'proposal_sent',
  negotiation: 'negotiating',
  won: 'won',
};

// ── Helpers ────────────────────────────────────────────────────

function periodRange(period: 'week' | 'month'): { start: string; end: string } {
  const now = new Date();
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: fmt(mon), end: fmt(sun) };
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function safeDiv(n: number, rate: number): number {
  return rate <= 0 ? n * 100 : n / (rate / 100);
}

// ── Editable rate input ────────────────────────────────────────

function RateInput({
  label,
  value,
  onChange,
  note,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** Muted aside beside the label, e.g. "(price is the price)". */
  note?: string;
}) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const commit = () => {
    const parsed = parseFloat(local);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100 && parsed !== value) {
      onChange(parsed);
    } else {
      setLocal(String(value));
    }
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, color: EV_NAVY, marginBottom: 7, fontWeight: 500 }}>
        {label}
        {note && <span style={{ color: EV_MUTED }}> {note}</span>}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: `1px solid ${EV_LINE}`,
          borderRadius: 8,
          padding: '9px 12px',
          backgroundColor: EV_PAPER,
        }}
      >
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={focused ? local : String(value)}
          onChange={(e) => setLocal(e.target.value)}
          onFocus={() => { setFocused(true); setLocal(String(value)); }}
          onBlur={() => { setFocused(false); commit(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            padding: 0,
            fontSize: 16,
            fontWeight: 600,
            color: EV_NAVY,
            backgroundColor: 'transparent',
            textAlign: 'right',
            fontFamily: BODY,
          }}
        />
        <span style={{ color: EV_MUTED, marginLeft: 4 }}>%</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────

export default function PlannerTab() {
  const [config, setConfig] = useState<PlannerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [wonCount, setWonCount] = useState(0);

  // Goal input local state (committed on blur)
  const [localGoal, setLocalGoal] = useState('1');
  const [goalFocused, setGoalFocused] = useState(false);

  // ── Fetch config ──────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from('marketing_planner_config')
      .select('*')
      .eq('is_singleton', true)
      .maybeSingle();
    if (data) {
      setConfig(data as PlannerConfig);
      setLocalGoal(String((data as PlannerConfig).goal_count));
    }
    setLoading(false);
  }, []);

  // ── Fetch pipeline actuals ────────────────────────────────────

  const fetchActuals = useCallback(async (period: 'week' | 'month') => {
    const { data: rows } = await supabase
      .from('sales_pipeline')
      .select('stage, won_date');
    if (!rows) return;

    const counts: Record<string, number> = {};
    const { start, end } = periodRange(period);
    let won = 0;

    for (const r of rows) {
      const stage = r.stage as string;
      counts[stage] = (counts[stage] || 0) + 1;
      if (stage === 'won' && r.won_date) {
        const wd = r.won_date as string;
        if (wd >= start && wd <= end) won++;
      }
    }
    setPipelineCounts(counts);
    setWonCount(won);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  useEffect(() => {
    if (config) fetchActuals(config.goal_period);
  }, [config?.goal_period, fetchActuals]);

  // ── Update config field ───────────────────────────────────────

  const updateField = useCallback(async (field: string, value: number | string | boolean) => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from('marketing_planner_config')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    if (!error) {
      setConfig(prev => prev ? { ...prev, [field]: value } : prev);
    }
    setSaving(false);
  }, [config]);

  // ── Backward math ─────────────────────────────────────────────

  const funnel = useMemo((): FunnelRow[] => {
    if (!config) return [];
    const won = config.goal_count;
    if (won === 0) {
      const base: FunnelRow[] = [
        { label: 'Touches', target: 0, actual: null, stage: null },
        { label: 'Contacts', target: 0, actual: null, stage: null },
        { label: 'Discoveries', target: 0, actual: pipelineCounts[STAGE_MAP.discovery] || 0, stage: 'discovery' },
        { label: 'Tours', target: 0, actual: pipelineCounts[STAGE_MAP.tour] || 0, stage: 'tour' },
      ];
      if (config.include_enterprise_path) {
        base.push(
          { label: 'Proposals', target: 0, actual: pipelineCounts[STAGE_MAP.proposal] || 0, stage: 'proposal' },
          { label: 'Negotiations', target: 0, actual: pipelineCounts[STAGE_MAP.negotiation] || 0, stage: 'negotiation' },
        );
      }
      base.push({ label: 'Won', target: 0, actual: wonCount, stage: 'won' });
      return base;
    }

    if (config.include_enterprise_path) {
      const negotiation = safeDiv(won, config.rate_negotiation_won);
      const proposal = safeDiv(negotiation, config.rate_proposal_negotiation);
      const tour = safeDiv(proposal, config.rate_tour_proposal);
      const discovery = safeDiv(tour, config.rate_discovery_tour);
      const contact = safeDiv(discovery, config.rate_contact_discovery);
      const touch = safeDiv(contact, config.rate_touch_contact);

      return [
        { label: 'Touches', target: Math.ceil(touch), actual: null, stage: null },
        { label: 'Contacts', target: Math.ceil(contact), actual: null, stage: null },
        { label: 'Discoveries', target: Math.ceil(discovery), actual: pipelineCounts[STAGE_MAP.discovery] || 0, stage: 'discovery' },
        { label: 'Tours', target: Math.ceil(tour), actual: pipelineCounts[STAGE_MAP.tour] || 0, stage: 'tour' },
        { label: 'Proposals', target: Math.ceil(proposal), actual: pipelineCounts[STAGE_MAP.proposal] || 0, stage: 'proposal' },
        { label: 'Negotiations', target: Math.ceil(negotiation), actual: pipelineCounts[STAGE_MAP.negotiation] || 0, stage: 'negotiation' },
        { label: 'Won', target: won, actual: wonCount, stage: 'won' },
      ];
    }

    const tour = safeDiv(won, config.rate_tour_won);
    const discovery = safeDiv(tour, config.rate_discovery_tour);
    const contact = safeDiv(discovery, config.rate_contact_discovery);
    const touch = safeDiv(contact, config.rate_touch_contact);

    return [
      { label: 'Touches', target: Math.ceil(touch), actual: null, stage: null },
      { label: 'Contacts', target: Math.ceil(contact), actual: null, stage: null },
      { label: 'Discoveries', target: Math.ceil(discovery), actual: pipelineCounts[STAGE_MAP.discovery] || 0, stage: 'discovery' },
      { label: 'Tours', target: Math.ceil(tour), actual: pipelineCounts[STAGE_MAP.tour] || 0, stage: 'tour' },
      { label: 'Won', target: won, actual: wonCount, stage: 'won' },
    ];
  }, [config, pipelineCounts, wonCount]);

  const maxTarget = useMemo(() => {
    if (funnel.length === 0) return 1;
    return Math.max(...funnel.map(f => f.target), 1);
  }, [funnel]);

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: EV_MUTED, fontFamily: BODY }}>
        Loading planner…
      </div>
    );
  }

  if (!config) {
    return (
      <div className="border rounded-lg p-12 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <p className="text-sm font-medium" style={{ color: EV_MUTED }}>
          No planner config found. Run the marketing_planner_config migration.
        </p>
      </div>
    );
  }

  // Stage presentation, in the mock's order. Enterprise rows always render;
  // when the toggle is off they sit dimmed and out of the chain.
  const rowFor = (label: string) => funnel.find(f => f.label === label) || null;
  const period = config.goal_period === 'month' ? 'month' : 'week';
  const perAbbr = period === 'month' ? 'mo' : 'wk';
  const entOn = config.include_enterprise_path;

  const STAGES = [
    { key: 'Touches',      name: 'Touches',       conv: 'top of funnel',                                  ent: false, live: false },
    { key: 'Contacts',     name: 'Contact',       conv: `${config.rate_touch_contact}% of touches`,       ent: false, live: false },
    { key: 'Discoveries',  name: 'Discovery',     conv: `${config.rate_contact_discovery}% of contacts`,  ent: false, live: true  },
    { key: 'Tours',        name: 'Tour',          conv: `${config.rate_discovery_tour}% of discoveries`,  ent: false, live: true  },
    { key: 'Proposals',    name: 'Proposal sent', conv: 'enterprise / custom only',                       ent: true,  live: true  },
    { key: 'Negotiations', name: 'Negotiation',   conv: 'enterprise / custom only',                       ent: true,  live: true  },
    { key: 'Won',          name: 'Won',           conv: entOn
        ? `${config.rate_negotiation_won}% of negotiations · the goal`
        : `${config.rate_tour_won}% of tours · the goal`,                                                ent: false, live: true  },
  ];

  const wtdPct = config.goal_count > 0
    ? Math.round((wonCount / config.goal_count) * 100)
    : 0;

  return (
    <div style={{ fontFamily: BODY, color: EV_NAVY }}>

      {/* ── Goal bar ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          fontFamily: DISPLAY, fontSize: 20, color: EV_NAVY, marginBottom: 20,
        }}
      >
        I want to close
        <input
          type="number"
          min={0}
          value={goalFocused ? localGoal : String(config.goal_count)}
          onChange={(e) => setLocalGoal(e.target.value)}
          onFocus={() => { setGoalFocused(true); setLocalGoal(String(config.goal_count)); }}
          onBlur={() => {
            setGoalFocused(false);
            const v = parseInt(localGoal) || 0;
            if (v !== config.goal_count) updateField('goal_count', v);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{
            width: 64, textAlign: 'center', fontFamily: BODY, fontSize: 18, fontWeight: 600,
            padding: 8, border: `1px solid ${EV_LINE}`, borderRadius: 8,
            backgroundColor: EV_PAPER, color: EV_NAVY, outline: 'none',
          }}
        />
        new accounts per
        <select
          value={config.goal_period}
          onChange={(e) => updateField('goal_period', e.target.value)}
          style={{
            fontFamily: BODY, fontSize: 14, padding: '9px 12px',
            border: `1px solid ${EV_LINE}`, borderRadius: 8,
            backgroundColor: EV_PAPER, color: EV_NAVY, cursor: 'pointer',
          }}
        >
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
        {saving && (
          <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 600, color: EV_MUTED }}>Saving…</span>
        )}
      </div>

      {/* ── Controls row ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <label
          style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13, color: EV_NAVY, fontWeight: 500, cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={entOn}
            onChange={(e) => updateField('include_enterprise_path', e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
          <span
            aria-hidden="true"
            style={{
              width: 38, height: 22, borderRadius: 99, position: 'relative', flex: 'none',
              backgroundColor: entOn ? EV_EMBER : EV_TRACK,
              border: `1px solid ${entOn ? EV_EMBER : EV_LINE}`,
              transition: 'background-color .15s',
            }}
          >
            <span
              style={{
                content: '""', position: 'absolute', top: 2, left: entOn ? 'auto' : 2, right: entOn ? 2 : 'auto',
                width: 18, height: 18, borderRadius: '50%', backgroundColor: '#FFF',
                boxShadow: '0 1px 2px rgba(0,0,0,.15)',
              }}
            />
          </span>
          Include enterprise path <span style={{ color: EV_MUTED, fontWeight: 400 }}>(proposal + negotiation)</span>
        </label>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: EV_MUTED, fontSize: 13 }}>
          Attribute to
          <select
            value={config.attribution_channel}
            onChange={(e) => updateField('attribution_channel', e.target.value)}
            style={{
              fontFamily: BODY, fontSize: 13, padding: '8px 12px',
              border: `1px solid ${EV_LINE}`, borderRadius: 8,
              backgroundColor: EV_PAPER, color: EV_NAVY, cursor: 'pointer',
            }}
          >
            <option value="all">All channels (overall)</option>
            <option value="outbound_calls">Outbound calls</option>
            <option value="in_person">In person</option>
            <option value="shows">Shows</option>
            <option value="content">Content</option>
          </select>
        </span>
      </div>

      {/* ── Conversion rates card ────────────────────────────────── */}
      <div style={CARD}>
        <div style={EYEBROW}>Conversion rates — standard path</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <RateInput label="Touch → Contact" value={config.rate_touch_contact} onChange={(v) => updateField('rate_touch_contact', v)} />
          <RateInput label="Contact → Discovery" value={config.rate_contact_discovery} onChange={(v) => updateField('rate_contact_discovery', v)} />
          <RateInput label="Discovery → Tour" value={config.rate_discovery_tour} onChange={(v) => updateField('rate_discovery_tour', v)} />
          <RateInput label="Tour → Won" note="(price is the price)" value={config.rate_tour_won} onChange={(v) => updateField('rate_tour_won', v)} />
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${EV_LINE}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: EV_EMBER, marginBottom: 12 }}>
            Enterprise / custom only
            <span
              style={{
                backgroundColor: '#F6E4DC', color: EV_EMBER, borderRadius: 4,
                padding: '2px 6px', marginLeft: 6, fontSize: 9, letterSpacing: '.04em',
              }}
            >
              TOGGLE ON
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <RateInput label="Tour → Proposal" value={config.rate_tour_proposal} onChange={(v) => updateField('rate_tour_proposal', v)} />
            <RateInput label="Proposal → Negotiation" value={config.rate_proposal_negotiation} onChange={(v) => updateField('rate_proposal_negotiation', v)} />
            <RateInput label="Negotiation → Won" value={config.rate_negotiation_won} onChange={(v) => updateField('rate_negotiation_won', v)} />
          </div>
        </div>
      </div>

      {/* ── Funnel card ──────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: 0, color: EV_NAVY }}>
            Overall funnel
            <small style={{ fontFamily: BODY, fontWeight: 400, fontSize: 12, color: EV_MUTED, marginLeft: 8 }}>
              per {period} · {entOn ? 'enterprise path' : 'standard path'}
            </small>
          </h3>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: EV_MUTED }}>
            {period === 'month' ? 'MONTH TO DATE' : 'WEEK TO DATE'} · <b style={{ color: EV_EMBER }}>{wtdPct}%</b>
          </span>
        </div>

        {STAGES.map((st, i) => {
          const row = rowFor(st.key);
          const dim = st.ent && !entOn;
          const target = row ? row.target : 0;
          const actual = row ? row.actual : null;
          const targetPct = maxTarget > 0 ? Math.round((target / maxTarget) * 100) : 0;
          const actualPct = actual !== null && maxTarget > 0
            ? Math.min(Math.round((actual / maxTarget) * 100), 100)
            : 0;

          return (
            <div
              key={st.key}
              style={{
                display: 'grid', gridTemplateColumns: '210px 1fr 110px',
                alignItems: 'center', gap: 16, padding: '14px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${EV_LINE}`,
                opacity: dim ? 0.5 : 1,
              }}
            >
              <div>
                <b style={{ display: 'block', fontSize: 14, fontWeight: 600, color: EV_NAVY }}>
                  {st.name}
                  {st.ent && <span style={TAG}>ENTERPRISE</span>}
                  {!st.live && <span style={{ ...TAG, color: EV_MUTED, backgroundColor: EV_TRACK }}>NO LIVE SOURCE</span>}
                </b>
                <div style={{ fontSize: 11, color: EV_MUTED, marginTop: 2 }}>{st.conv}</div>
              </div>

              <div>
                <div style={{ height: 12, borderRadius: 6, backgroundColor: EV_TRACK, overflow: 'hidden' }}>
                  <div style={{ height: 12, borderRadius: 6, backgroundColor: '#CBD2DD', width: `${dim ? 0 : targetPct}%` }} />
                </div>
                {/* No actual bar where there is no live source, and none for a
                    dimmed enterprise row — an empty ember bar would read as a
                    real zero rather than as "not measured". */}
                {st.live && !dim && (
                  <div style={{ marginTop: 7, height: 9, borderRadius: 5, backgroundColor: EV_TRACK, overflow: 'hidden' }}>
                    <div style={{ height: 9, borderRadius: 5, backgroundColor: EV_EMBER, width: `${actualPct}%` }} />
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: EV_MUTED }}>
                  {dim ? '—' : `${target} / ${perAbbr}`}
                </div>
                {st.live && !dim && (
                  <div style={{ fontSize: 12, color: EV_NAVY, marginTop: 6 }}>
                    Actual <b style={{ color: EV_EMBER }}>{actual ?? 0}</b>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer explainer ─────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: EV_MUTED, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${EV_LINE}` }}>
        Standard path (toggle off): <b style={{ color: EV_NAVY }}>1 account/week</b> needs about{' '}
        <b style={{ color: EV_NAVY }}>34 touches → 10 contacts → 5 discoveries → 3 tours → 1 won</b> — they see
        the price and buy, no proposal. Flip <b style={{ color: EV_NAVY }}>Include enterprise path</b> on and Tour
        routes through <b style={{ color: EV_NAVY }}>Proposal → Negotiation → Won</b> instead (needs ~67 touches for
        the same close). Ember bar = real week-to-date; grey = target. Touches and Contact have no live actual
        source yet, so they show target only.
      </div>
    </div>
  );
}
