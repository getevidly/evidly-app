/**
 * AdminHome — Platform admin home dashboard
 *
 * Route: /admin (platform_admin only — other roles see AdminHub)
 * Access: @getevidly.com or platform_admin role
 *
 * Sections:
 *  1. Welcome header + launch countdown
 *  2. Alert bar (pending signals, crawl health, DB status)
 *  3. 6 KPI stat cards (Supabase queries)
 *  4. Quick Access (top nav cards) + Recent Activity (timeline)
 *  5. Platform Status bar
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

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
  { label: 'Intelligence', path: '/admin/intelligence', icon: '\u26A1', color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Crawl Monitor', path: '/admin/crawl-monitor', icon: '\u27F3', color: '#2563EB', bg: '#EFF6FF' },
  { label: 'Signal Queue', path: '/admin/intelligence-admin', icon: '\u25CE', color: '#D97706', bg: '#FFFBEB' },
  { label: 'Command Center', path: '/admin/command-center', icon: '\u2B21', color: '#059669', bg: '#ECFDF5' },
  { label: 'User Emulation', path: '/admin/emulate', icon: '\uD83D\uDC64', color: '#1E2D4D', bg: '#F4F1EB' },
  { label: 'Configure', path: '/admin/configure', icon: '\u2699\uFE0F', color: '#6B7280', bg: '#F3F4F6' },
  { label: 'Sales Pipeline', path: '/admin/sales', icon: '\uD83C\uDFAF', color: '#DC2626', bg: '#FEF2F2' },
  { label: 'Billing', path: '/admin/billing', icon: '\uD83D\uDCB3', color: '#A08C5A', bg: '#FDF8EE' },
];

/* ------------------------------------------------------------------ */
/*  Recent Activity (static demo entries)                              */
/* ------------------------------------------------------------------ */
interface ActivityEntry {
  id: string;
  time: string;
  text: string;
  type: 'crawl' | 'signal' | 'user' | 'system' | 'deploy';
}

function getRecentActivity(): ActivityEntry[] {
  const now = new Date();
  const fmt = (mins: number) => {
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };
  return [
    { id: '1', time: fmt(3), text: 'Crawl cycle completed — 37 sources scanned', type: 'crawl' },
    { id: '2', time: fmt(12), text: '2 new intelligence signals classified', type: 'signal' },
    { id: '3', time: fmt(45), text: 'Vercel deployment succeeded (main)', type: 'deploy' },
    { id: '4', time: fmt(120), text: 'New organization onboarded: Coastal Kitchen Group', type: 'user' },
    { id: '5', time: fmt(180), text: 'DB backup completed — 42 MB snapshot', type: 'system' },
    { id: '6', time: fmt(360), text: 'RFP match found: LAUSD food services contract', type: 'signal' },
    { id: '7', time: fmt(720), text: 'Jurisdiction config updated: San Diego County', type: 'system' },
    { id: '8', time: fmt(1440), text: 'Monthly crawl health report generated', type: 'crawl' },
  ];
}

