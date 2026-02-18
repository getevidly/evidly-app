import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Flame, X, AlertTriangle, ShieldAlert,
  Thermometer, ClipboardList,
  CheckCircle2, BarChart3, LineChart as LineChartIcon, Shield,
  Settings2, ArrowUp, ArrowDown, Eye, EyeOff, Users, AlertCircle, FileText,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import type { LocationScore, LocationJurisdiction } from '../../types/jurisdiction';
import { AlertBanner, type AlertBannerItem } from '../shared/AlertBanner';
import {
  LOCATIONS_WITH_SCORES,
  DEMO_ORG,
  DEMO_WEEKLY_ACTIVITY,
  DEMO_TREND_DATA,
} from '../../data/demoData';

// ================================================================
// CONSTANTS
// ================================================================

const GOLD = '#C49A2B';
const NAVY = '#163a5f';
const PAGE_BG = '#f4f6f9';
const BODY_TEXT = '#1e293b';
const MUTED = '#94a3b8';

const FONT: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// ================================================================
// JIE LOCATION MAP
// ================================================================

const JIE_LOC_MAP: Record<string, string> = {
  'downtown': 'demo-loc-downtown',
  'airport': 'demo-loc-airport',
  'university': 'demo-loc-university',
};

// ================================================================
// KEYFRAMES
// ================================================================

