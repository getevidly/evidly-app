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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const CARD_BORDER = '#E2D9C8';

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

const SEVERITY_COLORS: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#FEE2E2', color: '#DC2626' },
  high: { bg: '#FEF3C7', color: '#D97706' },
  medium: { bg: '#DBEAFE', color: '#2563EB' },
  low: { bg: '#F3F4F6', color: '#6B7280' },
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

  useEffect(() => {
    const loadStats = async () => {
      if (isDemoMode) return;

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
    };

    loadStats();
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [updateCountdown, isDemoMode]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <AdminBreadcrumb crumbs={[{ label: 'Home' }]} />

      {/* ── A. Alert Banner ──────────────────────────────────── */}
      {crawlErrors > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            color: '#92400E',
          }}
        >
          <span>{crawlErrors} crawl source{crawlErrors !== 1 ? 's' : ''} in error state</span>
          <span
            onClick={() => navigate('/admin/intelligence')}
            style={{ cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textDecorationColor: '#D97706' }}
          >
            View in EvidLY Intelligence &rarr; Sources
          </span>
        </div>
      )}

      {/* AUDIT-FIX-08 / A-3: AI Budget Alert Banner */}
      {aiBudgetAlert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            color: '#92400E',
          }}
        >
          <span>AI classification spend today: ${aiBudgetAlert.spend.toFixed(4)} / ${aiBudgetAlert.budget.toFixed(2)} daily budget</span>
          <span
            onClick={() => navigate('/admin/intelligence-admin')}
            style={{ cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textDecorationColor: '#D97706' }}
          >
            View AI Costs &rarr;
          </span>
        </div>
      )}

      {/* ── B. Page Header ───────────────────────────────────── */}
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: NAVY,
            fontFamily: 'Syne, DM Sans, sans-serif',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Welcome back, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4 }}>
          EvidLY Admin Console — platform operations, intelligence, and growth.
        </p>
      </div>

      {/* ── C. Stat Cards Row ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, alignItems: 'stretch' }}>
        {([
          {
            label: 'MRR',
            value: mrr === null ? '—' : mrr === 0 ? '$0' : `$${mrr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            color: GOLD,
            sub: 'Pre-launch',
          },
          {
            label: 'Organizations',
            value: orgCount ?? '—',
            color: NAVY,
            sub: 'Active',
          },
          {
            label: 'Locations',
            value: locCount ?? '—',
            color: NAVY,
            sub: 'Active',
          },
          {
            label: 'Crawl Sources',
            value: crawlLive === null || crawlTotal === null ? '—' : `${crawlLive}/${crawlTotal}`,
            color: crawlLive !== null && crawlLive > 0 ? '#166534' : '#C2410C',
            sub: 'Live feeds',
          },
          {
            label: 'Signals Pending',
            value: pendingSignals ?? '—',
            color: '#C2410C',
            sub: 'Awaiting review',
          },
          {
            label: 'Launch Countdown',
            value: countdown || '—',
            color: GOLD,
            sub: 'May 5, 2026',
          },
        ] as const).map((card, i) => (
          <div
            key={i}
            style={{
              background: '#FFFFFF',
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: card.color,
                lineHeight: 1,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── D. Three-column grid ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

        {/* Column 1 — Quick Access */}
        <div
          style={{
            background: '#FFFFFF',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 12,
            padding: '20px 22px',
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: NAVY,
              margin: '0 0 14px 0',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Quick Access
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {QUICK_ACCESS.map(card => (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${CARD_BORDER}`,
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = GOLD;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = CARD_BORDER;
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 7,
                    background: card.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>
                  {card.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Column 2 — Platform Health */}
        <div
          style={{
            background: '#FFFFFF',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 12,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: NAVY,
              margin: '0 0 14px 0',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Platform Health
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {([
              {
                label: 'Intelligence Sources Live',
                value: crawlLive !== null && crawlTotal !== null ? `${crawlLive} / ${crawlTotal}` : '—',
                color: crawlLive !== null && crawlLive > 0 ? '#166534' : TEXT_MUTED,
              },
              {
                label: 'Sources with Errors',
                value: healthErrorCount ?? '—',
                color: healthErrorCount !== null && healthErrorCount > 0 ? '#DC2626' : '#059669',
              },
              {
                label: 'Signals Pending Review',
                value: pendingSignals ?? '—',
                color: pendingSignals !== null && pendingSignals > 0 ? '#C2410C' : '#059669',
              },
              {
                label: 'Edge Functions Active',
                value: '107 / 107',
                color: '#059669',
              },
            ] as const).map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: i < 3 ? `1px solid #F3F0EA` : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: TEXT_SEC }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* System status footer */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: `1px solid ${CARD_BORDER}`,
              display: 'flex',
              gap: 16,
              fontSize: 11,
            }}
          >
            <span style={{ color: TEXT_SEC }}>
              Supabase: <span style={{ color: '#059669', fontWeight: 600 }}>OK</span>
            </span>
            <span style={{ color: TEXT_SEC }}>
              Vercel: <span style={{ color: '#059669', fontWeight: 600 }}>OK</span>
            </span>
            <span style={{ color: TEXT_SEC }}>
              Crawl Engine:{' '}
              <span style={{ color: crawlErrors > 0 ? '#DC2626' : '#059669', fontWeight: 600 }}>
                {crawlErrors > 0 ? `${crawlErrors} errors` : 'OK'}
              </span>
            </span>
          </div>
        </div>

        {/* Column 3 — Open Tickets */}
        <div
          style={{
            background: '#FFFFFF',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 12,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: NAVY,
                margin: 0,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Open Tickets
            </h2>
            {tickets.length > 0 && (
              <span
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 10,
                }}
              >
                {tickets.length}
              </span>
            )}
          </div>

          {tickets.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: TEXT_MUTED,
                fontSize: 13,
                fontStyle: 'italic',
              }}
            >
              No open tickets
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {tickets.map((ticket, i) => {
                const sev = SEVERITY_COLORS[ticket.severity] || SEVERITY_COLORS.low;
                return (
                  <div
                    key={ticket.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 6px',
                      borderBottom: i < tickets.length - 1 ? '1px solid #F3F0EA' : 'none',
                      borderRadius: 6,
                      border: '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
                    onClick={() => navigate('/admin/support')}
                  >
                    <span style={{ fontSize: 11, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      #{ticket.id.slice(0, 6)}
                    </span>
                    <span style={{ fontSize: 12, color: NAVY, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: sev.bg,
                        color: sev.color,
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {ticket.severity}
                    </span>
                    <span style={{ fontSize: 11, color: TEXT_MUTED, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
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
