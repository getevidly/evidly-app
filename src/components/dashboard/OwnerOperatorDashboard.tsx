import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Flame, ChevronRight, AlertTriangle,
  Thermometer, ClipboardList, FileUp, Bot,
  CheckCircle2, Hammer, Clock, AlertCircle, CalendarDays,
  Activity,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useRole } from '../../contexts/RoleContext';
import { useTooltip } from '../../hooks/useTooltip';
import { SectionTooltip } from '../ui/SectionTooltip';
import { DEMO_ORG } from '../../data/demoData';
import {
  useDashboardData,
  type TaskItem,
  type DeadlineItem,
  type ImpactItem,
  type LocationWithScores,
} from '../../hooks/useDashboardData';
import type { ActivityItem } from '../../lib/dashboardQueries';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import type { LocationScore, LocationJurisdiction } from '../../types/jurisdiction';
import { AlertBanner, type AlertBannerItem } from '../shared/AlertBanner';
import { FireStatusBars } from '../shared/FireStatusBars';
import { GOLD, NAVY, PAGE_BG, MUTED, BODY_TEXT, FONT, JIE_LOC_MAP, KEYFRAMES, stagger, statusColor } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { HeroJurisdictionSummary } from './shared/HeroJurisdictionSummary';
import { WhereDoIStartSection, type PriorityItem } from './shared/WhereDoIStartSection';
import { TabbedDetailSection, type TabDef } from './shared/TabbedDetailSection';
import { CalendarCard } from './shared/CalendarCard';
import { OWNER_OPERATOR_EVENTS, OWNER_OPERATOR_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';


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

// AlertBanners — now uses shared component from ../shared/AlertBanner

// ================================================================
// LOCATION CARD — JURISDICTION-NATIVE
// ================================================================

function LocationCardJurisdiction({ loc, jieScore, jurisdictionData, expanded, onToggleExpand }: {
  loc: LocationWithScores;
  jieScore: LocationScore | null;
  jurisdictionData: LocationJurisdiction | null;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const navigate = useNavigate();
  const foodStatus = jieScore?.foodSafety?.status ?? 'unknown';
  const fireStatus = jieScore?.fireSafety?.status ?? 'unknown';
  const foodGradeDisplay = jieScore?.foodSafety?.gradeDisplay ?? 'Not assessed';
  const fireGradeDisplay = jieScore?.fireSafety?.gradeDisplay ?? 'Not assessed';
  const foodGradingType = jurisdictionData?.foodSafety?.grading_type ?? null;
  const fireAHJName = jurisdictionData?.fireSafety?.agency_name ?? 'Fire AHJ';
  const county = jurisdictionData?.county ?? '';

  // Agency contact data
  const foodAgencyName = jurisdictionData?.foodSafety?.agency_name ?? '';
  const foodAgencyPhone = jurisdictionData?.foodSafety?.agency_phone ?? '';
  const foodAgencyWebsite = jurisdictionData?.foodSafety?.agency_website ?? '';
  const fireAgencyPhone = jurisdictionData?.fireSafety?.agency_phone ?? '';
  const fireAgencyWebsite = jurisdictionData?.fireSafety?.agency_website ?? '';

  // Fire equipment status from jieScore details (populated from DEMO_LOCATION_GRADE_OVERRIDES)
  const fireDetails = jieScore?.fireSafety?.details as Record<string, any> | null;

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
        <button type="button" onClick={() => navigate(`/locations/${loc.id}`)} className="text-sm font-semibold text-left hover:opacity-70 transition-opacity" style={{ color: BODY_TEXT }}>{loc.name}</button>
        {county && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
            {county}
          </span>
        )}
      </div>

      {/* Food Safety row */}
      <button
        type="button"
        onClick={() => navigate('/compliance')}
        className="w-full p-3 rounded-lg mb-3 text-left transition-colors hover:opacity-90"
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
      </button>

      {/* Fire Safety row */}
      <button
        type="button"
        onClick={() => navigate('/fire-safety')}
        className="w-full p-3 rounded-lg mb-4 text-left transition-colors hover:opacity-90"
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
      </button>

      {/* Expandable Details */}
      {expanded && (
        <div className="mb-3 space-y-3 pt-2 border-t border-gray-100" style={{ animation: 'slideDown 0.2s ease-out' }}>
          {/* Food Safety Agency Contact */}
          {foodAgencyName && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#f8fafb' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Food Safety Authority</p>
              <p className="text-[12px] font-medium text-gray-700">{foodAgencyName}</p>
              {foodAgencyPhone && (
                <a href={`tel:${foodAgencyPhone}`} className="text-[11px] block mt-0.5" style={{ color: '#1e4d6b' }}>
                  {foodAgencyPhone}
                </a>
              )}
              {foodAgencyWebsite && (
                <a href={foodAgencyWebsite} target="_blank" rel="noopener noreferrer" className="text-[11px] block mt-0.5 hover:underline" style={{ color: '#1e4d6b' }}>
                  Agency Website &rarr;
                </a>
              )}
            </div>
          )}

          {/* Fire Safety Agency Contact + Equipment Status */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#f8fafb' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Fire Safety Authority</p>
            <p className="text-[12px] font-medium text-gray-700">{fireAHJName}</p>
            {fireAgencyPhone && (
              <a href={`tel:${fireAgencyPhone}`} className="text-[11px] block mt-0.5" style={{ color: '#1e4d6b' }}>
                {fireAgencyPhone}
              </a>
            )}
            {fireAgencyWebsite && (
              <a href={fireAgencyWebsite} target="_blank" rel="noopener noreferrer" className="text-[11px] block mt-0.5 hover:underline" style={{ color: '#1e4d6b' }}>
                Agency Website &rarr;
              </a>
            )}
            {fireDetails?.permitStatus && (
              <div className="mt-2">
                <FireStatusBars
                  permitStatus={fireDetails.permitStatus}
                  hoodStatus={fireDetails.hoodStatus}
                  extinguisherStatus={fireDetails.extinguisherStatus}
                  ansulStatus={fireDetails.ansulStatus}
                  compact
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle Details */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full text-center text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
        style={{ color: NAVY }}
      >
        {expanded ? 'Hide Details \u25B2' : 'View Details \u25BC'}
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
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.route)}
              className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:opacity-90"
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
              <span
                className="text-xs font-medium shrink-0"
                style={{ color: NAVY }}
              >
                Do It &rarr;
              </span>
            </button>
          );
        })}
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
            <button
              key={loc.id}
              type="button"
              onClick={() => navigate(`/fire-safety?location=${loc.id}`)}
              className="w-full p-3 rounded-lg text-left transition-colors hover:bg-gray-100"
              style={{ backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}
            >
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
              {/* Equipment status bars */}
              {details?.permitStatus && (
                <div className="mt-1.5">
                  <FireStatusBars
                    permitStatus={details.permitStatus}
                    hoodStatus={details.hoodStatus}
                    extinguisherStatus={details.extinguisherStatus}
                    ansulStatus={details.ansulStatus}
                    compact
                  />
                </div>
              )}
            </button>
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
          background: 'linear-gradient(135deg, #1c2a3f 0%, #263d56 50%, #2f4a66 100%)',
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
  const { companyName, firstName, isDemoMode } = useDemo();
  const { userRole } = useRole();
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
  // Expanded location cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const visibleAlerts = data.alerts.filter(a => !dismissedAlerts.has(a.id));
  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  }, []);

  const locs = data.locations;

  // Multi-location check
  const isMultiLocation = locs.length > 1;

  // Build priority items from impact data for WhereDoIStartSection
  const priorityItems: PriorityItem[] = useMemo(
    () => data.impact.map(item => ({
      id: item.id,
      severity: item.severity === 'critical' ? 'critical' as const : 'warning' as const,
      title: item.action,
      detail: `${item.location} \u00b7 ${item.pillar} \u00b7 +${item.points} pts`,
      actionLabel: 'Fix Now',
      route: item.route,
    })),
    [data.impact],
  );

  // Build tabs for TabbedDetailSection
  const detailTabs: TabDef[] = useMemo(() => [
    {
      id: 'tasks',
      label: "Today's Tasks",
      content: <WidgetTasks navigate={navigate} tasks={data.tasks} />,
    },
    {
      id: 'deadlines',
      label: 'Deadlines',
      content: <WidgetDeadlines navigate={navigate} deadlines={data.deadlines} />,
    },
    {
      id: 'food-safety',
      label: 'Food Safety',
      content: <WidgetScoreImpact navigate={navigate} impact={data.impact} />,
    },
    {
      id: 'fire-safety',
      label: 'Fire Safety',
      content: <WidgetFireSafety navigate={navigate} locations={data.locations} jieScores={jieScores} jurisdictions={jurisdictions} />,
    },
    {
      id: 'activity',
      label: 'Activity',
      content: <WidgetRecentActivity navigate={navigate} activity={data.activity} />,
    },
  ], [navigate, data, jieScores, jurisdictions]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{KEYFRAMES}</style>

      {/* ============================================================ */}
      {/* HERO — shared DashboardHero with dual-authority panels       */}
      {/* ============================================================ */}
      <div style={stagger(0)} className="px-4 sm:px-6 pt-4">
        <DashboardHero
          firstName={firstName}
          orgName={companyName || DEMO_ORG.name}
          subtitle={`${DEMO_ORG.locationCount} locations \u00b7 California`}
          onSubtitleClick={() => navigate('/org-hierarchy')}
        >
          <HeroJurisdictionSummary jieScores={jieScores} jurisdictions={jurisdictions} navigate={navigate} userRole={userRole} />
        </DashboardHero>
      </div>

      {/* ============================================================ */}
      {/* CONTENT                                                       */}
      {/* ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* Error Banner */}
        {error && <ErrorBanner message={error} onRetry={refresh} />}

        {/* Alert Banners */}
        {visibleAlerts.length > 0 && (
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 flex items-center">Alerts<SectionTooltip content={useTooltip('alertBanner', userRole)} /></h4>
        )}
        <AlertBanner alerts={visibleAlerts as AlertBannerItem[]} onDismiss={handleDismissAlert} navigate={navigate} />

        {/* Where Do I Start — priority actions from impact data */}
        <WhereDoIStartSection items={priorityItems} staggerOffset={2} tooltipContent={useTooltip('urgentItems', userRole)} />

        {/* Location Cards — only if multi-location */}
        {isMultiLocation && (
          <div style={stagger(3)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">Locations ({locs.length})<SectionTooltip content={useTooltip('locationCards', userRole)} /></h3>
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
                    expanded={expandedCards.has(loc.id)}
                    onToggleExpand={() => setExpandedCards(prev => {
                      const next = new Set(prev);
                      if (next.has(loc.id)) next.delete(loc.id);
                      else next.add(loc.id);
                      return next;
                    })}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Schedule Calendar */}
        <div style={stagger(4)}>
          <ErrorBoundary level="widget">
            <CalendarCard
              events={OWNER_OPERATOR_EVENTS}
              typeColors={OWNER_OPERATOR_CALENDAR.typeColors}
              typeLabels={OWNER_OPERATOR_CALENDAR.typeLabels}
              navigate={navigate}
              tooltipContent={useTooltip('scheduleCalendar', userRole)}
            />
          </ErrorBoundary>
        </div>

        {/* Tabbed Detail Section — replaces customizable widget grid */}
        <div style={stagger(5)}>
          <TabbedDetailSection tabs={detailTabs} defaultTab="tasks" />
        </div>

        {/* Footer */}
        <EvidlyFooter />
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar navigate={navigate} />
    </div>
  );
}