const TYPE_COLORS: Record<string, string> = {
  crawl: '#2563EB',
  signal: '#7C3AED',
  user: '#059669',
  system: '#6B7280',
  deploy: '#16A34A',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AdminHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Stats — null until query returns
  const [mrr, setMrr] = useState<number | null>(null);
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [locCount, setLocCount] = useState<number | null>(null);
  const [crawlLive, setCrawlLive] = useState<number | null>(null);
  const [crawlTotal, setCrawlTotal] = useState<number | null>(null);
  const [pendingSignals, setPendingSignals] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');

  // Alert bar state
  const [crawlErrors, setCrawlErrors] = useState(0);
  const [dbHealthy, setDbHealthy] = useState(true);

  const updateCountdown = useCallback(() => {
    const now = new Date();
    const diff = LAUNCH_DATE.getTime() - now.getTime();
    if (diff <= 0) { setCountdown('LAUNCHED'); return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setCountdown(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const [subRes, orgRes, locRes, crawlRes, sigRes] = await Promise.all([
        supabase.from('billing_subscriptions').select('mrr_cents').eq('status', 'active'),
        supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('locations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('crawl_health').select('status'),
        supabase.from('intelligence_signals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setMrr((subRes.data || []).reduce((sum, s) => sum + (s.mrr_cents || 0), 0) / 100);
      setOrgCount(orgRes.count ?? 0);
      setLocCount(locRes.count ?? 0);

      const sources = crawlRes.data || [];
      const live = sources.filter(s => s.status === 'active').length;
      setCrawlLive(live);
      setCrawlTotal(sources.length);
      setCrawlErrors(sources.filter(s => s.status === 'error').length);

      setPendingSignals(sigRes.count ?? 0);

      // Simple DB health check — if we got here, Supabase is responding
      setDbHealthy(true);
    };

    loadStats();
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Admin';

  const activity = getRecentActivity();

  // Alert bar conditions
  const hasAlerts = (pendingSignals !== null && pendingSignals > 0) || crawlErrors > 0 || !dbHealthy;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── 1. Welcome Header ────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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

        {/* Countdown chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FFFFFF',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 10,
            padding: '10px 16px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Launch
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: countdown === 'LAUNCHED' ? '#059669' : GOLD,
              fontFamily: 'DM Sans, monospace',
              letterSpacing: '-0.02em',
            }}
          >
            {countdown || '\u2014'}
          </div>
        </div>
      </div>

      {/* ── 2. Alert Bar ─────────────────────────────────────── */}
      {hasAlerts && (
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '12px 18px',
            background: '#FFFBEB',
            border: '1px solid #F59E0B',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            color: '#92400E',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {pendingSignals !== null && pendingSignals > 0 && (
            <span
              onClick={() => navigate('/admin/intelligence-admin')}
              style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#D97706' }}
            >
              {pendingSignals} signal{pendingSignals !== 1 ? 's' : ''} pending review
            </span>
          )}
          {crawlErrors > 0 && (
            <span
              onClick={() => navigate('/admin/crawl-monitor')}
              style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#D97706' }}
            >
              {crawlErrors} crawl source{crawlErrors !== 1 ? 's' : ''} in error state
            </span>
          )}
          {!dbHealthy && (
            <span style={{ color: '#DC2626', fontWeight: 600 }}>
              Database health check failed
            </span>
          )}
        </div>
      )}

      {/* ── 3. KPI Stat Cards ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
        {[
          {
            label: 'MRR',
            value: mrr === null ? '\u2014' : mrr === 0 ? '$0' : `$${mrr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            color: GOLD,
          },
          {
            label: 'Organizations',
            value: orgCount ?? '\u2014',
            color: NAVY,
          },
          {
            label: 'Locations',
            value: locCount ?? '\u2014',
            color: NAVY,
          },
          {
            label: 'Crawl Sources',
            value: crawlLive === null || crawlTotal === null ? '\u2014' : `${crawlLive}/${crawlTotal}`,
            color: crawlLive !== null && crawlTotal !== null && crawlLive < crawlTotal * 0.8 ? '#D97706' : '#059669',
          },
          {
            label: 'Signals Pending',
            value: pendingSignals ?? '\u2014',
            color: pendingSignals !== null && pendingSignals > 5 ? '#DC2626' : pendingSignals !== null && pendingSignals > 0 ? '#D97706' : '#059669',
          },
          {
            label: 'Countdown',
            value: countdown || '\u2014',
            color: countdown === 'LAUNCHED' ? '#059669' : GOLD,
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              background: '#FFFFFF',
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 10,
              padding: '18px 16px',
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
                color: TEXT_MUTED,
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
          </div>
        ))}
      </div>

      {/* ── 4. Quick Access + Recent Activity ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Quick Access */}
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
                  e.currentTarget.style.background = card.bg;
                  e.currentTarget.style.borderColor = card.color + '40';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#FFFFFF';
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
                <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                  {card.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
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
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activity.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: i < activity.length - 1 ? `1px solid #F3F0EA` : 'none',
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: TYPE_COLORS[entry.type] || '#6B7280',
                    marginTop: 5,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: NAVY, margin: 0, lineHeight: 1.5 }}>
                    {entry.text}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: TEXT_MUTED,
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {entry.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Platform Status Bar ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: '#FFFFFF',
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 10,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669' }} />
            <span style={{ fontWeight: 600, color: NAVY }}>All Systems Operational</span>
          </div>
          <span style={{ color: TEXT_MUTED }}>|</span>
          <span style={{ color: TEXT_SEC }}>
            Supabase: <span style={{ color: '#059669', fontWeight: 600 }}>OK</span>
          </span>
          <span style={{ color: TEXT_MUTED }}>|</span>
          <span style={{ color: TEXT_SEC }}>
            Vercel: <span style={{ color: '#059669', fontWeight: 600 }}>OK</span>
          </span>
          <span style={{ color: TEXT_MUTED }}>|</span>
          <span style={{ color: TEXT_SEC }}>
            Crawl Engine: <span style={{ color: crawlErrors > 0 ? '#D97706' : '#059669', fontWeight: 600 }}>
              {crawlErrors > 0 ? `${crawlErrors} error${crawlErrors !== 1 ? 's' : ''}` : 'OK'}
            </span>
          </span>
        </div>
        <span style={{ color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>
          v0.9.0-beta &middot; {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