const KEYFRAMES = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ringDraw {
  from { stroke-dashoffset: var(--circ); }
  to   { stroke-dashoffset: var(--off); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function stagger(i: number): React.CSSProperties {
  return { animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both` };
}

// ================================================================
// HELPERS
// ================================================================

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ================================================================
// ALERT BANNERS
// ================================================================

interface AlertItem {
  id: string;
  severity: 'critical' | 'warning';
  message: string;
  location: string;
  pillar: string;
  actionLabel: string;
  route: string;
}

const EXEC_ALERTS: AlertItem[] = [
  { id: 'ea1', severity: 'critical', message: 'University Dining Fire Safety dropped below 65 — 3 equipment inspections overdue', location: 'University Dining', pillar: 'Fire Safety', actionLabel: 'Take Action', route: '/dashboard?location=university' },
  { id: 'ea2', severity: 'warning', message: 'Airport Cafe walk-in cooler trending warm — 3 out-of-range readings this week', location: 'Airport Cafe', pillar: 'Food Safety', actionLabel: 'View Temps', route: '/temp-logs?location=airport' },
];

// AlertBanners — now uses shared component from ../shared/AlertBanner

// ================================================================
// WIDGET: KPIs — This Week's Performance
// ================================================================

function WidgetKPIs() {
  const act = DEMO_WEEKLY_ACTIVITY;
  const kpis = [
    { icon: <Thermometer size={18} />, label: 'Temp Checks', value: act.tempChecks.total, unit: 'logged', bar: act.tempChecks.onTimePercent, metric: String(act.tempChecks.onTimePercent), metricLabel: 'on time', trend: '\u2191 1.4 vs last week', status: 'good' as const },
    { icon: <ClipboardList size={18} />, label: 'Checklists', value: act.checklists.completed, unit: `of ${act.checklists.required}`, bar: act.checklists.percent, metric: String(act.checklists.percent), metricLabel: 'completion', trend: '\u2191 2.1 vs last week', status: 'good' as const },
    { icon: <FileText size={18} />, label: 'Documents', value: act.documents.uploaded, unit: 'uploaded', bar: 85, metric: String(act.documents.expiringSoon), metricLabel: 'expiring soon', trend: '\u2014', status: 'warning' as const },
    { icon: <AlertCircle size={18} />, label: 'Incidents', value: act.incidents.total, unit: 'reported', bar: 75, metric: String(act.incidents.resolved), metricLabel: 'resolved', trend: `\u2193 ${act.incidents.open} open`, status: 'attention' as const },
    { icon: <Users size={18} />, label: 'Team Activity', value: act.activeTeam, unit: 'active staff', bar: 100, metric: '3', metricLabel: 'locations covered', trend: 'full coverage', status: 'good' as const },
  ];

  const statusColors = { good: '#16a34a', warning: '#d97706', attention: '#dc2626' };

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">This Week's Performance</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(kpi => {
          const borderColor = statusColors[kpi.status];
          return (
            <div
              key={kpi.label}
              className="rounded-xl p-3.5 transition-all hover:shadow-md cursor-pointer"
              style={{ borderTop: `3px solid ${borderColor}`, backgroundColor: '#fafbfc' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: MUTED }}>{kpi.icon}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{kpi.label}</span>
              </div>
              <div className="mb-1">
                <span style={{ fontSize: 28, fontWeight: 800, color: BODY_TEXT }}>{kpi.value}</span>
                <span className="text-[11px] text-gray-400 ml-1.5">{kpi.unit}</span>
              </div>
              <div className="h-[3px] rounded-full bg-gray-100 overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${kpi.bar}%`, backgroundColor: borderColor }} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold" style={{ color: borderColor }}>{kpi.metric}</span>
                  <span className="text-[10px] text-gray-400 ml-1">{kpi.metricLabel}</span>
                </div>
                <span className="text-[10px] text-gray-400">{kpi.trend}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// WIDGET: Location Status
// ================================================================

function WidgetLocations({ jieScores, jurisdictions, navigate }: {
  jieScores: Record<string, LocationScore>;
  jurisdictions: Record<string, LocationJurisdiction>;
  navigate: (path: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Location Status</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {LOCATIONS_WITH_SCORES.map(loc => {
          const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
          const score = jieScores[jieLocId];
          const jur = jurisdictions[jieLocId];

          const foodStatus = score?.foodSafety?.status || 'unknown';
          const foodStatusColor = foodStatus === 'passing' ? '#16a34a' : foodStatus === 'failing' ? '#dc2626' : foodStatus === 'at_risk' ? '#d97706' : '#6b7280';

          return (
            <div
              key={loc.id}
              className="rounded-xl p-5 transition-all hover:shadow-lg"
              style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = GOLD;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Name + County */}
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-bold" style={{ color: BODY_TEXT }}>{loc.name}</h5>
                {jur?.county && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {jur.county} County
                  </span>
                )}
              </div>

              {/* Food Safety */}
              <div className="p-3 rounded-lg mb-2" style={{ borderLeft: `3px solid ${foodStatusColor}`, backgroundColor: '#fafbfc' }}>
                <div className="flex items-center gap-2 mb-1">
                  <UtensilsCrossed size={14} style={{ color: MUTED }} />
                  <span className="text-[13px] text-gray-700 flex-1">Food Safety</span>
                  <span className="text-sm font-bold" style={{ color: foodStatusColor }}>
                    {score?.foodSafety?.gradeDisplay || 'Pending'}
                  </span>
                </div>
                {score?.foodSafety?.details?.summary && (
                  <p className="text-[11px] text-gray-500 ml-6">{score.foodSafety.details.summary}</p>
                )}
              </div>

              {/* Fire Safety */}
              <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#f8fafc' }}>
                <div className="flex items-center gap-2">
                  <Flame size={14} style={{ color: MUTED }} />
                  <span className="text-[13px] text-gray-700 flex-1">Fire Safety</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    score?.fireSafety?.status === 'passing'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {score?.fireSafety?.grade || 'Pending'}
                  </span>
                </div>
                {jur?.fireSafety?.agency_name && (
                  <p className="text-[10px] text-gray-400 ml-6 mt-0.5">{jur.fireSafety.agency_name}</p>
                )}
              </div>

              {/* View Details */}
              <button
                type="button"
                onClick={() => navigate(`/dashboard?location=${loc.id}`)}
                className="w-full text-center text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: NAVY }}
              >
                View Details &rarr;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// WIDGET: Trend & Attention (2-column)
// ================================================================

function WidgetTrendAttention({ navigate, jieScores }: {
  navigate: (path: string) => void;
  jieScores: Record<string, LocationScore>;
}) {
  const trendData = useMemo(() => DEMO_TREND_DATA, []);

  const allLocations = LOCATIONS_WITH_SCORES.map(loc => {
    const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
    const score = jieScores[jieLocId];
    const foodStatus = score?.foodSafety?.status || 'unknown';
    const statusType = foodStatus === 'failing' ? 'critical' as const
      : foodStatus === 'at_risk' ? 'attention' as const
      : 'good' as const;
    const gradeDisplay = score?.foodSafety?.gradeDisplay || 'Pending';
    const description = statusType === 'critical'
      ? 'Reinspection required. Uncorrected major violations found during last inspection.'
      : statusType === 'attention'
        ? 'At risk. Review operational items and address flagged concerns.'
        : 'All authorities passing. Operations running smoothly.';
    const actionLabel = statusType === 'critical' ? 'Take Action' : statusType === 'attention' ? 'View Details' : '';
    const route = statusType !== 'good' ? `/dashboard?location=${loc.id}` : '';
    return { ...loc, statusType, gradeDisplay, description, actionLabel, route };
  }).sort((a, b) => {
    const order = { critical: 0, attention: 1, good: 2 };
    return order[a.statusType] - order[b.statusType];
  });

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Trend & Attention</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Trend Chart */}
        <div>
          <p className="text-[11px] font-medium text-gray-500 mb-1">EvidLY Operational Readiness — 30 Days</p>
          <p className="text-[10px] text-gray-400 mb-3">EvidLY Operational Readiness (internal tracking)</p>
          <div className="flex items-center gap-4 mb-2 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: GOLD }} /> Overall</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#16a34a' }} /> Food Safety</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#ea580c' }} /> Fire Safety</span>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="execGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} interval={4} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0d2847', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                  labelStyle={{ color: MUTED, fontSize: 11 }}
                  formatter={((v: number | undefined, name: string) => {
                    const labels: Record<string, string> = { overall: 'Overall', foodSafety: 'Food Safety', fireSafety: 'Fire Safety' };
                    return [String(v ?? ''), labels[name] || name];
                  }) as any}
                />
                <Area type="monotone" dataKey="overall" stroke={GOLD} strokeWidth={2.5} fill="url(#execGoldGrad)" dot={false} activeDot={{ r: 4, fill: GOLD }} name="overall" />
                <Line type="monotone" dataKey="foodSafety" stroke="#16a34a" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} name="foodSafety" />
                <Line type="monotone" dataKey="fireSafety" stroke="#ea580c" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} name="fireSafety" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Attention Required */}
        <div>
          <p className="text-[11px] font-medium text-gray-500 mb-3">Attention Required</p>
          <div className="space-y-3">
            {allLocations.map(loc => {
              const borderColor = loc.statusType === 'critical' ? '#dc2626' : loc.statusType === 'attention' ? '#d97706' : '#16a34a';
              const bgColor = loc.statusType === 'critical' ? '#fef2f2' : loc.statusType === 'attention' ? '#fffbeb' : '#f0fdf4';
              return (
                <div
                  key={loc.id}
                  className="rounded-xl p-4"
                  style={{ borderLeft: `4px solid ${borderColor}`, backgroundColor: bgColor }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">{loc.name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ color: borderColor, backgroundColor: borderColor + '15' }}>
                      {loc.gradeDisplay}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-600 leading-relaxed mb-2">{loc.description}</p>
                  {loc.actionLabel && (
                    <button
                      type="button"
                      className="text-xs font-medium"
                      style={{ color: NAVY }}
                      onClick={() => navigate(loc.route)}
                    >
                      {loc.actionLabel} &rarr;
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// WIDGET CONFIG
// ================================================================

interface WidgetConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
}

const DEFAULT_WIDGET_ORDER: WidgetConfig[] = [
  { id: 'kpis', label: "This Week's Performance", icon: <BarChart3 size={14} />, visible: true },
  { id: 'locations', label: 'Location Status', icon: <Users size={14} />, visible: true },
  { id: 'trendAttention', label: 'Trend & Attention', icon: <LineChartIcon size={14} />, visible: true },
];

// ================================================================
// STRATEGIC ACTIONS BAR (fixed bottom — NOT customizable)
// ================================================================

function StrategicActionsBar({ navigate }: { navigate: (path: string) => void }) {
  const actions = [
    { icon: <BarChart3 size={16} />, title: 'Generate Org Report', cta: 'Generate Report', route: '/reports' },
    { icon: <LineChartIcon size={16} />, title: 'View Benchmarks', cta: 'View Benchmarks', route: '/benchmarks' },
    { icon: <Shield size={16} />, title: 'Risk Assessment', cta: 'View Risk Report', route: '/risk-score' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100]"
      style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-[1100px] mx-auto px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
        {actions.map(a => (
          <div
            key={a.title}
            className="flex items-center gap-3 px-4 py-2.5 rounded-[10px] flex-1 transition-all"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = GOLD;
              (e.currentTarget as HTMLElement).style.backgroundColor = '#fefce8';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
              (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
            }}
          >
            <span style={{ color: NAVY }}>{a.icon}</span>
            <span className="text-[13px] font-semibold flex-1" style={{ color: BODY_TEXT }}>{a.title}</span>
            <button
              type="button"
              onClick={() => navigate(a.route)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md shrink-0 transition-colors"
              style={{ border: `1px solid ${NAVY}`, color: NAVY }}
            >
              {a.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================================================================
// EVIDLY FOOTER
// ================================================================

function EvidlyFooter() {
  return (
    <div className="flex items-center justify-center gap-2 py-6 mt-6" style={{ borderTop: '1px solid #eef1f5' }}>
      <span className="text-[15px] font-bold">
        <span style={{ color: GOLD }}>E</span>
        <span style={{ color: NAVY }}>vid</span>
        <span style={{ color: GOLD }}>LY</span>
      </span>
      <span className="text-[12px] text-gray-400">Compliance Simplified</span>
    </div>
  );
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();

  const jieLocIds = useMemo(
    () => LOCATIONS_WITH_SCORES.map(l => JIE_LOC_MAP[l.id] || l.id),
    [],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // Dismissed alerts (session-only)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const visibleAlerts = EXEC_ALERTS.filter(a => !dismissedAlerts.has(a.id));
  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  }, []);

  // Widget customization
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGET_ORDER);
  const [customizing, setCustomizing] = useState(false);

  const moveWidget = useCallback((index: number, dir: -1 | 1) => {
    setWidgets(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  }, []);

  const visibleWidgets = widgets.filter(w => w.visible);

  const renderWidget = (wid: string) => {
    switch (wid) {
      case 'kpis': return <WidgetKPIs />;
      case 'locations': return <WidgetLocations jieScores={jieScores} jurisdictions={jurisdictions} navigate={navigate} />;
      case 'trendAttention': return <WidgetTrendAttention navigate={navigate} jieScores={jieScores} />;
      default: return null;
    }
  };

  return (
    <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{KEYFRAMES}</style>

      {/* ============================================================ */}
      {/* DARK NAVY HEADER (locked)                                     */}
      {/* ============================================================ */}
      <div
        className="relative overflow-hidden"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'linear-gradient(135deg, #1c2a3f 0%, #263d56 50%, #2f4a66 100%)',
          padding: '20px 24px 40px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          ...stagger(0),
        }}
      >
        {/* Gold radial glow */}
        <div className="absolute pointer-events-none" style={{
          top: -80, right: -40, width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(196,154,43,0.10) 0%, transparent 55%)',
        }} />

        {/* Row 1: Logo | Divider | Greeting | Org */}
        <div className="flex items-start gap-4 mb-6 relative z-10">
          <div className="flex-shrink-0">
            <div className="flex items-baseline">
              <span className="text-[22px]" style={{ color: GOLD, fontWeight: 800 }}>E</span>
              <span className="text-[22px] text-white" style={{ fontWeight: 800 }}>vid</span>
              <span className="text-[22px]" style={{ color: GOLD, fontWeight: 800 }}>LY</span>
            </div>
            <p className="text-[9px] uppercase text-white mt-0.5" style={{ opacity: 0.45, letterSpacing: '0.12em' }}>
              Compliance Simplified
            </p>
          </div>
          <div className="w-px self-stretch" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-base font-medium">{getGreeting()}, Sarah.</p>
            <p className="text-blue-200 text-xs mt-0.5" style={{ opacity: 0.7 }}>{getFormattedDate()}</p>
          </div>
          <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="text-white font-semibold text-sm">{companyName || DEMO_ORG.name}</p>
            <p className="text-blue-200 text-xs mt-0.5" style={{ opacity: 0.7 }}>
              {DEMO_ORG.locationCount} locations &middot; California
            </p>
          </div>
        </div>

        {/* Dual-Authority Jurisdiction Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 mt-2" style={stagger(1)}>
          {/* Food Safety */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <UtensilsCrossed size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
              <span className="text-sm font-semibold text-white" style={{ opacity: 0.9 }}>Food Safety</span>
              <span className="text-[10px] text-white ml-auto" style={{ opacity: 0.5 }}>
                {Object.keys(jurisdictions).length > 0 ? `${new Set(Object.values(jurisdictions).map(j => j.county)).size} County Health Depts` : ''}
              </span>
            </div>
            <div className="space-y-2">
              {LOCATIONS_WITH_SCORES.map(loc => {
                const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
                const score = jieScores[jieLocId];
                const jur = jurisdictions[jieLocId];
                const statusColor = score?.foodSafety?.status === 'passing' ? '#22c55e'
                  : score?.foodSafety?.status === 'failing' ? '#ef4444'
                  : score?.foodSafety?.status === 'at_risk' ? '#f59e0b' : '#6b7280';
                return (
                  <div key={loc.id} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                    <span className="text-xs text-white flex-1 truncate" style={{ opacity: 0.85 }}>{loc.name}</span>
                    <span className="text-[10px] text-white" style={{ opacity: 0.5 }}>
                      {jur?.foodSafety?.agency_name ? jur.foodSafety.agency_name.split(' ').slice(0, 2).join(' ') : ''}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {score?.foodSafety?.gradeDisplay || 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fire Safety */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
              <span className="text-sm font-semibold text-white" style={{ opacity: 0.9 }}>Fire Safety</span>
              <span className="text-[10px] text-white ml-auto" style={{ opacity: 0.5 }}>2025 CFC</span>
            </div>
            <div className="space-y-2">
              {LOCATIONS_WITH_SCORES.map(loc => {
                const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
                const score = jieScores[jieLocId];
                const jur = jurisdictions[jieLocId];
                const isPassing = score?.fireSafety?.status === 'passing';
                return (
                  <div key={loc.id} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isPassing ? '#22c55e' : '#ef4444' }} />
                    <span className="text-xs text-white flex-1 truncate" style={{ opacity: 0.85 }}>{loc.name}</span>
                    <span className="text-[10px] text-white" style={{ opacity: 0.5 }}>
                      {jur?.fireSafety?.agency_name || ''}
                    </span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isPassing ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                      {score?.fireSafety?.grade || 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: GOLD }} />
      </div>

      {/* ============================================================ */}
      {/* CONTENT                                                       */}
      {/* ============================================================ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* Alert Banners (locked) */}
        <AlertBanner alerts={visibleAlerts as AlertBannerItem[]} onDismiss={handleDismissAlert} navigate={navigate} />

        {/* Customizable Widget Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Your Dashboard</h3>
            <button
              type="button"
              onClick={() => setCustomizing(prev => !prev)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                color: customizing ? '#92400e' : NAVY,
                backgroundColor: customizing ? '#fefce8' : '#f1f5f9',
                border: customizing ? `1px solid ${GOLD}` : '1px solid transparent',
              }}
            >
              {customizing ? <CheckCircle2 size={13} /> : <Settings2 size={13} />}
              {customizing ? 'Done Customizing' : 'Customize Dashboard'}
            </button>
          </div>

          {/* Customization instruction banner */}
          {customizing && (
            <div className="mb-4 p-2.5 rounded-lg text-[12px] font-medium text-center"
              style={{ backgroundColor: '#fefce8', border: '1px solid #fde68a', color: '#92400e' }}>
              Reorder with arrows &middot; Click to show/hide
            </div>
          )}

          {/* Widget pills */}
          {customizing && (
            <div className="flex flex-wrap gap-2 mb-4">
              {widgets.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWidget(w.id)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={w.visible ? {
                    backgroundColor: '#fefce8',
                    color: '#92400e',
                    border: `1px solid ${GOLD}`,
                  } : {
                    backgroundColor: '#f9fafb',
                    color: MUTED,
                    border: '1px solid #e5e7eb',
                    textDecoration: 'line-through',
                  }}
                >
                  {w.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  {w.label}
                </button>
              ))}
            </div>
          )}

          {/* Widget grid */}
          <div className="space-y-5">
            {visibleWidgets.map((w, idx) => (
              <div key={w.id} className="relative">
                {customizing && (
                  <div className="absolute -top-1 right-2 z-10 flex items-center gap-0.5 bg-white rounded-lg shadow-sm border border-gray-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => moveWidget(widgets.findIndex(wi => wi.id === w.id), -1)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      disabled={idx === 0}
                    >
                      <ArrowUp size={12} className={idx === 0 ? 'text-gray-200' : 'text-gray-500'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWidget(widgets.findIndex(wi => wi.id === w.id), 1)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      disabled={idx === visibleWidgets.length - 1}
                    >
                      <ArrowDown size={12} className={idx === visibleWidgets.length - 1 ? 'text-gray-200' : 'text-gray-500'} />
                    </button>
                  </div>
                )}
                <div style={customizing ? { border: `2px dashed ${GOLD}`, borderRadius: 16, padding: 2 } : undefined}>
                  {renderWidget(w.id)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer (locked) */}
        <EvidlyFooter />
      </div>

      {/* Strategic Actions Bar (fixed bottom — NOT customizable) */}
      <StrategicActionsBar navigate={navigate} />
    </div>
  );
}
