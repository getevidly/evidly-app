/**
 * SurveyTab — Market research survey analytics for the Marketing console.
 *
 * Reads from market_research_responses via useSurveyData hook.
 * All numbers are REAL — no fabricated data. Funnel stages without
 * backend tracking show "—" with an explanatory note.
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useSurveyData, type SurveyResponseRow, type GroupStats } from '../../../lib/marketing/useSurveyData';
import { KpiMini, BarRow } from './marketingPrimitives';
import {
  EV_NAVY, EV_EMBER, EV_SLATE, EV_SUCCESS, EV_MUTED, EV_FAINT,
  EV_LINE, EV_LIGHT, EV_PAPER, DISPLAY, BODY,
} from './marketingTokens';

// ── Helpers ──────────────────────────────────────────────────────

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Funnel stage type ────────────────────────────────────────────

interface FunnelStage {
  label: string;
  value: number | null;   // null = not tracked
  note?: string;
}

// ── Stat row for correlation panel ───────────────────────────────

function StatRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div className="grid grid-cols-3 py-2" style={{ borderTop: `1px solid ${EV_LINE}` }}>
      <div className="text-[12px] font-semibold" style={{ color: EV_NAVY }}>{label}</div>
      <div className="text-[12px] text-right font-mono" style={{ color: EV_MUTED }}>{a}</div>
      <div className="text-[12px] text-right font-mono" style={{ color: EV_MUTED }}>{b}</div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────

export default function SurveyTab() {
  const { responses, stats, loading, error } = useSurveyData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Bar-mix data: sort by count desc, compute pct relative to max
  const segmentBars = useMemo(() => {
    const entries = Object.entries(stats.segmentCounts).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] || 1;
    return entries.map(([label, count]) => ({
      label,
      pct: Math.round((count / max) * 100),
      right: `${count} (${pct(count, stats.completedCount)}%)`,
      color: EV_EMBER,
    }));
  }, [stats]);

  const hardestBars = useMemo(() => {
    const entries = Object.entries(stats.hardestCounts).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] || 1;
    return entries.map(([label, count]) => ({
      label,
      pct: Math.round((count / max) * 100),
      right: `${count}`,
      color: EV_SLATE,
    }));
  }, [stats]);

  const wouldPayBars = useMemo(() => {
    const entries = Object.entries(stats.wouldPayCounts).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] || 1;
    return entries.map(([label, count]) => ({
      label,
      pct: Math.round((count / max) * 100),
      right: `${count} (${pct(count, stats.completedCount)}%)`,
      color: EV_SUCCESS,
    }));
  }, [stats]);

  // Funnel stages
  const funnel: FunnelStage[] = [
    { label: 'Survey emails sent', value: null, note: 'No marketing_sends tracking yet' },
    { label: 'Survey started', value: stats.startedCount },
    { label: 'Survey completed', value: stats.completedCount },
    { label: 'Dashboard opened', value: null, note: 'No open-tracking pixel yet' },
    { label: 'Meeting booked', value: null, note: 'No Calendly webhook — static link only' },
  ];

  // Recent completed responses (last 20)
  const recentCompleted = useMemo(() => {
    return responses
      .filter(r => r.completed_at)
      .slice(0, 20);
  }, [responses]);

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: EV_MUTED, fontFamily: BODY }}>
        Loading survey data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
        {error}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY }}>
      {/* ── 1. KPI Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KpiMini l="Responses Complete" v={stats.completedCount} accent={EV_NAVY} />
        <KpiMini
          l="Completion Rate"
          v={`${stats.completionRate}%`}
          sub={`${stats.startedCount} started`}
          accent={EV_EMBER}
        />
        <KpiMini
          l="Median Time"
          v={stats.completedCount > 0 ? `${stats.medianMinutes} min` : '—'}
          sub="to complete"
        />
        <KpiMini
          l="Meetings Booked"
          v="—"
          sub="no Calendly webhook"
          accent={EV_FAINT}
        />
        <KpiMini
          l="Asked by Adj / Atty"
          v={stats.adjusterAttorneyCount}
          sub={`of ${stats.completedCount} completed`}
          accent={EV_SLATE}
        />
      </div>

      {/* ── 2. Cold Funnel ───────────────────────────────────────── */}
      <div className="border rounded-lg p-5 mb-8" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <h4 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
          Cold Survey Funnel
        </h4>
        <div className="space-y-2">
          {funnel.map((stage, i) => {
            const displayVal = stage.value !== null ? stage.value : '—';
            const barPct = stage.value !== null && funnel[0].value !== null && funnel[0].value > 0
              ? Math.round((stage.value / funnel[0].value) * 100)
              : stage.value !== null && stats.startedCount > 0
                ? Math.round((stage.value / stats.startedCount) * 100)
                : 0;

            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-[180px] text-[12px] font-semibold flex-shrink-0" style={{ color: EV_NAVY }}>
                  {stage.label}
                </div>
                <div className="flex-1 h-6 rounded relative" style={{ backgroundColor: EV_LIGHT }}>
                  {stage.value !== null && barPct > 0 && (
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.max(barPct, 2)}%`,
                        backgroundColor: EV_EMBER,
                        opacity: 0.7 - (i * 0.1),
                      }}
                    />
                  )}
                </div>
                <div className="w-[60px] text-right text-[13px] font-mono font-semibold flex-shrink-0" style={{ color: stage.value !== null ? EV_NAVY : EV_FAINT }}>
                  {displayVal}
                </div>
                {stage.note && (
                  <div className="text-[10px] italic flex-shrink-0" style={{ color: EV_FAINT }}>
                    {stage.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3 & 4. Q1 + Q7 Bar Mixes (side by side) ─────────────── */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-lg p-5" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <h4 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            Q1 — Operation Type
          </h4>
          {segmentBars.length > 0 ? (
            segmentBars.map(b => <BarRow key={b.label} label={b.label} pct={b.pct} color={b.color} right={b.right} />)
          ) : (
            <p className="text-[12px]" style={{ color: EV_MUTED }}>No completed responses yet.</p>
          )}
        </div>
        <div className="border rounded-lg p-5" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <h4 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            Q7 — Hardest Part of Record-Keeping
          </h4>
          <div className="text-[10px] mb-3" style={{ color: EV_FAINT }}>
            Multi-select — respondents may choose more than one
          </div>
          {hardestBars.length > 0 ? (
            hardestBars.map(b => <BarRow key={b.label} label={b.label} pct={b.pct} color={b.color} right={b.right} />)
          ) : (
            <p className="text-[12px]" style={{ color: EV_MUTED }}>No completed responses yet.</p>
          )}
        </div>
      </div>

      {/* ── 5. Q9 Would-Pay-For (full width — pricing signal) ────── */}
      <div className="border rounded-lg p-5 mb-8" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <h4 className="text-sm font-bold mb-1" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
          Q9 — What Would You Pay For?
        </h4>
        <div className="text-[10px] mb-4" style={{ color: EV_FAINT }}>
          Single choice — the feature respondents would pay for first
        </div>
        {wouldPayBars.length > 0 ? (
          wouldPayBars.map(b => <BarRow key={b.label} label={b.label} pct={b.pct} color={b.color} right={b.right} />)
        ) : (
          <p className="text-[12px]" style={{ color: EV_MUTED }}>No completed responses yet.</p>
        )}
      </div>

      {/* ── 6. Correlation Panel ─────────────────────────────────── */}
      <div className="border rounded-lg p-5 mb-8" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <h4 className="text-sm font-bold mb-1" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
          Correlation — Adjuster / Attorney Group vs Everyone Else
        </h4>
        <div className="text-[10px] mb-4" style={{ color: EV_FAINT }}>
          Respondents whose &quot;asked by&quot; includes Insurance adjuster or Attorney
        </div>

        {(stats.adjGroup.n > 0 || stats.restGroup.n > 0) ? (
          <>
            {(stats.adjGroup.n < 10 || stats.restGroup.n < 10) && (
              <div
                className="text-[11px] px-3 py-2 rounded mb-4"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
              >
                Small sample warning — one or both groups have fewer than 10 respondents.
                Interpret directionally, not as statistically significant.
              </div>
            )}

            <div className="grid grid-cols-3 pb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: EV_MUTED }}>Metric</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: EV_MUTED }}>
                Adj / Atty (n={stats.adjGroup.n})
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: EV_MUTED }}>
                Everyone else (n={stats.restGroup.n})
              </div>
            </div>
            <StatRow label="Want &quot;everything in one place&quot;" a={`${stats.adjGroup.onePlace}%`} b={`${stats.restGroup.onePlace}%`} />
            <StatRow label="Multi-unit (kitchens > 1)" a={`${stats.adjGroup.multiUnit}%`} b={`${stats.restGroup.multiUnit}%`} />
            <StatRow label="Binder-only record keeping" a={`${stats.adjGroup.binderOnly}%`} b={`${stats.restGroup.binderOnly}%`} />
            <StatRow label="Avg kitchens" a={`${stats.adjGroup.avgKitchens}`} b={`${stats.restGroup.avgKitchens}`} />
          </>
        ) : (
          <p className="text-[12px]" style={{ color: EV_MUTED }}>No completed responses yet.</p>
        )}
      </div>

      {/* ── 7. Recent Responses Table ─────────────────────────────── */}
      <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: EV_LINE }}>
          <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            Recent Responses
          </h4>
          <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>
            Last 20 completed · click to expand detail
          </div>
        </div>

        {recentCompleted.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: EV_MUTED }}>
            No completed responses yet.
          </div>
        ) : (
          <div>
            {/* Header */}
            <div
              className="grid px-5 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ gridTemplateColumns: '24px 1.5fr 1fr 1fr 1fr', color: EV_MUTED, borderBottom: `1px solid ${EV_LINE}` }}
            >
              <div />
              <div>Organization</div>
              <div>Segment</div>
              <div>County</div>
              <div className="text-right">Completed</div>
            </div>

            {/* Rows */}
            {recentCompleted.map(r => {
              const isOpen = expandedId === r.id;
              return (
                <div key={r.id}>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : r.id)}
                    className="w-full grid px-5 py-2.5 items-center text-left cursor-pointer bg-transparent border-x-0 border-t-0"
                    style={{
                      gridTemplateColumns: '24px 1.5fr 1fr 1fr 1fr',
                      borderBottom: isOpen ? 'none' : `1px solid ${EV_LINE}`,
                    }}
                  >
                    {isOpen
                      ? <ChevronDown size={14} style={{ color: EV_EMBER }} />
                      : <ChevronRight size={14} style={{ color: EV_FAINT }} />
                    }
                    <span className="text-[13px] font-semibold truncate" style={{ color: EV_NAVY }}>
                      {r.org_name || '(unnamed)'}
                    </span>
                    <span className="text-[12px]" style={{ color: EV_MUTED }}>
                      {r.segment || '—'}
                    </span>
                    <span className="text-[12px]" style={{ color: EV_MUTED }}>
                      {r.county_name || '—'}
                    </span>
                    <span className="text-[12px] text-right font-mono" style={{ color: EV_MUTED }}>
                      {r.completed_at ? fmtDate(r.completed_at) : '—'}
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <ResponseDetail row={r} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Expanded row detail ──────────────────────────────────────────

function ResponseDetail({ row }: { row: SurveyResponseRow }) {
  const fields: { label: string; value: string }[] = [
    { label: 'Contact', value: [row.contact_name, row.contact_email].filter(Boolean).join(' · ') || '—' },
    { label: 'Role', value: row.role || '—' },
    { label: 'Kitchens', value: row.kitchen_count || '—' },
    { label: 'Record locations', value: (row.record_locations || []).join(', ') || '—' },
    { label: 'How they learn about due dates', value: row.due_discovery || '—' },
    { label: 'Hardest parts', value: (row.hardest_parts || []).join(', ') || '—' },
    { label: 'Asked by', value: (row.asked_by || []).join(', ') || '—' },
    { label: 'Would pay for', value: row.would_pay_for || '—' },
    { label: 'Open answer', value: row.open_answer || '—' },
  ];

  return (
    <div
      className="px-5 pb-4 pt-1 ml-6"
      style={{ borderBottom: `1px solid ${EV_LINE}` }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        {fields.map(f => (
          <div key={f.label}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: EV_FAINT }}>
              {f.label}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: EV_NAVY }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
