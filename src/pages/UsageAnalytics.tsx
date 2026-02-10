import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

// ── Types ─────────────────────────────────────────────────────────
interface ModuleInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
}

interface ShiftBreakdown {
  morning: number;
  afternoon: number;
  evening: number;
}

interface OrgModuleUsage {
  adopted: boolean;
  sessions: number;
  avgDuration: number;
  trend: number[];
  shiftBreakdown?: ShiftBreakdown;
}

interface DemoOrg {
  id: string;
  name: string;
  industry: string;
  locationCount: number;
  totalSessions: number;
  trend: number;
  moduleUsage: Record<string, OrgModuleUsage>;
  weeklyTrend: number[];
}

// ── Constants ─────────────────────────────────────────────────────
const MODULES: ModuleInfo[] = [
  { id: 'temp-logs', name: 'Temperature Logs', icon: '🌡️', color: '#dc2626' },
  { id: 'checklists', name: 'Checklists', icon: '☑️', color: '#2563eb' },
  { id: 'corrective', name: 'Corrective Actions', icon: '⚠️', color: '#d97706' },
  { id: 'documents', name: 'Documents', icon: '📄', color: '#ea580c' },
  { id: 'vendors', name: 'Vendor Services', icon: '🚚', color: '#7c3aed' },
  { id: 'compliance', name: 'Compliance Score', icon: '🛡️', color: '#16a34a' },
  { id: 'action-center', name: 'Action Center', icon: '🎯', color: '#0891b2' },
  { id: 'qr-passport', name: 'QR Passport', icon: '📱', color: '#d4af37' },
  { id: 'calendar', name: 'Calendar', icon: '📅', color: '#8b5cf6' },
  { id: 'reports', name: 'Reporting', icon: '📊', color: '#1b4965' },
  { id: 'analysis', name: 'Predictive Alerts', icon: '📈', color: '#059669' },
  { id: 'key-metrics', name: 'Key Metrics', icon: '📉', color: '#b45309' },
  { id: 'leaderboard', name: 'Leaderboard', icon: '🏆', color: '#ca8a04' },
  { id: 'ai-advisor', name: 'AI Advisor', icon: '🤖', color: '#6366f1' },
  { id: 'help', name: 'Help / Support', icon: '❓', color: '#64748b' },
];

const INDUSTRIES = ['Restaurant', 'Healthcare', 'Senior Living', 'Education', 'Hospitality'];

const TIME_PERIODS = [
  { id: '7d', label: 'Last 7 Days', scale: 0.23 },
  { id: '30d', label: 'Last 30 Days', scale: 1 },
  { id: '90d', label: 'Last 90 Days', scale: 2.8 },
  { id: 'all', label: 'All Time', scale: 6 },
];

const SIZE_TIERS = [
  { id: 'all', label: 'All Sizes', min: 0, max: 999 },
  { id: '1', label: '1 Location', min: 1, max: 1 },
  { id: '2-5', label: '2-5 Locations', min: 2, max: 5 },
  { id: '6-10', label: '6-10 Locations', min: 6, max: 10 },
  { id: '11+', label: '11+ Locations', min: 11, max: 999 },
];

const MODULE_ADOPTION: Record<string, [number, number]> = {
  // Core daily-use (85-95%)
  'temp-logs': [0.88, 0.95],
  'checklists': [0.85, 0.93],
  'compliance': [0.90, 0.98],
  // Regular management (60-80%)
  'corrective': [0.62, 0.78],
  'documents': [0.65, 0.80],
  'vendors': [0.60, 0.75],
  'reports': [0.70, 0.82],
  'analysis': [0.62, 0.76],
  'key-metrics': [0.64, 0.78],
  // Newer features (30-50%)
  'action-center': [0.32, 0.48],
  'qr-passport': [0.30, 0.50],
  'calendar': [0.35, 0.48],
  'leaderboard': [0.30, 0.46],
  // AI-powered features (20-40%)
  'ai-advisor': [0.22, 0.38],
  // Help / Support (40-60%)
  'help': [0.40, 0.60],
};

