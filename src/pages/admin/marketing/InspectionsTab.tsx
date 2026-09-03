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

type Freshness = 'live' | 'snapshot';
type SortCol = 'slug' | 'platform_family' | 'facility_count' | 'inspection_count' | 'violation_count' | 'newest_inspection_date';
type SortDir = 'asc' | 'desc';

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

/** Column headers for the trigger queue. No rows exist to fill them yet. */
const QUEUE_COLS = ['Facility', 'Jurisdiction', 'Trigger', 'Inspection date', 'Outcome', 'Rank'];

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

/** A disabled filter bar — rendered so the shape is visible, inert because there is nothing to filter. */
function InertFilterBar({ placeholders }: { placeholders: string[] }) {
  return (
    <div className="flex items-center gap-3 flex-wrap px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
      {placeholders.map((p) => (
        <span
          key={p}
          className="py-[7px] px-[10px] text-[12.5px] border rounded-md select-none"
          style={{ borderColor: EV_LINE, color: EV_FAINT, backgroundColor: EV_LIGHT, fontFamily: BODY }}
        >
          {p}
        </span>
      ))}
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, srcRes, matchRes] = await Promise.all([
        supabase.functions.invoke('inspections-admin', { body: { section: 'summary' } }),
        supabase.functions.invoke('inspections-admin', { body: { section: 'sources' } }),
        supabase.functions.invoke('inspections-admin', { body: { section: 'match' } }),
      ]);

      const firstErr = sumRes.error || srcRes.error || matchRes.error;
      if (firstErr) throw new Error(firstErr.message);

      if (!sumRes.data?.ok || !srcRes.data?.ok || !matchRes.data?.ok) {
        throw new Error(
          sumRes.data?.error || srcRes.data?.error || matchRes.data?.error ||
          'The inspections read did not succeed.',
        );
      }

      setSummary(sumRes.data.summary as SummaryPayload);
      setSources((srcRes.data.sources ?? []) as SourceRow[]);
      setHeld((matchRes.data.facilities ?? []) as HeldFacility[]);
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
        <KpiMini l="IN THE QUEUE" v={0} sub="triggers not yet generated" accent={EV_MUTED} />
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
      <Section n={2} title="Trigger queue" note="What would be worked, once triggers are generated.">
        <InertFilterBar placeholders={['Search facility', 'All jurisdictions', 'All triggers', 'All ranks']} />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: EV_LINE }}>
                {QUEUE_COLS.map(c => (
                  <th key={c} className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>{c}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <EmptyState
          headline="No triggers generated yet."
          sub="Trigger generation is not built. Nothing reads the inspection record and produces a queue row today, so this list stays empty by design rather than for want of data."
        />
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
