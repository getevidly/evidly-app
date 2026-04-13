/**
 * Trial Health — cohort retention, email funnel, and expiring trial management
 * Route: /admin/trial-health
 * Access: platform_admin / @getevidly.com
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { toast } from 'sonner';
import {
  TrendingUp, Clock, Users, Mail, AlertTriangle, Send, Calendar,
} from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const BORDER = '#E2D9C8';

/* ── Demo data ───────────────────────────────────────────── */

interface CohortRow {
  week: string;
  signups: number;
  day7: number | null;
  day14: number | null;
  converted: number | null;
  churned: number | null;
}

const DEMO_COHORTS: CohortRow[] = [
  { week: 'Feb 3', signups: 18, day7: 14, day14: 11, converted: 6, churned: 4 },
  { week: 'Feb 10', signups: 22, day7: 17, day14: 13, converted: 8, churned: 5 },
  { week: 'Feb 17', signups: 15, day7: 12, day14: 9, converted: 5, churned: 3 },
  { week: 'Feb 24', signups: 28, day7: 21, day14: 16, converted: 9, churned: 6 },
  { week: 'Mar 3', signups: 20, day7: 16, day14: null, converted: null, churned: null },
  { week: 'Mar 10', signups: 12, day7: null, day14: null, converted: null, churned: null },
];

interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

const DEMO_FUNNEL: FunnelStep[] = [
  { label: 'Sent', count: 1247, color: '#1E2D4D' },
  { label: 'Delivered', count: 1198, color: '#2563EB' },
  { label: 'Opened', count: 742, color: '#7C3AED' },
  { label: 'Clicked', count: 298, color: '#D97706' },
  { label: 'Converted', count: 89, color: '#059669' },
];

interface ExpiringTrial {
  org: string;
  email: string;
  trialStart: string;
  daysLeft: number;
  lastLogin: string;
  emailsSent: number;
}

const DEMO_EXPIRING: ExpiringTrial[] = [
  { org: 'Sunrise Bistro', email: 'owner@sunrisebistro.com', trialStart: '2026-02-28', daysLeft: 1, lastLogin: '2 hours ago', emailsSent: 6 },
  { org: "Chef Mario's", email: 'mario@chefmarios.com', trialStart: '2026-03-01', daysLeft: 2, lastLogin: '1 day ago', emailsSent: 5 },
  { org: 'Golden Dragon', email: 'manager@goldendragon.com', trialStart: '2026-03-02', daysLeft: 3, lastLogin: '3 days ago', emailsSent: 4 },
  { org: 'Valley Fresh Catering', email: 'ops@valleyfresh.com', trialStart: '2026-03-03', daysLeft: 5, lastLogin: '6 hours ago', emailsSent: 5 },
  { org: 'Campus Dining Hall', email: 'dining@university.edu', trialStart: '2026-03-04', daysLeft: 7, lastLogin: '12 hours ago', emailsSent: 3 },
];

/* ── Helpers ──────────────────────────────────────────────── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function pct(value: number | null, base: number): string {
  if (value === null || base === 0) return '';
  return `${Math.round((value / base) * 100)}%`;
}

function retentionBg(value: number | null, base: number): string {
  if (value === null) return 'transparent';
  const ratio = value / base;
  if (ratio >= 0.5) return '#ECFDF5';
  if (ratio >= 0.3) return '#FEF3C7';
  return '#FEE2E2';
}

function daysLeftBadge(days: number): { bg: string; text: string } {
  if (days <= 2) return { bg: '#FEE2E2', text: '#991B1B' };
  if (days <= 5) return { bg: '#FEF3C7', text: '#92400E' };
  return { bg: '#D1FAE5', text: '#065F46' };
}

/* ── Component ───────────────────────────────────────────── */

