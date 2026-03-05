/**
 * AdminHome — Internal admin card grid (17 cards)
 *
 * Route: /admin (platform_admin only — other roles see AdminHub)
 * Access: @getevidly.com or isEvidlyAdmin
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const CARD_BORDER = '#E2D9C8';
const CARD_BORDER_HOVER = GOLD;
const TEXT_MUTED = '#8A96A8';

// Known constants — these are facts, not fake data
const LAUNCH_DATE = new Date('2026-05-05T00:00:00-07:00'); // May 5, 2026 Pacific

const Skeleton = () => (
  <span className="inline-block w-14 h-[18px] rounded animate-pulse" style={{ background: '#E5E0D8' }} />
);

function TickerCell({ label, border, children }: { label: string; border?: boolean; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3" style={{ borderRight: border ? `1px solid ${CARD_BORDER}` : undefined }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{label}</div>
      <div className="text-lg font-medium mt-0.5" style={{ color: NAVY, fontFamily: "'DM Mono', monospace" }}>
        {children}
      </div>
    </div>
  );
}

interface AdminCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  badge: string | null;
}

const ADMIN_CARDS: AdminCard[] = [
  {
    id: 'intelligence',
    title: 'EvidLY Intelligence',
    description: 'The moat. 80+ sources crawled. Every signal correlated to clients, jurisdictions, and industries.',
    icon: '\u26A1',
    route: '/admin/intelligence',
    badge: 'MOAT',
  },
  {
    id: 'command-center',
    title: 'Command Center',
    description: 'Real-time platform health, crawl status, live alerts, and system metrics.',
    icon: '\u2B21',
    route: '/admin/command-center',
    badge: null,
  },
  {
    id: 'guided-tours',
    title: 'Guided Tours',
    description: 'Launch, monitor, and review guided tour sessions with prospects.',
    icon: '\u25CE',
    route: '/admin/guided-tours',
    badge: null,
  },
  {
    id: 'leads',
    title: 'Assessment Leads',
    description: 'Inbound leads from landing page, outreach, and guided tour conversions.',
    icon: '\u25C8',
    route: '/admin/leads',
    badge: 'NEW',
  },
  {
    id: 'configure',
    title: 'Configure',
    description: 'Manage organizations, locations, invite users and vendors.',
    icon: '\u2699\uFE0F',
    route: '/admin/configure',
    badge: null,
  },
  {
    id: 'emulate',
    title: 'User Emulation',
    description: 'View EvidLY as any customer. Add team, equipment, sensors on their behalf.',
    icon: '\uD83D\uDC64',
    route: '/admin/emulate',
    badge: 'NEW',
  },
  {
    id: 'user-provisioning',
    title: 'User Provisioning',
    description: 'Invite users, create accounts, manage roles and permissions across all organizations.',
    icon: '\uD83D\uDC65',
    route: '/admin/users',
    badge: 'NEW',
  },
  {
    id: 'billing',
    title: 'Billing',
    description: 'Subscription management, MRR tracking, invoice history, and revenue projections.',
    icon: '\uD83D\uDCB3',
    route: '/admin/billing',
    badge: 'NEW',
  },
  {
    id: 'usage-analytics',
    title: 'Usage Analysis',
    description: 'Feature adoption, module engagement, and monetization signals.',
    icon: '\u25A6',
    route: '/admin/usage-analytics',
    badge: null,
  },
  {
    id: 'crawl-monitor',
    title: 'Crawl Monitor',
    description: 'Live status of all 37 JIE intelligence feeds with auto-retry monitoring.',
    icon: '\u27F3',
    route: '/admin/crawl-monitor',
    badge: null,
  },
  {
    id: 'rfp-monitor',
    title: 'RFP Monitor',
    description: 'Government procurement opportunities matched to EvidLY capabilities.',
    icon: '\u25C9',
    route: '/admin/rfp-monitor',
    badge: 'NEW',
  },
  {
    id: 'api-keys',
    title: 'API Keys',
    description: 'Manage platform credentials, service tokens, and third-party integrations.',
    icon: '\u2317',
    route: '/admin/api-keys',
    badge: null,
  },
  {
    id: 'messages',
    title: 'System Messages',
    description: 'Broadcast announcements, warnings, and feature updates to all users.',
    icon: '\uD83D\uDCE2',
    route: '/admin/messages',
    badge: 'NEW',
  },
  {
    id: 'k2c',
    title: 'K2C',
    description: 'Kitchen to Community donation tracking \u2014 meals, amounts, contributing locations.',
    icon: '\u2767',
    route: '/admin/k2c',
    badge: null,
  },
  {
    id: 'backup',
    title: 'Database Backup',
    description: 'Manual and scheduled Supabase backups. Download snapshots, view backup history.',
    icon: '\uD83D\uDDC4\uFE0F',
    route: '/admin/backup',
    badge: null,
  },
  {
    id: 'maintenance',
    title: 'Maintenance Mode',
    description: 'Take the platform offline for updates. Control the message shown to users.',
    icon: '\uD83D\uDEA7',
    route: '/admin/maintenance',
    badge: null,
  },
  {
    id: 'security',
    title: 'Security Settings',
    description: 'RLS audit, API rate limits, domain policy, blocked IPs, and session rules.',
    icon: '\uD83D\uDD10',
    route: '/admin/security-settings',
    badge: null,
  },
  {
    id: 'vault',
    title: 'Document Vault',
    description: 'Secure storage for build docs, architecture, legal, contracts, and IP.',
    icon: '\uD83D\uDD12',
    route: '/admin/vault',
    badge: null,
  },
  {
    id: 'event-log',
    title: 'Event Log',
    description: 'Platform audit trail \u2014 crawl events, errors, deploys, and system activity.',
    icon: '\u2261',
    route: '/admin/event-log',
    badge: null,
  },
  {
    id: 'campaigns',
    title: 'Marketing Campaigns',
    description: 'Track campaigns, channel performance, and attribution across guided tours.',
    icon: '\uD83D\uDCE3',
    route: '/admin/campaigns',
    badge: 'NEW',
  },
  {
    id: 'pipeline',
    title: 'Sales Pipeline',
    description: 'Kanban pipeline \u2014 from prospect to closed, with MRR tracking.',
    icon: '\uD83C\uDFAF',
    route: '/admin/pipeline',
    badge: 'NEW',
  },
];

export default function AdminHome() {
  const navigate = useNavigate();

  // All null until query returns — never initialized to fake numbers
  const [mrr, setMrr] = useState<number | null>(null);
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [locCount, setLocCount] = useState<number | null>(null);
  const [crawlLive, setCrawlLive] = useState<number | null>(null);
  const [crawlTotal, setCrawlTotal] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  const updateCountdown = useCallback(() => {
    const now = new Date();
    const diff = LAUNCH_DATE.getTime() - now.getTime();
    if (diff <= 0) { setCountdown('LAUNCHED'); return; }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    setCountdown(days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m ${secs}s`);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const [subRes, orgRes, locRes, crawlRes] = await Promise.all([
        supabase.from('billing_subscriptions').select('mrr_cents').eq('status', 'active'),
        supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('locations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('crawl_health').select('status'),
      ]);
      setMrr((subRes.data || []).reduce((sum, s) => sum + (s.mrr_cents || 0), 0) / 100);
      setOrgCount(orgRes.count ?? 0);
      setLocCount(locRes.count ?? 0);
      const sources = crawlRes.data || [];
      setCrawlLive(sources.filter(s => s.status === 'active').length);
      setCrawlTotal(sources.length);
    };
    loadStats();
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: NAVY, fontFamily: 'DM Sans, sans-serif' }}
        >
          Admin
        </h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
          Platform operations, billing, security, and system monitoring.
        </p>
      </div>

      {/* Ticker bar */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 rounded-xl border bg-white overflow-hidden"
        style={{ borderColor: CARD_BORDER }}
      >
        <TickerCell label="MRR" border>
          {mrr === null ? <Skeleton /> : mrr === 0
            ? <span style={{ color: TEXT_MUTED }}>$0</span>
            : `$${mrr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        </TickerCell>
        <TickerCell label="Organizations" border>
          {orgCount === null ? <Skeleton /> :
            <span style={{ color: orgCount === 0 ? TEXT_MUTED : NAVY }}>{orgCount}</span>}
        </TickerCell>
        <TickerCell label="Locations" border>
          {locCount === null ? <Skeleton /> :
            <span style={{ color: locCount === 0 ? TEXT_MUTED : NAVY }}>{locCount}</span>}
        </TickerCell>
        <TickerCell label="Crawl Live" border>
          {crawlLive === null || crawlTotal === null ? <Skeleton /> : (
            <span>
              <span style={{ color: crawlLive < crawlTotal * 0.8 ? '#D97706' : '#059669' }}>{crawlLive}</span>
              <span style={{ color: TEXT_MUTED, fontSize: 13 }}>/{crawlTotal}</span>
            </span>
          )}
        </TickerCell>
        <TickerCell label="Launch Date" border>
          <span style={{ color: GOLD }}>May 5 '26</span>
        </TickerCell>
        <TickerCell label="Countdown">
          {countdown ? <span style={{ color: countdown === 'LAUNCHED' ? '#059669' : NAVY }}>{countdown}</span> : <Skeleton />}
        </TickerCell>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_CARDS.map(card => (
          <button
            key={card.id}
            onClick={() => navigate(card.route)}
            className="relative flex flex-col items-start text-left p-6 rounded-xl border bg-white transition-all duration-150 hover:shadow-md group"
            style={{ borderColor: CARD_BORDER }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = CARD_BORDER_HOVER;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = CARD_BORDER;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Badge */}
            {card.badge === 'MOAT' ? (
              <span
                className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest"
                style={{ background: 'linear-gradient(135deg, #A08C5A, #C4AA72)', color: '#fff' }}
              >
                ⚡ MOAT
              </span>
            ) : card.badge && (
              <span
                className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border"
                style={{ color: GOLD, borderColor: GOLD }}
              >
                {card.badge}
              </span>
            )}

            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3"
              style={{ backgroundColor: '#F4F1EB' }}
            >
              {card.icon}
            </div>

            {/* Title */}
            <h3
              className="text-[15px] font-bold mb-1"
              style={{ color: NAVY }}
            >
              {card.title}
            </h3>

            {/* Description */}
            <p
              className="text-xs leading-relaxed"
              style={{ color: TEXT_MUTED, lineHeight: '1.6' }}
            >
              {card.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