// ── Seeded Random ─────────────────────────────────────────────────
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Demo Data ─────────────────────────────────────────────────────
const RAW_ORGS = [
  { name: "Bella's Italian Kitchen", industry: 'Restaurant', locs: 1 },
  { name: 'Pacific Coast Dining', industry: 'Restaurant', locs: 3 },
  { name: 'Golden Dragon Group', industry: 'Restaurant', locs: 8 },
  { name: 'Metro Burger Co', industry: 'Restaurant', locs: 12 },
  { name: 'Fresh Catch Seafood', industry: 'Restaurant', locs: 2 },
  { name: 'Sunrise Café', industry: 'Restaurant', locs: 1 },
  { name: 'Bay Area Medical Center', industry: 'Healthcare', locs: 3 },
  { name: 'Summit Health Network', industry: 'Healthcare', locs: 15 },
  { name: "Valley Children's Hospital", industry: 'Healthcare', locs: 1 },
  { name: 'Pacific Northwest Health', industry: 'Healthcare', locs: 6 },
  { name: 'Golden Years Communities', industry: 'Senior Living', locs: 5 },
  { name: 'Sunrise Senior Care', industry: 'Senior Living', locs: 9 },
  { name: 'Heritage Care Homes', industry: 'Senior Living', locs: 2 },
  { name: 'Bay Area School District', industry: 'Education', locs: 12 },
  { name: 'Pacific Academy', industry: 'Education', locs: 1 },
  { name: 'Valley Community College', industry: 'Education', locs: 3 },
  { name: 'Redwood High School', industry: 'Education', locs: 1 },
  { name: 'Grand Plaza Hotels', industry: 'Hospitality', locs: 7 },
  { name: 'Coastal Resorts Inc', industry: 'Hospitality', locs: 4 },
  { name: 'The Summit Lodge', industry: 'Hospitality', locs: 1 },
];

function generateDemoOrgs(): DemoOrg[] {
  const rng = createRng(42);
  return RAW_ORGS.map((raw, idx) => {
    const moduleUsage: Record<string, OrgModuleUsage> = {};
    let totalModuleSessions = 0;

    for (const mod of MODULES) {
      const [minAdopt, maxAdopt] = MODULE_ADOPTION[mod.id];

      // Coming-soon modules are never adopted
      if (mod.comingSoon) {
        const trend: number[] = [];
        for (let w = 0; w < 12; w++) trend.push(0);
        moduleUsage[mod.id] = { adopted: false, sessions: 0, avgDuration: 0, trend };
        continue;
      }

      const adoptionThreshold = minAdopt + rng() * (maxAdopt - minAdopt);
      const adopted = rng() < adoptionThreshold;

      let sessions = 0;
      let avgDuration = 0;
      const trend: number[] = [];
      let shiftBreakdown: ShiftBreakdown | undefined;

      if (adopted) {
        if (mod.id === 'temp-logs') {
          // 6-8 temp checks/day × 30 days = 360-480 per location/month
          sessions = Math.round(raw.locs * (360 + rng() * 120));
          avgDuration = Math.round(2 + rng() * 2);
          const morningPct = 0.38 + rng() * 0.10;
          const afternoonPct = 0.28 + rng() * 0.10;
          const eveningPct = 1 - morningPct - afternoonPct;
          shiftBreakdown = {
            morning: Math.round(sessions * morningPct),
            afternoon: Math.round(sessions * afternoonPct),
            evening: Math.round(sessions * eveningPct),
          };
        } else if (mod.id === 'checklists') {
          // 2-4 checklists/day × 30 days = 60-120 per location/month
          sessions = Math.round(raw.locs * (60 + rng() * 60));
          avgDuration = Math.round(5 + rng() * 8);
          const morningPct = 0.40 + rng() * 0.10;
          const afternoonPct = 0.25 + rng() * 0.12;
          const eveningPct = 1 - morningPct - afternoonPct;
          shiftBreakdown = {
            morning: Math.round(sessions * morningPct),
            afternoon: Math.round(sessions * afternoonPct),
            evening: Math.round(sessions * eveningPct),
          };
        } else {
          const moduleBase = (15 + rng() * 45) * raw.locs;
          sessions = Math.round(moduleBase);
          avgDuration = Math.round(3 + rng() * 12);
        }

        for (let w = 0; w < 12; w++) {
          const weekFactor = 0.7 + rng() * 0.6;
          trend.push(Math.round((sessions / 4) * weekFactor));
        }
      } else {
        for (let w = 0; w < 12; w++) trend.push(0);
      }

      moduleUsage[mod.id] = { adopted, sessions, avgDuration, trend, shiftBreakdown };
      totalModuleSessions += sessions;
    }

    const weeklyTrend: number[] = [];
    for (let w = 0; w < 12; w++) {
      let weekTotal = 0;
      for (const mod of MODULES) weekTotal += moduleUsage[mod.id].trend[w];
      weeklyTrend.push(weekTotal);
    }

    const recent4 = weeklyTrend.slice(-4).reduce((a, b) => a + b, 0);
    const prior4 = weeklyTrend.slice(-8, -4).reduce((a, b) => a + b, 0);
    const trend = prior4 > 0 ? Math.round(((recent4 - prior4) / prior4) * 100) : 0;

    return {
      id: `org-${idx}`,
      name: raw.name,
      industry: raw.industry,
      locationCount: raw.locs,
      totalSessions: totalModuleSessions,
      trend,
      moduleUsage,
      weeklyTrend,
    };
  });
}

