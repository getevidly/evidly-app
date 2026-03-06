import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Hammer,
  Clock,
  Radio,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useTooltip } from '../../hooks/useTooltip';
import { SectionTooltip } from '../ui/SectionTooltip';
import { useDemo } from '../../contexts/DemoContext';
import { DEMO_ORG } from '../../data/demoData';
import { DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { HealthBanner, type HealthStatus } from './shared/HealthBanner';
import { WhereDoIStartSection, type PriorityItem } from './shared/WhereDoIStartSection';
import { TabbedDetailSection, type TabDef } from './shared/TabbedDetailSection';
import { CalendarCard } from './shared/CalendarCard';
import { KITCHEN_MANAGER_EVENTS, KITCHEN_MANAGER_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { SelfDiagCard } from './shared/SelfDiagCard';
import { NFPAReminder } from '../ui/NFPAReminder';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';

// --------------- Demo Data ---------------

interface DemoChecklist {
  id: string;
  name: string;
  status: 'done' | 'in_progress' | 'not_started';
  assignee: string | null;
  completedAt?: string;
  items: number;
  completed: number;
}

interface DemoTemperature {
  id: string;
  name: string;
  temp: number | null;
  unit: string;
  status: 'normal' | 'alert' | 'needs_log';
  source: 'iot' | 'manual';
  lastReading: string;
}

const DEMO_CHECKLISTS: DemoChecklist[] = [
  { id: 'opening', name: 'Opening Checklist', status: 'done', assignee: 'Maria', completedAt: '6:15 AM', items: 12, completed: 12 },
  { id: 'midday', name: 'Midday Checklist', status: 'in_progress', assignee: 'Carlos', items: 8, completed: 4 },
  { id: 'closing', name: 'Closing Checklist', status: 'not_started', assignee: null, items: 10, completed: 0 },
];

const DEMO_TEMPERATURES: DemoTemperature[] = [
  { id: 'cooler-1', name: 'Walk-in Cooler #1', temp: 37.8, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '2 min ago' }, // demo
  { id: 'cooler-2', name: 'Walk-in Cooler #2', temp: 39.5, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '4 min ago' },
  { id: 'freezer', name: 'Walk-in Freezer', temp: -2, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '6 min ago' },
  { id: 'prep', name: 'Prep Cooler', temp: null, unit: '\u00B0F', status: 'needs_log', source: 'manual', lastReading: '4 hours ago' },
];

const DEMO_TEAM = [
  { name: 'Maria', done: 5, total: 6, activities: ['Opening checklist \u2705', '3 temp logs'] }, // demo
  { name: 'Carlos', done: 2, total: 5, activities: ['Midday checklist \uD83D\uDD28', '2 temp logs'] },
  { name: 'Sofia', done: 1, total: 3, activities: ['1 temp log'] },
];

const DEMO_PROGRESS = 52;

const CHEF_FOOD_SAFETY_LOCATIONS = [
  { name: 'Location 1', jurisdiction: 'Fresno County', status: 'Compliant', detail: 'No Open Majors' }, // demo
  { name: 'Location 2', jurisdiction: 'Merced County', status: 'Satisfactory', detail: 'Satisfactory' }, // demo
  { name: 'Location 3', jurisdiction: 'Stanislaus County', status: 'Action Required', detail: '3 Major Open' }, // demo
];

const HACCP_TILES = [
  { id: 'cooking', label: 'Cooking', status: 'green' as const, detail: 'All within range' },
  { id: 'walkin', label: 'Walk-in', status: 'green' as const, detail: '37.8\u00B0F — normal' },
  { id: 'hothold', label: 'Hot Hold', status: 'yellow' as const, detail: 'Station 2 trending low' },
  { id: 'cooling', label: 'Cooling', status: 'green' as const, detail: 'Last log 45 min ago' },
];

// --------------- Helpers ---------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-lg p-4 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs font-semibold uppercase mb-3 flex items-center"
      style={{ letterSpacing: '0.1em', color: '#6b7280', fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </h3>
  );
}

function ChecklistIcon({ status, size = 24 }: { status: DemoChecklist['status']; size?: number }) {
  if (status === 'done') return <CheckCircle2 size={size} className="text-green-500 shrink-0" />;
  if (status === 'in_progress') return <Hammer size={size} className="shrink-0" style={{ color: '#d4af37' }} />;
  return <Clock size={size} className="text-gray-400 shrink-0" />;
}

function TempStatusDot({ status }: { status: DemoTemperature['status'] }) {
  if (status === 'normal') return <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />;
  if (status === 'alert') return <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />;
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#d4af37';
  return '#dc2626';
}

function getChecklistBorderColor(status: DemoChecklist['status']): string {
  if (status === 'done') return '#16a34a';
  if (status === 'in_progress') return '#d4af37';
  return '#d1d5db';
}

function getChecklistBgTint(status: DemoChecklist['status']): string {
  if (status === 'done') return '#f0fdf4';
  if (status === 'in_progress') return '#fffbeb';
  return '#fafafa';
}

// ===============================================
// HACCP STATUS TILE
// ===============================================

function HACCPTile({ tile, navigate }: { tile: typeof HACCP_TILES[0]; navigate: (path: string) => void }) {
  const bgColor = tile.status === 'green' ? '#f0fdf4'
    : tile.status === 'yellow' ? '#fffbeb'
    : '#fef2f2';
  const borderColor = tile.status === 'green' ? '#bbf7d0'
    : tile.status === 'yellow' ? '#fde68a'
    : '#fecaca';
  const dotColor = tile.status === 'green' ? '#16a34a'
    : tile.status === 'yellow' ? '#d97706'
    : '#dc2626';

  return (
    <button
      type="button"
      onClick={() => navigate('/temp-logs')}
      className="rounded-xl p-4 text-left transition-all hover:shadow-md"
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="text-sm font-semibold text-gray-900">{tile.label}</span>
      </div>
      <p className="text-xs text-gray-600">{tile.detail}</p>
    </button>
  );
}

// ===============================================
// Derive HealthBanner status from HACCP tiles
// ===============================================

function deriveKitchenHealth(tiles: typeof HACCP_TILES): { status: HealthStatus; message: string } {
  const hasRed = tiles.some(t => t.status === 'red');
  const hasYellow = tiles.some(t => t.status === 'yellow');

  if (hasRed) {
    return {
      status: 'risk',
      message: 'One or more CCPs are out of range — immediate action required.',
    };
  }
  if (hasYellow) {
    return {
      status: 'attention',
      message: 'A CCP is trending out of range. Monitor closely.',
    };
  }
  return {
    status: 'healthy',
    message: 'All CCPs within range. Certs valid.',
  };
}

// ===============================================
// CHEF DASHBOARD
// ===============================================

export default function ChefDashboard() {
  const navigate = useNavigate();
  const { getAccessibleLocations, userRole } = useRole();
  const { companyName, isDemoMode } = useDemo();
  const { t } = useTranslation();

  // Extract useTooltip calls to top of component (rules-of-hooks)
  const overallScoreTooltip = useTooltip('overallScore', userRole);
  const todaysProgressTooltip = useTooltip('todaysProgress', userRole);
  const checklistCardTooltip = useTooltip('checklistCard', userRole);
  const urgentItemsTooltip = useTooltip('urgentItems', userRole);
  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const accessibleLocations = useMemo(() => getAccessibleLocations(), [getAccessibleLocations]);
  const hasMultipleLocations = accessibleLocations.length > 1;
  const [selectedLocationUrlId, setSelectedLocationUrlId] = useState(accessibleLocations[0]?.locationUrlId || 'downtown');

  const LOC_NAMES: Record<string, string> = {
    downtown: 'Location 1', // demo
    airport: 'Location 2', // demo
    university: 'Location 3', // demo
  };
  const locationName = LOC_NAMES[selectedLocationUrlId] || 'Location 1'; // demo

  // Data gating: demo data only in demo mode, empty in live mode
  const checklists = isDemoMode ? DEMO_CHECKLISTS : [];
  const temperatures = isDemoMode ? DEMO_TEMPERATURES : [];
  const team = isDemoMode ? DEMO_TEAM : [];
  const progress = isDemoMode ? DEMO_PROGRESS : 0;
  const foodSafetyLocations = isDemoMode ? CHEF_FOOD_SAFETY_LOCATIONS : [];
  const haccpTiles = isDemoMode ? HACCP_TILES : [];
  const priorityItems: PriorityItem[] = isDemoMode ? [
    { id: 'km-1', severity: 'warning', title: 'Hot Hold Station 2 trending low', detail: 'Check holding temperature — CCP out of range', actionLabel: 'Check Now', route: '/temp-logs' },
    { id: 'km-2', severity: 'warning', title: 'Log Prep Cooler temp', detail: 'Last logged 4 hours ago — overdue', actionLabel: 'Log Temp', route: '/temp-logs' },
    { id: 'km-3', severity: 'info', title: 'Complete midday checklist (4 items remaining)', detail: 'Carlos is working on it', actionLabel: 'View', route: '/checklists' },
  ] : [];

  // Derive health banner status from HACCP tiles
  const kitchenHealth = useMemo(() => deriveKitchenHealth(haccpTiles), [haccpTiles]);

  // Animated progress bar
  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Live mode empty state
  if (!isDemoMode) {
    return (
      <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        <DashboardHero
          firstName={DEMO_ROLE_NAMES[userRole]?.firstName || 'Chef'}
          orgName={companyName || 'Your Organization'}
          locationName={locationName}
        />
        <Card>
          <div className="text-center py-8">
            <p className="text-sm font-medium text-gray-500">No data yet. Set up your locations and team to see your kitchen dashboard.</p>
            <button type="button" onClick={() => navigate('/checklists')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
              Set Up Checklists
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Build "Do This Next" actions (max 3, from priorityItems)
  const doThisNextItems = priorityItems.slice(0, 3);

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* 1. Hero Banner */}
      <DashboardHero
        firstName={DEMO_ROLE_NAMES[userRole]?.firstName || 'Chef'}
        orgName={companyName || DEMO_ORG.name}
        locationName={locationName}
      />

      {/* 2. Onboarding checklist */}
      <OnboardingChecklistCard />

      {/* 3. HealthBanner — Kitchen Health */}
      <HealthBanner
        status={kitchenHealth.status}
        scope="Kitchen Health"
        message={kitchenHealth.message}
      />

      {/* 4. HACCP CCP Status — 2x2 grid */}
      <div>
        <SectionHeader>HACCP CCP Status<SectionTooltip content={overallScoreTooltip} /></SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          {haccpTiles.map(tile => (
            <HACCPTile key={tile.id} tile={tile} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* 5. CCP alert card — if any CCP not green */}
      {haccpTiles.some(t => t.status !== 'green') && (
        <Card>
          <button
            type="button"
            onClick={() => navigate('/temp-logs')}
            className="w-full flex items-center gap-3 text-left"
          >
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Hot Hold Station 2 trending low</p>
              <p className="text-xs text-gray-500 mt-0.5">Check holding temperature immediately</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-md text-white shrink-0" style={{ backgroundColor: '#d97706' }}>
              Check &rarr;
            </span>
          </button>
        </Card>
      )}

      {/* 6. What Needs Attention — CCP gaps + expiring certs ranked by risk */}
      {priorityItems.length > 0 && (
        <div>
          <SectionHeader>What Needs Attention</SectionHeader>
          <div className="space-y-2">
            {priorityItems.map(item => {
              const riskType = item.id === 'km-1' ? 'liability' : item.id === 'km-2' ? 'liability' : 'operational';
              const riskBg = riskType === 'liability' ? '#fef2f2' : '#eff6ff';
              const riskColor = riskType === 'liability' ? '#dc2626' : '#2563eb';
              const riskLabel = riskType === 'liability' ? 'Liability' : 'Operational';
              const iconColor = item.severity === 'warning' ? '#d97706' : '#6b7280';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="w-full rounded-lg p-3 text-left hover:shadow-md transition-shadow bg-white"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: iconColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                          style={{ backgroundColor: riskBg, color: riskColor }}
                        >
                          {riskLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{item.detail}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Do This Next — max 3 actions */}
      {doThisNextItems.length > 0 && (
        <div>
          <SectionHeader>Do This Next</SectionHeader>
          <div className="space-y-2">
            {doThisNextItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.route)}
                className="w-full rounded-lg p-3 text-left hover:shadow-md transition-shadow bg-white flex items-center gap-3"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: '#163a5f' }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.actionLabel}</p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 8. Team on Shift (compact) */}
      <Card>
        <SectionHeader>Team on Shift</SectionHeader>
        <div className="space-y-2">
          {team.map(member => (
            <div key={member.name} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: '#1e4d6b' }}
              >
                {member.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-900 flex-1">{member.name}</span>
              <span className="text-xs text-gray-500">{member.done}/{member.total} done</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 9. Today's Progress (animated bar) */}
      <Card>
        <SectionHeader>{t('cards.todaysProgress')}<SectionTooltip content={todaysProgressTooltip} /></SectionHeader>
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full" style={{ height: 12 }}>
            <div
              className="rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${animatedProgress}%`,
                height: 12,
                backgroundColor: getProgressColor(animatedProgress),
              }}
            />
          </div>
          <p className="text-sm font-medium" style={{ color: getProgressColor(DEMO_PROGRESS) }}>
            {progress}% {t('status.complete').toLowerCase()}
          </p>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* BELOW THE FOLD                                                */}
      {/* ============================================================ */}

      {/* NFPA Monthly Reminder */}
      <NFPAReminder />

      {/* Self-Diagnosis — Kitchen Problem */}
      <SelfDiagCard />

      {/* Location tabs (if multiple locations) */}
      {hasMultipleLocations && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {accessibleLocations.map((loc) => (
            <button
              key={loc.locationUrlId}
              onClick={() => setSelectedLocationUrlId(loc.locationUrlId)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedLocationUrlId === loc.locationUrlId
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {loc.locationName}
            </button>
          ))}
        </div>
      )}

      {/* Food Safety locations */}
      <div>
        <SectionHeader>{t('cards.foodSafety')}<SectionTooltip content={overallScoreTooltip} /></SectionHeader>
        <div className="space-y-2">
          {CHEF_FOOD_SAFETY_LOCATIONS.map(loc => {
            const statusColor = loc.status === 'Compliant' ? '#16a34a'
              : loc.status === 'Action Required' ? '#dc2626'
              : '#d97706';
            const statusBg = loc.status === 'Compliant' ? '#dcfce7'
              : loc.status === 'Action Required' ? '#fef2f2'
              : '#fef3c7';
            return (
              <button
                key={loc.name}
                type="button"
                onClick={() => navigate('/compliance')}
                className="w-full rounded-lg p-4 text-left hover:shadow-md transition-shadow"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', backgroundColor: '#fff', borderLeft: `3px solid ${statusColor}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">{loc.name}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: statusBg, color: statusColor }}
                  >
                    {loc.status === 'Compliant' ? t('status.compliant') : loc.status === 'Action Required' ? t('status.actionRequired') : t('status.satisfactory')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{loc.jurisdiction}</span>
                  <span className="text-xs text-gray-500">{loc.detail === 'No Open Majors' ? t('status.noOpenMajors') : loc.detail === 'Satisfactory' ? t('status.satisfactory') : loc.detail}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Checklists */}
      <div>
        <SectionHeader>{t('cards.checklists')}<SectionTooltip content={checklistCardTooltip} /></SectionHeader>
        <div className="space-y-3">
          {DEMO_CHECKLISTS.map((cl) => (
            <button
              key={cl.id}
              type="button"
              onClick={() => navigate('/checklists')}
              className="w-full rounded-lg p-4 text-left hover:shadow-md transition-shadow"
              style={{
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                borderLeft: `4px solid ${getChecklistBorderColor(cl.status)}`,
                backgroundColor: getChecklistBgTint(cl.status),
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <div className="flex items-center gap-4">
                <ChecklistIcon status={cl.status} size={24} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{cl.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cl.status === 'done' && `${t('status.complete')} \u00B7 ${cl.assignee} \u00B7 ${cl.completedAt}`}
                    {cl.status === 'in_progress' && `${cl.completed} of ${cl.items} items \u00B7 ${cl.assignee}`}
                    {cl.status === 'not_started' && t('status.notStartedYet')}
                  </p>
                </div>
                {cl.status === 'in_progress' && (
                  <div className="w-16 bg-gray-200 rounded-full" style={{ height: 6 }}>
                    <div
                      className="rounded-full"
                      style={{
                        width: `${(cl.completed / cl.items) * 100}%`,
                        height: 6,
                        backgroundColor: '#d4af37',
                      }}
                    />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Where Do I Start */}
      <WhereDoIStartSection items={priorityItems} tooltipContent={urgentItemsTooltip} />

      {/* Schedule Calendar */}
      <ErrorBoundary level="widget">
        <CalendarCard
          events={KITCHEN_MANAGER_EVENTS}
          typeColors={KITCHEN_MANAGER_CALENDAR.typeColors}
          typeLabels={KITCHEN_MANAGER_CALENDAR.typeLabels}
          navigate={navigate}
          tooltipContent={scheduleCalendarTooltip}
        />
      </ErrorBoundary>

      {/* Temperatures & Team Activity */}
      <Card>
        <TabbedDetailSection
          tabs={[
            {
              id: 'temperatures',
              label: t('cards.temperatures'),
              content: (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                        <th className="text-left pb-2 font-medium">{t('cards.equipment')}</th>
                        <th className="text-right pb-2 font-medium">Temp</th>
                        <th className="text-center pb-2 font-medium">{t('common.status')}</th>
                        <th className="text-center pb-2 font-medium">Source</th>
                        <th className="text-right pb-2 font-medium">Last</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {DEMO_TEMPERATURES.map((tmp) => (
                        <tr key={tmp.id} onClick={() => navigate('/temp-logs')} className="cursor-pointer hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 text-gray-900 font-medium">{tmp.name}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {tmp.temp !== null ? (
                              <span style={{ color: tmp.status === 'alert' ? '#dc2626' : '#374151' }}>
                                {tmp.temp}{tmp.unit}
                              </span>
                            ) : (
                              <span className="text-gray-300">&mdash;</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center">
                            <TempStatusDot status={tmp.status} />
                          </td>
                          <td className="py-2.5 text-center">
                            {tmp.source === 'iot' ? (
                              <Radio size={14} className="inline text-blue-500" />
                            ) : (
                              <span className="text-xs text-gray-400">{t('status.manual')}</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right text-gray-500 text-xs">{tmp.lastReading}</td>
                          <td className="py-2.5 text-right">
                            {tmp.status === 'needs_log' && (
                              <button
                                type="button"
                                onClick={() => navigate('/temp-logs')}
                                className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                                style={{ color: '#1e4d6b' }}
                              >
                                {t('actions.logTemp')} &rarr;
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              id: 'team-activity',
              label: t('cards.teamActivity'),
              content: (
                <div className="space-y-3">
                  {DEMO_TEAM.map((member) => (
                    <button key={member.name} type="button" onClick={() => navigate('/team')} className="flex items-start gap-3 w-full text-left rounded-lg p-1 -m-1 hover:bg-gray-50 transition-colors">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: '#1e4d6b' }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.activities.join(', ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ),
            },
          ] satisfies TabDef[]}
          defaultTab="temperatures"
        />
      </Card>
    </div>
  );
}
