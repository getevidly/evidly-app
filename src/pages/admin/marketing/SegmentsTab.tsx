/**
 * SegmentsTab — DERIVED tab for the Marketing console.
 *
 * Computed from sales_pipeline — nothing entered, so this view can never
 * disagree with the pipeline.  Groups accounts by segment with ICP band
 * breakdown (hot / warm / nurture) per segment.
 * Filters: county, segment, ICP band.
 *
 * Segment values are free-text on sales_pipeline (no CHECK constraint).
 * SEGMENTS in gtmReference.ts maps known values to category + fit score.
 */
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { AccountRow } from '../../../lib/marketing/useMarketingData';
import {
  SEGMENTS,
  deriveICP,
  priorityBand,
} from '../../../lib/marketing/gtmReference';
import {
  EV_NAVY, EV_EMBER, EV_MUTED,
  EV_LINE, EV_LIGHT, EV_PAPER,
  EV_SUCCESS, EV_WARN,
  DISPLAY, BODY,
} from './marketingTokens';

// ── Types ────────────────────────────────────────────────────────

type Band = 'hot' | 'warm' | 'nurture';

interface SegmentRow {
  segment: string;
  category: string;
  count: number;
  hot: number;
  warm: number;
  nurture: number;
  mrr: number;
}

type SortKey = 'segment' | 'category' | 'count' | 'hot' | 'warm' | 'nurture' | 'mrr';
type SortDir = 'asc' | 'desc';

// ── Band colors ──────────────────────────────────────────────────

const BAND_COLORS: Record<Band, string> = {
  hot:     EV_SUCCESS,
  warm:    EV_WARN,
  nurture: EV_MUTED,
};

// ── Component ────────────────────────────────────────────────────

interface SegmentsTabProps {
  accounts: AccountRow[];
  loading: boolean;
  error: string | null;
}

