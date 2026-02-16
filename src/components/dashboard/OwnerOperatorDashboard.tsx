import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Flame, ChevronRight, X, AlertTriangle, ShieldAlert,
  Thermometer, ClipboardList, FileUp, Bot, TrendingUp, TrendingDown,
  CheckCircle2, Hammer, Clock, AlertCircle, CalendarDays, Target,
  Settings2, ArrowUp, ArrowDown, Eye, EyeOff,
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
  DEMO_TREND_DATA,
  DEMO_ATTENTION_ITEMS as EXEC_ATTENTION_ITEMS,
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
const CARD_BG = '#ffffff';
const MUTED = '#94a3b8';
const BODY_TEXT = '#1e293b';

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
// DEMO DATA — Owner/Operator specific
// ================================================================

interface TaskItem {
  id: string;
  label: string;
  status: 'done' | 'in_progress' | 'pending' | 'overdue';
  time: string;
  route: string;
  reading?: string;
}

interface DeadlineItem {
  id: string;
  label: string;
  location: string;
  dueDate: string;
  daysLeft: number;
  severity: 'critical' | 'warning' | 'normal';
  route: string;
}

interface ImpactItem {
  id: string;
  action: string;
  points: number;
  location: string;
  pillar: string;
  severity: 'critical' | 'warning';
  route: string;
}

interface AlertItem {
  id: string;
  severity: 'critical' | 'warning';
  message: string;
  location: string;
  pillar: string;
  actionLabel: string;
  route: string;
}

const DEMO_TASKS: TaskItem[] = [
  { id: 't1', label: 'Opening checklist — Downtown Kitchen', status: 'done', time: '6:15 AM', route: '/checklists', reading: '12/12 items' },
  { id: 't2', label: 'Cooler #1 temperature log', status: 'done', time: '7:02 AM', route: '/temp-logs', reading: '37.8\u00B0F' },
  { id: 't3', label: 'Midday checklist — Downtown Kitchen', status: 'in_progress', time: '4/8 items', route: '/checklists' },
  { id: 't4', label: 'Prep cooler manual temp log', status: 'overdue', time: 'Due by 10 AM', route: '/temp-logs' },
  { id: 't5', label: 'Review incident report #247', status: 'pending', time: 'Due today', route: '/incidents' },
  { id: 't6', label: 'Closing checklist — Downtown Kitchen', status: 'pending', time: 'Due by 10 PM', route: '/checklists' },
];

const DEMO_DEADLINES: DeadlineItem[] = [
  { id: 'd1', label: 'Fire suppression certificate', location: 'University Dining', dueDate: 'Feb 26', daysLeft: 10, severity: 'critical', route: '/documents' },
  { id: 'd2', label: 'Hood cleaning service', location: 'Airport Cafe', dueDate: 'Feb 19', daysLeft: 3, severity: 'critical', route: '/vendors' },
  { id: 'd3', label: 'Food handler cert renewal', location: 'Airport Cafe', dueDate: 'Feb 28', daysLeft: 12, severity: 'warning', route: '/team' },
  { id: 'd4', label: 'Pest control report upload', location: 'Airport Cafe', dueDate: 'Mar 1', daysLeft: 13, severity: 'warning', route: '/documents' },
  { id: 'd5', label: 'Health permit renewal', location: 'Downtown Kitchen', dueDate: 'Apr 10', daysLeft: 53, severity: 'normal', route: '/documents' },
];

const DEMO_IMPACT: ImpactItem[] = [
  { id: 'i1', action: 'Complete 8 missed temperature logs', points: 7, location: 'University Dining', pillar: 'Food Safety', severity: 'critical', route: '/temp-logs?location=university' },
  { id: 'i2', action: 'Schedule overdue hood cleaning', points: 5, location: 'Airport Cafe', pillar: 'Fire Safety', severity: 'critical', route: '/vendors' },
  { id: 'i3', action: 'Upload fire suppression certificate', points: 4, location: 'University Dining', pillar: 'Fire Safety', severity: 'critical', route: '/documents' },
  { id: 'i4', action: 'Complete opening checklists (3 missed)', points: 3, location: 'University Dining', pillar: 'Food Safety', severity: 'warning', route: '/checklists?location=university' },
  { id: 'i5', action: 'Log prep cooler temperature', points: 2, location: 'Downtown Kitchen', pillar: 'Food Safety', severity: 'warning', route: '/temp-logs' },
];

