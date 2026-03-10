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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:      { bg: '#ECFDF5', text: '#059669', label: 'Live' },
  broken:      { bg: '#FEF2F2', text: '#DC2626', label: 'Error' },
  waf_blocked: { bg: '#F5F3FF', text: '#7C3AED', label: 'WAF Blocked' },
  pending:     { bg: '#FFFBEB', text: '#D97706', label: 'Pending' },
  paused:      { bg: '#F3F4F6', text: '#6B7280', label: 'Paused' },
};

// Sort priority: errors first, WAF second, pending, paused, active last
const STATUS_SORT: Record<string, number> = {
  broken: 0, waf_blocked: 1, pending: 2, paused: 3, active: 4,
};

interface SourceRow {
  id: string;
  source_key: string;
  name: string;
  category: string;
  subcategory: string | null;
  url: string | null;
  crawl_method: string | null;
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
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 360, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

export default function AdminCrawlMonitor() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [crawlSuccess, setCrawlSuccess] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [demoOnly, setDemoOnly] = useState(false);

  // Stat card values — set directly from latest crawl_runs row in loadData()
  const [liveCount, setLiveCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [changedCount, setChangedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [lastCrawled, setLastCrawled] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<RunRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [srcRes, runRes] = await Promise.all([
      supabase.from('intelligence_sources').select('*').order('category').order('name'),
      supabase.from('crawl_runs').select('*').order('started_at', { ascending: false }).limit(20),
    ]);
    if (srcRes.error) console.error('[CrawlMonitor] intelligence_sources query failed:', srcRes.error);
    if (runRes.error) console.error('[CrawlMonitor] crawl_runs query failed:', runRes.error);
    if (srcRes.data) setSources(srcRes.data);
    if (runRes.data) {
      console.log('[CrawlMonitor] crawl_runs rows:', runRes.data.length, 'latest:', runRes.data[0]);
      setRuns(runRes.data);
      const latest = runRes.data[0] || null;
      setLatestRun(latest);
      setLiveCount(latest?.feeds_live ?? 0);
      setErrorCount(latest?.feeds_failed ?? 0);
      setChangedCount(latest?.feeds_changed ?? 0);
      setTotalCount(latest?.feeds_total ?? 0);
      setLastCrawled(latest?.completed_at || latest?.started_at || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runCrawl = async () => {
    setRunning(true);
    setCrawlError(null);
    setCrawlSuccess(null);
    try {
      const { data, error } = await supabase.functions.invoke('crawl-monitor');
      if (error) throw error;
      const live = data?.feedsLive ?? 0;
      const failed = data?.feedsFailed ?? 0;
      const changed = data?.feedsChanged ?? 0;
      setCrawlSuccess(`Crawl completed: ${live} live, ${failed} failed, ${changed} changed.`);
      await loadData();
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      const hint = msg.includes('non-2xx')
        ? 'The crawl-monitor edge function may not be deployed. Run: supabase functions deploy crawl-monitor'
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
    <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || NAVY, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>{sub}</div>}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    padding: '6px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 12,
  };

  // Distinct categories from actual data
  const categories = [...new Set(sources.map(s => s.category))].sort();

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Crawl Monitor' }]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Crawl Monitor</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
            {sources.length} intelligence sources tracked
          </p>
        </div>
        <button onClick={runCrawl} disabled={running}
          style={{ padding: '8px 20px', background: running ? '#E5E7EB' : GOLD, border: 'none', borderRadius: 8, color: running ? TEXT_MUTED : '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: running ? 'default' : 'pointer' }}>
          {running ? 'Running...' : 'Run Crawl Now'}
        </button>
      </div>

      {/* Proactive offline notice — shows on load when crawl has never run */}
      {!loading && !crawlError && !crawlSuccess && sources.length > 0 && !latestRun && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: '#D97706', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>⚠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>
              Intelligence crawl has never run — {sources.length} sources are not being monitored
            </div>
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
              Click "Run Crawl Now" to start the first crawl, or deploy the edge function: <code style={{ fontSize: 11, background: '#FEF3C7', padding: '1px 4px', borderRadius: 3 }}>supabase functions deploy crawl-monitor</code>
            </div>
          </div>
        </div>
      )}

      {crawlError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: '#DC2626', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>⚠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>
              Intelligence crawl is offline — {sources.length} sources are not being monitored
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
              Edge Function error at crawl-monitor · Last attempted: {lastCrawled ? new Date(lastCrawled).toLocaleString() : 'Never'}
            </div>
            <div style={{ fontSize: 11, color: '#991B1B', marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
              {crawlError}
            </div>
          </div>
        </div>
      )}
      {crawlSuccess && (
        <div style={{ fontSize: 13, color: '#059669', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px' }}>
          {crawlSuccess}
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <div style={{ display: 'flex', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ flex: 1 }}><Skeleton h={70} /></div>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'stretch' }}>
          <KpiCard label="Live" value={liveCount} color="#16A34A" />
          <KpiCard label="Errors" value={errorCount} color="#DC2626" />
          <KpiCard label="Changed" value={changedCount} color="#D97706" />
          <KpiCard label="Total" value={totalCount} color={NAVY} />
          <KpiCard
            label="Last Crawl"
            value={lastCrawled ? new Date(lastCrawled).toLocaleDateString() : 'Never'}
            color={NAVY}
            sub={lastCrawled ? new Date(lastCrawled).toLocaleTimeString() : undefined}
          />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={inputStyle}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_SEC, cursor: 'pointer' }}>
          <input type="checkbox" checked={demoOnly} onChange={e => setDemoOnly(e.target.checked)} />
          Demo critical only
        </label>
        <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 'auto' }}>
          {filtered.length} of {sources.length} sources
        </span>
      </div>

      {/* Source Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : sources.length === 0 ? (
          <EmptyState icon="🕷️" title="No sources configured" subtitle="Intelligence sources will appear once the system is seeded." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Source', 'Category', 'Method', 'Freq', 'Status', 'Last Crawled', 'Signals', '⭐'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const sc = STATUS_COLORS[s.status] || STATUS_COLORS.pending;
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: NAVY, fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 10, color: GOLD, textDecoration: 'none' }}>
                          {s.url.replace('https://', '').substring(0, 40)}{s.url.length > 48 ? '...' : ''}
                        </a>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 11 }}>
                      {CATEGORY_LABELS[s.category] || s.category}
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                      {s.crawl_method || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 11 }}>
                      {s.crawl_frequency}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_MUTED, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                      {s.last_crawled_at ? new Date(s.last_crawled_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: "'DM Mono', monospace", color: s.signal_count_30d > 0 ? NAVY : TEXT_MUTED }}>
                      {s.signal_count_30d || 0}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
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
      <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>Run History</h2>
      <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {runs.length === 0 ? (
          <EmptyState icon="📊" title="No crawl runs recorded" subtitle="Click 'Run Crawl Now' to start the first run." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Started', 'Type', 'Live', 'Failed', 'Changed', 'Duration', 'Triggered By'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{new Date(r.started_at).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{r.run_type}</td>
                  <td style={{ padding: '10px 14px', color: '#059669', fontSize: 12, fontWeight: 600 }}>{r.feeds_live}</td>
                  <td style={{ padding: '10px 14px', color: r.feeds_failed > 0 ? '#DC2626' : TEXT_SEC, fontSize: 12, fontWeight: 600 }}>{r.feeds_failed}</td>
                  <td style={{ padding: '10px 14px', color: r.feeds_changed > 0 ? '#D97706' : TEXT_SEC, fontSize: 12 }}>{r.feeds_changed}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{r.triggered_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
