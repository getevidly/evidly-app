/**
 * FunnelTab — DERIVED tab for the Marketing console.
 *
 * Computed from sales_pipeline — nothing entered, so this view can never
 * disagree with the pipeline.  Shows stage-by-stage counts and estimated
 * MRR in pipeline order.  Filters: county, segment, ICP band.
 *
 * DB stage CHECK constraint (8 values, migration 20260604000002):
 *   prospect → tour_scheduled → tour_completed → proposal_sent →
 *   negotiating → won | lost | churned
 */
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { AccountRow } from '../../../lib/marketing/useMarketingData';
import {
  STAGE_LABELS,
  deriveICP,
  priorityBand,
  type Stage,
} from '../../../lib/marketing/gtmReference';
import {
  EV_NAVY, EV_EMBER, EV_MUTED,
  EV_LINE, EV_LIGHT, EV_PAPER,
  EV_SUCCESS, EV_DANGER,
  DISPLAY, BODY,
} from './marketingTokens';

// ── Pipeline stages in funnel order (DB CHECK constraint) ────────

const FUNNEL_STAGES: Stage[] = [
  'prospect',
  'tour_scheduled',
  'tour_completed',
  'proposal_sent',
  'negotiating',
  'won',
  'lost',
  'churned',
];

type SortKey = 'stage' | 'count' | 'mrr' | 'pct';
type SortDir = 'asc' | 'desc';

interface StageRow {
  stage: string;
  label: string;
  count: number;
  mrr: number;
  pct: number;
  order: number;
}

// ── Component ────────────────────────────────────────────────────

interface FunnelTabProps {
  accounts: AccountRow[];
  loading: boolean;
  error: string | null;
}