const DEMO_ALERTS: AlertItem[] = [
  { id: 'a1', severity: 'critical', message: 'University Dining score dropped below 70 — would fail inspection', location: 'University Dining', pillar: 'Overall', actionLabel: 'View Details', route: '/dashboard?location=university' },
  { id: 'a2', severity: 'warning', message: '3 out-of-range temperature readings this week', location: 'Airport Cafe', pillar: 'Food Safety', actionLabel: 'View Temp Log', route: '/temp-logs?location=airport' },
  { id: 'a3', severity: 'warning', message: 'Walk-in cooler trending warm — schedule service', location: 'Airport Cafe', pillar: 'Fire Safety', actionLabel: 'Schedule', route: '/equipment' },
];

// Generate trend data for 7d / 30d / 90d
function generateTrendData(days: number) {
  if (days <= 30) {
    const d = DEMO_TREND_DATA;
    if (days === 7) return d.slice(-7);
    return d;
  }
  // 90-day: extend backwards with lower scores
  const base = DEMO_TREND_DATA;
  const extra: typeof base = [];
  for (let i = 60; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - (29 + i));
    const foodBase = 74 + Math.floor(i / 12);
    const fireBase = 68 + Math.floor(i / 15);
    const f = foodBase - (i % 3);
    const fr = fireBase - (i % 4);
    extra.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      overall: Math.round(f * 0.6 + fr * 0.4),
      foodSafety: f,
      fireSafety: fr,
    });
  }
  return [...extra, ...base];
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
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function scoreColor(s: number): string {
  return getLocationScoreColor(s);
}

// ================================================================
// SCORE RING — DARK BG (header)
// ================================================================

function ScoreRing({ score, size = 110, stroke = 8, fontSize = 44, onClick }: {
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
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          style={{
            '--circ': `${C}`, '--off': `${off}`,
            strokeDasharray: C, strokeDashoffset: off,
            animation: 'ringDraw 1s ease-out 0.3s both',
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-white" style={{ fontSize, letterSpacing: '-1px' }}>{score}</span>
      </div>
      {onClick && (
        <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-white/20 transition-colors" />
      )}
    </button>
  );
}

// ================================================================
// SCORE RING — LIGHT BG (location cards)
// ================================================================

function ScoreRingLight({ score, size = 70, stroke = 5, fontSize = 24 }: {
  score: number; size?: number; stroke?: number; fontSize?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const off = C - (score / 100) * C;
  const c = scoreColor(score);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={c} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold" style={{ fontSize, color: c }}>{score}</span>
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
    title = 'Organization Breakdown';
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
          const opsScore = calcPillar({ ops: pillarData.ops, docs: 0 }, 1, 0);
          const docsScore = calcPillar({ ops: 0, docs: pillarData.docs }, 0, 1);
          return (
            <div key={loc.id} className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold" style={{ color: BODY_TEXT }}>{loc.name}</p>
                <span className="text-lg font-bold" style={{ color: scoreColor(pillarScore) }}>{pillarScore}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded bg-white">
                  <p className="text-xs text-gray-500 mb-1">Operations</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: scoreColor(opsScore) }}>{opsScore}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${opsScore}%`, backgroundColor: scoreColor(opsScore) }} />
                    </div>
                  </div>
                </div>
                <div className="p-2 rounded bg-white">
                  <p className="text-xs text-gray-500 mb-1">Documentation</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: scoreColor(docsScore) }}>{docsScore}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${docsScore}%`, backgroundColor: scoreColor(docsScore) }} />
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
    title = `${loc.name} — ${isFood ? 'Food Safety' : 'Fire Safety'}`;

    const opsItems = isFood
      ? ['Temperature logging', 'Daily checklists', 'Incident response', 'HACCP monitoring']
      : ['Hood cleaning', 'Fire suppression', 'Fire extinguisher', 'Equipment maintenance'];
    const docsItems = isFood
      ? ['Food handler certifications', 'Health permits', 'HACCP plans', 'Training records']
      : ['Fire suppression certificates', 'Insurance COIs', 'Inspection reports', 'Service contracts'];

    content = (
      <div className="space-y-4">
        <div className="text-center mb-4">
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
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeInUp 0.25s ease-out' }}
      >
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white rounded-t-xl z-10">
          <h3 className="text-base font-semibold" style={{ color: BODY_TEXT }}>{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="p-4">{content}</div>
      </div>
    </div>
  );
}

// ================================================================
// HEADER PILLAR CARD
// ================================================================

function HeaderPillarCard({ icon, label, score, onClick }: {
  icon: React.ReactNode; label: string; score: number; onClick: () => void;
}) {
  const barColor = score >= 85 ? '#16a34a' : score >= 70 ? '#d97706' : '#dc2626';
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl p-4 transition-all group"
      style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        width: 180,
        textAlign: 'center',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.14)';
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
      <div className="text-[32px] font-extrabold text-white leading-none mb-2">{score}</div>
      <div className="h-[3px] rounded-full overflow-hidden mx-4" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: barColor }} />
      </div>
    </button>
  );
}

