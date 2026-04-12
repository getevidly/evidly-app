/**
 * CommandCenter — Platform operations health dashboard
 *
 * Route: /admin/command-center
 * Access: isEvidlyAdmin || isDemoMode
 *
 * KPI strip: Active Orgs, Active Locations, Crawl Feeds Live, Open Tickets, System Status
 * 3-column layout: Live Event Feed (50%), Crawl Status (25%), Open Tickets (25%)
 * Quick actions: Run Crawl (Firecrawl), Refresh Metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { StatCardRow } from '../../components/admin/StatCardRow';
import { RefreshCw, Activity, Ticket, Radio, Zap } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const BORDER = '#E2D9C8';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';

interface EventRow {
  id: string;
  level: string;
  category: string;
  message: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface SourceRow {
  id: string;
  name: string;
  source_key: string;
  status: string;
  last_crawled_at: string | null;
  last_crawl_status: string | null;
  last_crawl_error: string | null;
  category: string;
}

interface TicketRow {
  id: string;
  ticket_number: string;
  priority: string;
  status: string;
  subject: string;
  created_at: string;
  contact_name: string | null;
}

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  ERROR: { bg: '#FEF2F2', color: '#DC2626' },
  WARN: { bg: '#FFFBEB', color: '#D97706' },
  INFO: { bg: '#F0F9FF', color: '#0284C7' },
  DEBUG: { bg: '#F9FAFB', color: '#6B7280' },
};

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#FEF2F2', color: '#DC2626' },
  high: { bg: '#FFFBEB', color: '#D97706' },
  normal: { bg: '#F0F9FF', color: '#0284C7' },
  low: { bg: '#F9FAFB', color: '#6B7280' },
};

const SOURCE_STATUS_ICON: Record<string, string> = {
  active: '✅',
  broken: '❌',
  waf_blocked: '🚫',
  paused: '⏸️',
  pending: '🕐',
};

const Skeleton = ({ h = 20 }: { h?: number }) => (
  <div style={{ width: '100%', height: h, background: '#E5E7EB', borderRadius: 6 }} className="animate-pulse" />
);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CommandCenter() {
  useDemoGuard();
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  usePageTitle('Admin | Command Center');

  const [events, setEvents] = useState<EventRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [activeOrgs, setActiveOrgs] = useState<number | null>(null);
  const [activeLocs, setActiveLocs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<{
    succeeded: number;
    failed: number;
    total: number;
  } | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [eventRes, sourceRes, ticketRes, orgRes, locRes] = await Promise.all([
      supabase.from('admin_event_log').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('intelligence_sources').select('id, name, source_key, status, last_crawled_at, last_crawl_status, last_crawl_error, category')
        .not('url', 'is', null).order('name'),
      supabase.from('support_tickets').select('id, ticket_number, priority, status, subject, created_at, contact_name')
        .in('status', ['open', 'in_progress', 'escalated']).order('priority'),
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('locations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    if (eventRes.data) setEvents(eventRes.data);
    if (sourceRes.data) setSources(sourceRes.data);
    if (ticketRes.data) setTickets(ticketRes.data);
    setActiveOrgs(orgRes.count ?? 0);
    setActiveLocs(locRes.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Compute status from intelligence_sources
  const totalFeeds = sources.length;
  const liveFeeds = sources.filter(s => s.status === 'active' && s.last_crawl_status === 'success').length;
  const lastCrawl = sources.reduce<string | null>((latest, s) => {
    if (!s.last_crawled_at) return latest;
    if (!latest) return s.last_crawled_at;
    return new Date(s.last_crawled_at) > new Date(latest) ? s.last_crawled_at : latest;
  }, null);

  const neverRun = !lastCrawl;
  const allDown = liveFeeds === 0 && !neverRun;
  const healthy = liveFeeds === totalFeeds;
  const degraded = liveFeeds > 0 && liveFeeds < totalFeeds;

  const systemStatus = neverRun  ? { label: 'Not Configured', color: GOLD }
                     : allDown   ? { label: 'Critical',        color: '#DC2626' }
                     : degraded  ? { label: 'Degraded',        color: '#D97706' }
                     :             { label: 'Healthy',         color: '#16A34A' };

  const statusSubtext = neverRun  ? 'Run crawl to activate feeds'
                      : allDown   ? 'No crawl feeds active'
                      : degraded  ? `${totalFeeds - liveFeeds} feeds down`
                      :             `All ${totalFeeds} feeds live`;

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRunNow = async () => {
    if (isDemoMode) return;
    setCrawling(true);
    setCrawlResult(null);
    setCrawlError(null);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-crawl');
      if (error) throw error;
      setCrawlResult(data);
      await loadData();
    } catch (err: any) {
      setCrawlError(err.message || 'Edge function error. Check Supabase logs.');
    } finally {
      setCrawling(false);
    }
  };

  const filteredEvents = eventFilter === 'all'
    ? events
    : events.filter(e => e.level === eventFilter.toUpperCase() || e.category === eventFilter);

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Command Center' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Command Center</h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
          Platform operations health — live events, crawl status, open tickets.
        </p>
      </div>

      {/* KPI Strip */}
      <StatCardRow cards={[
        { label: 'Active Orgs', value: activeOrgs ?? '—' },
        { label: 'Active Locations', value: activeLocs ?? '—' },
        { label: 'Crawl Feeds', value: loading ? '—' : `${liveFeeds}/${totalFeeds}`, valueColor: liveFeeds < totalFeeds ? 'red' : 'green', subtext: statusSubtext },
        { label: 'Open Tickets', value: loading ? '—' : tickets.length, valueColor: tickets.length > 5 ? 'red' : 'default' },
        { label: 'System Status', value: loading ? '—' : systemStatus.label, subtext: statusSubtext },
      ]} />

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handleRunNow}
          disabled={crawling}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: crawling ? '#9CA3AF' : NAVY,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: crawling ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <Zap size={13} />
          {crawling ? 'Crawling...' : '▶ Run Now'}
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
            background: refreshing ? '#F3F4F6' : '#fff', border: `1px solid ${BORDER}`,
            borderRadius: 8, fontSize: 12, fontWeight: 600, color: refreshing ? TEXT_MUTED : NAVY,
            cursor: refreshing ? 'default' : 'pointer',
          }}
        >
          <RefreshCw size={13} />
          {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Crawl result inline */}
      {crawlResult && (
        <div style={{
          fontSize: 12,
          color: crawlResult.failed > 0 ? '#D97706' : '#16A34A',
          background: crawlResult.failed > 0 ? '#FFFBEB' : '#F0FDF4',
          border: `1px solid ${crawlResult.failed > 0 ? '#FDE68A' : '#BBF7D0'}`,
          borderRadius: 8, padding: '10px 14px',
          fontFamily: 'Inter, sans-serif',
        }}>
          Last run: {crawlResult.succeeded}/{crawlResult.total} feeds succeeded
          {crawlResult.failed > 0 && ` · ${crawlResult.failed} failed`}
        </div>
      )}
      {crawlError && (
        <div style={{
          fontSize: 13, borderRadius: 8, padding: '10px 14px',
          color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA',
        }}>
          Crawl failed: {crawlError}
        </div>
      )}

      {/* 3-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>

        {/* LEFT: Live Event Feed */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color={GOLD} />
              <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Live Event Feed</span>
              <span style={{ fontSize: 10, color: TEXT_MUTED }}>Last 50</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all', 'ERROR', 'WARN', 'INFO', 'configure', 'crawl', 'auth'].map(f => (
                <button key={f} onClick={() => setEventFilter(f)}
                  style={{
                    padding: '2px 8px', borderRadius: 4, border: 'none', fontSize: 10, fontWeight: 600,
                    background: eventFilter === f ? NAVY : '#F3F4F6',
                    color: eventFilter === f ? '#fff' : TEXT_MUTED, cursor: 'pointer',
                  }}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={28} />)}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No events match this filter.</div>
            ) : filteredEvents.map(ev => {
              const lc = LEVEL_COLORS[ev.level] || LEVEL_COLORS.INFO;
              return (
                <div key={ev.id} style={{ padding: '8px 18px', borderBottom: `1px solid #F3F4F6`, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: lc.bg, color: lc.color, minWidth: 36, textAlign: 'center' }}>
                    {ev.level}
                  </span>
                  <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: '#F3F4F6', color: TEXT_SEC }}>
                    {ev.category}
                  </span>
                  <span style={{ flex: 1, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.message}
                  </span>
                  <span style={{ color: TEXT_MUTED, fontSize: 10, whiteSpace: 'nowrap' }}>{timeAgo(ev.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* MIDDLE: Crawl Status — reads from intelligence_sources */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={14} color={GOLD} />
            <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Crawl Status</span>
            <span style={{ fontSize: 10, color: TEXT_MUTED }}>{liveFeeds}/{totalFeeds}</span>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={24} />)}
              </div>
            ) : sources.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No crawl feeds configured.</div>
            ) : sources.map(s => (
              <div key={s.id} style={{ padding: '7px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}
                title={s.last_crawl_error || undefined}>
                <span style={{ fontSize: 13 }}>{SOURCE_STATUS_ICON[s.status] || '❓'}</span>
                <span style={{ flex: 1, color: NAVY, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
                {s.last_crawl_status && (
                  <span style={{
                    fontSize: 9, fontWeight: 600,
                    color: s.last_crawl_status === 'success' ? '#16A34A' : s.last_crawl_status === 'error' ? '#DC2626' : TEXT_MUTED,
                  }}>
                    {s.last_crawl_status}
                  </span>
                )}
                <span style={{ fontSize: 9, color: TEXT_MUTED }}>{s.last_crawled_at ? timeAgo(s.last_crawled_at) : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Open Tickets */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ticket size={14} color={GOLD} />
              <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Open Tickets</span>
            </div>
            <a href="/admin/support" style={{ fontSize: 10, color: GOLD, fontWeight: 600, textDecoration: 'none' }}>View All →</a>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={24} />)}
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No open tickets.</div>
            ) : tickets.map(t => {
              const pc = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.normal;
              return (
                <div key={t.id} style={{ padding: '8px 18px', borderBottom: '1px solid #F3F4F6', fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: pc.bg, color: pc.color }}>
                      {t.priority}
                    </span>
                    <span style={{ color: TEXT_MUTED, fontSize: 9 }}>#{t.ticket_number}</span>
                  </div>
                  <div style={{ color: NAVY, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.subject}
                  </div>
                  {t.contact_name && <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>{t.contact_name}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