export default function SegmentsTab({ accounts, loading, error }: SegmentsTabProps) {
  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filters
  const [fCounty, setFCounty] = useState('');
  const [fSegment, setFSegment] = useState('');
  const [fBand, setFBand] = useState('');

  // ── Options from data ─────────────────────────────────────────

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

  // ── Filter ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = accounts;
    if (fCounty) list = list.filter(a => a.county === fCounty);
    if (fSegment) list = list.filter(a => a.segment === fSegment);
    if (fBand) list = list.filter(a => priorityBand(deriveICP(a)) === fBand);
    return list;
  }, [accounts, fCounty, fSegment, fBand]);

  // ── Build segment rows ────────────────────────────────────────

  const segmentRows = useMemo(() => {
    const map: Record<string, SegmentRow> = {};

    for (const a of filtered) {
      const seg = a.segment || '(none)';
      if (!map[seg]) {
        const entry = SEGMENTS[seg];
        map[seg] = {
          segment: seg,
          category: entry?.category || '—',
          count: 0,
          hot: 0,
          warm: 0,
          nurture: 0,
          mrr: 0,
        };
      }
      const row = map[seg];
      row.count += 1;
      row.mrr += (a.estimated_mrr_cents || 0) / 100;

      const band = priorityBand(deriveICP(a));
      row[band] += 1;
    }

    return Object.values(map);
  }, [filtered]);

  // ── Sort ──────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    const list = [...segmentRows];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'segment':
        case 'category':
          cmp = (a[sortKey]).localeCompare(b[sortKey]);
          break;
        default:
          cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [segmentRows, sortKey, sortDir]);

  // ── Totals ────────────────────────────────────────────────────

  const totals = useMemo(() => {
    let count = 0, hot = 0, warm = 0, nurture = 0, mrr = 0;
    for (const r of segmentRows) {
      count += r.count;
      hot += r.hot;
      warm += r.warm;
      nurture += r.nurture;
      mrr += r.mrr;
    }
    return { count, hot, warm, nurture, mrr };
  }, [segmentRows]);

  // ── Sort toggle ───────────────────────────────────────────────

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'segment' || key === 'category' ? 'asc' : 'desc'); }
  };

  // ── Sort header ───────────────────────────────────────────────

  const SortHeader = ({ label, col, right }: { label: string; col: SortKey; right?: boolean }) => (
    <th
      onClick={() => toggleSort(col)}
      className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
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

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: EV_MUTED, fontFamily: BODY }}>
        Loading segments…
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
        {/* DERIVED — Segments: computed from sales_pipeline, nothing entered */}
        <p className="text-[11px] font-medium" style={{ color: EV_MUTED }}>
          {filtered.length} account{filtered.length !== 1 ? 's' : ''} across{' '}
          {segmentRows.length} segment{segmentRows.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex items-end gap-3 flex-wrap mb-4">
        <div>
          <label
            className="text-[10px] font-bold uppercase tracking-wider block mb-1"
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
            className="text-[10px] font-bold uppercase tracking-wider block mb-1"
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
            className="text-[10px] font-bold uppercase tracking-wider block mb-1"
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

      {/* ── Segment table ────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ borderBottom: `1px solid ${EV_LINE}` }}>
              <SortHeader label="Segment" col="segment" />
              <SortHeader label="Type" col="category" />
              <SortHeader label="Count" col="count" right />
              <SortHeader label="Hot" col="hot" right />
              <SortHeader label="Warm" col="warm" right />
              <SortHeader label="Nurture" col="nurture" right />
              <SortHeader label="Est. MRR" col="mrr" right />
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-[13px]"
                  style={{ color: EV_MUTED }}
                >
                  No accounts match the current filters.
                </td>
              </tr>
            ) : (
              displayed.map(r => (
                <tr key={r.segment} style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                  <td
                    className="py-2.5 px-3 text-[13px] font-semibold"
                    style={{ color: EV_NAVY }}
                  >
                    {r.segment}
                  </td>
                  <td className="py-2.5 px-3">
                    {r.category !== '—' ? (
                      <span
                        className="text-[10px] font-bold py-0.5 px-2 rounded-full"
                        style={{
                          backgroundColor: r.category === 'owner' ? '#EFF6FF' : '#F3E8FF',
                          color: r.category === 'owner' ? '#1D4ED8' : '#7E22CE',
                        }}
                      >
                        {r.category}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: EV_MUTED }}>—</span>
                    )}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[13px] font-semibold text-right"
                    style={{ color: EV_NAVY, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.count}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[13px] text-right"
                    style={{ color: r.hot > 0 ? EV_SUCCESS : EV_MUTED, fontFamily: 'ui-monospace, monospace', fontWeight: r.hot > 0 ? 700 : 400 }}
                  >
                    {r.hot}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[13px] text-right"
                    style={{ color: r.warm > 0 ? EV_WARN : EV_MUTED, fontFamily: 'ui-monospace, monospace', fontWeight: r.warm > 0 ? 700 : 400 }}
                  >
                    {r.warm}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[13px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.nurture}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[13px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    ${r.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${EV_LINE}` }}>
              <td
                className="py-2.5 px-3 text-[13px] font-bold"
                style={{ color: EV_NAVY }}
              >
                Total
              </td>
              <td />
              <td
                className="py-2.5 px-3 text-[13px] font-bold text-right"
                style={{ color: EV_NAVY, fontFamily: 'ui-monospace, monospace' }}
              >
                {totals.count}
              </td>
              <td
                className="py-2.5 px-3 text-[13px] font-bold text-right"
                style={{ color: EV_SUCCESS, fontFamily: 'ui-monospace, monospace' }}
              >
                {totals.hot}
              </td>
              <td
                className="py-2.5 px-3 text-[13px] font-bold text-right"
                style={{ color: EV_WARN, fontFamily: 'ui-monospace, monospace' }}
              >
                {totals.warm}
              </td>
              <td
                className="py-2.5 px-3 text-[13px] font-bold text-right"
                style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
              >
                {totals.nurture}
              </td>
              <td
                className="py-2.5 px-3 text-[13px] font-bold text-right"
                style={{ color: EV_NAVY, fontFamily: 'ui-monospace, monospace' }}
              >
                ${totals.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
