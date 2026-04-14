/**
 * Crawl Monitor — Live feed status, run history, run-now button
 * Route: /admin/crawl-monitor
 *
 * Reads from `intelligence_sources` (canonical table, 80+ sources).
 * Edge function `crawl-monitor` crawls demo-critical sources and
 * updates intelligence_sources.status + last_crawled_at.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { useDemoGuard } from '../../hooks/useDemoGuard';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  live:        { bg: '#ECFDF5', text: '#059669', label: 'Live' },
  error:       { bg: '#FEF2F2', text: '#DC2626', label: 'Error' },
  waf_blocked: { bg: '#F5F3FF', text: '#7C3AED', label: 'WAF Blocked' },
  timeout:     { bg: '#FFFBEB', text: '#D97706', label: 'Timeout' },
  pending:     { bg: '#FFFBEB', text: '#D97706', label: 'Pending' },
  disabled:    { bg: '#F3F4F6', text: '#6B7280', label: 'Disabled' },
};

// Sort priority: errors first, WAF second, pending, disabled, live last
const STATUS_SORT: Record<string, number> = {
  error: 0, waf_blocked: 1, pending: 2, disabled: 3, live: 4,
};

interface SourceRow {
  id: string;
  source_key: string;
  name: string;
  category: string;
  subcategory: string | null;
  url: string | null;
  crawl_method: string | null;
  fetch_method: string | null;
  crawl_frequency: string;
  status: string;
  last_crawled_at: string | null;
  last_signal_at: string | null;
  signal_count_30d: number;
  is_demo_critical: boolean;
  notes: string | null;
}

interface RunRow {
  id: string;
  run_type: string;
  started_at: string;
  completed_at: string | null;
  feeds_total: number;
  feeds_live: number;
  feeds_failed: number;
  feeds_changed: number;
  duration_ms: number | null;
  triggered_by: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  jurisdiction_food: 'County EH (Food)',
  jurisdiction_fire: 'Fire AHJ',
  state_agency:      'State Agency',
  federal_agency:    'Federal Agency',
  legislative:       'Legislative',
  industry:          'Industry',
  insurance:         'Insurance',
  competitive:       'Competitive',
  news:              'News / Trade',
};

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="rounded-md animate-pulse bg-gray-200" style={{ width: w, height: h }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream border-2 border-dashed border-[#E2D9C8] rounded-xl m-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-[#6B7F96] max-w-[360px] mx-auto">{subtitle}</div>
  </div>
);

export default function AdminCrawlMonitor() {
  useDemoGuard();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [crawlSuccess, setCrawlSuccess] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [demoOnly, setDemoOnly] = useState(false);

  // Stat card values — set from intelligence_sources counts + crawl_runs history
  const [liveCount, setLiveCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [changedCount, setChangedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [lastCrawled, setLastCrawled] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<RunRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [srcRes, runRes, totalRes, liveRes, errorRes, lastCrawlRes] = await Promise.all([
      supabase.from('intelligence_sources').select('*').order('category').order('name'),
      supabase.from('crawl_runs').select('*').order('started_at', { ascending: false }).limit(20),
      supabase.from('intelligence_sources').select('*', { count: 'exact', head: true }),
      supabase.from('intelligence_sources').select('*', { count: 'exact', head: true }).eq('status', 'live'),
      supabase.from('intelligence_sources').select('*', { count: 'exact', head: true }).in('status', ['error', 'waf_blocked', 'timeout']),
      supabase.from('intelligence_sources').select('last_crawled_at').not('last_crawled_at', 'is', null).order('last_crawled_at', { ascending: false }).limit(1).single(),
    ]);
    if (srcRes.error) console.error('[CrawlMonitor] intelligence_sources query failed:', srcRes.error);
    if (runRes.error) console.error('[CrawlMonitor] crawl_runs query failed:', runRes.error);
    console.log('[CrawlMonitor] v2 sources:', srcRes.data?.length, 'total:', totalRes.count, 'live:', liveRes.count, 'errors:', errorRes.count, 'srcErr:', srcRes.error, 'totalErr:', totalRes.error, 'liveErr:', liveRes.error, 'errorErr:', errorRes.error);
    if (srcRes.data) {
      setSources(srcRes.data);
      // Log status distribution for debugging
      const statusDist: Record<string, number> = {};
      for (const s of srcRes.data) { statusDist[s.status] = (statusDist[s.status] || 0) + 1; }
      console.log('[CrawlMonitor] status distribution:', statusDist);
    }

    // Stat cards: TOTAL/LIVE/ERRORS from intelligence_sources directly
    setTotalCount(totalRes.count ?? 0);
    setLiveCount(liveRes.count ?? 0);
    setErrorCount(errorRes.count ?? 0);

    // Last Crawl: most recent last_crawled_at from intelligence_sources
    setLastCrawled(lastCrawlRes.data?.last_crawled_at || null);

    if (runRes.data) {
      setRuns(runRes.data);
      const latest = runRes.data[0] || null;
      setLatestRun(latest);
      // CHANGED comes from crawl_runs (content hash comparison)
      setChangedCount(latest?.feeds_changed ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runCrawl = async () => {
    setRunning(true);
    setCrawlError(null);
    setCrawlSuccess(null);
    try {
      const [crawlResult, firecrawlResult] = await Promise.all([
        supabase.functions.invoke('crawl-monitor'),
        supabase.functions.invoke('trigger-crawl'),
      ]);

      // Surface errors from either function
      const errors: string[] = [];
      if (crawlResult.error) errors.push(`crawl-monitor: ${crawlResult.error.message}`);
      if (firecrawlResult.error) errors.push(`trigger-crawl: ${firecrawlResult.error.message}`);
      if (errors.length > 0) throw new Error(errors.join(' | '));

      const totalLive = (crawlResult.data?.feedsLive ?? 0) + (firecrawlResult.data?.succeeded ?? 0);
      const totalFailed = (crawlResult.data?.feedsFailed ?? 0) + (firecrawlResult.data?.failed ?? 0);
      const totalChanged = crawlResult.data?.feedsChanged ?? 0;
      setCrawlSuccess(`Crawl completed: ${totalLive} live, ${totalFailed} failed, ${totalChanged} changed.`);
      await loadData();
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      const hint = msg.includes('non-2xx')
        ? 'An edge function may not be deployed. Run: supabase functions deploy crawl-monitor && supabase functions deploy trigger-crawl'
        : '';
      setCrawlError(`Crawl failed: ${msg}${hint ? ` — ${hint}` : ''}`);
      console.error('[CrawlMonitor] Edge function error:', err);
    } finally {
      setRunning(false);
    }
  };

  // Filtered + sorted sources
  const filtered = sources
    .filter(s => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (demoOnly && !s.is_demo_critical) return false;
      return true;
    })
    .sort((a, b) => (STATUS_SORT[a.status] ?? 9) - (STATUS_SORT[b.status] ?? 9));


  const KpiCard = ({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) => (
    <div className="bg-white border border-[#E2D9C8] rounded-[10px] px-5 py-4 flex flex-col items-center justify-center text-center">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-2">{label}</div>
      <div className="text-[28px] font-extrabold leading-none" style={{ color: color || '#1E2D4D' }}>{value}</div>
      {sub && <div className="text-[11px] text-[#9CA3AF] mt-1.5">{sub}</div>}
    </div>
  );

  // Distinct categories from actual data
  const categories = [...new Set(sources.map(s => s.category))].sort();

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Crawl Monitor' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Crawl Monitor</h1>
          <p className="text-[13px] text-[#6B7F96] mt-1">
            {sources.length} intelligence sources tracked
          </p>
        </div>
        <button onClick={runCrawl} disabled={running}
          className={`py-2 px-5 border-none rounded-lg text-[13px] font-bold ${running ? 'bg-gray-200 text-[#9CA3AF] cursor-default' : 'bg-gold text-white cursor-pointer'}`}>
          {running ? 'Running...' : 'Run Crawl Now'}
        </button>
      </div>

      {/* Proactive offline notice — shows on load when crawl has never run */}
      {!loading && !crawlError && !crawlSuccess && sources.length > 0 && !latestRun && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-4 py-2.5 flex gap-2.5 items-start">
          <span className="text-[#D97706] text-base leading-none shrink-0">&#9888;</span>
          <div>
            <div className="text-[13px] font-semibold text-[#92400E]">
              Intelligence crawl has never run — {sources.length} sources are not being monitored
            </div>
            <div className="text-xs text-[#B45309] mt-0.5">
              Click "Run Crawl Now" to start the first crawl, or deploy the edge function: <code className="text-[11px] bg-[#FEF3C7] px-1 py-px rounded">supabase functions deploy crawl-monitor</code>
            </div>
          </div>
        </div>
      )}

      {crawlError && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-md px-4 py-2.5 flex gap-2.5 items-start">
          <span className="text-[#DC2626] text-base leading-none shrink-0">&#9888;</span>
          <div>
            <div className="text-[13px] font-semibold text-[#991B1B]">
              Intelligence crawl is offline — {sources.length} sources are not being monitored
            </div>
            <div className="text-xs text-[#B91C1C] mt-0.5">
              Edge Function error at crawl-monitor · Last attempted: {lastCrawled ? new Date(lastCrawled).toLocaleString() : 'Never'}
            </div>
            <div className="text-[11px] text-[#991B1B] mt-1 font-[DM_Mono,monospace]">
              {crawlError}
            </div>
          </div>
        </div>
      )}
      {crawlSuccess && (
        <div className="text-[13px] text-[#059669] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3.5 py-2.5">
          {crawlSuccess}
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex-1"><Skeleton h={70} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3 items-stretch">
          <KpiCard label="Live" value={liveCount} color="#16A34A" />
          <KpiCard label="Errors" value={errorCount} color="#DC2626" />
          <KpiCard label="Changed" value={changedCount} color="#D97706" />
          <KpiCard label="Total" value={totalCount} color="#1E2D4D" />
          <KpiCard
            label="Last Crawl"
            value={lastCrawled ? new Date(lastCrawled).toLocaleDateString() : 'Never'}
            color="#1E2D4D"
            sub={lastCrawled ? new Date(lastCrawled).toLocaleTimeString() : undefined}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-1.5 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-xs">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-xs">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[#6B7F96] cursor-pointer">
          <input type="checkbox" checked={demoOnly} onChange={e => setDemoOnly(e.target.checked)} />
          Demo critical only
        </label>
        <span className="text-[11px] text-[#9CA3AF] ml-auto">
          {filtered.length} of {sources.length} sources
        </span>
      </div>

      {/* Source Table */}
      <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : sources.length === 0 ? (
          <EmptyState icon="&#128375;" title="No sources configured" subtitle="Intelligence sources will appear once the system is seeded." />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E2D9C8]">
                {['Source', 'Category', 'Method', 'Freq', 'Status', 'Last Crawled', 'Signals', '&#11088;'].map(h => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[#6B7F96] font-semibold text-[11px] uppercase tracking-[0.5px]" dangerouslySetInnerHTML={{ __html: h }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const sc = STATUS_COLORS[s.status] || STATUS_COLORS.pending;
                return (
                  <tr key={s.id} className="border-b border-[#E2D9C8] hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="text-navy font-semibold text-[13px]">{s.name}</div>
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noreferrer"
                          className="text-[10px] text-gold no-underline">
                          {s.url.replace('https://', '').substring(0, 40)}{s.url.length > 48 ? '...' : ''}
                        </a>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-[#6B7F96] text-[11px]">
                      {CATEGORY_LABELS[s.category] || s.category}
                    </td>
                    <td className="px-3.5 py-2.5 text-[#6B7F96] text-[11px] font-[DM_Mono,monospace]">
                      {s.fetch_method || s.crawl_method || '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-[#6B7F96] text-[11px]">
                      {s.crawl_frequency}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-[10px] text-[10px] font-bold" style={{ background: sc.bg, color: sc.text }}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[#9CA3AF] text-[11px] font-[DM_Mono,monospace]">
                      {s.last_crawled_at ? new Date(s.last_crawled_at).toLocaleString() : '—'}
                    </td>
                    <td className={`px-3.5 py-2.5 text-xs font-[DM_Mono,monospace] ${s.signal_count_30d > 0 ? 'text-navy' : 'text-[#9CA3AF]'}`}>
                      {s.signal_count_30d || 0}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      {s.is_demo_critical ? '⭐' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Run History */}
      <h2 className="text-lg font-bold text-navy">Run History</h2>
      <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
        {runs.length === 0 ? (
          <EmptyState icon="&#128202;" title="No crawl runs recorded" subtitle="Click 'Run Crawl Now' to start the first run." />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E2D9C8]">
                {['Started', 'Type', 'Live', 'Failed', 'Changed', 'Duration', 'Triggered By'].map(h => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[#6B7F96] font-semibold text-[11px] uppercase tracking-[0.5px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} className="border-b border-[#E2D9C8]">
                  <td className="px-3.5 py-2.5 text-[#6B7F96] text-xs">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="px-3.5 py-2.5 text-[#6B7F96] text-xs">{r.run_type}</td>
                  <td className="px-3.5 py-2.5 text-[#059669] text-xs font-semibold">{r.feeds_live}</td>
                  <td className={`px-3.5 py-2.5 text-xs font-semibold ${r.feeds_failed > 0 ? 'text-[#DC2626]' : 'text-[#6B7F96]'}`}>{r.feeds_failed}</td>
                  <td className={`px-3.5 py-2.5 text-xs ${r.feeds_changed > 0 ? 'text-[#D97706]' : 'text-[#6B7F96]'}`}>{r.feeds_changed}</td>
                  <td className="px-3.5 py-2.5 text-[#6B7F96] text-xs">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td className="px-3.5 py-2.5 text-[#6B7F96] text-xs">{r.triggered_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
