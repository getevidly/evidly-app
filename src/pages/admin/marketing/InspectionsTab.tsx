/**
 * InspectionsTab — the read-only view over the inspection ingestion.
 *
 * READ ONLY. This tab generates no triggers, queues nothing and sends
 * nothing. Sections 2, 3 and 4 are deliberately empty: the generation
 * and send paths are a later step and do not exist yet. Their filter
 * bars and column headers are rendered so the shape of the surface is
 * visible, but no illustrative row is ever shown as if it were real.
 *
 * Data comes from the inspections-admin edge function, never from
 * supabase.from(). The four ingestion tables are RLS-gated to
 * @getevidly.com sessions, so a browser-side read returns zero rows
 * silently; reading server-side on the service-role client makes the
 * data path explicit.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { KpiMini } from './marketingPrimitives';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_FAINT, EV_LINE, EV_PAPER,
  EV_LIGHT, EV_SUCCESS, EV_WARN, DISPLAY, BODY,
} from './marketingTokens';

/** A source that has posted within this many days reads as a live feed. */
const FRESH_WINDOW_DAYS = 21;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

interface SummaryPayload {
  source_count: number;
  active_source_count: number;
  facility_count: number;
  inspection_count: number;
  violation_count: number;
}

interface SourceRow {
  id: string;
  slug: string | null;
  platform_family: string | null;
  is_active: boolean | null;
  facility_count: number | null;
  inspection_count: number | null;
  violation_count: number | null;
  newest_inspection_date: string | null;
  error: string | null;
}

interface HeldFacility {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  resolved_pipeline_id: string | null;
  slug: string | null;
}

interface QueueRow {
  id: string;
  facility_id: string;
  facility_name: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  slug: string | null;
  trigger_type: 'cited' | 'clean' | 'due';
  trigger_date: string | null;
  mapped_record: string | null;
  rank: number | null;
}

type Freshness = 'live' | 'snapshot';
type SortCol = 'slug' | 'platform_family' | 'facility_count' | 'inspection_count' | 'violation_count' | 'newest_inspection_date';
type QueueSortCol = 'facility_name' | 'slug' | 'trigger_type' | 'trigger_date' | 'mapped_record' | 'rank';
type SortDir = 'asc' | 'desc';
type TriggerAction = 'approve' | 'hold' | 'skip' | 'client';

/**
 * The designed suppression rules. These are the rule set the surface is
 * built around, not rows read from a table — nothing evaluates them yet.
 */
const SUPPRESSION_RULES: { rule: string; detail: string }[] = [
  { rule: 'Already a client', detail: 'Facility resolves to an organization already on EvidLY.' },
  { rule: 'Already in pipeline', detail: 'Facility resolves to an open sales_pipeline row.' },
  { rule: 'Contacted in last 90 days', detail: 'Any outreach touch inside the window suppresses a new trigger.' },
  { rule: 'Chain or franchise parent', detail: 'Multi-unit brands route to a named account, never a per-site trigger.' },
  { rule: 'Address unresolved', detail: 'No deliverable address means no postcard step.' },
  { rule: 'Opted out', detail: 'Any recorded opt-out suppresses every step permanently.' },
];

/** Trigger-type pill colours: cited ember, clean green, due navy. */
const TRIGGER_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  cited: { bg: '#FBEAE5', fg: EV_EMBER, label: 'CITED' },
  clean: { bg: '#E8F2EC', fg: EV_SUCCESS, label: 'CLEAN' },
  due: { bg: '#EEF1F6', fg: EV_NAVY, label: 'DUE' },
};

function TriggerPill({ type }: { type: string }) {
  const m = TRIGGER_PILL[type] ?? { bg: EV_LIGHT, fg: EV_MUTED, label: type.toUpperCase() };
  return (
    <span
      className="inline-block text-[10px] font-bold tracking-wider rounded px-2 py-[3px] whitespace-nowrap"
      style={{ backgroundColor: m.bg, color: m.fg, fontFamily: BODY }}
    >
      {m.label}
    </span>
  );
}

