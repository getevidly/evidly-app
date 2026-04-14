/**
 * AdminHome — Platform admin home dashboard
 *
 * Route: /admin (platform_admin only — other roles see AdminHub)
 * Access: @getevidly.com or platform_admin role
 *
 * Sections:
 *  A. Alert banner (crawl errors only)
 *  B. Welcome header + subtitle
 *  C. 6 KPI stat cards (Supabase queries)
 *  D. Three-column grid: Quick Access, Platform Health, Open Tickets
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';

const LAUNCH_DATE = new Date('2026-05-05T00:00:00-07:00');

/* ------------------------------------------------------------------ */
/*  Quick Access cards                                                 */
/* ------------------------------------------------------------------ */
interface QuickCard {
  label: string;
  path: string;
  icon: string;
  color: string;
  bg: string;
}

const QUICK_ACCESS: QuickCard[] = [
  { label: 'EvidLY Intelligence', path: '/admin/intelligence', icon: '⚡', color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Sales Pipeline', path: '/admin/sales', icon: '📊', color: '#DC2626', bg: '#FEF2F2' },
  { label: 'Configure', path: '/admin/configure', icon: '⚙️', color: '#6B7280', bg: '#F3F4F6' },
  { label: 'Signal Queue', path: '/admin/intelligence-admin', icon: '🔔', color: '#D97706', bg: '#FFFBEB' },
  { label: 'User Provisioning', path: '/admin/users', icon: '👤', color: '#1E2D4D', bg: '#F4F1EB' },
  { label: 'Billing', path: '/admin/billing', icon: '💳', color: '#A08C5A', bg: '#FDF8EE' },
  { label: 'Email Sequences', path: '/admin/email-sequences', icon: '📧', color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Trial Health', path: '/admin/trial-health', icon: '💊', color: '#059669', bg: '#ECFDF5' },
  { label: 'Demo Tours', path: '/admin/demo-tours', icon: '🎯', color: '#059669', bg: '#ECFDF5' },
];

/* ------------------------------------------------------------------ */
/*  Ticket interface                                                    */
/* ------------------------------------------------------------------ */
interface Ticket {
  id: string;
  title: string;
  severity: string;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-600' },
  high: { bg: 'bg-amber-100', text: 'text-amber-600' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-600' },
  low: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AdminHome() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Stats
  const [mrr, setMrr] = useState<number | null>(null);
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [locCount, setLocCount] = useState<number | null>(null);
  const [crawlLive, setCrawlLive] = useState<number | null>(null);
  const [crawlTotal, setCrawlTotal] = useState<number | null>(null);
  const [crawlErrors, setCrawlErrors] = useState(0);
  const [pendingSignals, setPendingSignals] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Platform Health
  const [healthErrorCount, setHealthErrorCount] = useState<number | null>(null);

  // AUDIT-FIX-08 / A-3: AI budget alert
  const [aiBudgetAlert, setAiBudgetAlert] = useState<{ spend: number; budget: number } | null>(null);

  // Open Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const updateCountdown = useCallback(() => {
    const now = new Date();
    const diff = LAUNCH_DATE.getTime() - now.getTime();
    if (diff <= 0) { setCountdown('LAUNCHED'); return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    setCountdown(`${d}d ${h}h`);
  }, []);

  const loadStats = useCallback(async () => {
    if (isDemoMode) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError(null);
    try {
      const [subRes, orgRes, locRes, totalRes, liveRes, errorRes, sigRes, ticketRes] = await Promise.all([
        supabase.from('billing_subscriptions').select('mrr_cents').eq('status', 'active'),
        supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('locations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('intelligence_sources').select('*', { count: 'exact', head: true }),
        supabase.from('intelligence_sources').select('*', { count: 'exact', head: true }).eq('status', 'live'),
        supabase.from('intelligence_sources').select('*', { count: 'exact', head: true }).in('status', ['error', 'waf_blocked', 'timeout']),
        supabase.from('intelligence_signals').select('id', { count: 'exact', head: true }).eq('is_published', false),
        supabase.from('support_tickets').select('id, title, severity, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(10),
      ]);

      setMrr((subRes.data || []).reduce((sum, s) => sum + (s.mrr_cents || 0), 0) / 100);
      setOrgCount(orgRes.count ?? 0);
      setLocCount(locRes.count ?? 0);

      const total = totalRes.count ?? 0;
      const live = liveRes.count ?? 0;
      const errors = errorRes.count ?? 0;
      setCrawlTotal(total);
      setCrawlLive(live);
      setCrawlErrors(errors);
      setHealthErrorCount(errors);

      setPendingSignals(sigRes.count ?? 0);
      setTickets(ticketRes.data || []);

      // AUDIT-FIX-08 / A-3: Check for AI budget threshold alert
      const today = new Date().toISOString().split('T')[0];
      const { data: alertData } = await supabase
        .from('platform_audit_log')
        .select('metadata')
        .eq('action', 'security.ai_budget_threshold_reached')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(1);
      if (alertData && alertData.length > 0) {
        const meta = alertData[0].metadata as { daily_spend?: number; daily_budget?: number } | null;
        if (meta) setAiBudgetAlert({ spend: meta.daily_spend || 0, budget: meta.daily_budget || 0 });
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load dashboard data');
    }
    setIsLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    loadStats();
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [loadStats, updateCountdown]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Admin';

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <AdminBreadcrumb crumbs={[{ label: 'Home' }]} />
        <div className="grid grid-cols-6 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-[10px] bg-[#E8EDF4] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[220px] rounded-xl bg-[#E8EDF4] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <AdminBreadcrumb crumbs={[{ label: 'Home' }]} />
        <div className="text-center py-12 px-12">
          <p className="text-slate_ui text-sm">Failed to load dashboard data.</p>
          <Button onClick={loadStats} variant="gold" size="sm" className="mt-3">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb crumbs={[{ label: 'Home' }]} />

      {/* ── A. Alert Banner ──────────────────────────────────── */}
      {crawlErrors > 0 && (
        <div className="flex items-center justify-between px-[18px] py-3 bg-amber-100 border border-amber-500 rounded-[10px] text-[13px] font-medium text-amber-800">
          <span>{crawlErrors} crawl source{crawlErrors !== 1 ? 's' : ''} in error state</span>
          <span
            onClick={() => navigate('/admin/intelligence')}
            className="cursor-pointer font-semibold underline decoration-amber-600"
          >
            View in EvidLY Intelligence &rarr; Sources
          </span>
        </div>
      )}

      {/* AUDIT-FIX-08 / A-3: AI Budget Alert Banner */}
      {aiBudgetAlert && (
        <div className="flex items-center justify-between px-[18px] py-3 bg-amber-100 border border-amber-500 rounded-[10px] text-[13px] font-medium text-amber-800">
          <span>AI classification spend today: ${aiBudgetAlert.spend.toFixed(4)} / ${aiBudgetAlert.budget.toFixed(2)} daily budget</span>
          <span
            onClick={() => navigate('/admin/intelligence-admin')}
            className="cursor-pointer font-semibold underline decoration-amber-600"
          >
            View AI Costs &rarr;
          </span>
        </div>
      )}

      {/* ── B. Page Header ───────────────────────────────────── */}
      <div>
        <h1 className="text-[26px] font-extrabold text-navy font-[Syne,DM_Sans,sans-serif] m-0 tracking-[-0.02em]">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-slate_ui mt-1">
          EvidLY Admin Console — platform operations, intelligence, and growth.
        </p>
      </div>

      {/* ── C. Stat Cards Row ────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3.5 items-stretch">
        {([
          {
            label: 'MRR',
            value: mrr === null ? '—' : mrr === 0 ? '$0' : `$${mrr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            color: 'text-gold',
            sub: 'Pre-launch',
          },
          {
            label: 'Organizations',
            value: orgCount ?? '—',
            color: 'text-navy',
            sub: 'Active',
          },
          {
            label: 'Locations',
            value: locCount ?? '—',
            color: 'text-navy',
            sub: 'Active',
          },
          {
            label: 'Crawl Sources',
            value: crawlLive === null || crawlTotal === null ? '—' : `${crawlLive}/${crawlTotal}`,
            color: crawlLive !== null && crawlLive > 0 ? 'text-green-800' : 'text-orange-700',
            sub: 'Live feeds',
          },
          {
            label: 'Signals Pending',
            value: pendingSignals ?? '—',
            color: 'text-orange-700',
            sub: 'Awaiting review',
          },
          {
            label: 'Launch Countdown',
            value: countdown || '—',
            color: 'text-gold',
            sub: 'May 5, 2026',
          },
        ] as const).map((card, i) => (
          <div
            key={i}
            className="bg-white border border-border_ui-warm rounded-[10px] px-5 py-4 flex flex-col items-center justify-center text-center"
          >
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-2">
              {card.label}
            </div>
            <div className={`text-[28px] font-extrabold leading-none font-[DM_Sans,sans-serif] ${card.color}`}>
              {card.value}
            </div>
            <div className="text-[11px] text-gray-400 mt-1.5">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── D. Three-column grid ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Column 1 — Quick Access */}
        <div className="bg-white border border-border_ui-warm rounded-xl px-[22px] py-5">
          <h2 className="text-sm font-bold text-navy mb-3.5 font-[DM_Sans,sans-serif]">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACCESS.map(card => (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border_ui-warm bg-white cursor-pointer transition-all text-left hover:border-gold"
              >
                <div
                  className="w-8 h-8 rounded-[7px] flex items-center justify-center text-[15px] shrink-0"
                  style={{ background: card.bg }}
                >
                  {card.icon}
                </div>
                <span className="text-xs font-semibold text-navy">
                  {card.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Column 2 — Platform Health */}
        <div className="bg-white border border-border_ui-warm rounded-xl px-[22px] py-5 flex flex-col">
          <h2 className="text-sm font-bold text-navy mb-3.5 font-[DM_Sans,sans-serif]">
            Platform Health
          </h2>
          <div className="flex flex-col gap-3 flex-1">
            {([
              {
                label: 'Intelligence Sources Live',
                value: crawlLive !== null && crawlTotal !== null ? `${crawlLive} / ${crawlTotal}` : '—',
                color: crawlLive !== null && crawlLive > 0 ? 'text-green-800' : 'text-gray-400',
              },
              {
                label: 'Sources with Errors',
                value: healthErrorCount ?? '—',
                color: healthErrorCount !== null && healthErrorCount > 0 ? 'text-red-600' : 'text-emerald-600',
              },
              {
                label: 'Signals Pending Review',
                value: pendingSignals ?? '—',
                color: pendingSignals !== null && pendingSignals > 0 ? 'text-orange-700' : 'text-emerald-600',
              },
              {
                label: 'Edge Functions',
                value: 'See Supabase',
                color: 'text-gray-400',
              },
            ] as const).map((row, i) => (
              <div
                key={i}
                className={`flex justify-between items-center py-2 ${i < 3 ? 'border-b border-[#F3F0EA]' : ''}`}
              >
                <span className="text-xs text-slate_ui">{row.label}</span>
                <span className={`text-[13px] font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* System status footer */}
          <div className="mt-4 pt-3 border-t border-border_ui-warm flex gap-4 text-[11px]">
            <span className="text-slate_ui">
              Supabase: <span className="text-emerald-600 font-semibold">OK</span>
            </span>
            <span className="text-slate_ui">
              Vercel: <span className="text-emerald-600 font-semibold">OK</span>
            </span>
            <span className="text-slate_ui">
              Crawl Engine:{' '}
              <span className={`font-semibold ${crawlErrors > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {crawlErrors > 0 ? `${crawlErrors} errors` : 'OK'}
              </span>
            </span>
          </div>
        </div>

        {/* Column 3 — Open Tickets */}
        <div className="bg-white border border-border_ui-warm rounded-xl px-[22px] py-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3.5">
            <h2 className="text-sm font-bold text-navy m-0 font-[DM_Sans,sans-serif]">
              Open Tickets
            </h2>
            {tickets.length > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-[7px] py-0.5 rounded-[10px]">
                {tickets.length}
              </span>
            )}
          </div>

          {tickets.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-[13px] italic">
              No open tickets
            </div>
          ) : (
            <div className="flex flex-col">
              {tickets.map((ticket, i) => {
                const sev = SEVERITY_COLORS[ticket.severity] || SEVERITY_COLORS.low;
                return (
                  <div
                    key={ticket.id}
                    className={`flex items-center gap-2.5 px-1.5 py-2 rounded-md border border-transparent cursor-pointer transition-colors hover:border-gold ${
                      i < tickets.length - 1 ? 'border-b border-b-[#F3F0EA]' : ''
                    }`}
                    onClick={() => navigate('/admin/support')}
                  >
                    <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                      #{ticket.id.slice(0, 6)}
                    </span>
                    <span className="text-xs text-navy flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {ticket.title}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${sev.bg} ${sev.text}`}>
                      {ticket.severity}
                    </span>
                    <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                      {relativeTime(ticket.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
