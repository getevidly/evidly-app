import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Flame, ChevronRight, AlertTriangle, ShieldAlert,
  Thermometer, ClipboardList, FileUp, Bot, TrendingUp,
  CheckCircle2, Hammer, Clock, AlertCircle, CalendarDays, Target,
  Settings2, ArrowUp, ArrowDown, Eye, EyeOff, Wrench, Shield,
  GraduationCap, Activity, LayoutGrid,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { DEMO_ORG } from '../../data/demoData';
import {
  useDashboardData,
  type TaskItem,
  type DeadlineItem,
  type ImpactItem,
  type AlertItem as HookAlertItem,
  type LocationWithScores,
  type ModuleStatus,
} from '../../hooks/useDashboardData';
import type { ActivityItem } from '../../lib/dashboardQueries';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import type { LocationScore, LocationJurisdiction } from '../../types/jurisdiction';

// ================================================================
// CONSTANTS
// ================================================================

const GOLD = '#C49A2B';
const NAVY = '#163a5f';
const PAGE_BG = '#f4f6f9';
const MUTED = '#94a3b8';
const BODY_TEXT = '#1e293b';

const FONT: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// Maps dashboard location IDs -> JIE dual-authority location IDs
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
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function stagger(i: number): React.CSSProperties {
  return { animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both` };
}

// Generate trend data for 7d / 30d / 90d
function generateTrendData(days: number, trendData: { date: string; overall: number; foodSafety: number; fireSafety: number }[]) {
  if (days <= 30) {
    if (days === 7) return trendData.slice(-7);
    return trendData;
  }
  // 90-day: extend backwards with lower scores
  const base = trendData;
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
      overall: Math.round((f + fr) / 2),
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

function statusColor(status: 'passing' | 'failing' | 'at_risk' | 'unknown'): string {
  switch (status) {
    case 'passing': return '#16a34a';
    case 'failing': return '#dc2626';
    case 'at_risk': return '#d97706';
    default: return '#94a3b8';
  }
}

function gradingTypeLabel(gradingType: string | null): string {
  if (!gradingType) return '';
  switch (gradingType) {
    case 'pass_reinspect': return 'CalCode Pass/Reinspect';
    case 'three_tier_rating': return 'Three-Tier Rating';
    case 'violation_based': return 'CalCode Violation-Based';
    case 'letter_grade': return 'Letter Grade';
    default: return gradingType;
  }
}

// ================================================================
// ALERT BANNERS
// ================================================================

function AlertBanners({ alerts, onDismiss, navigate }: {
  alerts: HookAlertItem[];
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
              <span className="text-gray-400 text-sm">&times;</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ================================================================
// LOCATION CARD — JURISDICTION-NATIVE
// ================================================================

function LocationCardJurisdiction({ loc, jieScore, jurisdictionData, onViewDetails }: {
  loc: LocationWithScores;
  jieScore: LocationScore | null;
  jurisdictionData: LocationJurisdiction | null;
  onViewDetails: (id: string) => void;
}) {
  const foodStatus = jieScore?.foodSafety?.status ?? 'unknown';
  const fireStatus = jieScore?.fireSafety?.status ?? 'unknown';
  const foodGradeDisplay = jieScore?.foodSafety?.gradeDisplay ?? 'Not assessed';
  const fireGradeDisplay = jieScore?.fireSafety?.gradeDisplay ?? 'Not assessed';
  const foodGradingType = jurisdictionData?.foodSafety?.grading_type ?? null;
  const fireAHJName = jurisdictionData?.fireSafety?.agency_name ?? 'Fire AHJ';
  const county = jurisdictionData?.county ?? '';

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
      {/* Name + County badge */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>{loc.name}</h4>
        {county && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
            {county}
          </span>
        )}
      </div>

      {/* Food Safety row */}
      <div
        className="p-3 rounded-lg mb-3"
        style={{ borderLeft: `3px solid ${statusColor(foodStatus)}`, backgroundColor: '#fafafa' }}
      >
        <div className="flex items-start gap-2">
          <UtensilsCrossed size={14} style={{ color: statusColor(foodStatus), marginTop: 2, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{foodGradeDisplay}</p>
            {jieScore?.foodSafety?.details?.summary && (
              <p className="text-[11px] text-gray-500 mt-0.5">{jieScore.foodSafety.details.summary}</p>
            )}
            {foodGradingType && (
              <p className="text-[10px] mt-1" style={{ color: MUTED }}>{gradingTypeLabel(foodGradingType)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Fire Safety row */}
      <div
        className="p-3 rounded-lg mb-4"
        style={{ backgroundColor: '#f8f8f8' }}
      >
        <div className="flex items-start gap-2">
          <Flame size={14} style={{ color: '#ea580c', marginTop: 2, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{fireGradeDisplay}</p>
              {fireStatus === 'passing' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>Pass</span>
              )}
              {fireStatus === 'failing' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>Fail</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">{fireAHJName}</p>
          </div>
        </div>
      </div>

      {/* View Details */}
      <button
        type="button"
        onClick={() => onViewDetails(loc.id)}
        className="w-full text-center text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
        style={{ color: NAVY }}
      >
        View Details &rarr;
      </button>
    </div>
  );
}

// ================================================================
// WIDGET: TODAY'S TASKS
// ================================================================

function WidgetTasks({ navigate, tasks }: { navigate: (path: string) => void; tasks: TaskItem[] }) {
  const done = tasks.filter(t => t.status === 'done').length;
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Today's Tasks</h4>
        <span className="text-xs font-medium" style={{ color: NAVY }}>{done}/{tasks.length} complete</span>
      </div>
      <div className="space-y-1.5">
        {tasks.map(task => {
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

function WidgetDeadlines({ navigate, deadlines }: { navigate: (path: string) => void; deadlines: DeadlineItem[] }) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Upcoming Deadlines</h4>
        <CalendarDays size={14} className="text-gray-400" />
      </div>
      <div className="space-y-1.5">
        {deadlines.map(dl => {
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

function WidgetScoreImpact({ navigate, impact }: { navigate: (path: string) => void; impact: ImpactItem[] }) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Score Impact</h4>
        <p className="text-[11px] text-gray-400 mt-0.5">Actions ranked by compliance impact</p>
      </div>
      <div className="space-y-2">
        {impact.map(item => {
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

function WidgetTrend({ trendData }: { trendData: { date: string; overall: number; foodSafety: number; fireSafety: number }[] }) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const data = useMemo(() => generateTrendData(range, trendData), [range, trendData]);

  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-1">
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

      <p className="text-[10px] text-gray-400 mb-2">EvidLY Operational Readiness (internal tracking)</p>

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
// WIDGET: FIRE SAFETY — JURISDICTION-NATIVE
// ================================================================

const FIRE_EQUIPMENT_ALERTS = [
  { id: 'fa-1', label: 'Hood Ventilation — grease buildup above threshold', location: 'University Dining', severity: 'critical' as const, route: '/equipment/EQ-013' },
  { id: 'fa-2', label: 'Ansul system annual cert expires in 12 days', location: 'Airport Cafe', severity: 'warning' as const, route: '/equipment/EQ-009' },
  { id: 'fa-3', label: 'Exhaust fan belt replacement overdue', location: 'Downtown Kitchen', severity: 'warning' as const, route: '/equipment/EQ-017' },
];

function fireEquipDotColor(status: string | undefined): string {
  if (!status) return '#94a3b8';
  if (status === 'current') return '#22c55e';
  if (status === 'due_soon') return '#eab308';
  // overdue, expired, or anything else
  return '#ef4444';
}

function WidgetFireSafety({ navigate, locations, jieScores, jurisdictions }: {
  navigate: (path: string) => void;
  locations: LocationWithScores[];
  jieScores: Record<string, LocationScore>;
  jurisdictions: Record<string, LocationJurisdiction>;
}) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fire Safety</h4>
        <Flame size={14} className="text-orange-400" />
      </div>

      {/* Per-location jurisdiction-native rows */}
      <div className="space-y-3 mb-4">
        {locations.map(loc => {
          const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
          const score = jieScores[jieLocId];
          const jur = jurisdictions[jieLocId];
          const fireAHJ = jur?.fireSafety?.agency_name ?? 'Fire AHJ';
          const fireStatus = score?.fireSafety?.status ?? 'unknown';
          const details = score?.fireSafety?.details as Record<string, any> | null;

          return (
            <div key={loc.id} className="p-3 rounded-lg" style={{ backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{loc.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{fireAHJ}</p>
                </div>
                {fireStatus === 'passing' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>Pass</span>
                )}
                {fireStatus === 'failing' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>Fail</span>
                )}
                {fireStatus === 'at_risk' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>At Risk</span>
                )}
                {fireStatus === 'unknown' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: '#94a3b8' }}>Unknown</span>
                )}
              </div>
              {/* Equipment status dots */}
              {details && (
                <div className="flex items-center gap-3 mt-1.5">
                  {([
                    { key: 'permitStatus', label: 'Permit' },
                    { key: 'hoodStatus', label: 'Hood' },
                    { key: 'extinguisherStatus', label: 'Ext' },
                    { key: 'ansulStatus', label: 'Ansul' },
                  ] as const).map(item => {
                    const itemStatus = details[item.key] as string | undefined;
                    if (itemStatus === undefined) return null;
                    return (
                      <span key={item.key} className="flex items-center gap-1 text-[10px] text-gray-500">
                        {item.label}
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: fireEquipDotColor(itemStatus) }}
                        />
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {FIRE_EQUIPMENT_ALERTS.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Equipment Alerts</p>
          {FIRE_EQUIPMENT_ALERTS.map(a => {
            const isCritical = a.severity === 'critical';
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(a.route)}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors hover:opacity-90"
                style={{
                  backgroundColor: isCritical ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${isCritical ? '#fecaca' : '#fde68a'}`,
                }}
              >
                <AlertTriangle size={12} className={isCritical ? 'text-red-500' : 'text-amber-500'} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-gray-800 truncate">{a.label}</p>
                  <p className="text-[10px] text-gray-500">{a.location}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <button
        type="button"
        onClick={() => navigate('/fire-safety')}
        className="mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
        style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}
      >
        <Flame size={12} /> View Fire Safety
      </button>
    </div>
  );
}