// ================================================================
// ALERT BANNERS
// ================================================================

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
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
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
// LOCATION CARD
// ================================================================

function LocationCardNew({ loc, onPillarClick, onViewDetails }: {
  loc: typeof LOCATIONS_WITH_SCORES[0];
  onPillarClick: (locationId: string, pillar: 'food' | 'fire') => void;
  onViewDetails: (locationId: string) => void;
}) {
  const statusLabel = getLocationStatusLabel(loc.score);
  const statusColor = scoreColor(loc.score);
  const trend = loc.trend;

  return (
    <div
      className="bg-white rounded-xl p-5 transition-all hover:shadow-lg group"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }}
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
        <h4 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>{loc.name}</h4>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: statusColor + '18', color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      {/* Score Ring */}
      <div className="flex justify-center mb-3">
        <ScoreRingLight score={loc.score} />
      </div>

      {/* Trend */}
      <div className="flex items-center justify-center gap-1 mb-4 text-xs">
        {trend > 0 ? <TrendingUp size={12} className="text-green-500" /> : trend < 0 ? <TrendingDown size={12} className="text-red-500" /> : null}
        <span style={{ color: trend > 0 ? '#16a34a' : trend < 0 ? '#dc2626' : MUTED }}>
          {trend > 0 ? '+' : ''}{trend} pts
        </span>
      </div>

      {/* Pillar Rows */}
      <div className="space-y-2">
        {([
          { key: 'food' as const, icon: <UtensilsCrossed size={14} />, label: 'Food Safety', score: loc.foodScore },
          { key: 'fire' as const, icon: <Flame size={14} />, label: 'Fire Safety', score: loc.fireScore },
        ]).map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPillarClick(loc.id, p.key)}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <span style={{ color: MUTED }}>{p.icon}</span>
            <span className="text-[13px] text-gray-700 flex-1">{p.label}</span>
            <span className="text-sm font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</span>
            <ChevronRight size={14} className="text-gray-300" />
          </button>
        ))}
        {/* Progress bars below pillar rows */}
        <div className="grid grid-cols-2 gap-2 px-2">
          {([loc.foodScore, loc.fireScore]).map((s, i) => (
            <div key={i} className="h-1.5 rounded-full overflow-hidden bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${s}%`, backgroundColor: scoreColor(s) }} />
            </div>
          ))}
        </div>
      </div>

      {/* View Details */}
      <button
        type="button"
        onClick={() => onViewDetails(loc.id)}
        className="w-full text-center text-xs font-medium mt-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        style={{ color: NAVY }}
      >
        View Details &rarr;
      </button>
    </div>
  );
}