export default function FunnelTab({ accounts, loading, error }: FunnelTabProps) {
  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('stage');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Filters
  const [fCounty, setFCounty] = useState('');
  const [fSegment, setFSegment] = useState('');
  const [fBand, setFBand] = useState('');

  // ── Unique counties / segments from data ──────────────────────

  const countyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts) if (a.county) set.add(a.county);
    return Array.from(set).sort();
  }, [accounts]);

  const segmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts) if (a.segment) set.add(a.segment);
    return Array.from(set).sort();
  }, [accounts]);

  // ── Filter accounts ───────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = accounts;
    if (fCounty) list = list.filter(a => a.county === fCounty);
    if (fSegment) list = list.filter(a => a.segment === fSegment);
    if (fBand) list = list.filter(a => priorityBand(deriveICP(a)) === fBand);
    return list;
  }, [accounts, fCounty, fSegment, fBand]);

  // ── Build stage rows ──────────────────────────────────────────

  const stageRows = useMemo(() => {
    const counts: Record<string, { count: number; mrr: number }> = {};

    for (const s of FUNNEL_STAGES) {
      counts[s] = { count: 0, mrr: 0 };
    }

    for (const a of filtered) {
      const s = a.stage;
      if (!counts[s]) counts[s] = { count: 0, mrr: 0 };
      counts[s].count += 1;
      counts[s].mrr += (a.estimated_mrr_cents || 0) / 100;
    }

    const total = filtered.length || 1;
    const rows: StageRow[] = [];

    for (let i = 0; i < FUNNEL_STAGES.length; i++) {
      const s = FUNNEL_STAGES[i];
      const c = counts[s];
      rows.push({
        stage: s,
        label: STAGE_LABELS[s] || s,
        count: c.count,
        mrr: c.mrr,
        pct: Math.round((c.count / total) * 100),
        order: i,
      });
    }

    // Catch stages not in FUNNEL_STAGES (shouldn't exist per DB CHECK,
    // but defensive in case the constraint was later expanded)
    const knownSet = new Set<string>(FUNNEL_STAGES as readonly string[]);
    for (const [s, c] of Object.entries(counts)) {
      if (!knownSet.has(s) && c.count > 0) {
        rows.push({
          stage: s,
          label: STAGE_LABELS[s as Stage] || s,
          count: c.count,
          mrr: c.mrr,
          pct: Math.round((c.count / total) * 100),
          order: rows.length,
        });
      }
    }

    return rows;
  }, [filtered]);

  // ── Sorted rows ───────────────────────────────────────────────

  const displayed = useMemo(() => {
    const list = [...stageRows];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'stage': cmp = a.order - b.order; break;
        case 'count': cmp = a.count - b.count; break;
        case 'mrr':   cmp = a.mrr - b.mrr;     break;
        case 'pct':   cmp = a.pct - b.pct;     break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [stageRows, sortKey, sortDir]);

  // ── Totals + max for bar width ────────────────────────────────

  const totals = useMemo(() => ({
    count: filtered.length,
    mrr: filtered.reduce((sum, a) => sum + (a.estimated_mrr_cents || 0) / 100, 0),
  }), [filtered]);

  const maxCount = useMemo(
    () => Math.max(...stageRows.map(r => r.count), 1),
    [stageRows],
  );

  // ── Sort toggle ───────────────────────────────────────────────

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Sort header ───────────────────────────────────────────────

  const SortHeader = ({ label, col, right }: { label: string; col: SortKey; right?: boolean }) => (
    <th
      onClick={() => toggleSort(col)}
      className="py-2 px-3 text-[10px] font-bold tracking-wider cursor-pointer select-none"
      style={{ color: EV_MUTED, textAlign: right ? 'right' : 'left' }}
    >
      <span
        className="inline-flex items-center gap-1"
        style={{ justifyContent: right ? 'flex-end' : 'flex-start' }}
      >
        {label}
        {sortKey === col ? (
          sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
        ) : (
          <ChevronDown size={10} style={{ opacity: 0.3 }} />
        )}
      </span>
    </th>
  );

  // ── Bar color per stage ───────────────────────────────────────

  const barColor = (stage: string) => {
    if (stage === 'won') return EV_SUCCESS;
    if (stage === 'lost' || stage === 'churned') return EV_DANGER;
    return EV_EMBER;
  };

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: EV_MUTED, fontFamily: BODY }}>
        Loading funnel…
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
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-5">
        {/* DERIVED — Funnel: computed from sales_pipeline, nothing entered */}
        <p className="text-[11px] font-medium" style={{ color: EV_MUTED }}>
          {filtered.length} account{filtered.length !== 1 ? 's' : ''} across{' '}
          {FUNNEL_STAGES.length} stages
        </p>
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex items-end gap-3 flex-wrap mb-4">
        <div>
          <label
            className="text-[10px] font-bold tracking-wider block mb-1"
            style={{ color: EV_MUTED }}
          >
            County
          </label>
          <select
            value={fCounty}
            onChange={e => setFCounty(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 140 }}
          >
            <option value="">All</option>
            {countyOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="text-[10px] font-bold tracking-wider block mb-1"
            style={{ color: EV_MUTED }}
          >
            Segment
          </label>
          <select
            value={fSegment}
            onChange={e => setFSegment(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 140 }}
          >
            <option value="">All</option>
            {segmentOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="text-[10px] font-bold tracking-wider block mb-1"
            style={{ color: EV_MUTED }}
          >
            ICP Band
          </label>
          <select
            value={fBand}
            onChange={e => setFBand(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 120 }}
          >
            <option value="">All</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="nurture">Nurture</option>
          </select>
        </div>

        {(fCounty || fSegment || fBand) && (
          <button
            onClick={() => { setFCounty(''); setFSegment(''); setFBand(''); }}
            className="py-[6px] px-3 text-[11px] font-semibold rounded-md cursor-pointer border-none"
            style={{ backgroundColor: EV_LIGHT, color: EV_MUTED }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Stage table ──────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ borderBottom: `1px solid ${EV_LINE}` }}>
              <SortHeader label="Stage" col="stage" />
              <SortHeader label="Count" col="count" right />
              <SortHeader label="Est. MRR" col="mrr" right />
              <SortHeader label="% of Total" col="pct" right />
              <th
                className="py-2 px-3 text-[10px] font-bold tracking-wider"
                style={{ color: EV_MUTED }}
              />
            </tr>
          </thead>
          <tbody>
            {displayed.map(r => {
              const barPct = Math.round((r.count / maxCount) * 100);
              return (
                <tr key={r.stage} style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                  <td
                    className="py-2.5 px-3 text-[13px] font-semibold"
                    style={{ color: EV_NAVY }}
                  >
                    {r.label}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[13px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.count}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[13px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    ${r.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[13px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.pct}%
                  </td>
                  <td className="py-2.5 px-3" style={{ minWidth: 120 }}>
                    <div className="h-2 rounded" style={{ backgroundColor: EV_LIGHT }}>
                      <div
                        className="h-full rounded"
                        style={{ width: `${barPct}%`, backgroundColor: barColor(r.stage) }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${EV_LINE}` }}>
              <td
                className="py-2.5 px-3 text-[13px] font-bold"
                style={{ color: EV_NAVY }}
              >
                Total
              </td>
              <td
                className="py-2.5 px-3 text-[13px] font-bold text-right"
                style={{ color: EV_NAVY, fontFamily: 'ui-monospace, monospace' }}
              >
                {totals.count}
              </td>
              <td
                className="py-2.5 px-3 text-[13px] font-bold text-right"
                style={{ color: EV_NAVY, fontFamily: 'ui-monospace, monospace' }}
              >
                ${totals.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td
                className="py-2.5 px-3 text-[13px] font-bold text-right"
                style={{ color: EV_NAVY, fontFamily: 'ui-monospace, monospace' }}
              >
                100%
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