function fmt(n: number | null | undefined): string {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

function freshnessOf(newest: string | null): Freshness {
  if (!newest) return 'snapshot';
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - FRESH_WINDOW_DAYS);
  return newest >= cutoff.toISOString().slice(0, 10) ? 'live' : 'snapshot';
}

function FreshnessPill({ kind }: { kind: Freshness }) {
  const live = kind === 'live';
  return (
    <span
      className="inline-block text-[10px] font-bold tracking-wider rounded px-2 py-[3px] whitespace-nowrap"
      style={{
        backgroundColor: live ? '#E8F2EC' : '#FBF3E0',
        color: live ? EV_SUCCESS : EV_WARN,
        fontFamily: BODY,
      }}
    >
      {live ? 'Live · daily' : 'Quarterly snapshot'}
    </span>
  );
}

/** Shared shell so every section reads the same way down the page. */
function Section({ n, title, note, children }: {
  n: number; title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold" style={{ color: EV_EMBER, fontFamily: MONO }}>{n}</span>
          <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{title}</h4>
        </div>
        {note && <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>{note}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ headline, sub }: { headline: string; sub?: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="text-[13px] font-semibold" style={{ color: EV_MUTED, fontFamily: BODY }}>{headline}</div>
      {sub && <div className="text-[11.5px] mt-1.5 max-w-md mx-auto" style={{ color: EV_FAINT }}>{sub}</div>}
    </div>
  );
}

export default function InspectionsTab() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [held, setHeld] = useState<HeldFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Sources filters ──────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterFreshness, setFilterFreshness] = useState('');

  // ── Sources sort ─────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<SortCol>('slug');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Queue ────────────────────────────────────────────────────
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [qSearch, setQSearch] = useState('');
  const [qJurisdiction, setQJurisdiction] = useState('');
  const [qType, setQType] = useState('');
  const [qSortCol, setQSortCol] = useState<QueueSortCol>('rank');
  const [qSortDir, setQSortDir] = useState<SortDir>('desc');
  /** trigger id currently being written, so its buttons disable */
  const [acting, setActing] = useState<string | null>(null);
  /** trigger id whose inline reason box is open, and for which action */
  const [reasonFor, setReasonFor] = useState<{ id: string; action: TriggerAction } | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, srcRes, matchRes, queueRes] = await Promise.all([
        supabase.functions.invoke('inspections-admin', { body: { section: 'summary' } }),
        supabase.functions.invoke('inspections-admin', { body: { section: 'sources' } }),
        supabase.functions.invoke('inspections-admin', { body: { section: 'match' } }),
        supabase.functions.invoke('inspections-admin', { body: { section: 'queue' } }),
      ]);

      const firstErr = sumRes.error || srcRes.error || matchRes.error || queueRes.error;
      if (firstErr) throw new Error(firstErr.message);

      if (!sumRes.data?.ok || !srcRes.data?.ok || !matchRes.data?.ok || !queueRes.data?.ok) {
        throw new Error(
          sumRes.data?.error || srcRes.data?.error || matchRes.data?.error || queueRes.data?.error ||
          'The inspections read did not succeed.',
        );
      }

      setSummary(sumRes.data.summary as SummaryPayload);
      setSources((srcRes.data.sources ?? []) as SourceRow[]);
      setHeld((matchRes.data.facilities ?? []) as HeldFacility[]);
      setQueue((queueRes.data.triggers ?? []) as QueueRow[]);
      setQueueTotal((queueRes.data.total ?? 0) as number);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load inspection data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const platforms = useMemo(
    () => [...new Set(sources.map(s => s.platform_family).filter(Boolean) as string[])].sort(),
    [sources],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sources.filter(s => {
      if (q && !(s.slug ?? '').toLowerCase().includes(q)) return false;
      if (filterPlatform && s.platform_family !== filterPlatform) return false;
      if (filterFreshness && freshnessOf(s.newest_inspection_date) !== filterFreshness) return false;
      return true;
    });
  }, [sources, search, filterPlatform, filterFreshness]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'slug': cmp = (a.slug ?? '').localeCompare(b.slug ?? ''); break;
        case 'platform_family': cmp = (a.platform_family ?? '').localeCompare(b.platform_family ?? ''); break;
        case 'facility_count': cmp = (a.facility_count ?? 0) - (b.facility_count ?? 0); break;
        case 'inspection_count': cmp = (a.inspection_count ?? 0) - (b.inspection_count ?? 0); break;
        case 'violation_count': cmp = (a.violation_count ?? 0) - (b.violation_count ?? 0); break;
        case 'newest_inspection_date':
          cmp = (a.newest_inspection_date ?? '').localeCompare(b.newest_inspection_date ?? ''); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return rows;
  }, [filtered, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  // ── Queue filter / sort — same inline pattern as Sources above ──
  const qJurisdictions = useMemo(
    () => [...new Set(queue.map(t => t.slug).filter(Boolean) as string[])].sort(),
    [queue],
  );

  const qFiltered = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    return queue.filter(t => {
      if (q && !`${t.facility_name ?? ''} ${t.city ?? ''}`.toLowerCase().includes(q)) return false;
      if (qJurisdiction && t.slug !== qJurisdiction) return false;
      if (qType && t.trigger_type !== qType) return false;
      return true;
    });
  }, [queue, qSearch, qJurisdiction, qType]);

  const qSorted = useMemo(() => {
    const rows = [...qFiltered];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (qSortCol) {
        case 'facility_name': cmp = (a.facility_name ?? '').localeCompare(b.facility_name ?? ''); break;
        case 'slug': cmp = (a.slug ?? '').localeCompare(b.slug ?? ''); break;
        case 'trigger_type': cmp = a.trigger_type.localeCompare(b.trigger_type); break;
        case 'trigger_date': cmp = (a.trigger_date ?? '').localeCompare(b.trigger_date ?? ''); break;
        case 'mapped_record': cmp = (a.mapped_record ?? '').localeCompare(b.mapped_record ?? ''); break;
        case 'rank': cmp = (a.rank ?? 0) - (b.rank ?? 0); break;
      }
      return qSortDir === 'desc' ? -cmp : cmp;
    });
    return rows;
  }, [qFiltered, qSortCol, qSortDir]);

  function toggleQSort(col: QueueSortCol) {
    if (qSortCol === col) setQSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setQSortCol(col); setQSortDir('asc'); }
  }

  const qHasFilters = !!(qSearch || qJurisdiction || qType);

  /**
   * Fire one operator action. The row is removed optimistically — it is
   * no longer status='new' — and restored in place if the write fails.
   * Nothing here sends anything; 'approve' only stages the row.
   */
  const act = useCallback(async (row: QueueRow, action: TriggerAction, reason?: string) => {
    setActing(row.id);
    setActionError(null);
    const before = queue;
    setQueue(q => q.filter(t => t.id !== row.id));
    setQueueTotal(n => Math.max(0, n - 1));
    try {
      const { data, error: invErr } = await supabase.functions.invoke('inspections-admin', {
        body: { section: 'act', trigger_id: row.id, action, reason: reason ?? null },
      });
      if (invErr) throw new Error(invErr.message);
      if (!data?.ok) throw new Error(data?.error || 'The action did not succeed.');
      setReasonFor(null);
      setReasonText('');
    } catch (e) {
      setQueue(before);
      setQueueTotal(n => n + 1);
      setActionError(e instanceof Error ? e.message : 'The action did not succeed.');
    } finally {
      setActing(null);
    }
  }, [queue]);

  function onMarkClient(row: QueueRow) {
    const name = row.facility_name ?? 'this facility';
    if (window.confirm(`Mark ${name} as your client? It will be protected from all future triggers.`)) {
      act(row, 'client');
    }
  }

  const sortIcon = (active: boolean) => (
    <ArrowUpDown size={11} style={{ color: active ? EV_EMBER : EV_MUTED, opacity: active ? 1 : 0.4 }} />
  );

  const hasFilters = !!(search || filterPlatform || filterFreshness);

  if (loading) {
    return <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading inspection data...</div>;
  }
  if (error) {
    return (
      <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
        {error}
        <button onClick={load} className="ml-3 underline font-semibold cursor-pointer">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini l="LIVE SOURCES" v={fmt(summary?.active_source_count)} sub={`${fmt(summary?.source_count)} configured`} />
        <KpiMini l="FACILITIES" v={fmt(summary?.facility_count)} sub="crawled and stored" />
        <KpiMini l="INSPECTIONS" v={fmt(summary?.inspection_count)} sub={`${fmt(summary?.violation_count)} violations`} />
        <KpiMini l="IN THE QUEUE" v={fmt(queueTotal)} sub="awaiting a decision" accent={EV_EMBER} />
      </div>

      {/* ── 1 Sources ──────────────────────────────────────────── */}
      <Section n={1} title="Sources" note="One row per configured jurisdiction feed. Counts are live.">
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jurisdiction"
            className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY, minWidth: 190 }}
          />
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
          >
            <option value="">All platforms</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={filterFreshness}
            onChange={e => setFilterFreshness(e.target.value)}
            className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
          >
            <option value="">All freshness</option>
            <option value="live">Live &middot; daily</option>
            <option value="snapshot">Quarterly snapshot</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterPlatform(''); setFilterFreshness(''); }}
              className="py-[7px] px-3 text-[12px] font-semibold rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-[12px] font-semibold" style={{ color: EV_MUTED }}>
            Showing {sorted.length} of {sources.length}
          </span>
        </div>

        {sorted.length === 0 ? (
          <EmptyState headline="No sources match these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: EV_LINE }}>
                  {([
                    ['Jurisdiction', 'slug'],
                    ['Platform', 'platform_family'],
                    ['Facilities', 'facility_count'],
                    ['Inspections', 'inspection_count'],
                    ['Violations', 'violation_count'],
                    ['Newest', 'newest_inspection_date'],
                  ] as const).map(([label, col]) => (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      className="py-2 px-4 text-[10px] font-bold tracking-wider cursor-pointer select-none"
                      style={{ color: EV_MUTED }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label} {sortIcon(sortCol === col)}
                      </span>
                    </th>
                  ))}
                  <th className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(s => (
                  <tr key={s.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                    <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>
                      {s.slug ?? '—'}
                      {s.error && (
                        <div className="text-[10.5px] font-normal mt-0.5" style={{ color: EV_WARN }}>
                          {s.error}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{s.platform_family ?? '—'}</td>
                    <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED, fontFamily: MONO }}>{fmt(s.facility_count)}</td>
                    <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED, fontFamily: MONO }}>{fmt(s.inspection_count)}</td>
                    <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED, fontFamily: MONO }}>{fmt(s.violation_count)}</td>
                    <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED, fontFamily: MONO }}>{s.newest_inspection_date ?? '—'}</td>
                    <td className="py-2.5 px-4"><FreshnessPill kind={freshnessOf(s.newest_inspection_date)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── 2 Trigger queue ────────────────────────────────────── */}
      <Section
        n={2}
        title="Trigger queue"
        note="Approve stages a trigger. Nothing is sent — the send sequence is not built."
      >
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
          <input
            value={qSearch}
            onChange={e => setQSearch(e.target.value)}
            placeholder="Search facility"
            className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY, minWidth: 190 }}
          />
          <select
            value={qJurisdiction}
            onChange={e => setQJurisdiction(e.target.value)}
            className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
          >
            <option value="">All jurisdictions</option>
            {qJurisdictions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={qType}
            onChange={e => setQType(e.target.value)}
            className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
          >
            <option value="">All triggers</option>
            <option value="cited">Cited</option>
            <option value="clean">Clean</option>
            <option value="due">Due</option>
          </select>
          {qHasFilters && (
            <button
              onClick={() => { setQSearch(''); setQJurisdiction(''); setQType(''); }}
              className="py-[7px] px-3 text-[12px] font-semibold rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-[12px] font-semibold" style={{ color: EV_MUTED }}>
            {qHasFilters
              ? `Showing ${qSorted.length} of ${queueTotal}`
              : `${fmt(queueTotal)} in queue`}
          </span>
        </div>

        {actionError && (
          <div className="mx-4 mt-3 text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {actionError}
          </div>
        )}

        {qSorted.length === 0 ? (
          <EmptyState
            headline={queue.length === 0 ? 'Nothing left in the queue.' : 'No triggers match these filters.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: EV_LINE }}>
                  {([
                    ['Facility', 'facility_name'],
                    ['Jurisdiction', 'slug'],
                    ['Trigger', 'trigger_type'],
                    ['Date', 'trigger_date'],
                    ['Mapped record', 'mapped_record'],
                    ['Rank', 'rank'],
                  ] as const).map(([label, col]) => (
                    <th
                      key={col}
                      onClick={() => toggleQSort(col)}
                      className="py-2 px-4 text-[10px] font-bold tracking-wider cursor-pointer select-none"
                      style={{ color: EV_MUTED }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label} {sortIcon(qSortCol === col)}
                      </span>
                    </th>
                  ))}
                  <th className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {qSorted.map(t => {
                  const busy = acting === t.id;
                  const openReason = reasonFor?.id === t.id ? reasonFor : null;
                  return (
                    <tr key={t.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE, opacity: busy ? 0.5 : 1 }}>
                      <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>
                        {t.facility_name ?? '—'}
                        <div className="text-[11px] font-normal" style={{ color: EV_MUTED }}>{t.city ?? '—'}</div>
                      </td>
                      <td className="py-2.5 px-4 text-[12.5px]" style={{ color: EV_MUTED }}>{t.slug ?? '—'}</td>
                      <td className="py-2.5 px-4"><TriggerPill type={t.trigger_type} /></td>
                      <td className="py-2.5 px-4 text-[12.5px]" style={{ color: EV_MUTED, fontFamily: MONO }}>{t.trigger_date ?? '—'}</td>
                      <td className="py-2.5 px-4 text-[12.5px]" style={{ color: t.mapped_record ? EV_NAVY : EV_FAINT }}>
                        {t.mapped_record ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 text-[12.5px]" style={{ color: EV_MUTED, fontFamily: MONO }}>{t.rank ?? 0}</td>
                      <td className="py-2.5 px-4">
                        {openReason ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={reasonText}
                              onChange={e => setReasonText(e.target.value)}
                              placeholder="Reason (optional)"
                              className="py-[5px] px-2 text-[12px] border rounded outline-none bg-white"
                              style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY, minWidth: 150 }}
                            />
                            <button
                              disabled={busy}
                              onClick={() => act(t, openReason.action, reasonText)}
                              className="py-[5px] px-2.5 text-[11px] font-bold rounded cursor-pointer border-none"
                              style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}
                            >
                              Confirm {openReason.action}
                            </button>
                            <button
                              onClick={() => { setReasonFor(null); setReasonText(''); }}
                              className="py-[5px] px-2 text-[11px] font-semibold rounded cursor-pointer border-none"
                              style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              disabled={busy}
                              onClick={() => act(t, 'approve')}
                              className="py-[5px] px-2.5 text-[11px] font-bold rounded cursor-pointer border-none whitespace-nowrap"
                              style={{ backgroundColor: EV_EMBER, color: '#fff', fontFamily: BODY }}
                            >
                              Approve
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => { setReasonFor({ id: t.id, action: 'hold' }); setReasonText(''); }}
                              className="py-[5px] px-2.5 text-[11px] font-semibold rounded cursor-pointer whitespace-nowrap"
                              style={{ backgroundColor: '#fff', color: EV_NAVY, border: `1px solid ${EV_LINE}`, fontFamily: BODY }}
                            >
                              Hold
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => { setReasonFor({ id: t.id, action: 'skip' }); setReasonText(''); }}
                              className="py-[5px] px-2.5 text-[11px] font-semibold rounded cursor-pointer whitespace-nowrap"
                              style={{ backgroundColor: '#fff', color: EV_MUTED, border: `1px solid ${EV_LINE}`, fontFamily: BODY }}
                            >
                              Skip
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => onMarkClient(t)}
                              className="py-[5px] px-2.5 text-[11px] font-semibold rounded cursor-pointer whitespace-nowrap"
                              style={{ backgroundColor: '#fff', color: EV_SUCCESS, border: `1px solid ${EV_SUCCESS}`, fontFamily: BODY }}
                            >
                              Mark client
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── 3 Sequence ─────────────────────────────────────────── */}
      <Section n={3} title="Sequence" note="The three steps a triggered facility would move through.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-4 py-4">
          {[
            { step: 'Step 1', name: 'Postcard', when: 'Day 0', note: null as string | null },
            { step: 'Step 2', name: 'Call', when: 'Day 4', note: null as string | null },
            { step: 'Step 3', name: 'Email', when: 'Day 10', note: 'needs a contact' },
          ].map(s => (
            <div key={s.step} className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_LIGHT }}>
              <div className="text-[10px] font-bold tracking-[0.14em]" style={{ color: EV_MUTED }}>{s.step}</div>
              <div className="text-[15px] font-bold mt-1" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{s.name}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: EV_MUTED }}>
                {s.when}{s.note ? ` · ${s.note}` : ''}
              </div>
              <div className="text-2xl font-bold mt-3" style={{ color: EV_MUTED, fontFamily: DISPLAY }}>0</div>
              <div className="text-[10.5px]" style={{ color: EV_FAINT }}>sent</div>
            </div>
          ))}
        </div>
        <EmptyState headline="Nothing has been sent yet." />
      </Section>

      {/* ── 4 Response by trigger ──────────────────────────────── */}
      <Section n={4} title="Response by trigger" note="Reply and conversion rate per trigger type.">
        <EmptyState
          headline="No responses to measure yet."
          sub="Nothing has been sent, so there is nothing to measure. This fills in once the sequence runs."
        />
      </Section>

      {/* ── 5 Match review & suppression ───────────────────────── */}
      <Section n={5} title="Match review &amp; suppression" note="Facilities held for a human decision, and the rules that hold them.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="border-b lg:border-b-0 lg:border-r" style={{ borderColor: EV_LINE }}>
            <div className="px-4 py-2.5 border-b" style={{ borderColor: EV_LINE }}>
              <div className="text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>HELD FOR REVIEW</div>
            </div>
            {held.length === 0 ? (
              <EmptyState headline="Nothing held for review." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b" style={{ borderColor: EV_LINE }}>
                      {['Facility', 'Address', 'Jurisdiction'].map(c => (
                        <th key={c} className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {held.map(f => (
                      <tr key={f.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                        <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>{f.name ?? '—'}</td>
                        <td className="py-2.5 px-4 text-[12.5px]" style={{ color: EV_MUTED }}>
                          {[f.address, f.city].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-[12.5px]" style={{ color: EV_MUTED }}>{f.slug ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="px-4 py-2.5 border-b" style={{ borderColor: EV_LINE }}>
              <div className="text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>SUPPRESSION RULES</div>
            </div>
            <div>
              {SUPPRESSION_RULES.map(r => (
                <div key={r.rule} className="px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                  <div className="text-[12.5px] font-semibold" style={{ color: EV_NAVY }}>{r.rule}</div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: EV_MUTED }}>{r.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
