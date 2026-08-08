/**
 * OverviewTab — DERIVED tab (computed, nothing typed).
 *
 * This tab is a roll-up of real data from four sources:
 *   1. sales_pipeline  → pipeline count by stage, segment, ICP band
 *   2. founder seats   → live seat count via get_founder_count RPC
 *   3. marketing_sends → outreach email send count
 *   4. market_research_responses → survey response count + completion rate
 *
 * "Derived" means every number is COMPUTED from existing tables.
 * There is no form, no typed input. If a query returns zero rows the
 * KPI shows 0 and the table shows an empty state — never a placeholder
 * number. The seat counter is read live via the get_founder_count RPC
 * so it never goes stale.
 */
import { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  type AccountRow,
  type SendRow,
} from '../../../lib/marketing/useMarketingData';
import {
  STAGES,
  STAGE_LABELS,
  deriveICP,
  priorityBand,
  type Stage,
} from '../../../lib/marketing/gtmReference';
import { useFounderCount, FOUNDER_CAP } from '../../../hooks/useFounderCount';
import { KpiMini } from './marketingPrimitives';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, EV_PAPER, EV_LIGHT,
  EV_SUCCESS, EV_WARN, EV_DANGER, DISPLAY, BODY,
} from './marketingTokens';

// ── Types ────────────────────────────────────────────────────────

interface OverviewTabProps {
  accounts: AccountRow[];
  sends: SendRow[];
  loading: boolean;
  error: string | null;
}

type SortCol = 'stage' | 'count' | 'mrr';
type SortDir = 'asc' | 'desc';

type SegSortCol = 'segment' | 'count' | 'hot' | 'warm';

// ── Helpers ──────────────────────────────────────────────────────

const ACTIVE_STAGES: Stage[] = STAGES.filter(
  s => s !== 'won' && s !== 'lost' && s !== 'churned',
) as Stage[];

