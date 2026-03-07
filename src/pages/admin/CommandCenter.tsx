/**
 * CommandCenter — Platform operations health dashboard
 *
 * Route: /admin/command-center
 * Access: isEvidlyAdmin || isDemoMode
 *
 * KPI strip: Active Orgs, Active Locations, Crawl Feeds Live, Open Tickets, System Status
 * 3-column layout: Live Event Feed (50%), Crawl Status (25%), Open Tickets (25%)
 * Quick actions: Run Crawl, Refresh Metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { RefreshCw, Activity, Ticket, MapPin, Building2, Radio, Zap, HeartPulse } from 'lucide-react';

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

interface CrawlFeed {
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

const CRAWL_STATUS_ICON: Record<string, string> = {
  active: '✅',
  degraded: '⚠️',
  blocked: '❌',
  timeout: '🕐',
  inactive: '⏸️',
};

const Skeleton = ({ h = 20 }: { h?: number }) => (
  <div style={{ width: '100%', height: h, background: '#E5E7EB', borderRadius: 6 }} className="animate-pulse" />
);

// KpiCard removed — using shared KpiTile

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
  const { user } = useAuth();
  const { isDemoMode } = useDemo();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [feeds, setFeeds] = useState<CrawlFeed[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [activeOrgs, setActiveOrgs] = useState<number | null>(null);
  const [activeLocs, setActiveLocs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [runningCrawl, setRunningCrawl] = useState(false);
  const [crawlFeedback, setCrawlFeedback] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [eventRes, feedRes, ticketRes, orgRes, locRes] = await Promise.all([
      supabase.from('admin_event_log').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('crawl_health').select('*').order('feed_name'),
      supabase.from('support_tickets').select('id, ticket_number, priority, status, subject, created_at, contact_name')
        .in('status', ['open', 'in_progress', 'escalated']).order('priority'),
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('locations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    if (eventRes.data) setEvents(eventRes.data);
    if (feedRes.data) setFeeds(feedRes.data);
    if (ticketRes.data) setTickets(ticketRes.data);
    setActiveOrgs(orgRes.count ?? 0);
    setActiveLocs(locRes.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const crawlLive = feeds.filter(f => f.status === 'active').length;
  const crawlTotal = feeds.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRunCrawl = async () => {
    setRunningCrawl(true);
    setCrawlFeedback(null);
    try {
      const { error } = await supabase.functions.invoke('crawl-monitor');
      if (error) throw error;
      setCrawlFeedback({ type: 'success', msg: 'Crawl completed — refreshing data.' });
      await loadData();
    } catch (err: any) {
      setCrawlFeedback({ type: 'error', msg: `Crawl failed: ${err.message || 'Edge function error. Check Supabase logs.'}` });
    }
    setRunningCrawl(false);
  };

  const filteredEvents = eventFilter === 'all'
    ? events
    : events.filter(e => e.level === eventFilter.toUpperCase() || e.category === eventFilter);

  const systemStatusInfo = (() => {
    if (feeds.length === 0) return { label: 'Unknown', sub: 'No feeds configured', colorKey: 'default' as const };
    if (crawlLive === 0) return { label: 'Critical', sub: 'No crawl feeds active', colorKey: 'red' as const };
    if (crawlLive < crawlTotal * 0.6) return { label: 'Critical', sub: `${crawlLive}/${crawlTotal} feeds active`, colorKey: 'red' as const };
    if (crawlLive < crawlTotal * 0.9) return { label: 'Degraded', sub: `${crawlLive}/${crawlTotal} feeds active`, colorKey: 'amber' as const };
    return { label: 'Healthy', sub: `${crawlLive}/${crawlTotal} feeds active`, colorKey: 'green' as const };
  })();

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Command Center' }]} />
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Command Center</h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
          Platform operations health — live events, crawl status, open tickets.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KpiTile label="Active Orgs" value={activeOrgs ?? '—'} />
        <KpiTile label="Active Locations" value={activeLocs ?? '—'} />
        <KpiTile label="Crawl Feeds" value={loading ? '—' : `${crawlLive}/${crawlTotal}`} valueColor={crawlLive < crawlTotal * 0.8 ? 'amber' : 'green'} />
        <KpiTile label="Open Tickets" value={loading ? '—' : tickets.length} valueColor={tickets.length > 5 ? 'amber' : 'default'} />
        <KpiTile label="System Status" value={loading ? '—' : systemStatusInfo.label} sub={systemStatusInfo.sub} valueColor={systemStatusInfo.colorKey} />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: runningCrawl ? 'Running...' : 'Run Crawl', icon: Zap, onClick: handleRunCrawl, disabled: runningCrawl },
          { label: refreshing ? 'Refreshing...' : 'Refresh Metrics', icon: RefreshCw, onClick: handleRefresh, disabled: refreshing },
        ].map(btn => (
          <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
              background: btn.disabled ? '#F3F4F6' : '#fff', border: `1px solid ${BORDER}`,
              borderRadius: 8, fontSize: 12, fontWeight: 600, color: btn.disabled ? TEXT_MUTED : NAVY,
              cursor: btn.disabled ? 'default' : 'pointer',
            }}>
            <btn.icon size={13} />
            {btn.label}
          </button>
        ))}
      </div>

      {crawlFeedback && (
        <div style={{
          fontSize: 13, borderRadius: 8, padding: '10px 14px',
          color: crawlFeedback.type === 'error' ? '#DC2626' : '#059669',
          background: crawlFeedback.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${crawlFeedback.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
        }}>
          {crawlFeedback.msg}
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

        {/* MIDDLE: Crawl Status */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={14} color={GOLD} />
            <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Crawl Status</span>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={24} />)}
              </div>
            ) : feeds.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No crawl feeds configured.</div>
            ) : feeds.map(f => (
              <div key={f.id} style={{ padding: '7px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ fontSize: 13 }}>{CRAWL_STATUS_ICON[f.status] || '❓'}</span>
                <span style={{ flex: 1, color: NAVY, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.feed_name}
                </span>
                {f.response_ms != null && (
                  <span style={{ fontSize: 9, color: f.response_ms > 5000 ? '#D97706' : TEXT_MUTED }}>{f.response_ms}ms</span>
                )}
                <span style={{ fontSize: 9, color: TEXT_MUTED }}>{f.last_checked_at ? timeAgo(f.last_checked_at) : '—'}</span>
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
