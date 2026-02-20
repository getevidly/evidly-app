import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Hammer,
  Clock,
  Radio,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useTooltip } from '../../hooks/useTooltip';
import { SectionTooltip } from '../ui/SectionTooltip';
import { useDemo } from '../../contexts/DemoContext';
import { DEMO_ORG } from '../../data/demoData';
import { DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { WhereDoIStartSection, type PriorityItem } from './shared/WhereDoIStartSection';
import { ReferralBanner } from '../referral/ReferralBanner';
import { K2CWidget } from '../referral/K2CWidget';
import { demoReferral } from '../../data/demoData';
import { TabbedDetailSection, type TabDef } from './shared/TabbedDetailSection';
import { CalendarCard } from './shared/CalendarCard';
import { KITCHEN_MANAGER_EVENTS, KITCHEN_MANAGER_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';

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
  { id: 'cooler-1', name: 'Walk-in Cooler #1', temp: 37.8, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '2 min ago' },
  { id: 'cooler-2', name: 'Walk-in Cooler #2', temp: 39.5, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '4 min ago' },
  { id: 'freezer', name: 'Walk-in Freezer', temp: -2, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '6 min ago' },
  { id: 'prep', name: 'Prep Cooler', temp: null, unit: '\u00B0F', status: 'needs_log', source: 'manual', lastReading: '4 hours ago' },
];

const DEMO_TEAM = [
  { name: 'Maria', activities: ['Opening checklist \u2705', '3 temp logs'] },
  { name: 'Carlos', activities: ['Midday checklist \uD83D\uDD28', '2 temp logs'] },
  { name: 'Sofia', activities: ['1 temp log'] },
];

const DEMO_PROGRESS = 52;

const CHEF_FOOD_SAFETY_LOCATIONS = [
  { name: 'Downtown Kitchen', jurisdiction: 'Fresno County', status: 'Compliant', detail: 'No Open Majors' },
  { name: 'Airport Cafe', jurisdiction: 'Merced County', status: 'Satisfactory', detail: 'Satisfactory' },
  { name: 'University Dining', jurisdiction: 'Stanislaus County', status: 'Action Required', detail: '3 Major Open' },
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
// KITCHEN MANAGER DASHBOARD
// ===============================================

export default function KitchenManagerDashboard() {
  const navigate = useNavigate();
  const { getAccessibleLocations, userRole } = useRole();
  const { companyName } = useDemo();
  const { t } = useTranslation();

  const accessibleLocations = useMemo(() => getAccessibleLocations(), [getAccessibleLocations]);
  const hasMultipleLocations = accessibleLocations.length > 1;
  const [selectedLocationUrlId, setSelectedLocationUrlId] = useState(accessibleLocations[0]?.locationUrlId || 'downtown');

  const KM_LOC_NAMES: Record<string, string> = {
    downtown: 'Downtown Kitchen',
    airport: 'Airport Cafe',
    university: 'University Dining',
  };
  const locationName = KM_LOC_NAMES[selectedLocationUrlId] || 'Downtown Kitchen';

  // Animated progress bar
  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(DEMO_PROGRESS), 100);
    return () => clearTimeout(timer);
  }, []);

  // Priority items for "Where Do I Start" section
  const priorityItems: PriorityItem[] = [
    { id: 'km-1', severity: 'warning', title: 'Complete midday checklist (4 items remaining)', detail: 'Carlos is working on it', actionLabel: 'View', route: '/checklists' },
    { id: 'km-2', severity: 'warning', title: 'Log Prep Cooler temp', detail: 'Last logged 4 hours ago', actionLabel: 'Log Temp', route: '/temp-logs' },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Hero Banner */}
      <DashboardHero
        firstName={DEMO_ROLE_NAMES[userRole]?.firstName || 'Chef'}
        orgName={companyName || DEMO_ORG.name}
        locationName={locationName}
      />

      {/* K2C Referral Banner */}
      <ReferralBanner
        referralCode={demoReferral.referralCode}
        referralUrl={demoReferral.referralUrl}
        mealsGenerated={demoReferral.mealsGenerated}
      />

      {/* Food Safety — chef only */}
      {userRole === 'chef' && (
        <div>
          <SectionHeader>{t('cards.foodSafety')}<SectionTooltip content={useTooltip('overallScore', userRole)} /></SectionHeader>
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
      )}

      {/* K2C Widget */}
      <div style={{ maxWidth: 320 }}>
        <K2CWidget
          mealsGenerated={demoReferral.mealsGenerated}
          referralsCount={demoReferral.referralsCount}
          monthsFree={demoReferral.monthsFree}
          onShareClick={() => navigator.clipboard.writeText(demoReferral.referralUrl)}
        />
      </div>

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

      {/* Today's Progress */}
      <Card>
        <SectionHeader>{t('cards.todaysProgress')}<SectionTooltip content={useTooltip('todaysProgress', userRole)} /></SectionHeader>
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
            {DEMO_PROGRESS}% {t('status.complete').toLowerCase()}
          </p>
        </div>
      </Card>

      {/* Checklists — HERO SECTION */}
      <div>
        <SectionHeader>{t('cards.checklists')}<SectionTooltip content={useTooltip('checklistCard', userRole)} /></SectionHeader>
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
      <WhereDoIStartSection items={priorityItems} tooltipContent={useTooltip('urgentItems', userRole)} />

      {/* Schedule Calendar */}
      <ErrorBoundary level="widget">
        <CalendarCard
          events={KITCHEN_MANAGER_EVENTS}
          typeColors={KITCHEN_MANAGER_CALENDAR.typeColors}
          typeLabels={KITCHEN_MANAGER_CALENDAR.typeLabels}
          navigate={navigate}
          tooltipContent={useTooltip('scheduleCalendar', userRole)}
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
