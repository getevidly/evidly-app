import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Hammer,
  Clock,
  Radio,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../../data/demoJurisdictions';
import { DEMO_ORG } from '../../data/demoData';
import { FoodSafetyWidget } from '../shared/FoodSafetyWidget';
import { getGreeting, getFormattedDate, GOLD } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { WhereDoIStartSection, type PriorityItem } from './shared/WhereDoIStartSection';
import { TabbedDetailSection, type TabDef } from './shared/TabbedDetailSection';

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
      className="text-xs font-semibold uppercase mb-3"
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
  const { getAccessibleLocations } = useRole();
  const { companyName } = useDemo();

  const accessibleLocations = useMemo(() => getAccessibleLocations(), [getAccessibleLocations]);
  const hasMultipleLocations = accessibleLocations.length > 1;
  const [selectedLocationUrlId, setSelectedLocationUrlId] = useState(accessibleLocations[0]?.locationUrlId || 'downtown');

  // Jurisdiction-native grades for selected location
  const jieKey = `demo-loc-${selectedLocationUrlId}`;
  const override = DEMO_LOCATION_GRADE_OVERRIDES[jieKey];
  const foodGrade = override?.foodSafety?.gradeDisplay || 'Pending';
  const foodStatus = override?.foodSafety?.status || 'unknown';
  const fireGrade = override?.fireSafety?.grade || 'Pending';
  const fireStatus = override?.fireSafety?.status || 'unknown';

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
        greeting={`${getGreeting()}, Chef.`}
        orgName={companyName || DEMO_ORG.name}
        locationName={locationName}
      >
        {/* Grade badges */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            foodStatus === 'passing' ? 'bg-green-500/20 text-green-300'
              : foodStatus === 'failing' ? 'bg-red-500/20 text-red-300'
              : 'bg-amber-500/20 text-amber-300'
          }`}>
            {foodGrade}
          </span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            fireStatus === 'passing' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}>
            Fire: {fireGrade}
          </span>
        </div>
      </DashboardHero>

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
        <SectionHeader>Today's Progress</SectionHeader>
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
            {DEMO_PROGRESS}% complete
          </p>
        </div>
      </Card>

      {/* Checklists — HERO SECTION */}
      <div>
        <SectionHeader>Checklists</SectionHeader>
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
                    {cl.status === 'done' && `Done \u00B7 ${cl.assignee} \u00B7 ${cl.completedAt}`}
                    {cl.status === 'in_progress' && `${cl.completed} of ${cl.items} items \u00B7 ${cl.assignee}`}
                    {cl.status === 'not_started' && 'Not started yet'}
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
      <WhereDoIStartSection items={priorityItems} />

      {/* Temperatures & Team Activity */}
      <Card>
        <TabbedDetailSection
          tabs={[
            {
              id: 'temperatures',
              label: 'Temperatures',
              content: (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                        <th className="text-left pb-2 font-medium">Equipment</th>
                        <th className="text-right pb-2 font-medium">Temp</th>
                        <th className="text-center pb-2 font-medium">Status</th>
                        <th className="text-center pb-2 font-medium">Source</th>
                        <th className="text-right pb-2 font-medium">Last</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {DEMO_TEMPERATURES.map((t) => (
                        <tr key={t.id}>
                          <td className="py-2.5 text-gray-900 font-medium">{t.name}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {t.temp !== null ? (
                              <span style={{ color: t.status === 'alert' ? '#dc2626' : '#374151' }}>
                                {t.temp}{t.unit}
                              </span>
                            ) : (
                              <span className="text-gray-300">&mdash;</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center">
                            <TempStatusDot status={t.status} />
                          </td>
                          <td className="py-2.5 text-center">
                            {t.source === 'iot' ? (
                              <Radio size={14} className="inline text-blue-500" />
                            ) : (
                              <span className="text-xs text-gray-400">Manual</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right text-gray-500 text-xs">{t.lastReading}</td>
                          <td className="py-2.5 text-right">
                            {t.status === 'needs_log' && (
                              <button
                                type="button"
                                onClick={() => navigate('/temp-logs')}
                                className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                                style={{ color: '#1e4d6b' }}
                              >
                                Log Temp &rarr;
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
              label: 'Team Activity',
              content: (
                <div className="space-y-3">
                  {DEMO_TEAM.map((member) => (
                    <div key={member.name} className="flex items-start gap-3">
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
                    </div>
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