function fmtMrr(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Lightweight survey count hook ────────────────────────────────

function useSurveyCounts() {
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [surveyLoading, setSurveyLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const { count: totalCount } = await supabase
          .from('market_research_responses')
          .select('*', { count: 'exact', head: true });

        const { count: completedCount } = await supabase
          .from('market_research_responses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');

        if (!cancelled) {
          setTotal(totalCount ?? 0);
          setCompleted(completedCount ?? 0);
        }
      } catch {
        // Table may not exist yet — show 0
      }
      if (!cancelled) setSurveyLoading(false);
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  return { total, completed, surveyLoading };
}

// ── Component ────────────────────────────────────────────────────

export default function OverviewTab({
  accounts, sends, loading, error,
}: OverviewTabProps) {
  const { founderCount, spotsRemaining, loading: seatLoading } = useFounderCount();
  const { total: surveyTotal, completed: surveyCompleted, surveyLoading } = useSurveyCounts();

  // ── Filters ──────────────────────────────────────────────────
  const [filterCounty, setFilterCounty] = useState<string>('');
  const [filterSegment, setFilterSegment] = useState<string>('');
  const [filterBand, setFilterBand] = useState<string>('');

  // ── Sort state for pipeline-by-stage table ───────────────────
  const [stageSort, setStageSort] = useState<SortCol>('stage');
  const [stageSortDir, setStageSortDir] = useState<SortDir>('asc');

  // ── Sort state for segment table ─────────────────────────────
  const [segSort, setSegSort] = useState<SegSortCol>('count');
  const [segSortDir, setSegSortDir] = useState<SortDir>('desc');

  // ── Filtered accounts ────────────────────────────────────────
  const filtered = useMemo(() => {
    return accounts.filter(a => {
      if (filterCounty && a.county !== filterCounty) return false;
      if (filterSegment && a.segment !== filterSegment) return false;
      if (filterBand) {
        const band = priorityBand(deriveICP(a));
        if (band !== filterBand) return false;
      }
      return true;
    });
  }, [accounts, filterCounty, filterSegment, filterBand]);

  // ── KPI values ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    const inPipeline = filtered.filter(
      a => a.stage !== 'won' && a.stage !== 'lost' && a.stage !== 'churned',
    ).length;
    const won = filtered.filter(a => a.stage === 'won').length;
    const totalMrr = filtered
      .filter(a => a.stage === 'won')
      .reduce((sum, a) => sum + a.estimated_mrr_cents, 0);
    const hot = filtered.filter(a => priorityBand(deriveICP(a)) === 'hot').length;
    return { inPipeline, won, totalMrr, hot };
  }, [filtered]);

  // ── Pipeline by stage ────────────────────────────────────────
  const stageRows = useMemo(() => {
    const map: Record<string, { count: number; mrr: number }> = {};
    for (const s of ACTIVE_STAGES) map[s] = { count: 0, mrr: 0 };
    for (const a of filtered) {
      if (map[a.stage]) {
        map[a.stage].count += 1;
        map[a.stage].mrr += a.estimated_mrr_cents;
      }
    }
    const rows = ACTIVE_STAGES.map(s => ({
      stage: s,
      label: STAGE_LABELS[s],
      count: map[s].count,
      mrr: map[s].mrr,
    }));
    rows.sort((a, b) => {
      let cmp = 0;
      if (stageSort === 'stage') cmp = ACTIVE_STAGES.indexOf(a.stage as Stage) - ACTIVE_STAGES.indexOf(b.stage as Stage);
      else if (stageSort === 'count') cmp = a.count - b.count;
      else if (stageSort === 'mrr') cmp = a.mrr - b.mrr;
      return stageSortDir === 'desc' ? -cmp : cmp;
    });
    return rows;
  }, [filtered, stageSort, stageSortDir]);

  // ── Pipeline by segment ──────────────────────────────────────
  const segmentRows = useMemo(() => {
    const map: Record<string, { count: number; hot: number; warm: number }> = {};
    for (const a of filtered) {
      const seg = a.segment || 'Unassigned';
      if (!map[seg]) map[seg] = { count: 0, hot: 0, warm: 0 };
      map[seg].count += 1;
      const band = priorityBand(deriveICP(a));
      if (band === 'hot') map[seg].hot += 1;
      else if (band === 'warm') map[seg].warm += 1;
    }
    const rows = Object.entries(map).map(([segment, v]) => ({
      segment, ...v,
    }));
    rows.sort((a, b) => {
      let cmp = 0;
      if (segSort === 'segment') cmp = a.segment.localeCompare(b.segment);
      else if (segSort === 'count') cmp = a.count - b.count;
      else if (segSort === 'hot') cmp = a.hot - b.hot;
      else if (segSort === 'warm') cmp = a.warm - b.warm;
      return segSortDir === 'desc' ? -cmp : cmp;
    });
    return rows;
  }, [filtered, segSort, segSortDir]);

  // ── Unique counties / segments for filter dropdowns ──────────
  const counties = useMemo(
    () => [...new Set(accounts.map(a => a.county).filter(Boolean) as string[])].sort(),
    [accounts],
  );
  const segments = useMemo(
    () => [...new Set(accounts.map(a => a.segment).filter(Boolean) as string[])].sort(),
    [accounts],
  );

  // ── Sort togglers ────────────────────────────────────────────
  function toggleStageSort(col: SortCol) {
    if (stageSort === col) setStageSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setStageSort(col); setStageSortDir('asc'); }
  }
  function toggleSegSort(col: SegSortCol) {
    if (segSort === col) setSegSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSegSort(col); setSegSortDir('desc'); }
  }

  // ── Render ───────────────────────────────────────────────────

  if (loading) {
    return <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading overview...</div>;
  }

  if (error) {
    return (
      <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
        {error}
      </div>
    );
  }

  const sortIcon = (active: boolean) => (
    <ArrowUpDown size={11} style={{ color: active ? EV_EMBER : EV_MUTED, opacity: active ? 1 : 0.4 }} />
  );

  return (
    <div className="space-y-6">
      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiMini l="In Pipeline" v={kpis.inPipeline} accent={EV_NAVY} />
        <KpiMini l="Won" v={kpis.won} accent={EV_SUCCESS} />
        <KpiMini l="Won MRR" v={fmtMrr(kpis.totalMrr)} accent={EV_SUCCESS} />
        <KpiMini l="Tier-1 / Hot" v={kpis.hot} accent={EV_EMBER} />
        <KpiMini l="Sends" v={sends.length} accent={EV_NAVY} />
        <KpiMini
          l="Founder Seats"
          v={seatLoading ? '...' : `${founderCount} / ${FOUNDER_CAP}`}
          sub={seatLoading ? '' : `${spotsRemaining} remaining`}
          accent={spotsRemaining <= 25 ? EV_DANGER : spotsRemaining <= 75 ? EV_WARN : EV_NAVY}
        />
      </div>

      {/* ── Survey snapshot ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiMini
          l="Survey Responses"
          v={surveyLoading ? '...' : surveyTotal}
          accent={EV_NAVY}
        />
        <KpiMini
          l="Completed"
          v={surveyLoading ? '...' : surveyCompleted}
          accent={EV_SUCCESS}
        />
        <KpiMini
          l="Completion Rate"
          v={surveyLoading ? '...' : surveyTotal > 0 ? `${Math.round(surveyCompleted / surveyTotal * 100)}%` : '\u2014'}
          accent={EV_NAVY}
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterCounty}
          onChange={e => setFilterCounty(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
        >
          <option value="">All counties</option>
          {counties.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterSegment}
          onChange={e => setFilterSegment(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
        >
          <option value="">All segments</option>
          {segments.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterBand}
          onChange={e => setFilterBand(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
        >
          <option value="">All ICP bands</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="nurture">Nurture</option>
        </select>
        {(filterCounty || filterSegment || filterBand) && (
          <button
            onClick={() => { setFilterCounty(''); setFilterSegment(''); setFilterBand(''); }}
            className="py-[7px] px-3 text-[12px] font-semibold rounded-md cursor-pointer border-none"
            style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Pipeline by stage ──────────────────────────────────── */}
      <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
          <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Pipeline by Stage</h4>
          <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>Active pipeline only (excludes won / lost / churned)</div>
        </div>
        {stageRows.every(r => r.count === 0) ? (
          <div className="p-8 text-center text-[13px]" style={{ color: EV_MUTED }}>No accounts in pipeline</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: EV_LINE }}>
                  {([['Stage', 'stage'], ['Count', 'count'], ['Est. MRR', 'mrr']] as const).map(([label, col]) => (
                    <th
                      key={col}
                      onClick={() => toggleStageSort(col)}
                      className="py-2 px-4 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
                      style={{ color: EV_MUTED, textAlign: col === 'stage' ? 'left' : 'right' }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label} {sortIcon(stageSort === col)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stageRows.map(r => (
                  <tr key={r.stage} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                    <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>{r.label}</td>
                    <td className="py-2.5 px-4 text-[13px] text-right" style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}>{r.count}</td>
                    <td className="py-2.5 px-4 text-[13px] text-right" style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}>{fmtMrr(r.mrr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pipeline by segment ────────────────────────────────── */}
      <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
          <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Pipeline by Segment</h4>
        </div>
        {segmentRows.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: EV_MUTED }}>No accounts</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: EV_LINE }}>
                  {([['Segment', 'segment'], ['Count', 'count'], ['Hot', 'hot'], ['Warm', 'warm']] as const).map(([label, col]) => (
                    <th
                      key={col}
                      onClick={() => toggleSegSort(col)}
                      className="py-2 px-4 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
                      style={{ color: EV_MUTED, textAlign: col === 'segment' ? 'left' : 'right' }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label} {sortIcon(segSort === col)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segmentRows.map(r => (
                  <tr key={r.segment} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                    <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>{r.segment}</td>
                    <td className="py-2.5 px-4 text-[13px] text-right" style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}>{r.count}</td>
                    <td className="py-2.5 px-4 text-[13px] text-right font-bold" style={{ color: EV_SUCCESS, fontFamily: 'ui-monospace, monospace' }}>{r.hot}</td>
                    <td className="py-2.5 px-4 text-[13px] text-right font-bold" style={{ color: EV_WARN, fontFamily: 'ui-monospace, monospace' }}>{r.warm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
