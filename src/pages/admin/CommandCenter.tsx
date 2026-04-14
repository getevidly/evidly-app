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
  active: '\u2705',
  broken: '\u274C',
  waf_blocked: '\uD83D\uDEAB',
  paused: '\u23F8\uFE0F',
  pending: '\uD83D\uDD50',
};

const Skeleton = ({ h = 20 }: { h?: number }) => (
  <div className="w-full bg-[#E5E7EB] rounded-md animate-pulse" style={{ height: h }} />
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

  const systemStatus = neverRun  ? { label: 'Not Configured', color: '#A08C5A' }
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
        <h1 className="text-2xl font-bold tracking-tight text-navy">Command Center</h1>
        <p className="text-[13px] text-[#6B7F96] mt-1">
          Platform operations health — live events, crawl status, open tickets.
        </p>
      </div>

      {/* KPI Strip */}
      <StatCardRow cards={[
        { label: 'Active Orgs', value: activeOrgs ?? '\u2014' },
        { label: 'Active Locations', value: activeLocs ?? '\u2014' },
        { label: 'Crawl Feeds', value: loading ? '\u2014' : `${liveFeeds}/${totalFeeds}`, valueColor: liveFeeds < totalFeeds ? 'red' : 'green', subtext: statusSubtext },
        { label: 'Open Tickets', value: loading ? '\u2014' : tickets.length, valueColor: tickets.length > 5 ? 'red' : 'default' },
        { label: 'System Status', value: loading ? '\u2014' : systemStatus.label, subtext: statusSubtext },
      ]} />

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={handleRunNow}
          disabled={crawling}
          className={`flex items-center gap-1.5 border-none rounded-md px-4 py-2 text-[13px] font-semibold font-[Inter,sans-serif] text-white ${crawling ? 'bg-[#9CA3AF] cursor-not-allowed' : 'bg-navy cursor-pointer'}`}
        >
          <Zap size={13} />
          {crawling ? 'Crawling...' : '\u25B6 Run Now'}
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-1.5 py-[7px] px-4 border border-[#E2D9C8] rounded-lg text-xs font-semibold ${refreshing ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-default' : 'bg-white text-navy cursor-pointer'}`}
        >
          <RefreshCw size={13} />
          {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Crawl result inline */}
      {crawlResult && (
        <div className={`text-xs rounded-lg px-3.5 py-2.5 font-[Inter,sans-serif] ${crawlResult.failed > 0 ? 'text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A]' : 'text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0]'}`}>
          Last run: {crawlResult.succeeded}/{crawlResult.total} feeds succeeded
          {crawlResult.failed > 0 && ` \u00B7 ${crawlResult.failed} failed`}
        </div>
      )}
      {crawlError && (
        <div className="text-[13px] rounded-lg px-3.5 py-2.5 text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA]">
          Crawl failed: {crawlError}
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">

        {/* LEFT: Live Event Feed */}
        <div className="bg-white border border-[#E2D9C8] rounded-xl overflow-hidden">
          <div className="px-[18px] py-3.5 border-b border-[#E2D9C8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-gold" />
              <span className="text-[13px] font-bold text-navy">Live Event Feed</span>
              <span className="text-[10px] text-[#9CA3AF]">Last 50</span>
            </div>
            <div className="flex gap-1">
              {['all', 'ERROR', 'WARN', 'INFO', 'configure', 'crawl', 'auth'].map(f => (
                <button key={f} onClick={() => setEventFilter(f)}
                  className={`px-2 py-0.5 rounded border-none text-[10px] font-semibold cursor-pointer ${eventFilter === f ? 'bg-navy text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {loading ? (
              <div className="p-4 flex flex-col gap-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={28} />)}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-10 text-center text-[#9CA3AF] text-[13px]">No events match this filter.</div>
            ) : filteredEvents.map(ev => {
              const lc = LEVEL_COLORS[ev.level] || LEVEL_COLORS.INFO;
              return (
                <div key={ev.id} className="px-[18px] py-2 border-b border-[#F3F4F6] flex items-center gap-2.5 text-xs hover:bg-[#FAFAF8]">
                  <span
                    className="px-1.5 py-px rounded-[3px] text-[9px] font-bold min-w-[36px] text-center"
                    style={{ background: lc.bg, color: lc.color }}
                  >
                    {ev.level}
                  </span>
                  <span className="px-1.5 py-px rounded-[3px] text-[9px] font-semibold bg-[#F3F4F6] text-[#6B7F96]">
                    {ev.category}
                  </span>
                  <span className="flex-1 text-navy overflow-hidden text-ellipsis whitespace-nowrap">
                    {ev.message}
                  </span>
                  <span className="text-[#9CA3AF] text-[10px] whitespace-nowrap">{timeAgo(ev.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* MIDDLE: Crawl Status — reads from intelligence_sources */}
        <div className="bg-white border border-[#E2D9C8] rounded-xl overflow-hidden">
          <div className="px-[18px] py-3.5 border-b border-[#E2D9C8] flex items-center gap-2">
            <Radio size={14} className="text-gold" />
            <span className="text-[13px] font-bold text-navy">Crawl Status</span>
            <span className="text-[10px] text-[#9CA3AF]">{liveFeeds}/{totalFeeds}</span>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {loading ? (
              <div className="p-4 flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={24} />)}
              </div>
            ) : sources.length === 0 ? (
              <div className="p-10 text-center text-[#9CA3AF] text-[13px]">No crawl feeds configured.</div>
            ) : sources.map(s => (
              <div key={s.id} className="px-[18px] py-[7px] border-b border-[#F3F4F6] flex items-center gap-2 text-[11px]"
                title={s.last_crawl_error || undefined}>
                <span className="text-[13px]">{SOURCE_STATUS_ICON[s.status] || '\u2753'}</span>
                <span className="flex-1 text-navy font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                  {s.name}
                </span>
                {s.last_crawl_status && (
                  <span className={`text-[9px] font-semibold ${s.last_crawl_status === 'success' ? 'text-[#16A34A]' : s.last_crawl_status === 'error' ? 'text-[#DC2626]' : 'text-[#9CA3AF]'}`}>
                    {s.last_crawl_status}
                  </span>
                )}
                <span className="text-[9px] text-[#9CA3AF]">{s.last_crawled_at ? timeAgo(s.last_crawled_at) : '\u2014'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Open Tickets */}
        <div className="bg-white border border-[#E2D9C8] rounded-xl overflow-hidden">
          <div className="px-[18px] py-3.5 border-b border-[#E2D9C8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket size={14} className="text-gold" />
              <span className="text-[13px] font-bold text-navy">Open Tickets</span>
            </div>
            <a href="/admin/support" className="text-[10px] text-gold font-semibold no-underline">View All &rarr;</a>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {loading ? (
              <div className="p-4 flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={24} />)}
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-10 text-center text-[#9CA3AF] text-[13px]">No open tickets.</div>
            ) : tickets.map(t => {
              const pc = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.normal;
              return (
                <div key={t.id} className="px-[18px] py-2 border-b border-[#F3F4F6] text-[11px]">
                  <div className="flex items-center gap-1.5 mb-[3px]">
                    <span
                      className="px-1.5 py-px rounded-[3px] text-[9px] font-bold"
                      style={{ background: pc.bg, color: pc.color }}
                    >
                      {t.priority}
                    </span>
                    <span className="text-[#9CA3AF] text-[9px]">#{t.ticket_number}</span>
                  </div>
                  <div className="text-navy font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {t.subject}
                  </div>
                  {t.contact_name && <div className="text-[10px] text-[#9CA3AF] mt-0.5">{t.contact_name}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
