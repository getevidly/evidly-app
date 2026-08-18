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
  EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, EV_LIGHT, EV_PAPER,
  EV_SUCCESS,
  DISPLAY, BODY,
} from './marketingTokens';

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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
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
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] font-medium" style={{ color: EV_NAVY }}>{label}</span>
      <span className="inline-flex items-center gap-1">
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
            width: 60,
            padding: '4px 8px',
            border: `1px solid ${EV_LINE}`,
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'ui-monospace, monospace',
            color: EV_NAVY,
            backgroundColor: EV_PAPER,
            outline: 'none',
            textAlign: 'right',
          }}
        />
        <span className="text-[12px] font-semibold" style={{ color: EV_MUTED }}>%</span>
      </span>
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

  return (
    <div style={{ fontFamily: BODY }}>
      {/* ── Goal bar ─────────────────────────────────────────────── */}
      <div
        className="border rounded-lg p-5 mb-6 flex items-center gap-3 flex-wrap"
        style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
      >
        <span className="text-[14px] font-semibold" style={{ color: EV_NAVY }}>
          I want to close
        </span>
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
            width: 64,
            padding: '6px 10px',
            border: `2px solid ${EV_EMBER}`,
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 700,
            fontFamily: DISPLAY,
            color: EV_EMBER,
            backgroundColor: EV_PAPER,
            outline: 'none',
            textAlign: 'center',
          }}
        />
        <span className="text-[14px] font-semibold" style={{ color: EV_NAVY }}>
          new accounts per
        </span>
        <select
          value={config.goal_period}
          onChange={(e) => updateField('goal_period', e.target.value)}
          style={{
            padding: '6px 12px',
            border: `1px solid ${EV_LINE}`,
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: EV_NAVY,
            backgroundColor: EV_PAPER,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="week">week</option>
          <option value="month">month</option>
        </select>
        {saving && (
          <span className="text-[11px] font-semibold" style={{ color: EV_MUTED }}>
            Saving…
          </span>
        )}
      </div>

      {/* ── Controls row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-6 mb-6 flex-wrap">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.include_enterprise_path}
            onChange={(e) => updateField('include_enterprise_path', e.target.checked)}
            className="w-4 h-4 accent-[#B24A2E]"
          />
          <span className="text-[13px] font-semibold" style={{ color: EV_NAVY }}>
            Include enterprise path
          </span>
        </label>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Conversion Rates card ──────────────────────────────── */}
        <div className="border rounded-lg p-5" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            Conversion Rates
          </h3>
          <div className="divide-y" style={{ borderColor: EV_LINE }}>
            <RateInput label="Touch → Contact" value={config.rate_touch_contact} onChange={(v) => updateField('rate_touch_contact', v)} />
            <RateInput label="Contact → Discovery" value={config.rate_contact_discovery} onChange={(v) => updateField('rate_contact_discovery', v)} />
            <RateInput label="Discovery → Tour" value={config.rate_discovery_tour} onChange={(v) => updateField('rate_discovery_tour', v)} />
            {config.include_enterprise_path ? (
              <>
                <RateInput label="Tour → Proposal" value={config.rate_tour_proposal} onChange={(v) => updateField('rate_tour_proposal', v)} />
                <RateInput label="Proposal → Negotiation" value={config.rate_proposal_negotiation} onChange={(v) => updateField('rate_proposal_negotiation', v)} />
                <RateInput label="Negotiation → Won" value={config.rate_negotiation_won} onChange={(v) => updateField('rate_negotiation_won', v)} />
              </>
            ) : (
              <RateInput label="Tour → Won" value={config.rate_tour_won} onChange={(v) => updateField('rate_tour_won', v)} />
            )}
          </div>
        </div>

        {/* ── Funnel card ────────────────────────────────────────── */}
        <div className="lg:col-span-2 border rounded-lg p-5" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            Funnel Targets
          </h3>
          <p className="text-[11px] mb-5" style={{ color: EV_MUTED }}>
            Backward math from {config.goal_count} won per {config.goal_period}
          </p>

          <div className="space-y-3">
            {funnel.map((row) => {
              const targetPct = Math.round((row.target / maxTarget) * 100);
              const actualPct = row.actual !== null
                ? Math.min(Math.round((row.actual / maxTarget) * 100), 100)
                : null;
              const onTrack = row.actual !== null && row.actual >= row.target;

              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold" style={{ color: EV_NAVY }}>
                      {row.label}
                    </span>
                    <span className="text-[12px] font-mono" style={{ color: EV_MUTED }}>
                      {row.actual !== null ? (
                        <>
                          <span className="font-bold" style={{ color: onTrack ? EV_SUCCESS : EV_EMBER }}>
                            {row.actual}
                          </span>
                          {' / '}
                          {row.target}
                        </>
                      ) : (
                        <>— / {row.target}</>
                      )}
                    </span>
                  </div>
                  <div className="relative h-5 rounded" style={{ backgroundColor: EV_LIGHT }}>
                    {/* Target bar (muted background) */}
                    <div
                      className="absolute inset-y-0 left-0 rounded"
                      style={{ width: `${targetPct}%`, backgroundColor: `${EV_NAVY}18` }}
                    />
                    {/* Actual bar (solid overlay) */}
                    {actualPct !== null && (
                      <div
                        className="absolute inset-y-0 left-0 rounded"
                        style={{
                          width: `${Math.min(actualPct, targetPct)}%`,
                          backgroundColor: onTrack ? EV_SUCCESS : EV_EMBER,
                          opacity: 0.65,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