// ================================================================
// FILTER TABS
// ================================================================

type DashboardFilter = 'all' | 'attention' | 'critical';

function FilterTabs({ value, onChange, total, attentionCount, criticalCount }: {
  value: DashboardFilter;
  onChange: (f: DashboardFilter) => void;
  total: number;
  attentionCount: number;
  criticalCount: number;
}) {
  const tabs: { key: DashboardFilter; label: string }[] = [
    { key: 'all', label: `All Locations (${total})` },
    { key: 'attention', label: `Needs Attention (${attentionCount})` },
    { key: 'critical', label: `Critical (${criticalCount})` },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {tabs.map(tab => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: active ? '#eef4f8' : undefined,
              color: active ? '#1e4d6b' : '#6b7280',
              border: active ? '1px solid #1e4d6b' : '1px solid #e5e7eb',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ================================================================
// WIDGET: TODAY'S TASKS
// ================================================================

function WidgetTasks({ navigate }: { navigate: (path: string) => void }) {
  const done = DEMO_TASKS.filter(t => t.status === 'done').length;
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Today's Tasks</h4>
        <span className="text-xs font-medium" style={{ color: NAVY }}>{done}/{DEMO_TASKS.length} complete</span>
      </div>
      <div className="space-y-1.5">
        {DEMO_TASKS.map(task => {
          const isOverdue = task.status === 'overdue';
          const isDone = task.status === 'done';
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => navigate(task.route)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors hover:bg-gray-50"
              style={isOverdue ? { backgroundColor: '#fef2f2', border: '1px solid #fecaca' } : undefined}
            >
              {isDone && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
              {task.status === 'in_progress' && <Hammer size={16} className="shrink-0" style={{ color: GOLD }} />}
              {task.status === 'pending' && <Clock size={16} className="text-gray-300 shrink-0" />}
              {isOverdue && <AlertCircle size={16} className="text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {task.label}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-[11px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>{task.time}</p>
                {task.reading && <p className="text-[10px] text-gray-400">{task.reading}</p>}
              </div>
              <ChevronRight size={12} className="text-gray-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// WIDGET: UPCOMING DEADLINES
// ================================================================

function WidgetDeadlines({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Upcoming Deadlines</h4>
        <CalendarDays size={14} className="text-gray-400" />
      </div>
      <div className="space-y-1.5">
        {DEMO_DEADLINES.map(dl => {
          const bg = dl.severity === 'critical' ? '#fef2f2' : dl.severity === 'warning' ? '#fffbeb' : undefined;
          const borderColor = dl.severity === 'critical' ? '#fecaca' : dl.severity === 'warning' ? '#fde68a' : '#e5e7eb';
          return (
            <button
              key={dl.id}
              type="button"
              onClick={() => navigate(dl.route)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors hover:opacity-90"
              style={{ backgroundColor: bg, border: `1px solid ${borderColor}` }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-800">{dl.label}</p>
                <p className="text-[11px] text-gray-500">{dl.location}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-medium text-gray-600">{dl.dueDate}</p>
                <p className={`text-[10px] font-semibold ${
                  dl.severity === 'critical' ? 'text-red-600' : dl.severity === 'warning' ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  {dl.daysLeft}d left
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// WIDGET: SCORE IMPACT
// ================================================================

function WidgetScoreImpact({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Score Impact</h4>
        <p className="text-[11px] text-gray-400 mt-0.5">Actions ranked by impact on Inspection Readiness</p>
      </div>
      <div className="space-y-2">
        {DEMO_IMPACT.map(item => {
          const isCritical = item.severity === 'critical';
          const borderColor = isCritical ? '#dc2626' : '#d97706';
          const bgColor = isCritical ? '#fef2f2' : '#fffbeb';
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ borderLeft: `3px solid ${borderColor}`, backgroundColor: bgColor }}
            >
              <div
                className="shrink-0 flex items-center justify-center rounded-md text-xs font-bold text-white"
                style={{ width: 36, height: 28, backgroundColor: borderColor }}
              >
                +{item.points}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-800">{item.action}</p>
                <p className="text-[11px] text-gray-500">{item.location} &middot; {item.pillar}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(item.route)}
                className="text-xs font-medium shrink-0 hover:underline"
                style={{ color: NAVY }}
              >
                Do It &rarr;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// WIDGET: COMPLIANCE TREND
// ================================================================

function WidgetTrend() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const data = useMemo(() => generateTrendData(range), [range]);

  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Compliance Trend</h4>
        <div className="flex items-center gap-1">
          {([7, 30, 90] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setRange(d)}
              className="px-2 py-1 text-[11px] font-medium rounded transition-colors"
              style={{
                backgroundColor: range === d ? '#eef4f8' : undefined,
                color: range === d ? '#1e4d6b' : '#94a3b8',
                border: range === d ? '1px solid #1e4d6b' : '1px solid transparent',
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 text-[11px]">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: GOLD, display: 'inline-block' }} /> Overall</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: '#16a34a', display: 'inline-block' }} /> Food Safety</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: '#ea580c', display: 'inline-block' }} /> Fire Safety</span>
      </div>

      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.25} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false}
              interval={range === 7 ? 0 : range === 30 ? 4 : 14} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#0d2847', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
              labelStyle={{ color: '#94a3b8', fontSize: 11 }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="overall" stroke={GOLD} strokeWidth={2.5} fill="url(#goldGrad)" dot={false} />
            <Line type="monotone" dataKey="foodSafety" stroke="#16a34a" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="fireSafety" stroke="#ea580c" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
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

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'tasks', label: 'Today\'s Tasks', icon: <ClipboardList size={14} />, visible: true },
  { id: 'deadlines', label: 'Upcoming Deadlines', icon: <CalendarDays size={14} />, visible: true },
  { id: 'impact', label: 'Score Impact', icon: <Target size={14} />, visible: true },
  { id: 'trend', label: 'Compliance Trend', icon: <TrendingUp size={14} />, visible: true },
];

// ================================================================
// QUICK ACTIONS BAR
// ================================================================

function QuickActionsBar({ navigate }: { navigate: (path: string) => void }) {
  const actions = [
    { icon: <Thermometer size={16} />, label: 'Log Temp', route: '/temp-logs' },
    { icon: <ClipboardList size={16} />, label: 'Checklist', route: '/checklists' },
    { icon: <FileUp size={16} />, label: 'Upload Doc', route: '/documents' },
    { icon: <Bot size={16} />, label: 'AI Advisor', route: '/compliance-copilot' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2 sm:gap-4 px-4"
      style={{
        height: 56,
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {actions.map(a => (
        <button
          key={a.label}
          type="button"
          onClick={() => navigate(a.route)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] transition-colors"
          style={{ color: '#6b7280', backgroundColor: '#f9fafb' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = GOLD;
            (e.currentTarget as HTMLElement).style.backgroundColor = '#fefce8';
            (e.currentTarget as HTMLElement).style.border = `1px solid ${GOLD}`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
            (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb';
            (e.currentTarget as HTMLElement).style.border = '1px solid transparent';
          }}
        >
          {a.icon}
          <span className="hidden sm:inline">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

// ================================================================
// EVIDLY FOOTER
// ================================================================

function EvidlyFooter() {
  return (
    <div className="flex items-center justify-center gap-2 py-6 mt-6" style={{ borderTop: '1px solid #eef1f5' }}>
      <span className="text-sm font-bold">
        <span style={{ color: GOLD }}>E</span>
        <span style={{ color: NAVY }}>vid</span>
        <span style={{ color: GOLD }}>LY</span>
      </span>
      <span className="text-xs text-gray-400">Compliance Simplified</span>
    </div>
  );
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function OwnerOperatorDashboard() {
  const navigate = useNavigate();
  const { companyName } = useDemo();

  // Drill-down modal
  const [modal, setModal] = useState<ModalType | null>(null);

  // Dismissed alerts (session-only)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const visibleAlerts = DEMO_ALERTS.filter(a => !dismissedAlerts.has(a.id));
  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  }, []);

  // Location filter
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const locs = LOCATIONS_WITH_SCORES;

  const attentionCount = locs.filter(l => l.score < 85 && l.score >= 70).length;
  const criticalCount = locs.filter(l => l.score < 70).length;

  const filteredLocations = useMemo(() => {
    switch (filter) {
      case 'attention': return locs.filter(l => l.score < 85 && l.score >= 70);
      case 'critical': return locs.filter(l => l.score < 70);
      default: return locs;
    }
  }, [locs, filter]);

  // Widget customization
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
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

  // Multi-location check
  const isMultiLocation = locs.length > 1;

  const renderWidget = (wid: string) => {
    switch (wid) {
      case 'tasks': return <WidgetTasks navigate={navigate} />;
      case 'deadlines': return <WidgetDeadlines navigate={navigate} />;
      case 'impact': return <WidgetScoreImpact navigate={navigate} />;
      case 'trend': return <WidgetTrend />;
      default: return null;
    }
  };

  return (
    <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{KEYFRAMES}</style>

      {/* ============================================================ */}
      {/* DARK NAVY HEADER                                             */}
      {/* ============================================================ */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d2847 0%, #1a3d6d 50%, #0d2847 100%)',
          padding: '20px 24px 40px',
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
              <span className="text-[22px] font-bold" style={{ color: GOLD }}>E</span>
              <span className="text-[22px] font-bold text-white">vid</span>
              <span className="text-[22px] font-bold" style={{ color: GOLD }}>LY</span>
            </div>
            <p className="text-[9px] uppercase text-white mt-0.5" style={{ opacity: 0.45, letterSpacing: '0.12em' }}>
              Compliance Simplified
            </p>
          </div>

          <div className="w-px self-stretch" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />

          <div className="flex-1 min-w-0">
            <p className="text-white text-base font-medium">{getGreeting()}, James.</p>
            <p className="text-blue-200 text-xs mt-0.5" style={{ opacity: 0.7 }}>{getFormattedDate()}</p>
          </div>

          <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="text-white font-semibold text-sm">{companyName || DEMO_ORG.name}</p>
            <p className="text-blue-200 text-xs mt-0.5" style={{ opacity: 0.7 }}>
              {DEMO_ORG.locationCount} locations &middot; CA
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
            <p className="text-[10px] uppercase text-white mt-2" style={{ letterSpacing: '0.1em', opacity: 0.5 }}>
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* Alert Banners */}
        <AlertBanners alerts={visibleAlerts} onDismiss={handleDismissAlert} navigate={navigate} />

        {/* Location Cards — only if multi-location */}
        {isMultiLocation && (
          <div style={stagger(3)}>
            <div className="flex items-center justify-between mb-3">
              <FilterTabs
                value={filter}
                onChange={setFilter}
                total={locs.length}
                attentionCount={attentionCount}
                criticalCount={criticalCount}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.map(loc => (
                <LocationCardNew
                  key={loc.id}
                  loc={loc}
                  onPillarClick={(locId, pillar) => setModal({ kind: 'location-pillar', locationId: locId, pillar })}
                  onViewDetails={(locId) => navigate(`/dashboard?location=${locId}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Customizable Widgets */}
        <div style={stagger(4)}>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleWidgets.map((w, idx) => (
              <div key={w.id} className="relative">
                {customizing && (
                  <div
                    className="absolute -top-1 -right-1 z-10 flex items-center gap-0.5 bg-white rounded-lg shadow-sm border border-gray-200 p-0.5"
                  >
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

        {/* Footer */}
        <EvidlyFooter />
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar navigate={navigate} />

      {/* Drill-Down Modal */}
      {modal && <DrillDownModal modal={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