export default function TrialHealth() {
  useDemoGuard();
  const { isDemoMode } = useDemo();

  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [expiring, setExpiring] = useState<ExpiringTrial[]>([]);
  const [activeTrials, setActiveTrials] = useState<number | string>(0);
  const [avgTrialLength, setAvgTrialLength] = useState<string>('0d');
  const [trialToPaid, setTrialToPaid] = useState<string>('0%');
  const [expiringCount, setExpiringCount] = useState<number>(0);

  const loadData = useCallback(async () => {
    setLoading(true);

    if (isDemoMode) {
      setCohorts(DEMO_COHORTS);
      setFunnel(DEMO_FUNNEL);
      setExpiring(DEMO_EXPIRING);
      setActiveTrials(23);
      setAvgTrialLength('11.2d');
      setTrialToPaid('34%');
      setExpiringCount(5);
      setLoading(false);
      return;
    }

    try {
      // KPI: Active trials
      const { count: activeCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .not('trial_started_at', 'is', null)
        .is('converted_at', null)
        .is('churned_at', null);

      setActiveTrials(activeCount ?? 0);

      // KPI: Avg trial length
      const { data: trialOrgs } = await supabase
        .from('organizations')
        .select('trial_started_at, converted_at, churned_at')
        .not('trial_started_at', 'is', null);

      if (trialOrgs && trialOrgs.length > 0) {
        let totalDays = 0;
        let counted = 0;
        for (const org of trialOrgs) {
          const start = new Date(org.trial_started_at).getTime();
          const end = org.converted_at
            ? new Date(org.converted_at).getTime()
            : org.churned_at
              ? new Date(org.churned_at).getTime()
              : Date.now();
          totalDays += (end - start) / 86400000;
          counted++;
        }
        setAvgTrialLength(counted > 0 ? `${(totalDays / counted).toFixed(1)}d` : '0d');
      }

      // KPI: Trial-to-paid rate
      const { count: convertedCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .not('trial_started_at', 'is', null)
        .not('converted_at', 'is', null);

      const totalTrials = trialOrgs?.length ?? 0;
      const converted = convertedCount ?? 0;
      setTrialToPaid(totalTrials > 0 ? `${Math.round((converted / totalTrials) * 100)}%` : '0%');

      // KPI: Expiring within 7 days
      const now = new Date().toISOString();
      const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString();
      const { count: expCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .not('trial_started_at', 'is', null)
        .is('converted_at', null)
        .is('churned_at', null)
        .gte('trial_ends_at', now)
        .lte('trial_ends_at', sevenDaysLater);

      setExpiringCount(expCount ?? 0);

      // Cohort data — aggregate from organizations
      const { data: cohortOrgs } = await supabase
        .from('organizations')
        .select('trial_started_at, converted_at, churned_at')
        .not('trial_started_at', 'is', null)
        .order('trial_started_at', { ascending: true });

      if (cohortOrgs && cohortOrgs.length > 0) {
        const weekMap: Record<string, { signups: number; day7: number; day14: number; converted: number; churned: number }> = {};
        for (const org of cohortOrgs) {
          const start = new Date(org.trial_started_at);
          const weekStart = new Date(start);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
          const key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!weekMap[key]) weekMap[key] = { signups: 0, day7: 0, day14: 0, converted: 0, churned: 0 };
          weekMap[key].signups++;
          const daysSinceStart = (Date.now() - start.getTime()) / 86400000;
          if (daysSinceStart >= 7 && !org.churned_at) weekMap[key].day7++;
          if (daysSinceStart >= 14 && !org.churned_at) weekMap[key].day14++;
          if (org.converted_at) weekMap[key].converted++;
          if (org.churned_at) weekMap[key].churned++;
        }
        setCohorts(Object.entries(weekMap).map(([week, data]) => ({
          week,
          signups: data.signups,
          day7: data.day7 || null,
          day14: data.day14 || null,
          converted: data.converted || null,
          churned: data.churned || null,
        })));
      }

      // Email funnel — aggregate from trial_email_log
      const { data: emailLogs } = await supabase
        .from('trial_email_log')
        .select('status');

      if (emailLogs && emailLogs.length > 0) {
        const statusCounts: Record<string, number> = { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 };
        for (const log of emailLogs) {
          const s = (log.status || '').toLowerCase();
          if (s === 'sent') { statusCounts.sent++; statusCounts.delivered++; }
          if (s === 'delivered') statusCounts.delivered++;
          if (s === 'opened') { statusCounts.delivered++; statusCounts.opened++; }
          if (s === 'clicked') { statusCounts.delivered++; statusCounts.opened++; statusCounts.clicked++; }
          if (s === 'converted') { statusCounts.delivered++; statusCounts.opened++; statusCounts.clicked++; statusCounts.converted++; }
        }
        setFunnel([
          { label: 'Sent', count: emailLogs.length, color: '#1E2D4D' },
          { label: 'Delivered', count: statusCounts.delivered, color: '#2563EB' },
          { label: 'Opened', count: statusCounts.opened, color: '#7C3AED' },
          { label: 'Clicked', count: statusCounts.clicked, color: '#D97706' },
          { label: 'Converted', count: statusCounts.converted, color: '#059669' },
        ]);
      }

      // Expiring trials table
      const { data: expiringOrgs } = await supabase
        .from('organizations')
        .select('name, owner_email, trial_started_at, trial_ends_at, last_login_at, trial_emails_sent')
        .not('trial_started_at', 'is', null)
        .is('converted_at', null)
        .is('churned_at', null)
        .gte('trial_ends_at', now)
        .lte('trial_ends_at', sevenDaysLater)
        .order('trial_ends_at', { ascending: true });

      if (expiringOrgs) {
        setExpiring(expiringOrgs.map(org => {
          const daysLeft = Math.max(1, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000));
          const lastLogin = org.last_login_at
            ? formatRelativeTime(new Date(org.last_login_at))
            : 'Never';
          return {
            org: org.name,
            email: org.owner_email,
            trialStart: org.trial_started_at,
            daysLeft,
            lastLogin,
            emailsSent: org.trial_emails_sent ?? 0,
          };
        }));
      }
    } catch (err) {
      console.error('TrialHealth load error:', err);
    }

    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendReminder = (trial: ExpiringTrial) => {
    if (isDemoMode) {
      toast(`Reminder sent to ${trial.email}`);
      return;
    }
    // Live: invoke edge function
    supabase.functions.invoke('trial-reminder', { body: { email: trial.email, org: trial.org } })
      .then(() => toast.success(`Reminder sent to ${trial.email}`))
      .catch(() => toast.error('Failed to send reminder'));
  };

  const handleExtend = (trial: ExpiringTrial) => {
    if (isDemoMode) {
      toast(`Trial extended 7 days for ${trial.org}`);
      return;
    }
    // Live: update trial_ends_at
    supabase
      .from('organizations')
      .update({ trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString() })
      .eq('name', trial.org)
      .then(() => {
        toast.success(`Trial extended 7 days for ${trial.org}`);
        loadData();
      });
  };

  /* ── Loading state ──────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mb-3" />
        <p className="text-sm" style={{ color: TEXT_SEC }}>Loading...</p>
      </div>
    );
  }

  /* ── Funnel helpers ─────────────────────────────────────── */

  const maxFunnel = funnel.length > 0 ? funnel[0].count : 1;

  return (
    <div className="p-8 max-w-5xl" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <AdminBreadcrumb crumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Trial Health' }]} />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0, fontFamily: 'Outfit, sans-serif' }}>Trial Health</h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, margin: '4px 0 0 0', fontFamily: 'Inter, sans-serif' }}>
          Cohort retention, email engagement, and expiring trial management.
        </p>
      </div>

      {/* ── KPI Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Active Trials" value={activeTrials} />
        <KpiTile label="Avg Trial Length" value={avgTrialLength} />
        <KpiTile label="Trial-to-Paid Rate" value={trialToPaid} valueColor="green" />
        <KpiTile label="Trials Expiring (7d)" value={expiringCount} valueColor="warning" />
      </div>

      {/* ── Section A: Cohort Timeline ─────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" style={{ color: NAVY }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Cohort Timeline</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Week</th>
                <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Signups</th>
                <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Day 7 Active</th>
                <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Day 14 Active</th>
                <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Converted</th>
                <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Churned</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((row) => (
                <tr key={row.week} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td className="px-3 py-2.5 font-medium" style={{ color: NAVY }}>{row.week}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: NAVY, fontWeight: 600 }}>{row.signups}</td>
                  <td className="px-3 py-2.5 text-center" style={{ backgroundColor: retentionBg(row.day7, row.signups) }}>
                    {row.day7 !== null ? (
                      <div>
                        <span style={{ fontWeight: 600, color: NAVY }}>{row.day7}</span>
                        <span className="block text-xs" style={{ color: TEXT_SEC }}>({pct(row.day7, row.signups)})</span>
                      </div>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>&mdash;</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center" style={{ backgroundColor: retentionBg(row.day14, row.signups) }}>
                    {row.day14 !== null ? (
                      <div>
                        <span style={{ fontWeight: 600, color: NAVY }}>{row.day14}</span>
                        <span className="block text-xs" style={{ color: TEXT_SEC }}>({pct(row.day14, row.signups)})</span>
                      </div>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>&mdash;</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center" style={{ backgroundColor: row.converted !== null ? '#D1FAE5' : 'transparent' }}>
                    {row.converted !== null ? (
                      <div>
                        <span style={{ fontWeight: 600, color: '#065F46' }}>{row.converted}</span>
                        <span className="block text-xs" style={{ color: '#047857' }}>({pct(row.converted, row.signups)})</span>
                      </div>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>&mdash;</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center" style={{ backgroundColor: row.churned !== null ? '#F3F4F6' : 'transparent' }}>
                    {row.churned !== null ? (
                      <span style={{ fontWeight: 600, color: '#6B7280' }}>{row.churned}</span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section B: Email Funnel ────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5" style={{ color: NAVY }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Email Funnel</h2>
        </div>
        <div className="space-y-1">
          {funnel.map((step, i) => {
            const widthPct = maxFunnel > 0 ? (step.count / maxFunnel) * 100 : 0;
            const prevCount = i > 0 ? funnel[i - 1].count : null;
            const dropPct = prevCount ? Math.round(((prevCount - step.count) / prevCount) * 100) : null;
            const ratePct = prevCount ? Math.round((step.count / prevCount) * 100) : null;

            return (
              <div key={step.label}>
                {/* Drop-off annotation */}
                {dropPct !== null && (
                  <div className="flex items-center gap-2 py-1 pl-2">
                    <span className="text-xs" style={{ color: TEXT_SEC }}>
                      &darr; {dropPct}% drop
                    </span>
                  </div>
                )}
                {/* Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-24 shrink-0" style={{ color: NAVY }}>{step.label}</span>
                  <div className="flex-1 relative">
                    <div
                      className="rounded-md h-9 flex items-center justify-end px-3 transition-all"
                      style={{
                        width: `${Math.max(widthPct, 8)}%`,
                        backgroundColor: step.color,
                      }}
                    >
                      <span className="text-xs font-bold text-white">{step.count.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium w-12 text-right shrink-0" style={{ color: TEXT_SEC }}>
                    {ratePct !== null ? `${ratePct}%` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section C: Expiring Trials ─────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: NAVY }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Expiring Trials &mdash; Next 7 Days</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Org Name</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Owner Email</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Trial Start</th>
                <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Days Left</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Last Login</th>
                <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Emails Sent</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_SEC }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map((trial) => {
                const badge = daysLeftBadge(trial.daysLeft);
                return (
                  <tr key={trial.email} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: NAVY }}>{trial.org}</td>
                    <td className="px-3 py-2.5" style={{ color: TEXT_SEC }}>{trial.email}</td>
                    <td className="px-3 py-2.5" style={{ color: TEXT_SEC }}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" style={{ color: TEXT_SEC }} />
                        {formatDate(trial.trialStart)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {trial.daysLeft}d
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: TEXT_SEC }}>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" style={{ color: TEXT_SEC }} />
                        {trial.lastLogin}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center" style={{ color: TEXT_SEC }}>{trial.emailsSent}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleSendReminder(trial)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex items-center gap-1"
                          style={{ backgroundColor: NAVY }}
                        >
                          <Send className="w-3 h-3" />
                          Send Reminder
                        </button>
                        <button
                          onClick={() => handleExtend(trial)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1"
                          style={{ color: NAVY, borderColor: BORDER }}
                        >
                          <TrendingUp className="w-3 h-3" />
                          Extend 7d
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {expiring.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: TEXT_SEC }}>
                    No trials expiring in the next 7 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Utility ─────────────────────────────────────────────── */

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}