// ── Sparkline ─────────────────────────────────────────────────────
function Sparkline({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────
const F = { fontFamily: "'DM Sans', sans-serif" };

const selectStyle = {
  padding: '8px 32px 8px 12px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  backgroundColor: 'white',
  fontWeight: 600,
  fontSize: '13px',
  color: '#374151',
  cursor: 'pointer',
  ...F,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
};

// ── Main Component ────────────────────────────────────────────────
export function UsageAnalytics() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();

  const isAdmin = isEvidlyAdmin || isDemoMode;

  const [timePeriod, setTimePeriod] = useState('30d');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'customers' | 'industry'>('overview');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSchedule, setEmailSchedule] = useState<'none' | 'weekly' | 'monthly'>('none');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [shiftFilter, setShiftFilter] = useState('all');

  const allOrgs = useMemo(() => generateDemoOrgs(), []);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const timeScale = TIME_PERIODS.find(t => t.id === timePeriod)?.scale || 1;
  const sizeRange = SIZE_TIERS.find(s => s.id === sizeFilter) || SIZE_TIERS[0];

  const filteredOrgs = allOrgs.filter(org => {
    if (industryFilter !== 'all' && org.industry !== industryFilter) return false;
    if (sizeFilter !== 'all' && (org.locationCount < sizeRange.min || org.locationCount > sizeRange.max)) return false;
    return true;
  });

  // KPIs
  const totalCustomers = filteredOrgs.length;
  const totalLocations = filteredOrgs.reduce((sum, o) => sum + o.locationCount, 0);
  const totalSessions = Math.round(filteredOrgs.reduce((sum, o) => sum + o.totalSessions, 0) * timeScale);
  const avgSessionsPerCustomer = totalCustomers > 0 ? Math.round(totalSessions / totalCustomers) : 0;
  const avgTrend = totalCustomers > 0 ? Math.round(filteredOrgs.reduce((sum, o) => sum + o.trend, 0) / totalCustomers) : 0;

  // Module-level aggregates
  const moduleStats = MODULES.map(mod => {
    const adoptedCount = filteredOrgs.filter(o => o.moduleUsage[mod.id].adopted).length;
    const adoptionRate = totalCustomers > 0 ? Math.round((adoptedCount / totalCustomers) * 100) : 0;
    const totalModSessions = Math.round(filteredOrgs.reduce((sum, o) => sum + o.moduleUsage[mod.id].sessions, 0) * timeScale);
    const avgDuration = adoptedCount > 0
      ? Math.round(filteredOrgs.filter(o => o.moduleUsage[mod.id].adopted).reduce((sum, o) => sum + o.moduleUsage[mod.id].avgDuration, 0) / adoptedCount)
      : 0;

    const weeklyData: number[] = [];
    for (let w = 0; w < 12; w++) {
      weeklyData.push(filteredOrgs.reduce((sum, o) => sum + o.moduleUsage[mod.id].trend[w], 0));
    }

    const industryBreakdown = INDUSTRIES.map(ind => {
      const indOrgs = filteredOrgs.filter(o => o.industry === ind);
      const indAdopted = indOrgs.filter(o => o.moduleUsage[mod.id].adopted).length;
      return { industry: ind, adopted: indAdopted, total: indOrgs.length, rate: indOrgs.length > 0 ? Math.round((indAdopted / indOrgs.length) * 100) : 0 };
    });

    let shiftData: ShiftBreakdown | null = null;
    if (mod.id === 'temp-logs' || mod.id === 'checklists') {
      shiftData = { morning: 0, afternoon: 0, evening: 0 };
      for (const org of filteredOrgs) {
        const sb = org.moduleUsage[mod.id].shiftBreakdown;
        if (sb) {
          shiftData.morning += sb.morning;
          shiftData.afternoon += sb.afternoon;
          shiftData.evening += sb.evening;
        }
      }
      shiftData.morning = Math.round(shiftData.morning * timeScale);
      shiftData.afternoon = Math.round(shiftData.afternoon * timeScale);
      shiftData.evening = Math.round(shiftData.evening * timeScale);
    }

    return { ...mod, adoptedCount, adoptionRate, totalSessions: totalModSessions, avgDuration, weeklyData, industryBreakdown, shiftData };
  });

  const maxModuleSessions = Math.max(...moduleStats.map(m => m.totalSessions), 1);

  // Heatmap thresholds
  const allModuleSessions = filteredOrgs.flatMap(o => MODULES.map(m => o.moduleUsage[m.id].sessions)).filter(s => s > 0);
  allModuleSessions.sort((a, b) => a - b);
  const p25 = allModuleSessions[Math.floor(allModuleSessions.length * 0.25)] || 0;
  const p75 = allModuleSessions[Math.floor(allModuleSessions.length * 0.75)] || 0;

  function heatmapColor(sessions: number): { bg: string; text: string } {
    if (sessions === 0) return { bg: '#f3f4f6', text: '#9ca3af' };
    if (sessions > p75) return { bg: '#dcfce7', text: '#16a34a' };
    if (sessions > p25) return { bg: '#dbeafe', text: '#1b4965' };
    return { bg: '#fef3c7', text: '#d4af37' };
  }

  // Email report
  const sendReport = async () => {
    setEmailSending(true);
    try {
      const periodLabel = TIME_PERIODS.find(t => t.id === timePeriod)?.label || 'Last 30 Days';
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const launchedStats = moduleStats.filter(m => !m.comingSoon);
      const top5 = [...launchedStats].sort((a, b) => b.adoptionRate - a.adoptionRate).slice(0, 5);
      const bottom3 = [...launchedStats].sort((a, b) => a.adoptionRate - b.adoptionRate).slice(0, 3);
      const decliningOrgs = filteredOrgs.filter(o => o.trend < -5);

      const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;background:#faf8f3">
<div style="max-width:600px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
<div style="background:#1b4965;padding:32px 24px;text-align:center">
<div style="font-size:28px;font-weight:800;color:white"><span style="color:#d4af37">Evid</span>LY</div>
<div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px">Usage Analytics Report</div>
</div>
<div style="padding:24px">
<div style="font-size:14px;color:#6b7280;margin-bottom:16px">${periodLabel} · Generated ${today}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr>
<td style="background:#f9fafb;padding:16px;border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:800;color:#1b4965">${totalCustomers}</div><div style="font-size:11px;color:#6b7280">Customers</div></td>
<td width="8"></td>
<td style="background:#f9fafb;padding:16px;border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:800;color:#1b4965">${totalLocations}</div><div style="font-size:11px;color:#6b7280">Locations</div></td>
<td width="8"></td>
<td style="background:#f9fafb;padding:16px;border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:800;color:#1b4965">${totalSessions.toLocaleString()}</div><div style="font-size:11px;color:#6b7280">Sessions</div></td>
<td width="8"></td>
<td style="background:#f9fafb;padding:16px;border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:800;color:#1b4965">${avgSessionsPerCustomer}</div><div style="font-size:11px;color:#6b7280">Avg/Customer</div></td>
</tr></table>
<h3 style="font-size:14px;font-weight:700;color:#1b4965;margin-bottom:8px">Top 5 Most-Used Modules</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
${top5.map(m => `<tr><td style="padding:6px 0;font-size:13px">${m.icon} ${m.name}</td><td style="text-align:right;font-weight:700;color:#16a34a;font-size:13px">${m.adoptionRate}%</td></tr>`).join('')}
</table>
<h3 style="font-size:14px;font-weight:700;color:#d97706;margin-bottom:8px">Opportunity Areas (Lowest Adoption)</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
${bottom3.map(m => `<tr><td style="padding:6px 0;font-size:13px">${m.icon} ${m.name}</td><td style="text-align:right;font-weight:700;color:#d97706;font-size:13px">${m.adoptionRate}%</td></tr>`).join('')}
</table>
<h3 style="font-size:14px;font-weight:700;color:#1b4965;margin-bottom:8px">Industry Breakdown</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
${INDUSTRIES.map(ind => {
        const indOrgs = filteredOrgs.filter(o => o.industry === ind);
        if (indOrgs.length === 0) return '';
        const indSessions = Math.round(indOrgs.reduce((s, o) => s + o.totalSessions, 0) * timeScale);
        const indModStats = MODULES.map(mod => ({ name: mod.name, rate: Math.round((indOrgs.filter(o => o.moduleUsage[mod.id].adopted).length / indOrgs.length) * 100) }));
        const topMod = [...indModStats].sort((a, b) => b.rate - a.rate)[0];
        return `<tr><td style="padding:6px 0;font-size:13px;border-bottom:1px solid #f3f4f6"><strong>${ind}</strong> — ${indOrgs.length} customers, ${indSessions.toLocaleString()} sessions<br/><span style="font-size:11px;color:#6b7280">Top module: ${topMod.name} (${topMod.rate}%)</span></td></tr>`;
      }).join('')}
</table>
${decliningOrgs.length > 0 ? `<h3 style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:8px">Declining Usage — Outreach Needed</h3>
<div style="margin-bottom:20px">${decliningOrgs.map(o => `<div style="padding:6px 0;font-size:13px;border-bottom:1px solid #f3f4f6">${o.name} <span style="color:#dc2626;font-weight:600">(${o.trend}%)</span></div>`).join('')}</div>` : ''}
<div style="text-align:center;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af">
Generated ${today} · This is an automated report from EvidLY Analytics
</div>
</div>
</div>
</body></html>`;

      try {
        await fetch('/api/send-usage-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'usage@getevidly.com',
            from: 'EvidLY Platform <noreply@getevidly.com>',
            subject: `EvidLY Usage Report — ${periodLabel} — ${today}`,
            html: emailHtml,
          }),
        });
      } catch {
        // Silent fail in demo
      }

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } finally {
      setEmailSending(false);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'modules' as const, label: 'Module Usage' },
    { id: 'customers' as const, label: 'Customer Detail' },
    { id: 'industry' as const, label: 'By Industry' },
  ];

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb items={[{ label: 'Admin', href: '/dashboard' }, { label: 'Usage Analytics' }]} />

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', ...F }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1b4965', margin: '0 0 4px 0', ...F }}>Usage Analytics</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, ...F }}>Internal — Track customer module adoption and platform usage</p>
          </div>
          <button
            onClick={() => setShowEmailModal(true)}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              backgroundColor: '#d4af37', color: 'white', fontWeight: 700,
              fontSize: '13px', cursor: 'pointer', ...F,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            📧 Send Report
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)} style={selectStyle}>
            {TIME_PERIODS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Industries</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} style={selectStyle}>
            {SIZE_TIERS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Customers', value: totalCustomers, fmt: String(totalCustomers) },
            { label: 'Total Locations', value: totalLocations, fmt: String(totalLocations) },
            { label: 'Total Sessions', value: totalSessions, fmt: totalSessions.toLocaleString() },
            { label: 'Avg Sessions/Customer', value: avgSessionsPerCustomer, fmt: avgSessionsPerCustomer.toLocaleString() },
          ].map(kpi => (
            <div key={kpi.label} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', ...F }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1b4965', marginBottom: '4px' }}>
                {kpi.fmt}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: avgTrend >= 0 ? '#16a34a' : '#dc2626' }}>
                {avgTrend >= 0 ? '↑' : '↓'} {Math.abs(avgTrend)}% vs prior period
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px', fontSize: '14px', fontWeight: 600, border: 'none',
                backgroundColor: 'transparent', cursor: 'pointer', ...F, whiteSpace: 'nowrap',
                color: activeTab === tab.id ? '#1b4965' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #d4af37' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'modules' && renderModuleUsage()}
        {activeTab === 'customers' && renderCustomerDetail()}
        {activeTab === 'industry' && renderByIndustry()}
      </div>

      {showEmailModal && renderEmailModal()}
    </>
  );

  // ── Overview Tab ──────────────────────────────────────────────
  function renderOverview() {
    const sortedByAdoption = [...moduleStats].sort((a, b) => b.adoptionRate - a.adoptionRate);
    const sortedBySessions = [...moduleStats].sort((a, b) => b.totalSessions - a.totalSessions);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Module Adoption Rate */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965', margin: '0 0 16px 0', ...F, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Module Adoption Rate
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedByAdoption.map(mod => (
                <div key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: mod.comingSoon ? 0.5 : 1 }}>
                  <div style={{ width: '130px', fontSize: '11px', fontWeight: 500, color: '#374151', ...F, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mod.icon} {mod.name}
                  </div>
                  <div style={{ flex: 1, height: '18px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${mod.adoptionRate}%`, height: '100%', backgroundColor: mod.color, borderRadius: '4px', transition: 'width 0.3s' }} />
                    {mod.comingSoon && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>
                        COMING SOON
                      </div>
                    )}
                  </div>
                  <div style={{ width: '40px', fontSize: '11px', fontWeight: 700, color: mod.comingSoon ? '#9ca3af' : mod.color, textAlign: 'right', ...F }}>
                    {mod.comingSoon ? '—' : `${mod.adoptionRate}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions by Module */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965', margin: '0 0 16px 0', ...F, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sessions by Module
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedBySessions.map(mod => (
                <div key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: mod.comingSoon ? 0.5 : 1 }}>
                  <div style={{ width: '130px', fontSize: '11px', fontWeight: 500, color: '#374151', ...F, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mod.icon} {mod.name}
                  </div>
                  <div style={{ flex: 1, height: '18px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${(mod.totalSessions / maxModuleSessions) * 100}%`, height: '100%', backgroundColor: mod.color, borderRadius: '4px', transition: 'width 0.3s' }} />
                    {mod.comingSoon && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>
                        COMING SOON
                      </div>
                    )}
                  </div>
                  <div style={{ width: '60px', fontSize: '11px', fontWeight: 700, color: mod.comingSoon ? '#9ca3af' : '#374151', textAlign: 'right', ...F }}>
                    {mod.comingSoon ? '—' : mod.totalSessions.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Industry Breakdown */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965', margin: '0 0 16px 0', ...F, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Industry Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {INDUSTRIES.map(ind => {
              const indOrgs = filteredOrgs.filter(o => o.industry === ind);
              if (indOrgs.length === 0) return null;
              const indSessions = Math.round(indOrgs.reduce((s, o) => s + o.totalSessions, 0) * timeScale);
              const avgSess = Math.round(indSessions / indOrgs.length);

              const indModStats = MODULES.map(mod => {
                const adoptedCount = indOrgs.filter(o => o.moduleUsage[mod.id].adopted).length;
                return { name: mod.name, rate: indOrgs.length > 0 ? Math.round((adoptedCount / indOrgs.length) * 100) : 0 };
              });
              const topMod = [...indModStats].sort((a, b) => b.rate - a.rate)[0];
              const lowMod = [...indModStats].sort((a, b) => a.rate - b.rate)[0];

              return (
                <div key={ind} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', ...F }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965', marginBottom: '12px' }}>{ind}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Customers: <strong style={{ color: '#374151' }}>{indOrgs.length}</strong></div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Avg Sessions: <strong style={{ color: '#374151' }}>{avgSess.toLocaleString()}</strong></div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#16a34a', marginBottom: '4px' }}>Top: <strong>{topMod.name}</strong> ({topMod.rate}%)</div>
                  <div style={{ fontSize: '11px', color: '#d97706' }}>Lowest: <strong>{lowMod.name}</strong> ({lowMod.rate}%)</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Module Usage Tab ──────────────────────────────────────────
  function renderModuleUsage() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {moduleStats.map(mod => {
          const hasShifts = mod.id === 'temp-logs' || mod.id === 'checklists';
          let displaySessions = mod.totalSessions;

          if (hasShifts && shiftFilter !== 'all' && mod.shiftData) {
            displaySessions = mod.shiftData[shiftFilter as keyof ShiftBreakdown];
          }

          // Coming Soon card
          if (mod.comingSoon) {
            return (
              <div key={mod.id} style={{ backgroundColor: 'white', border: '2px dashed #e5e7eb', borderRadius: '12px', padding: '20px', ...F, position: 'relative', opacity: 0.7 }}>
                <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', fontWeight: 700, color: '#6366f1', backgroundColor: '#eef2ff', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                  COMING SOON
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{mod.icon}</span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965' }}>{mod.name}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#9ca3af' }}>0%</div>
                    <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>Adoption (0/{totalCustomers})</div>
                  </div>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#9ca3af' }}>—</div>
                    <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>Not Yet Available</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', ...F, textAlign: 'center' }}>
                  Module launching soon — will be available to all customers
                </div>
              </div>
            );
          }

          return (
            <div key={mod.id} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', ...F }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>{mod.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965' }}>{mod.name}</div>
                    {hasShifts && (
                      <select
                        value={shiftFilter}
                        onChange={e => setShiftFilter(e.target.value)}
                        style={{ fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px 6px', marginTop: '4px', color: '#6b7280', cursor: 'pointer', ...F }}
                      >
                        <option value="all">All Shifts</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                      </select>
                    )}
                  </div>
                </div>
                <Sparkline data={mod.weeklyData} color={mod.color} width={80} height={28} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: mod.color }}>{mod.adoptionRate}%</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>Adoption ({mod.adoptedCount}/{totalCustomers})</div>
                </div>
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1b4965' }}>{displaySessions.toLocaleString()}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>
                    {hasShifts && shiftFilter !== 'all' ? `${shiftFilter.charAt(0).toUpperCase() + shiftFilter.slice(1)} Sessions` : 'Total Sessions'}
                  </div>
                </div>
              </div>

              {hasShifts && mod.shiftData && shiftFilter === 'all' && (
                <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: mod.id === 'temp-logs' ? '#fef2f2' : '#eff6ff', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: mod.id === 'temp-logs' ? '#dc2626' : '#2563eb', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Shift Breakdown
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { label: 'Morning', value: mod.shiftData.morning, color: '#f59e0b' },
                      { label: 'Afternoon', value: mod.shiftData.afternoon, color: '#ea580c' },
                      { label: 'Evening', value: mod.shiftData.evening, color: '#7c3aed' },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, textAlign: 'center', fontSize: '10px', ...F }}>
                        <div style={{ fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
                        <div style={{ color: '#6b7280' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', ...F }}>
                Avg duration: <strong style={{ color: '#374151' }}>{mod.avgDuration} min</strong>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {mod.industryBreakdown.filter(ib => ib.total > 0).map(ib => (
                  <span key={ib.industry} style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', ...F,
                    backgroundColor: ib.rate >= 80 ? '#dcfce7' : ib.rate >= 50 ? '#dbeafe' : '#fef3c7',
                    color: ib.rate >= 80 ? '#16a34a' : ib.rate >= 50 ? '#1b4965' : '#d97706',
                  }}>
                    {ib.industry}: {ib.rate}%
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Customer Detail Tab ───────────────────────────────────────
  function renderCustomerDetail() {
    const sortedOrgs = [...filteredOrgs].sort((a, b) => b.totalSessions - a.totalSessions);

    return (
      <div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', minWidth: '1300px', ...F }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' }}>Customer</th>
                <th style={{ padding: '10px 6px', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' }}>Size</th>
                <th style={{ padding: '10px 6px', textAlign: 'right', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' }}>Sessions</th>
                {MODULES.map(mod => (
                  <th key={mod.id} style={{ padding: '10px 2px', textAlign: 'center', fontSize: '9px', fontWeight: 700, color: mod.comingSoon ? '#c7d2fe' : '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', maxWidth: '44px' }} title={mod.comingSoon ? `${mod.name} (Coming Soon)` : mod.name}>
                    {mod.icon}
                  </th>
                ))}
                <th style={{ padding: '10px 6px', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrgs.map(org => (
                <tr key={org.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: '#111827' }}>{org.name}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{org.locationCount} loc · {org.industry}</div>
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#374151' }}>
                    {org.locationCount}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#1b4965' }}>
                    {Math.round(org.totalSessions * timeScale).toLocaleString()}
                  </td>
                  {MODULES.map(mod => {
                    const usage = org.moduleUsage[mod.id];
                    const scaledSessions = Math.round(usage.sessions * timeScale);
                    const { bg, text } = mod.comingSoon ? { bg: '#f3f4f6', text: '#d1d5db' } : heatmapColor(usage.sessions);
                    return (
                      <td key={mod.id} style={{ padding: '3px 1px', textAlign: 'center' }}>
                        <div style={{
                          width: '30px', height: '24px', borderRadius: '4px',
                          backgroundColor: bg, display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: '8px', fontWeight: 700, color: text,
                        }}>
                          {mod.comingSoon ? '·' : usage.sessions > 0 ? (scaledSessions > 999 ? `${Math.round(scaledSessions / 1000)}k` : scaledSessions) : '—'}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Sparkline data={org.weeklyTrend} color={org.trend >= 0 ? '#16a34a' : '#dc2626'} width={60} height={20} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: org.trend >= 0 ? '#16a34a' : '#dc2626' }}>
                        {org.trend >= 0 ? '+' : ''}{org.trend}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '8px', ...F, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Legend:</span>
          {[
            { label: 'Heavy', bg: '#dcfce7', color: '#16a34a' },
            { label: 'Active', bg: '#dbeafe', color: '#1b4965' },
            { label: 'Light', bg: '#fef3c7', color: '#d4af37' },
            { label: 'Not Adopted', bg: '#f3f4f6', color: '#9ca3af' },
            { label: 'Coming Soon', bg: '#f3f4f6', color: '#d1d5db' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: item.bg, border: '1px solid #e5e7eb' }} />
              <span style={{ fontSize: '11px', color: item.color, fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── By Industry Tab ───────────────────────────────────────────
  function renderByIndustry() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {INDUSTRIES.map(ind => {
          const indOrgs = filteredOrgs.filter(o => o.industry === ind);
          if (indOrgs.length === 0) return null;
          const indSessions = Math.round(indOrgs.reduce((s, o) => s + o.totalSessions, 0) * timeScale);

          return (
            <div key={ind} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', ...F }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', margin: 0 }}>{ind}</h3>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {indOrgs.length} customer{indOrgs.length !== 1 ? 's' : ''} · {indSessions.toLocaleString()} sessions
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px' }}>
                {MODULES.map(mod => {
                  if (mod.comingSoon) {
                    return (
                      <div key={mod.id} style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px dashed #e5e7eb', opacity: 0.6 }}>
                        <div style={{ fontSize: '14px', marginBottom: '2px' }}>{mod.icon}</div>
                        <div style={{ fontSize: '8px', fontWeight: 700, color: '#6366f1', letterSpacing: '0.3px' }}>SOON</div>
                        <div style={{ fontSize: '8px', color: '#9ca3af', fontWeight: 600, ...F }}>{mod.name}</div>
                      </div>
                    );
                  }
                  const adoptedCount = indOrgs.filter(o => o.moduleUsage[mod.id].adopted).length;
                  const rate = Math.round((adoptedCount / indOrgs.length) * 100);
                  const bg = rate >= 80 ? '#dcfce7' : rate >= 60 ? '#dbeafe' : rate >= 40 ? '#fef3c7' : '#fef2f2';
                  const color = rate >= 80 ? '#16a34a' : rate >= 60 ? '#1b4965' : rate >= 40 ? '#d97706' : '#dc2626';

                  return (
                    <div key={mod.id} style={{ backgroundColor: bg, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', marginBottom: '2px' }}>{mod.icon}</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color }}>{rate}%</div>
                      <div style={{ fontSize: '8px', color: '#6b7280', fontWeight: 600, ...F }}>{mod.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Email Report Modal ────────────────────────────────────────
  function renderEmailModal() {
    const periodLabel = TIME_PERIODS.find(t => t.id === timePeriod)?.label || 'Last 30 Days';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const top5 = [...moduleStats].sort((a, b) => b.adoptionRate - a.adoptionRate).slice(0, 5);
    const bottom3 = [...moduleStats].sort((a, b) => a.adoptionRate - b.adoptionRate).slice(0, 3);
    const decliningOrgs = filteredOrgs.filter(o => o.trend < -5);

    return (
      <div
        onClick={() => setShowEmailModal(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '16px',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            maxWidth: '520px', width: '100%', overflow: 'hidden', ...F, maxHeight: '90vh', overflowY: 'auto',
          }}
        >
          <div style={{ background: '#1b4965', padding: '20px 24px', color: 'white' }}>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>Send Usage Report</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>to usage@getevidly.com</div>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1b4965', marginBottom: '8px' }}>Report Preview</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
              Subject: EvidLY Usage Report — {periodLabel} — {today}
            </div>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', color: '#374151' }}>KPI Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: '#6b7280' }}>
                <div>Customers: <strong style={{ color: '#1b4965' }}>{totalCustomers}</strong></div>
                <div>Locations: <strong style={{ color: '#1b4965' }}>{totalLocations}</strong></div>
                <div>Sessions: <strong style={{ color: '#1b4965' }}>{totalSessions.toLocaleString()}</strong></div>
                <div>Avg/Customer: <strong style={{ color: '#1b4965' }}>{avgSessionsPerCustomer}</strong></div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', color: '#16a34a' }}>Top 5 Modules</div>
              {top5.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#374151' }}>
                  <span>{m.icon} {m.name}</span>
                  <strong>{m.adoptionRate}%</strong>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', color: '#d97706' }}>Opportunity Areas</div>
              {bottom3.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#374151' }}>
                  <span>{m.icon} {m.name}</span>
                  <strong style={{ color: '#d97706' }}>{m.adoptionRate}%</strong>
                </div>
              ))}
            </div>

            {decliningOrgs.length > 0 && (
              <div style={{ backgroundColor: '#fef2f2', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px', color: '#dc2626' }}>Declining Usage ({decliningOrgs.length})</div>
                {decliningOrgs.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#374151' }}>
                    <span>{o.name}</span>
                    <strong style={{ color: '#dc2626' }}>{o.trend}%</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Schedule */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1b4965', marginBottom: '8px' }}>Schedule</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([
                  { id: 'none' as const, label: 'One-time' },
                  { id: 'weekly' as const, label: 'Weekly (Mon)' },
                  { id: 'monthly' as const, label: 'Monthly (1st)' },
                ]).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setEmailSchedule(opt.id)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                      border: emailSchedule === opt.id ? '2px solid #d4af37' : '2px solid #e5e7eb',
                      backgroundColor: emailSchedule === opt.id ? '#fef3c7' : 'white',
                      color: emailSchedule === opt.id ? '#92400e' : '#6b7280',
                      cursor: 'pointer', ...F,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowEmailModal(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb',
                  backgroundColor: 'white', fontWeight: 600, fontSize: '13px', color: '#374151',
                  cursor: 'pointer', ...F,
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendReport}
                disabled={emailSending}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                  backgroundColor: emailSent ? '#16a34a' : '#1b4965',
                  fontWeight: 700, fontSize: '13px', color: 'white',
                  cursor: emailSending ? 'wait' : 'pointer', ...F,
                  opacity: emailSending ? 0.7 : 1,
                }}
              >
                {emailSent ? '✓ Sent!' : emailSending ? 'Sending...' : 'Send Now'}
              </button>
            </div>

            {emailSchedule !== 'none' && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#16a34a', fontWeight: 500, textAlign: 'center' }}>
                Scheduled: {emailSchedule === 'weekly' ? 'Every Monday at 8:00 AM' : '1st of each month at 8:00 AM'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default UsageAnalytics;