// ================================================================
// WIDGET: MODULE STATUS
// ================================================================

const MODULE_ICONS: Record<string, React.ReactNode> = {
  'mod-checklists': <ClipboardList size={18} />,
  'mod-temp': <Thermometer size={18} />,
  'mod-equipment': <Wrench size={18} />,
  'mod-haccp': <Shield size={18} />,
  'mod-training': <GraduationCap size={18} />,
  'mod-fire': <Flame size={18} />,
};

const STATUS_DOT: Record<string, string> = {
  good: '#22c55e',
  warning: '#eab308',
  critical: '#ef4444',
};

function WidgetModuleStatus({ navigate, modules }: { navigate: (path: string) => void; modules: ModuleStatus[] }) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Module Status</h4>
        <LayoutGrid size={14} className="text-gray-400" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {modules.map(mod => (
          <button
            key={mod.id}
            type="button"
            onClick={() => navigate(mod.route)}
            className="flex items-center gap-2.5 p-3 rounded-lg text-left transition-colors hover:bg-gray-50"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <div className="shrink-0" style={{ color: MUTED }}>
              {MODULE_ICONS[mod.id] || <Activity size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-800 truncate">{mod.label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_DOT[mod.status] || '#94a3b8' }}
                />
                <p className="text-[11px] text-gray-500 truncate">{mod.metric}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ================================================================
// WIDGET: RECENT ACTIVITY
// ================================================================

function WidgetRecentActivity({ navigate, activity }: { navigate: (path: string) => void; activity: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recent Activity</h4>
        <Activity size={14} className="text-gray-400" />
      </div>
      <div className="space-y-1.5">
        {activity.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => navigate(item.url)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-gray-50"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ backgroundColor: item.borderColor, border: `2px solid ${item.borderColor}20` }}
            >
              {item.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-gray-800 truncate">
                <span className="font-medium">{item.name}</span>{' '}
                {item.action}
              </p>
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">{item.time}</span>
          </button>
        ))}
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
  { id: 'modules', label: 'Module Status', icon: <LayoutGrid size={14} />, visible: true },
  { id: 'tasks', label: 'Today\'s Tasks', icon: <ClipboardList size={14} />, visible: true },
  { id: 'deadlines', label: 'Upcoming Deadlines', icon: <CalendarDays size={14} />, visible: true },
  { id: 'fire-safety', label: 'Fire Safety', icon: <Flame size={14} />, visible: true },
  { id: 'impact', label: 'Score Impact', icon: <Target size={14} />, visible: true },
  { id: 'trend', label: 'Compliance Trend', icon: <TrendingUp size={14} />, visible: true },
  { id: 'activity', label: 'Recent Activity', icon: <Activity size={14} />, visible: true },
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
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[13px] transition-colors min-h-[44px]"
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
// SKELETON LOADER
// ================================================================

function DashboardSkeleton() {
  return (
    <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh' }}>
      {/* Header skeleton */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d2847 0%, #1a3d6d 50%, #0d2847 100%)',
          padding: '20px 24px 40px',
        }}
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-8 rounded bg-white/10 animate-pulse" />
          <div className="flex-1">
            <div className="w-40 h-5 rounded bg-white/10 animate-pulse mb-2" />
            <div className="w-28 h-3 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-6">
          <div className="w-full max-w-lg h-[120px] rounded-xl bg-white/10 animate-pulse" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: GOLD }} />
      </div>
      {/* Content skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse" style={{ height: 220 }}>
              <div className="w-24 h-4 bg-gray-200 rounded mb-3" />
              <div className="w-full h-12 bg-gray-100 rounded mb-3" />
              <div className="w-full h-12 bg-gray-100 rounded mb-3" />
              <div className="w-full h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse" style={{ height: 180 }}>
              <div className="w-32 h-3 bg-gray-200 rounded mb-4" />
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-100 rounded" />
                <div className="w-3/4 h-3 bg-gray-100 rounded" />
                <div className="w-5/6 h-3 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ERROR BANNER
// ================================================================

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
    >
      <AlertTriangle size={18} className="text-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-red-800">Dashboard data could not be loaded</p>
        <p className="text-[11px] text-red-600">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-semibold px-3 py-1.5 rounded-md text-white shrink-0"
        style={{ backgroundColor: '#dc2626' }}
      >
        Retry
      </button>
    </div>
  );
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function OwnerOperatorDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();
  const { data, loading, error, refresh } = useDashboardData();

  // JIE: Dual-authority jurisdiction data per location
  const jieLocIds = useMemo(
    () => data.locations.map(l => JIE_LOC_MAP[l.id] || l.id),
    [data.locations],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // Dismissed alerts (session-only)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const visibleAlerts = data.alerts.filter(a => !dismissedAlerts.has(a.id));
  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  }, []);

  const locs = data.locations;

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

  // Compute unique counties and fire AHJs for header summary
  const uniqueCounties = useMemo(() => {
    const counties = new Set<string>();
    for (const loc of locs) {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      const jur = jurisdictions[jieLocId];
      if (jur?.county) counties.add(jur.county);
    }
    return counties.size;
  }, [locs, jurisdictions]);

  const uniqueFireAHJs = useMemo(() => {
    const ahjs = new Set<string>();
    for (const loc of locs) {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      const jur = jurisdictions[jieLocId];
      if (jur?.fireSafety?.agency_name) ahjs.add(jur.fireSafety.agency_name);
    }
    return ahjs.size;
  }, [locs, jurisdictions]);

  const renderWidget = (wid: string) => {
    switch (wid) {
      case 'modules': return <WidgetModuleStatus navigate={navigate} modules={data.moduleStatuses} />;
      case 'tasks': return <WidgetTasks navigate={navigate} tasks={data.tasks} />;
      case 'deadlines': return <WidgetDeadlines navigate={navigate} deadlines={data.deadlines} />;
      case 'fire-safety': return <WidgetFireSafety navigate={navigate} locations={data.locations} jieScores={jieScores} jurisdictions={jurisdictions} />;
      case 'impact': return <WidgetScoreImpact navigate={navigate} impact={data.impact} />;
      case 'trend': return <WidgetTrend trendData={data.trendData} />;
      case 'activity': return <WidgetRecentActivity navigate={navigate} activity={data.activity} />;
      default: return null;
    }
  };

  if (loading) return <DashboardSkeleton />;

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

        {/* Center: Dual-Authority Jurisdiction Summary */}
        <div className="flex flex-col sm:flex-row gap-3 relative z-10 max-w-3xl mx-auto" style={stagger(1)}>
          {/* Food Safety Panel */}
          <div
            className="flex-1 rounded-xl p-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <UtensilsCrossed size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
              <span className="text-[13px] text-white font-semibold">Food Safety</span>
            </div>
            <p className="text-[10px] text-white mb-3" style={{ opacity: 0.5 }}>
              {uniqueCounties} County Health Dept{uniqueCounties !== 1 ? 's' : ''} — each grades differently
            </p>
            <div className="space-y-2">
              {locs.map(loc => {
                const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
                const score = jieScores[jieLocId];
                const jur = jurisdictions[jieLocId];
                const foodStatus = score?.foodSafety?.status ?? 'unknown';
                const agencyShort = jur?.foodSafety?.agency_name
                  ? jur.foodSafety.agency_name.split(' ').slice(0, 3).join(' ')
                  : '';
                const gradeDisp = score?.foodSafety?.gradeDisplay ?? 'N/A';

                return (
                  <div key={loc.id} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: statusColor(foodStatus) }}
                    />
                    <span className="text-[11px] text-white truncate flex-1" style={{ opacity: 0.9 }}>
                      {loc.name}
                    </span>
                    {agencyShort && (
                      <span className="text-[9px] text-white shrink-0" style={{ opacity: 0.45 }}>
                        {agencyShort}
                      </span>
                    )}
                    <span className="text-[11px] text-white font-medium shrink-0 truncate max-w-[120px]" style={{ opacity: 0.85 }}>
                      {gradeDisp}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fire Safety Panel */}
          <div
            className="flex-1 rounded-xl p-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Flame size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
              <span className="text-[13px] text-white font-semibold">Fire Safety</span>
            </div>
            <p className="text-[10px] text-white mb-3" style={{ opacity: 0.5 }}>
              {uniqueFireAHJs} Fire AHJ{uniqueFireAHJs !== 1 ? 's' : ''} — 2025 CFC operational permits
            </p>
            <div className="space-y-2">
              {locs.map(loc => {
                const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
                const score = jieScores[jieLocId];
                const jur = jurisdictions[jieLocId];
                const fireStatus = score?.fireSafety?.status ?? 'unknown';
                const fireAHJ = jur?.fireSafety?.agency_name ?? '';

                return (
                  <div key={loc.id} className="flex items-center gap-2">
                    <span className="text-[11px] text-white truncate flex-1" style={{ opacity: 0.9 }}>
                      {loc.name}
                    </span>
                    <span className="text-[9px] text-white shrink-0 truncate max-w-[100px]" style={{ opacity: 0.45 }}>
                      {fireAHJ}
                    </span>
                    {fireStatus === 'passing' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.25)', color: '#86efac' }}>Pass</span>
                    )}
                    {fireStatus === 'failing' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>Fail</span>
                    )}
                    {fireStatus === 'at_risk' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(234,179,8,0.25)', color: '#fde68a' }}>At Risk</span>
                    )}
                    {fireStatus === 'unknown' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(148,163,184,0.25)', color: '#cbd5e1' }}>--</span>
                    )}
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* Error Banner */}
        {error && <ErrorBanner message={error} onRetry={refresh} />}

        {/* Alert Banners */}
        <AlertBanners alerts={visibleAlerts} onDismiss={handleDismissAlert} navigate={navigate} />

        {/* Location Cards — only if multi-location */}
        {isMultiLocation && (
          <div style={stagger(3)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Locations ({locs.length})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locs.map(loc => {
                const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
                return (
                  <LocationCardJurisdiction
                    key={loc.id}
                    loc={loc}
                    jieScore={jieScores[jieLocId] || null}
                    jurisdictionData={jurisdictions[jieLocId] || null}
                    onViewDetails={(locId) => navigate(`/dashboard?location=${locId}`)}
                  />
                );
              })}
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
    </div>
  );
}
