import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Flame, ChevronRight, X, AlertTriangle, ShieldAlert,
  Thermometer, ClipboardList,
  CheckCircle2, BarChart3, LineChart as LineChartIcon, Shield,
  Settings2, ArrowUp, ArrowDown, Eye, EyeOff, Users, AlertCircle, FileText,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import {
  LOCATIONS_WITH_SCORES,
  DEMO_ORG,
  DEMO_ORG_SCORES,
  DEMO_WEEKLY_ACTIVITY,
  DEMO_ATTENTION_ITEMS,
  DEMO_TREND_DATA,
  calcPillar,
  getLocationScoreColor,
  getLocationStatusLabel,
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

function scoreColor(s: number): string {
  return getLocationScoreColor(s);
}

// ================================================================
// SCORE RING — DARK BG (header, 120px)
// ================================================================

function ScoreRing({ score, size = 120, stroke = 8, fontSize = 40, onClick }: {
  score: number; size?: number; stroke?: number; fontSize?: number; onClick?: () => void;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const off = C - (score / 100) * C;
  const color = score >= 85 ? GOLD : score >= 70 ? '#d97706' : '#dc2626';

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group"
      style={{ width: size, height: size, cursor: onClick ? 'pointer' : 'default' }}
      title={onClick ? 'View org-wide breakdown' : undefined}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          style={{
            '--circ': `${C}`, '--off': `${off}`,
            strokeDasharray: C, strokeDashoffset: off,
            animation: 'ringDraw 1s ease-out 0.3s both',
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white" style={{ fontSize, fontWeight: 800, letterSpacing: '-1px' }}>{score}</span>
      </div>
      {onClick && (
        <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-white/20 transition-colors" />
      )}
    </button>
  );
}

// ================================================================
// SCORE RING — LIGHT BG (location cards, 80px)
// ================================================================

function ScoreRingLight({ score, size = 80, stroke = 6, fontSize = 24 }: {
  score: number; size?: number; stroke?: number; fontSize?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const off = C - (score / 100) * C;
  const c = scoreColor(score);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={c} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize, fontWeight: 700, color: c }}>{score}</span>
      </div>
    </div>
  );
}

// ================================================================
// DRILL-DOWN MODALS
// ================================================================

type ModalType =
  | { kind: 'org-overall' }
  | { kind: 'org-pillar'; pillar: 'food' | 'fire' }
  | { kind: 'location-pillar'; locationId: string; pillar: 'food' | 'fire' };

function DrillDownModal({ modal, onClose }: { modal: ModalType; onClose: () => void }) {
  const locs = LOCATIONS_WITH_SCORES;

  let title = '';
  let content: React.ReactNode = null;

  if (modal.kind === 'org-overall') {
    title = 'Inspection Readiness — All Locations';
    content = (
      <div className="space-y-4">
        {locs.map(loc => (
          <div key={loc.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
            <ScoreRingLight score={loc.score} size={56} stroke={4} fontSize={18} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: BODY_TEXT }}>{loc.name}</p>
              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                <span>Food Safety: <strong style={{ color: scoreColor(loc.foodScore) }}>{loc.foodScore}</strong></span>
                <span>Fire Safety: <strong style={{ color: scoreColor(loc.fireScore) }}>{loc.fireScore}</strong></span>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full"
              style={{ backgroundColor: scoreColor(loc.score) + '18', color: scoreColor(loc.score) }}>
              {getLocationStatusLabel(loc.score)}
            </span>
          </div>
        ))}
      </div>
    );
  } else if (modal.kind === 'org-pillar') {
    const isFood = modal.pillar === 'food';
    title = isFood ? 'Food Safety — All Locations' : 'Fire Safety — All Locations';
    content = (
      <div className="space-y-4">
        {locs.map(loc => {
          const pillarData = isFood ? loc.foodSafety : loc.fireSafety;
          const pillarScore = isFood ? loc.foodScore : loc.fireScore;
          return (
            <div key={loc.id} className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold" style={{ color: BODY_TEXT }}>{loc.name}</p>
                <span className="text-lg font-bold" style={{ color: scoreColor(pillarScore) }}>{pillarScore}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-3">
                <div className="h-full rounded-full" style={{ width: `${pillarScore}%`, backgroundColor: scoreColor(pillarScore) }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded bg-white">
                  <p className="text-xs text-gray-500 mb-1">Operations</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: scoreColor(pillarData.ops) }}>{pillarData.ops}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pillarData.ops}%`, backgroundColor: scoreColor(pillarData.ops) }} />
                    </div>
                  </div>
                </div>
                <div className="p-2 rounded bg-white">
                  <p className="text-xs text-gray-500 mb-1">Documentation</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: scoreColor(pillarData.docs) }}>{pillarData.docs}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pillarData.docs}%`, backgroundColor: scoreColor(pillarData.docs) }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  } else if (modal.kind === 'location-pillar') {
    const loc = locs.find(l => l.id === modal.locationId) || locs[0];
    const isFood = modal.pillar === 'food';
    const pillarData = isFood ? loc.foodSafety : loc.fireSafety;
    const pillarScore = isFood ? loc.foodScore : loc.fireScore;
    const pillarIcon = isFood ? '\uD83C\uDF7D\uFE0F' : '\uD83D\uDD25';
    title = `${pillarIcon} ${isFood ? 'Food Safety' : 'Fire Safety'} — ${loc.name}`;

    const opsItems = isFood
      ? ['Temperature logging compliance', 'Daily checklists completion', 'Incident response time', 'HACCP monitoring']
      : ['Hood cleaning schedule', 'Fire suppression system', 'Fire extinguisher inspections', 'Equipment maintenance'];
    const docsItems = isFood
      ? ['Food handler certifications', 'Health permits', 'HACCP plans', 'Training records']
      : ['Fire suppression certificates', 'Insurance COIs', 'Inspection reports', 'Service contracts'];

    content = (
      <div className="space-y-4">
        <div className="text-center mb-2">
          <span className="text-4xl font-bold" style={{ color: scoreColor(pillarScore) }}>{pillarScore}</span>
          <p className="text-xs text-gray-500 mt-1">{isFood ? 'Food Safety' : 'Fire Safety'} Score</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Operations</p>
              <span className="text-lg font-bold" style={{ color: scoreColor(pillarData.ops) }}>{pillarData.ops}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-3">
              <div className="h-full rounded-full" style={{ width: `${pillarData.ops}%`, backgroundColor: scoreColor(pillarData.ops) }} />
            </div>
            <ul className="space-y-1.5">
              {opsItems.map((item, i) => (
                <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Documentation</p>
              <span className="text-lg font-bold" style={{ color: scoreColor(pillarData.docs) }}>{pillarData.docs}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-3">
              <div className="h-full rounded-full" style={{ width: `${pillarData.docs}%`, backgroundColor: scoreColor(pillarData.docs) }} />
            </div>
            <ul className="space-y-1.5">
              {docsItems.map((item, i) => (
                <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[500px] max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeInUp 0.25s ease-out' }}
      >
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white rounded-t-2xl z-10">
          <h3 className="text-base font-semibold" style={{ color: BODY_TEXT }}>{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="p-4">{content}</div>
      </div>
    </div>
  );
}

// ================================================================
// HEADER PILLAR CARD (clickable)
// ================================================================

function HeaderPillarCard({ icon, label, score, onClick }: {
  icon: React.ReactNode; label: string; score: number; onClick: () => void;
}) {
  const barColor = score >= 85 ? '#16a34a' : score >= 70 ? '#d97706' : '#dc2626';
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl p-4 transition-all"
      style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        width: 180,
        textAlign: 'center',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.12)';
        (e.currentTarget as HTMLElement).style.borderColor = GOLD + '40';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
      }}
    >
      <div className="flex items-center justify-center gap-1.5 mb-2">
        {icon}
        <span className="text-[13px] text-white" style={{ opacity: 0.7 }}>{label}</span>
      </div>
      <div className="text-white leading-none mb-2" style={{ fontSize: 32, fontWeight: 800 }}>{score}</div>
      <div className="h-[3px] rounded-full overflow-hidden mx-4" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: barColor }} />
      </div>
    </button>
  );
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

function AlertBanners({ alerts, onDismiss, navigate }: {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
  navigate: (path: string) => void;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2" style={{ animation: 'slideDown 0.3s ease-out' }}>
      {alerts.map(alert => {
        const isCritical = alert.severity === 'critical';
        return (
          <div
            key={alert.id}
            className="flex items-center gap-3 px-4 py-3 rounded-[10px]"
            style={{
              backgroundColor: isCritical ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${isCritical ? '#fecaca' : '#fde68a'}`,
            }}
          >
            {isCritical
              ? <ShieldAlert size={18} className="text-red-500 shrink-0" />
              : <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: isCritical ? '#991b1b' : '#92400e' }}>
                {alert.message}
              </p>
              <p className="text-[11px] text-gray-500">{alert.location} &middot; {alert.pillar}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(alert.route)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md text-white shrink-0"
              style={{ backgroundColor: isCritical ? '#dc2626' : '#d97706' }}
            >
              {alert.actionLabel}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              className="p-1 rounded hover:bg-black/5 shrink-0 transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

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
// WIDGET: Location Performance
// ================================================================

function WidgetLocations({ onPillarClick, navigate }: {
  onPillarClick: (locationId: string, pillar: 'food' | 'fire') => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Location Performance</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {LOCATIONS_WITH_SCORES.map(loc => {
          const statusLabel = getLocationStatusLabel(loc.score);
          const c = scoreColor(loc.score);
          const trendSign = loc.trend >= 0 ? '+' : '';
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
              {/* Name + Status */}
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-bold" style={{ color: BODY_TEXT }}>{loc.name}</h5>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: c + '18', color: c }}>
                  {statusLabel}
                </span>
              </div>

              {/* Score Ring */}
              <div className="flex flex-col items-center mb-3">
                <ScoreRingLight score={loc.score} />
                <p className="text-xs text-gray-400 mt-2">{trendSign}{loc.trend} vs last week</p>
              </div>

              {/* Two pillar rows — clickable */}
              <div className="space-y-1.5 mb-3">
                {([
                  { key: 'food' as const, icon: <UtensilsCrossed size={14} />, label: 'Food Safety', score: loc.foodScore },
                  { key: 'fire' as const, icon: <Flame size={14} />, label: 'Fire Safety', score: loc.fireScore },
                ]).map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => onPillarClick(loc.id, p.key)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <span style={{ color: MUTED }}>{p.icon}</span>
                    <span className="text-[13px] text-gray-700 flex-1">{p.label}</span>
                    <span className="text-sm font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </button>
                ))}
                <div className="grid grid-cols-2 gap-2 px-2 pt-1">
                  {[loc.foodScore, loc.fireScore].map((s, i) => (
                    <div key={i} className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${s}%`, backgroundColor: scoreColor(s) }} />
                    </div>
                  ))}
                </div>
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

function WidgetTrendAttention({ navigate }: { navigate: (path: string) => void }) {
  const trendData = useMemo(() => DEMO_TREND_DATA, []);

  const allLocations = LOCATIONS_WITH_SCORES.map(loc => ({
    ...loc,
    statusType: loc.score >= 85 ? 'good' as const : loc.score >= 70 ? 'attention' as const : 'critical' as const,
    description: loc.score < 70
      ? 'Score below 70. 3 equipment inspections overdue. Fire suppression certificate expires in 12 days.'
      : loc.score < 85
        ? '3 out-of-range temperature readings this week. Walk-in cooler trending warm.'
        : 'All pillars above threshold. Operations running smoothly.',
    actionLabel: loc.score < 70 ? 'Take Action' : loc.score < 85 ? 'View Details' : '',
    route: loc.score < 85 ? `/dashboard?location=${loc.id}` : '',
  })).sort((a, b) => a.score - b.score);

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Trend & Attention</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Trend Chart */}
        <div>
          <p className="text-[11px] font-medium text-gray-500 mb-3">Inspection Readiness — 30 Days</p>
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
                  formatter={(v: number, name: string) => {
                    const labels: Record<string, string> = { overall: 'Overall', foodSafety: 'Food Safety', fireSafety: 'Fire Safety' };
                    return [String(v), labels[name] || name];
                  }}
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
                      {loc.score}
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
  { id: 'locations', label: 'Location Performance', icon: <Users size={14} />, visible: true },
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
  const { companyName } = useDemo();

  // Drill-down modal
  const [modal, setModal] = useState<ModalType | null>(null);

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
      case 'locations': return <WidgetLocations onPillarClick={(locId, pillar) => setModal({ kind: 'location-pillar', locationId: locId, pillar })} navigate={navigate} />;
      case 'trendAttention': return <WidgetTrendAttention navigate={navigate} />;
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
          background: 'linear-gradient(135deg, #0d2847 0%, #1a3d6d 50%, #0d2847 100%)',
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

        {/* Center: Score Ring + Pillar Cards */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10" style={stagger(1)}>
          <div className="flex flex-col items-center">
            <ScoreRing
              score={DEMO_ORG_SCORES.overall}
              onClick={() => setModal({ kind: 'org-overall' })}
            />
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-sm" style={{ color: '#22c55e' }}>&uarr;</span>
              <span className="text-sm text-blue-100">2.3 vs last week</span>
            </div>
            <p className="text-[10px] uppercase text-white mt-1" style={{ letterSpacing: '0.1em', opacity: 0.5 }}>
              Inspection Readiness
            </p>
          </div>

          <div className="flex gap-3" style={stagger(2)}>
            <HeaderPillarCard
              icon={<UtensilsCrossed size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />}
              label="Food Safety"
              score={DEMO_ORG_SCORES.foodSafety}
              onClick={() => setModal({ kind: 'org-pillar', pillar: 'food' })}
            />
            <HeaderPillarCard
              icon={<Flame size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />}
              label="Fire Safety"
              score={DEMO_ORG_SCORES.fireSafety}
              onClick={() => setModal({ kind: 'org-pillar', pillar: 'fire' })}
            />
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
        <AlertBanners alerts={visibleAlerts} onDismiss={handleDismissAlert} navigate={navigate} />

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

      {/* Drill-Down Modal */}
      {modal && <DrillDownModal modal={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
