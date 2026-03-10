/**
 * ADMIN-DASHBOARD — EvidLY Internal Admin Dashboard
 *
 * All platform metrics in one place: crawl health, event log,
 * API keys, assessment leads, demo sessions, K2C, and more.
 *
 * Route: /admin/dashboard
 * Access: @getevidly.com users or isEvidlyAdmin flag
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { format } from 'date-fns';
import {
  Loader2, RefreshCw, Activity, Key, Users, Bug, Terminal,
  ScrollText, Play, Heart, BarChart3, Globe, Shield, AlertTriangle,
  CheckCircle, XCircle, Clock, Zap, ChevronDown, UserCog,
} from 'lucide-react';
import { EmulationPanel } from '../../components/admin/EmulationPanel';

// ── Colors ──────────────────────────────────────────────────
const BRAND = '#1e4d6b';
const GOLD = '#A08C5A';
const TEXT_SEC = '#3D5068';
const TEXT_TERT = '#6B7F96';

// ── Types ───────────────────────────────────────────────────

interface CrawlHealthRow {
  id: string; feed_id: string; feed_name: string; pillar: string;
  status: string; last_checked_at: string | null; last_success_at: string | null;
  response_ms: number | null; error_message: string | null;
  retry_count: number; content_hash: string | null; jurisdiction_id: string | null;
  auto_retry_at: string | null;
}

interface CrawlRunRow {
  id: string; run_type: string; started_at: string; completed_at: string | null;
  feeds_total: number; feeds_live: number; feeds_failed: number;
  feeds_changed: number; duration_ms: number | null; triggered_by: string;
}

interface EventRow {
  id: string; event_time: string; level: string; category: string | null;
  message: string; metadata: any; user_id: string | null;
}

interface ApiKeyRow {
  id: string; name: string; key_preview: string; scope: string;
  status: string; created_at: string; last_used_at: string | null;
}

interface LeadRow {
  id: string; business_name: string; county: string | null;
  contact_email: string | null; account_type: string | null;
  status: string; locations_count: number; source: string | null;
  created_at: string;
}

interface DemoSessionRow {
  id: string; account_name: string; county: string | null;
  user_email: string | null; started_at: string; last_active_at: string;
  duration_seconds: number; instance_id: string | null;
}

interface K2CRow {
  id: string; account_name: string; county: string | null;
  amount_cents: number; meals_count: number; donation_period: string;
}

// ── Tabs ────────────────────────────────────────────────────

type TabId = 'command' | 'crawl' | 'events' | 'apikeys' | 'leads' | 'edge' | 'demos' | 'k2c' | 'usage' | 'web' | 'emulation';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'command', label: 'Command Center', icon: <Activity size={15} /> },
  { id: 'crawl',   label: 'Crawl Monitor',  icon: <Bug size={15} /> },
  { id: 'events',  label: 'Event Log',      icon: <ScrollText size={15} /> },
  { id: 'apikeys', label: 'API Keys',       icon: <Key size={15} /> },
  { id: 'leads',   label: 'Leads',          icon: <Users size={15} /> },
  { id: 'edge',    label: 'Edge Functions',  icon: <Zap size={15} /> },
  { id: 'demos',   label: 'Demo Sessions',  icon: <Play size={15} /> },
  { id: 'k2c',     label: 'K2C',            icon: <Heart size={15} /> },
  { id: 'usage',   label: 'Usage',          icon: <BarChart3 size={15} /> },
  { id: 'web',     label: 'Web Analytics',  icon: <Globe size={15} /> },
  { id: 'emulation', label: 'User Emulation', icon: <UserCog size={15} /> },
];

// ── Demo data ───────────────────────────────────────────────

const DEMO_CRAWL_HEALTH: CrawlHealthRow[] = [
  { id: '1', feed_id: 'cdph_la', feed_name: 'CDPH — Los Angeles', pillar: 'food_safety', status: 'live', last_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), response_ms: 342, error_message: null, retry_count: 0, content_hash: 'a1b2c3', jurisdiction_id: 'la_county', auto_retry_at: null },
  { id: '2', feed_id: 'fda_recalls', feed_name: 'FDA Recalls', pillar: 'food_safety', status: 'live', last_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), response_ms: 189, error_message: null, retry_count: 0, content_hash: 'd4e5f6', jurisdiction_id: null, auto_retry_at: null },
  { id: '3', feed_id: 'ca_fire_marshal', feed_name: 'CA State Fire Marshal', pillar: 'facility_safety', status: 'timeout', last_checked_at: new Date().toISOString(), last_success_at: null, response_ms: 15000, error_message: 'Request timed out after 15s', retry_count: 2, content_hash: null, jurisdiction_id: null, auto_retry_at: new Date(Date.now() + 30 * 60000).toISOString() },
  { id: '4', feed_id: 'nfpa96', feed_name: 'NFPA 96 Updates', pillar: 'facility_safety', status: 'waf_block', last_checked_at: new Date().toISOString(), last_success_at: null, response_ms: 420, error_message: 'WAF/CDN block detected', retry_count: 5, content_hash: null, jurisdiction_id: null, auto_retry_at: null },
  { id: '5', feed_id: 'cdph_fresno', feed_name: 'CDPH — Fresno', pillar: 'food_safety', status: 'live', last_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), response_ms: 567, error_message: null, retry_count: 0, content_hash: 'g7h8i9', jurisdiction_id: 'fresno', auto_retry_at: null },
];

const DEMO_EVENTS: EventRow[] = [
  { id: '1', event_time: new Date().toISOString(), level: 'INFO', category: 'crawl', message: 'cdph_la: live', metadata: { feedId: 'cdph_la', responseMs: 342 }, user_id: null },
  { id: '2', event_time: new Date(Date.now() - 60000).toISOString(), level: 'ERROR', category: 'crawl', message: 'ca_fire_marshal: timeout — Request timed out after 15s', metadata: { feedId: 'ca_fire_marshal', responseMs: 15000 }, user_id: null },
  { id: '3', event_time: new Date(Date.now() - 120000).toISOString(), level: 'WARN', category: 'crawl', message: 'CONTENT CHANGE DETECTED: fda_recalls — hash changed', metadata: { feedId: 'fda_recalls' }, user_id: null },
  { id: '4', event_time: new Date(Date.now() - 300000).toISOString(), level: 'INFO', category: 'auth', message: 'User login: arthur@getevidly.com', metadata: {}, user_id: null },
  { id: '5', event_time: new Date(Date.now() - 600000).toISOString(), level: 'INFO', category: 'demo', message: 'Demo session started: Destino\'s Restaurant (Fresno)', metadata: {}, user_id: null },
];

const DEMO_LEADS: LeadRow[] = [
  { id: '1', business_name: 'Taco Loco', county: 'Fresno', contact_email: 'owner@tacoloco.com', account_type: 'single', status: 'new', locations_count: 1, source: 'landing_page', created_at: new Date().toISOString() },
  { id: '2', business_name: 'Central Valley Catering', county: 'Merced', contact_email: 'info@cvcatering.com', account_type: 'multi-unit', status: 'demo_scheduled', locations_count: 3, source: 'outreach', created_at: new Date(Date.now() - 86400000).toISOString() },
];

const DEMO_API_KEYS: ApiKeyRow[] = [
  { id: '1', name: 'Insurance Partner — Acme', key_preview: 'sk-ev-prod-••••7f2a', scope: 'read', status: 'active', created_at: new Date(Date.now() - 30 * 86400000).toISOString(), last_used_at: new Date().toISOString() },
];

const DEMO_SESSIONS: DemoSessionRow[] = [
  { id: '1', account_name: "Destino's Restaurant", county: 'Fresno', user_email: 'demo@getevidly.com', started_at: new Date(Date.now() - 1800000).toISOString(), last_active_at: new Date().toISOString(), duration_seconds: 1800, instance_id: 'demo_destinos' },
];

const DEMO_K2C: K2CRow[] = [
  { id: '1', account_name: "Destino's Restaurant", county: 'Fresno', amount_cents: 15000, meals_count: 150, donation_period: '2026-02-01' },
  { id: '2', account_name: 'Pacific Coast Dining', county: 'Los Angeles', amount_cents: 32000, meals_count: 320, donation_period: '2026-02-01' },
];

// ── Component ───────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();

  // Auth guard
  if (!isEvidlyAdmin && !isDemoMode) {
    return <Navigate to="/dashboard" replace />;
  }

  const [activeTab, setActiveTab] = useState<TabId>('command');
  const [loading, setLoading] = useState(!isDemoMode);
  const [crawlRunning, setCrawlRunning] = useState(false);

  // Data state
  const [crawlHealth, setCrawlHealth] = useState<CrawlHealthRow[]>(isDemoMode ? DEMO_CRAWL_HEALTH : []);
  const [crawlRuns, setCrawlRuns] = useState<CrawlRunRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>(isDemoMode ? DEMO_EVENTS : []);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>(isDemoMode ? DEMO_API_KEYS : []);
  const [leads, setLeads] = useState<LeadRow[]>(isDemoMode ? DEMO_LEADS : []);
  const [demoSessions, setDemoSessions] = useState<DemoSessionRow[]>(isDemoMode ? DEMO_SESSIONS : []);
  const [k2cData, setK2cData] = useState<K2CRow[]>(isDemoMode ? DEMO_K2C : []);

  // Stats
  const [orgCount, setOrgCount] = useState(isDemoMode ? 12 : 0);
  const [locCount, setLocCount] = useState(isDemoMode ? 34 : 0);

  // ── Fetch all data ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (isDemoMode) return;
    setLoading(true);
    try {
      const [healthRes, runsRes, eventsRes, keysRes, leadsRes, demosRes, k2cRes, orgsRes, locsRes] = await Promise.all([
        supabase.from('crawl_health').select('*').order('pillar').order('feed_name'),
        supabase.from('crawl_runs').select('*').order('started_at', { ascending: false }).limit(10),
        supabase.from('admin_event_log').select('*').order('event_time', { ascending: false }).limit(200),
        supabase.from('admin_api_keys').select('*').order('created_at'),
        supabase.from('assessment_leads').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('demo_sessions').select('*').order('last_active_at', { ascending: false }).limit(50),
        supabase.from('k2c_donations').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('locations').select('id', { count: 'exact', head: true }),
      ]);

      if (healthRes.data) setCrawlHealth(healthRes.data);
      if (runsRes.data) setCrawlRuns(runsRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (keysRes.data) setApiKeys(keysRes.data);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (demosRes.data) setDemoSessions(demosRes.data);
      if (k2cRes.data) setK2cData(k2cRes.data);
      if (orgsRes.count != null) setOrgCount(orgsRes.count);
      if (locsRes.count != null) setLocCount(locsRes.count);
    } catch (err) {
      console.error('[AdminDashboard] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime event stream ────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;
    const channel = supabase
      .channel('admin-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_event_log' }, (payload) => {
        setEvents(prev => [payload.new as EventRow, ...prev].slice(0, 200));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isDemoMode]);

  // ── Run crawl now ────────────────────────────────────────
  const runCrawlNow = useCallback(async () => {
    setCrawlRunning(true);
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 2000));
        toast.success('Demo crawl completed — 37 feeds checked');
      } else {
        const { error } = await supabase.functions.invoke('crawl-monitor', {
          body: { trigger: 'manual' },
        });
        if (error) throw error;
        toast.success('Crawl completed — refreshing data');
        await fetchAll();
      }
    } catch (err: any) {
      toast.error(`Crawl failed: ${err.message || 'Unknown error'}`);
    } finally {
      setCrawlRunning(false);
    }
  }, [isDemoMode, fetchAll]);

  // ── Computed stats ───────────────────────────────────────
  const crawlStats = useMemo(() => {
    const live = crawlHealth.filter(f => f.status === 'live').length;
    const failed = crawlHealth.filter(f => f.status !== 'live' && f.status !== 'pending').length;
    const pending = crawlHealth.filter(f => f.status === 'pending').length;
    return { live, failed, pending, total: crawlHealth.length };
  }, [crawlHealth]);

  const latestRun = crawlRuns[0] || null;
  const recentErrors = useMemo(() => events.filter(e => e.level === 'ERROR').length, [events]);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Dashboard' }]} />
      {isDemoMode && (
        <div className="rounded-lg px-4 py-2 text-sm font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
          Demo Mode — displaying sample data
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND }}>Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: TEXT_TERT }}>
            Platform metrics, crawl health, and operational monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runCrawlNow}
            disabled={crawlRunning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: BRAND }}
            onMouseEnter={e => { if (!crawlRunning) e.currentTarget.style.backgroundColor = '#2a6a8f'; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = BRAND}
          >
            {crawlRunning ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />}
            {crawlRunning ? 'Running...' : 'Run Crawl Now'}
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: '#D1D9E6', color: TEXT_SEC }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Organizations" value={orgCount} icon={<Users size={18} />} />
        <KpiCard label="Locations" value={locCount} icon={<Globe size={18} />} />
        <KpiCard label="Feeds Live" value={`${crawlStats.live}/${crawlStats.total}`} icon={<CheckCircle size={18} />} color="#16a34a" />
        <KpiCard label="Errors (24h)" value={recentErrors} icon={<AlertTriangle size={18} />} color={recentErrors > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b" style={{ borderColor: '#D1D9E6' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors"
            style={{
              color: activeTab === tab.id ? BRAND : TEXT_TERT,
              borderBottom: activeTab === tab.id ? `2px solid ${GOLD}` : '2px solid transparent',
              backgroundColor: activeTab === tab.id ? '#eef4f8' : 'transparent',
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-6" style={{ borderColor: '#D1D9E6' }}>
        {loading && !isDemoMode ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: BRAND }} />
          </div>
        ) : (
          <>
            {activeTab === 'command' && <CommandCenterTab crawlStats={crawlStats} latestRun={latestRun} orgCount={orgCount} locCount={locCount} recentErrors={recentErrors} events={events.slice(0, 10)} />}
            {activeTab === 'crawl' && <CrawlMonitorTab feeds={crawlHealth} runs={crawlRuns} />}
            {activeTab === 'events' && <EventLogTab events={events} />}
            {activeTab === 'apikeys' && <ApiKeysTab keys={apiKeys} />}
            {activeTab === 'leads' && <LeadsTab leads={leads} />}
            {activeTab === 'edge' && <EdgeFunctionsTab events={events} />}
            {activeTab === 'demos' && <DemoSessionsTab sessions={demoSessions} />}
            {activeTab === 'k2c' && <K2CTab donations={k2cData} onRefresh={fetchAll} isDemoMode={isDemoMode} />}
            {activeTab === 'usage' && <UsageTab orgCount={orgCount} locCount={locCount} isDemoMode={isDemoMode} />}
            {activeTab === 'web' && <WebAnalyticsTab leads={leads} />}
            {activeTab === 'emulation' && <EmulationPanel />}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#D1D9E6' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: color || BRAND }}>{icon}</span>
        <span className="text-xs font-medium" style={{ color: TEXT_TERT }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: color || '#0B1628' }}>{value}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { live: '#16a34a', pending: '#6b7280', timeout: '#d97706', error: '#dc2626', waf_block: '#dc2626' };
  return <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors[status] || '#6b7280' }} />;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM d, HH:mm'); } catch { return '—'; }
}

// ── Command Center ──────────────────────────────────────────

function CommandCenterTab({ crawlStats, latestRun, orgCount, locCount, recentErrors, events }: {
  crawlStats: { live: number; failed: number; pending: number; total: number };
  latestRun: CrawlRunRow | null;
  orgCount: number; locCount: number; recentErrors: number;
  events: EventRow[];
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Platform Overview</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Feeds Live" value={crawlStats.live} total={crawlStats.total} color="#16a34a" />
        <MiniStat label="Feeds Failed" value={crawlStats.failed} color="#dc2626" />
        <MiniStat label="Feeds Pending" value={crawlStats.pending} color="#6b7280" />
        <MiniStat label="Errors (24h)" value={recentErrors} color={recentErrors > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {latestRun && (
        <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p className="font-medium" style={{ color: BRAND }}>Last Crawl Run</p>
          <p style={{ color: TEXT_SEC }}>
            {fmtDate(latestRun.started_at)} &middot; {latestRun.feeds_live}/{latestRun.feeds_total} live
            {latestRun.feeds_changed > 0 && <span className="text-amber-600"> &middot; {latestRun.feeds_changed} changed</span>}
            {latestRun.duration_ms && ` &middot; ${(latestRun.duration_ms / 1000).toFixed(1)}s`}
          </p>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium mb-2" style={{ color: TEXT_SEC }}>Recent Events</h4>
        <div className="space-y-1">
          {events.map(e => (
            <div key={e.id} className="flex items-center gap-2 text-xs py-1">
              <LevelBadge level={e.level} />
              <span style={{ color: TEXT_TERT }}>{fmtDate(e.event_time)}</span>
              <span style={{ color: '#374151' }} className="truncate">{e.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, total, color }: { label: string; value: number; total?: number; color: string }) {
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <p className="text-[11px] font-medium" style={{ color: TEXT_TERT }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>
        {value}{total !== undefined && <span className="text-sm font-normal" style={{ color: TEXT_TERT }}>/{total}</span>}
      </p>
    </div>
  );
}

// ── Crawl Monitor ───────────────────────────────────────────

function CrawlMonitorTab({ feeds, runs }: { feeds: CrawlHealthRow[]; runs: CrawlRunRow[] }) {
  const [pillarFilter, setPillarFilter] = useState<'all' | 'food_safety' | 'facility_safety'>('all');
  const filtered = pillarFilter === 'all' ? feeds : feeds.filter(f => f.pillar === pillarFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Crawl Health ({feeds.length} feeds)</h3>
        <div className="flex gap-1">
          {(['all', 'food_safety', 'facility_safety'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPillarFilter(p)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: pillarFilter === p ? BRAND : '#f1f5f9',
                color: pillarFilter === p ? '#fff' : TEXT_SEC,
              }}
            >
              {p === 'all' ? 'All' : p === 'food_safety' ? 'Food Safety' : 'Facility Safety'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: '#e2e8f0' }}>
              <th className="text-left py-2 px-2 text-xs font-medium" style={{ color: TEXT_TERT }}>Status</th>
              <th className="text-left py-2 px-2 text-xs font-medium" style={{ color: TEXT_TERT }}>Feed</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden sm:table-cell" style={{ color: TEXT_TERT }}>Pillar</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden md:table-cell" style={{ color: TEXT_TERT }}>Response</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden md:table-cell" style={{ color: TEXT_TERT }}>Last Check</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden lg:table-cell" style={{ color: TEXT_TERT }}>Retries</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden lg:table-cell" style={{ color: TEXT_TERT }}>Error</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#f1f5f9' }}>
                <td className="py-2 px-2"><StatusDot status={f.status} /> <span className="text-xs ml-1">{f.status}</span></td>
                <td className="py-2 px-2 font-medium" style={{ color: '#0B1628' }}>{f.feed_name}</td>
                <td className="py-2 px-2 hidden sm:table-cell">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: f.pillar === 'food_safety' ? '#dcfce7' : '#fef3c7', color: f.pillar === 'food_safety' ? '#166534' : '#92400e' }}>
                    {f.pillar === 'food_safety' ? 'Food' : 'Facility'}
                  </span>
                </td>
                <td className="py-2 px-2 hidden md:table-cell" style={{ color: TEXT_SEC }}>{f.response_ms ? `${f.response_ms}ms` : '—'}</td>
                <td className="py-2 px-2 hidden md:table-cell" style={{ color: TEXT_TERT }}>{fmtDate(f.last_checked_at)}</td>
                <td className="py-2 px-2 hidden lg:table-cell" style={{ color: f.retry_count > 0 ? '#dc2626' : TEXT_TERT }}>{f.retry_count}</td>
                <td className="py-2 px-2 hidden lg:table-cell text-xs truncate max-w-48" style={{ color: '#dc2626' }}>{f.error_message || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {runs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 mt-4" style={{ color: TEXT_SEC }}>Recent Runs</h4>
          <div className="space-y-1">
            {runs.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded" style={{ backgroundColor: '#f8fafc' }}>
                <span style={{ color: TEXT_TERT }}>{fmtDate(r.started_at)}</span>
                <span className="font-medium">{r.feeds_live}/{r.feeds_total} live</span>
                {r.feeds_failed > 0 && <span style={{ color: '#dc2626' }}>{r.feeds_failed} failed</span>}
                {r.feeds_changed > 0 && <span style={{ color: '#d97706' }}>{r.feeds_changed} changed</span>}
                {r.duration_ms && <span style={{ color: TEXT_TERT }}>{(r.duration_ms / 1000).toFixed(1)}s</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Event Log ───────────────────────────────────────────────

function EventLogTab({ events }: { events: EventRow[] }) {
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(events.map(e => e.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [events]);

  const filtered = events.filter(e => {
    if (levelFilter !== 'all' && e.level !== levelFilter) return false;
    if (catFilter !== 'all' && e.category !== catFilter) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Event Log</h3>
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="text-xs border rounded px-2 py-1" style={{ borderColor: '#D1D9E6' }}
        >
          <option value="all">All Levels</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="text-xs border rounded px-2 py-1" style={{ borderColor: '#D1D9E6' }}
        >
          {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: TEXT_TERT }}>{filtered.length} events</span>
      </div>

      <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
        {filtered.map(e => (
          <div key={e.id} className="flex items-start gap-2 text-xs py-1.5 px-2 rounded hover:bg-gray-50">
            <LevelBadge level={e.level} />
            <span className="flex-shrink-0" style={{ color: TEXT_TERT }}>{fmtDate(e.event_time)}</span>
            {e.category && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#f1f5f9', color: TEXT_SEC }}>{e.category}</span>}
            <span style={{ color: '#374151' }} className="break-all">{e.message}</span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-center py-8" style={{ color: TEXT_TERT }}>No events match filters</p>}
      </div>
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    INFO: { bg: '#dbeafe', text: '#1e40af' },
    WARN: { bg: '#fef3c7', text: '#92400e' },
    ERROR: { bg: '#fee2e2', text: '#991b1b' },
    DEBUG: { bg: '#f3f4f6', text: '#6b7280' },
  };
  const s = styles[level] || styles.DEBUG;
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: s.bg, color: s.text }}>{level}</span>;
}

// ── API Keys ────────────────────────────────────────────────

function ApiKeysTab({ keys }: { keys: ApiKeyRow[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold" style={{ color: BRAND }}>API Keys ({keys.length})</h3>
      {keys.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: TEXT_TERT }}>No API keys configured</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
              <Key size={16} style={{ color: GOLD }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{k.name}</p>
                <p className="text-xs font-mono" style={{ color: TEXT_TERT }}>{k.key_preview}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: k.scope === 'full' ? '#dbeafe' : '#f1f5f9', color: k.scope === 'full' ? '#1e40af' : TEXT_SEC }}>{k.scope}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: k.status === 'active' ? '#dcfce7' : '#fee2e2', color: k.status === 'active' ? '#166534' : '#991b1b' }}>{k.status}</span>
              <span className="text-xs hidden sm:inline" style={{ color: TEXT_TERT }}>{k.last_used_at ? `Used ${fmtDate(k.last_used_at)}` : 'Never used'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Leads ───────────────────────────────────────────────────

function LeadsTab({ leads }: { leads: LeadRow[] }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    new: { bg: '#dbeafe', text: '#1e40af' },
    contacted: { bg: '#fef3c7', text: '#92400e' },
    demo_scheduled: { bg: '#e0e7ff', text: '#3730a3' },
    converted: { bg: '#dcfce7', text: '#166534' },
    lost: { bg: '#f3f4f6', text: '#6b7280' },
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Assessment Leads ({leads.length})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: '#e2e8f0' }}>
              <th className="text-left py-2 px-2 text-xs font-medium" style={{ color: TEXT_TERT }}>Business</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden sm:table-cell" style={{ color: TEXT_TERT }}>County</th>
              <th className="text-left py-2 px-2 text-xs font-medium" style={{ color: TEXT_TERT }}>Status</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden md:table-cell" style={{ color: TEXT_TERT }}>Type</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden md:table-cell" style={{ color: TEXT_TERT }}>Source</th>
              <th className="text-left py-2 px-2 text-xs font-medium hidden lg:table-cell" style={{ color: TEXT_TERT }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => {
              const sc = statusColors[l.status] || statusColors.new;
              return (
                <tr key={l.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-2 px-2 font-medium">{l.business_name}</td>
                  <td className="py-2 px-2 hidden sm:table-cell" style={{ color: TEXT_SEC }}>{l.county || '—'}</td>
                  <td className="py-2 px-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                      {l.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2 px-2 hidden md:table-cell" style={{ color: TEXT_SEC }}>{l.account_type || '—'}</td>
                  <td className="py-2 px-2 hidden md:table-cell" style={{ color: TEXT_TERT }}>{l.source || '—'}</td>
                  <td className="py-2 px-2 hidden lg:table-cell" style={{ color: TEXT_TERT }}>{fmtDate(l.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Edge Functions ──────────────────────────────────────────

const KNOWN_FUNCTIONS = [
  'classify-document', 'ai-document-analysis', 'cloud-file-import', 'crawl-monitor',
  'intelligence-collect', 'rfp-crawl', 'rfp-classify', 'checkup-notify',
  'check-equipment-alerts', 'send-document-alerts', 'send-missing-doc-reminders',
  'auto-request-documents',
];

function EdgeFunctionsTab({ events }: { events: EventRow[] }) {
  const edgeErrors = useMemo(() => {
    return events.filter(e => e.level === 'ERROR');
  }, [events]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Edge Functions ({KNOWN_FUNCTIONS.length})</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {KNOWN_FUNCTIONS.map(fn => {
          const errCount = edgeErrors.filter(e => e.message?.includes(fn) || e.metadata?.feedId === fn).length;
          return (
            <div key={fn} className="flex items-center gap-2 p-3 rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
              <Zap size={14} style={{ color: errCount > 0 ? '#dc2626' : '#16a34a' }} />
              <span className="text-sm font-medium flex-1">{fn}</span>
              {errCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-800">{errCount} err</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Demo Sessions ───────────────────────────────────────────

function DemoSessionsTab({ sessions }: { sessions: DemoSessionRow[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Demo Sessions ({sessions.length})</h3>
      {sessions.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: TEXT_TERT }}>No demo sessions recorded</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
              <Play size={14} style={{ color: BRAND }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.account_name}</p>
                <p className="text-xs" style={{ color: TEXT_TERT }}>
                  {s.county || 'N/A'} &middot; {Math.round(s.duration_seconds / 60)}min &middot; {fmtDate(s.started_at)}
                </p>
              </div>
              {s.user_email && <span className="text-xs hidden sm:inline" style={{ color: TEXT_TERT }}>{s.user_email}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── K2C ─────────────────────────────────────────────────────

function K2CTab({ donations, onRefresh, isDemoMode }: { donations: K2CRow[]; onRefresh: () => void; isDemoMode: boolean }) {
  const [processing, setProcessing] = useState(false);
  const totalMeals = donations.reduce((sum, d) => sum + d.meals_count, 0);
  const totalDollars = donations.reduce((sum, d) => sum + d.amount_cents, 0) / 100;

  const processK2C = async () => {
    setProcessing(true);
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1500));
        toast.success('Demo mode — K2C processor simulated');
      } else {
        const { data, error } = await supabase.functions.invoke('k2c-processor', {
          body: { triggerType: 'manual_admin' },
        });
        if (error) throw error;
        toast.success(`K2C processed: ${data.processed} orgs recorded, ${data.skipped} already done this period`);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(`K2C processing failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Kitchen to Community</h3>
        <button
          onClick={processK2C}
          disabled={processing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#16a34a' }}
          onMouseEnter={e => { if (!processing) e.currentTarget.style.backgroundColor = '#15803d'; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
        >
          {processing ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />}
          {processing ? 'Processing...' : 'Process Now'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Total Meals" value={totalMeals.toLocaleString()} color="#16a34a" />
        <MiniStat label="Total Donated" value={`$${totalDollars.toLocaleString()}`} color={BRAND} />
      </div>
      <div className="space-y-2">
        {donations.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
            <Heart size={14} style={{ color: '#dc2626' }} />
            <div className="flex-1">
              <p className="text-sm font-medium">{d.account_name}</p>
              <p className="text-xs" style={{ color: TEXT_TERT }}>{d.county || 'N/A'}</p>
            </div>
            <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>{d.meals_count} meals</span>
            <span className="text-xs hidden sm:inline" style={{ color: TEXT_TERT }}>${(d.amount_cents / 100).toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Usage ───────────────────────────────────────────────────

function UsageTab({ orgCount, locCount, isDemoMode }: { orgCount: number; locCount: number; isDemoMode: boolean }) {
  const [metrics, setMetrics] = useState<{
    temp_logs: number; checklists: number; documents: number;
    corrective_actions: number; time_saved_hours: number; money_saved_dollars: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setMetrics({ temp_logs: 4200, checklists: 1850, documents: 340, corrective_actions: 42, time_saved_hours: 1342, money_saved_dollars: 38926 });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        // Compute from stored counts
        const tempLogs = data.temp_logs_count || 0;
        const checklists = data.checklists_count || 0;
        const docs = data.docs_uploaded_count || 0;
        const corrective = data.corrective_actions_count || 0;
        const timeMins = tempLogs * 8 + checklists * 12 + docs * 20 + corrective * 25;
        const timeHrs = Math.round(timeMins / 60);
        const labor = timeHrs * 28;
        const fines = Math.round(corrective * 500 * 0.15);
        const insurance = Math.round((data.locations_count || 0) * (200 / 12));
        setMetrics({
          temp_logs: tempLogs, checklists, documents: docs,
          corrective_actions: corrective,
          time_saved_hours: timeHrs,
          money_saved_dollars: labor + fines + insurance,
        });
      }
    })();
  }, [isDemoMode]);

  const refreshMetrics = async () => {
    if (isDemoMode) { toast.success('Demo mode — metrics refresh simulated'); return; }
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('platform-metrics-refresh', { body: {} });
      if (error) throw error;
      toast.success('Metrics refreshed — reloading...');
      // Re-fetch
      const { data } = await supabase
        .from('platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const tempLogs = data.temp_logs_count || 0;
        const checklists = data.checklists_count || 0;
        const docs = data.docs_uploaded_count || 0;
        const corrective = data.corrective_actions_count || 0;
        const timeMins = tempLogs * 8 + checklists * 12 + docs * 20 + corrective * 25;
        const timeHrs = Math.round(timeMins / 60);
        const labor = timeHrs * 28;
        const fines = Math.round(corrective * 500 * 0.15);
        const insurance = Math.round((data.locations_count || 0) * (200 / 12));
        setMetrics({
          temp_logs: tempLogs, checklists, documents: docs,
          corrective_actions: corrective,
          time_saved_hours: timeHrs,
          money_saved_dollars: labor + fines + insurance,
        });
      }
    } catch (err: any) {
      toast.error(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Platform Usage</h3>
        <button
          onClick={refreshMetrics}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50"
          style={{ borderColor: '#D1D9E6', color: TEXT_SEC }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh Metrics
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Organizations" value={orgCount} color={BRAND} />
        <MiniStat label="Locations" value={locCount} color={BRAND} />
        {metrics && (
          <>
            <MiniStat label="Temp Logs" value={metrics.temp_logs.toLocaleString()} color="#dc2626" />
            <MiniStat label="Checklists" value={metrics.checklists.toLocaleString()} color="#2563eb" />
          </>
        )}
      </div>
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Documents" value={metrics.documents.toLocaleString()} color="#ea580c" />
          <MiniStat label="Corrective Actions" value={metrics.corrective_actions.toLocaleString()} color="#d97706" />
          <div className="relative group">
            <MiniStat label="Time Saved" value={`${metrics.time_saved_hours.toLocaleString()} hrs`} color="#8b5cf6" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                8 min/temp log + 12 min/checklist + 20 min/doc + 25 min/corrective action
              </div>
            </div>
          </div>
          <div className="relative group">
            <MiniStat label="Est. Money Saved" value={`$${metrics.money_saved_dollars.toLocaleString()}`} color={GOLD} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                $28/hr labor + $500 x 15% fine avoidance + $200/loc/yr insurance
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: '#eef4f8', border: '1px solid #D1D9E6' }}>
        <Shield size={14} style={{ color: BRAND, flexShrink: 0 }} />
        <span className="text-xs" style={{ color: TEXT_SEC }}>Emulation sessions are excluded from all usage metrics. Formulas use real DB counts from platform_metrics_daily.</span>
      </div>
    </div>
  );
}

// ── Web Analytics ───────────────────────────────────────────

function WebAnalyticsTab({ leads }: { leads: LeadRow[] }) {
  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => {
      const src = l.source || 'unknown';
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: BRAND }}>Web Analytics</h3>
      {sourceBreakdown.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: TEXT_SEC }}>Lead Sources</h4>
          <div className="space-y-1.5">
            {sourceBreakdown.map(([source, count]) => (
              <div key={source} className="flex items-center gap-3 text-sm">
                <span className="w-32 font-medium" style={{ color: '#0B1628' }}>{source}</span>
                <div className="flex-1 h-4 rounded-full" style={{ backgroundColor: '#f1f5f9' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(count / leads.length) * 100}%`, backgroundColor: BRAND, minWidth: 4 }}
                  />
                </div>
                <span className="text-xs font-semibold w-8 text-right" style={{ color: TEXT_SEC }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: TEXT_TERT }}>
          No lead source data available. Connect Plausible or PostHog for full web analytics.
        </p>
      )}
    </div>
  );
}
