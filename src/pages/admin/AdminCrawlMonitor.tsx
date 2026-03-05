/**
 * Crawl Monitor — Live feed status, run history, run-now button
 * Route: /admin/crawl-monitor
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const BG = '#0F1629';
const CARD = '#1A2540';
const GOLD = '#A08C5A';
const TEXT = '#F0EBE0';
const TEXT_DIM = '#8A9AB8';
const TEXT_MUTED = '#4A5C7A';
const BORDER = '#1E2D4D';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  live:      { bg: '#0f3326', text: '#34D399' },
  pending:   { bg: '#1a2540', text: '#8A9AB8' },
  error:     { bg: '#3b1414', text: '#F87171' },
  timeout:   { bg: '#3b2f10', text: '#FBBF24' },
  waf_block: { bg: '#3b2f10', text: '#FBBF24' },
};

interface FeedRow {
  id: string;
  feed_id: string;
  feed_name: string;
  pillar: string;
  status: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  response_ms: number | null;
  error_message: string | null;
  retry_count: number;
  content_hash: string | null;
  auto_retry_at: string | null;
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

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: BORDER, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: TEXT_MUTED }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_DIM, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_MUTED, maxWidth: 360, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

export default function AdminCrawlMonitor() {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState<FeedRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [pillarFilter, setPillarFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [feedRes, runRes] = await Promise.all([
      supabase.from('crawl_health').select('*').order('feed_id'),
      supabase.from('crawl_runs').select('*').order('started_at', { ascending: false }).limit(20),
    ]);
    if (feedRes.data) setFeeds(feedRes.data);
    if (runRes.data) setRuns(runRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runCrawl = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('crawl-monitor');
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert(`Crawl failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const filteredFeeds = feeds.filter(f => {
    if (pillarFilter !== 'all' && f.pillar !== pillarFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    return true;
  });

  const liveCount = feeds.filter(f => f.status === 'live').length;
  const errorCount = feeds.filter(f => f.status === 'error' || f.status === 'timeout').length;
  const wafCount = feeds.filter(f => f.status === 'waf_block').length;
  const pendingCount = feeds.filter(f => f.status === 'pending').length;
  const latestRun = runs[0] || null;

  const KpiCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || TEXT }}>{value}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontSize: 13 }}>&larr; Admin</button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0 }}>Crawl Monitor</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, marginTop: 4 }}>{feeds.length} feeds tracked</p>
        </div>
        <button onClick={runCrawl} disabled={running}
          style={{ padding: '8px 20px', background: running ? BORDER : GOLD, border: 'none', borderRadius: 8, color: running ? TEXT_DIM : '#1E2D4D', fontSize: 13, fontWeight: 700, cursor: running ? 'default' : 'pointer' }}>
          {running ? 'Running...' : 'Run Crawl Now'}
        </button>
      </div>

      {/* KPIs */}
      {loading ? (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ flex: 1 }}><Skeleton h={70} /></div>)}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <KpiCard label="Live" value={liveCount} color="#34D399" />
          <KpiCard label="Errors" value={errorCount} color="#F87171" />
          <KpiCard label="WAF Blocked" value={wafCount} color="#FBBF24" />
          <KpiCard label="Pending" value={pendingCount} />
          <KpiCard label="Last Run" value={latestRun ? new Date(latestRun.started_at).toLocaleString() : 'Never'} />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={pillarFilter} onChange={e => setPillarFilter(e.target.value)}
          style={{ padding: '6px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 }}>
          <option value="all">All Pillars</option>
          <option value="food_safety">Food Safety</option>
          <option value="fire_safety">Facility Safety</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 }}>
          <option value="all">All Statuses</option>
          {['live', 'error', 'timeout', 'waf_block', 'pending'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Feed Table */}
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 32 }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : feeds.length === 0 ? (
          <EmptyState icon="🕷️" title="No feeds configured" subtitle="Run your first crawl to populate feed status." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Feed', 'Pillar', 'Status', 'Response', 'Last Checked', 'Error', 'Retries'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFeeds.map(f => {
                const sc = STATUS_COLORS[f.status] || STATUS_COLORS.pending;
                return (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>{f.feed_name}</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{f.feed_id}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>
                      {f.pillar === 'food_safety' ? 'Food Safety' : 'Facility Safety'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text }}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>
                      {f.response_ms !== null ? `${f.response_ms}ms` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>
                      {f.last_checked_at ? new Date(f.last_checked_at).toLocaleString() : 'Never'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#F87171', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.error_message || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: f.retry_count > 0 ? '#FBBF24' : TEXT_DIM, fontSize: 12 }}>
                      {f.retry_count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Run History */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Run History</h2>
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {runs.length === 0 ? (
          <EmptyState icon="📊" title="No crawl runs recorded" subtitle="Click 'Run Crawl Now' to start the first run." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Started', 'Type', 'Live', 'Failed', 'Changed', 'Duration', 'Triggered By'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(r.started_at).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{r.run_type}</td>
                  <td style={{ padding: '10px 14px', color: '#34D399', fontSize: 12, fontWeight: 600 }}>{r.feeds_live}</td>
                  <td style={{ padding: '10px 14px', color: r.feeds_failed > 0 ? '#F87171' : TEXT_DIM, fontSize: 12, fontWeight: 600 }}>{r.feeds_failed}</td>
                  <td style={{ padding: '10px 14px', color: r.feeds_changed > 0 ? '#FBBF24' : TEXT_DIM, fontSize: 12 }}>{r.feeds_changed}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{r.triggered_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
