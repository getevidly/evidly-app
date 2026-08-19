/**
 * TodayTab — read-only list of pipeline rows due today or overdue.
 *
 * Queries sales_pipeline for open rows (stage not won/lost/churned)
 * where next_action_at <= today. No writes, no mutations, no forms.
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { STAGE_LABELS, type Stage } from '../../../lib/marketing/gtmReference';
import {
  EV_NAVY, EV_MUTED, EV_LINE, EV_PAPER, EV_LIGHT, EV_FAINT,
  EV_DANGER, EV_WARN, EV_SUCCESS, EV_EMBER, DISPLAY, BODY,
} from './marketingTokens';
import { ArrowRight, ArrowUpDown } from 'lucide-react';
import ChannelCadences from './ChannelCadences';
import StartToday from './StartToday';
import AdherenceCards from './AdherenceCards';

// Adjustable — controls how many follow-up rows render before deferring the rest
const DAILY_QUEUE_CAP = 15;

interface PipelineRow {
  id: string;
  org_name: string;
  contact_name: string | null;
  stage: string;
  source: string | null;
  county: string | null;
  call_summary: string | null;
  notes: string | null;
  next_action_at: string;
}

type SortCol = 'org_name' | 'source' | 'next_action_at';
type SortDir = 'asc' | 'desc';

export default function TodayTab() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterDue, setFilterDue] = useState('');

  // ── Sort state ──────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<SortCol>('next_action_at');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('sales_pipeline')
      .select('id, org_name, contact_name, stage, source, county, call_summary, notes, next_action_at')
      .not('stage', 'in', '(won,lost,churned)')
      .lte('next_action_at', today)
      .order('next_action_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data as PipelineRow[]) || []);
        setLoading(false);
      });
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Header counts — always from unfiltered rows
  const overdueCount = useMemo(
    () => rows.filter(r => r.next_action_at < today).length,
    [rows, today],
  );
  const dueCount = rows.length;

  // Distinct channels for dropdown
  const channels = useMemo(
    () => [...new Set(rows.map(r => r.source).filter(Boolean) as string[])].sort(),
    [rows],
  );

  const filtersActive = search !== '' || filterChannel !== '' || filterDue !== '';

  // ── displayRows = filter + sort ─────────────────────────────
  const displayRows = useMemo(() => {
    let result = rows;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.org_name.toLowerCase().includes(q) ||
        (r.contact_name && r.contact_name.toLowerCase().includes(q)),
      );
    }

    // Channel filter
    if (filterChannel) {
      result = result.filter(r => r.source === filterChannel);
    }

    // Due filter
    if (filterDue === 'overdue') {
      result = result.filter(r => r.next_action_at < today);
    } else if (filterDue === 'due_today') {
      result = result.filter(r => r.next_action_at === today);
    }

    // Sort
    const sorted = [...result];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'org_name': cmp = a.org_name.localeCompare(b.org_name); break;
        case 'source': cmp = (a.source || '').localeCompare(b.source || ''); break;
        case 'next_action_at': cmp = a.next_action_at.localeCompare(b.next_action_at); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return sorted;
  }, [rows, search, filterChannel, filterDue, today, sortCol, sortDir]);

  // ── Sort helpers ────────────────────────────────────────────
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const sortIcon = (active: boolean) => (
    <ArrowUpDown size={11} style={{ color: active ? EV_EMBER : EV_MUTED, opacity: active ? 1 : 0.4 }} />
  );

  const deferredCount = displayRows.length > DAILY_QUEUE_CAP
    ? displayRows.length - DAILY_QUEUE_CAP
    : 0;

  if (loading) {
    return <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Adherence cards */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>The number you are graded on</h3>
        <AdherenceCards today={today} />
      </div>

      {/* Follow up today */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Follow up today</h3>
      </div>
      {error ? (
        <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">{error}</div>
      ) : rows.length === 0 ? (
        <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="text-[13px]" style={{ color: EV_MUTED }}>Nothing due today.</div>
          <div className="text-[12px] mt-1" style={{ color: EV_MUTED }}>You are done for today.</div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[12px]" style={{ color: EV_MUTED }}>
            {dueCount} due &middot; {overdueCount} overdue
          </p>

          <p className="text-[12px]" style={{ color: EV_MUTED }}>
            Clear the first three and today counts.
          </p>

          {/* ── Filters ────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search org or contact..."
              className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
              style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY, minWidth: 180 }}
            />
            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
              className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
              style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
              <option value="">All channels</option>
              {channels.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterDue} onChange={e => setFilterDue(e.target.value)}
              className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
              style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
              <option value="">All</option>
              <option value="overdue">Overdue only</option>
              <option value="due_today">Due today only</option>
            </select>
            {filtersActive && (
              <button
                onClick={() => { setSearch(''); setFilterChannel(''); setFilterDue(''); }}
                className="py-[7px] px-3 text-[12px] font-semibold rounded-md cursor-pointer border-none"
                style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}>
                Clear filters
              </button>
            )}
            <span className="ml-auto text-[12px] font-semibold" style={{ color: EV_MUTED }}>
              Showing {displayRows.length} of {rows.length}
            </span>
          </div>

          {/* Table */}
          {displayRows.length === 0 ? (
            <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
              <div className="text-[13px]" style={{ color: EV_MUTED }}>No records match the filters.</div>
            </div>
          ) : (
            <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b" style={{ borderColor: EV_LINE }}>
                      {([
                        ['Org', 'org_name'],
                        ['Contact', null],
                        ['Stage', null],
                        ['Channel', 'source'],
                        ['County', null],
                        ['Notes', null],
                        ['Due date', 'next_action_at'],
                        ['', null],
                      ] as const).map(([label, col]) => (
                        col ? (
                          <th key={label} onClick={() => toggleSort(col)}
                            className="py-2 px-4 text-[10px] font-bold tracking-wider cursor-pointer select-none"
                            style={{ color: EV_MUTED }}>
                            <span className="inline-flex items-center gap-1">
                              {label} {sortIcon(sortCol === col)}
                            </span>
                          </th>
                        ) : (
                          <th key={label} className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>
                            {label}
                          </th>
                        )
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.slice(0, DAILY_QUEUE_CAP).map(r => {
                      const daysAgo = Math.floor(
                        (new Date(today).getTime() - new Date(r.next_action_at).getTime()) / 86400000,
                      );
                      const isOverdue = daysAgo > 0;
                      const snippet = (r.call_summary || r.notes || '\u2014').slice(0, 80);

                      return (
                        <tr key={r.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                          <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>{r.org_name}</td>
                          <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{r.contact_name || '\u2014'}</td>
                          <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>
                            {STAGE_LABELS[r.stage as Stage] ?? r.stage}
                          </td>
                          <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{r.source || '\u2014'}</td>
                          <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{r.county || '\u2014'}</td>
                          <td className="py-2.5 px-4 text-[13px] max-w-[200px] truncate" style={{ color: EV_FAINT }}>{snippet}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className="inline-block py-0.5 px-2 text-[11px] font-semibold rounded-full whitespace-nowrap"
                              style={{
                                backgroundColor: isOverdue ? '#fef2f2' : '#f0fdf4',
                                color: isOverdue ? EV_DANGER : EV_SUCCESS,
                              }}
                            >
                              {isOverdue ? `Overdue ${daysAgo} day${daysAgo !== 1 ? 's' : ''}` : 'Due today'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <Link
                              to="/admin/sales"
                              className="inline-flex items-center gap-1 text-[12px] font-semibold no-underline"
                              style={{ color: EV_NAVY }}
                            >
                              Pipeline <ArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {deferredCount > 0 && (
            <p className="text-[12px] mt-2" style={{ color: EV_MUTED }}>
              {deferredCount} deferred to tomorrow.
            </p>
          )}
        </div>
      )}

      {/* Start today */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Start today</h3>
        <StartToday today={today} />
      </div>

      {/* Channel cadences */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Channel cadences</h3>
        <ChannelCadences />
      </div>
    </div>
  );
}
