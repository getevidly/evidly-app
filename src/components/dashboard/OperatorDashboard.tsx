import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Hammer,
  Clock,
  Radio,
  MapPin,
  CalendarDays,
  Thermometer,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import {
  calculateInspectionReadiness,
  getReadinessColor,
} from '../../utils/inspectionReadiness';
import type { InspectionReadinessScore } from '../../utils/inspectionReadiness';
import PillarCard from './PillarCard';
import LocationCard from './LocationCard';

// ===============================================
// TYPES
// ===============================================

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

interface DemoVendorSchedule {
  day: string;
  service: string;
  vendor: string;
}

interface ComplianceThresholds {
  warningLevel: number;
  criticalLevel: number;
}

interface LocationDemoData {
  id: string;
  name: string;
  foodOps: number;
  foodDocs: number;
  fireOps: number;
  fireDocs: number;
}

interface ComplianceAlertItem {
  severity: 'critical' | 'warning';
  title: string;
  actionLabel: string;
  actionRoute: string;
  location?: string;
}

interface AttentionItem {
  title: string;
  detail: string;
  actionLabel: string;
  actionRoute: string;
}

type DashboardState = 'all_clear' | 'warning' | 'critical';

// ===============================================
// DEMO DATA
// ===============================================

const DEMO_CHECKLISTS: DemoChecklist[] = [
  { id: 'opening', name: 'Opening', status: 'done', assignee: 'Maria', completedAt: '6:15 AM', items: 12, completed: 12 },
  { id: 'midday', name: 'Midday', status: 'in_progress', assignee: 'Carlos', items: 8, completed: 4 },
  { id: 'closing', name: 'Closing', status: 'not_started', assignee: null, items: 10, completed: 0 },
];

const DEMO_TEMPERATURES: DemoTemperature[] = [
  { id: 'cooler-1', name: 'Cooler #1', temp: 37.8, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '2 min ago' },
  { id: 'cooler-2', name: 'Cooler #2', temp: 39.5, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '4 min ago' },
  { id: 'freezer', name: 'Freezer', temp: -2, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '6 min ago' },
  { id: 'prep', name: 'Prep Cooler', temp: null, unit: '\u00B0F', status: 'needs_log', source: 'manual', lastReading: '4 hours ago' },
];

const DEMO_VENDOR_SCHEDULE: DemoVendorSchedule[] = [
  { day: 'Mon', service: 'Pest Control', vendor: 'Western Pest' },
  { day: 'Wed', service: 'Grease Trap', vendor: 'Valley Grease' },
  { day: 'Fri', service: 'Hood Cleaning', vendor: 'Cleaning Pros Plus' },
];

const DEFAULT_THRESHOLDS: ComplianceThresholds = { warningLevel: 85, criticalLevel: 75 };

// --- State-specific location data ---

const DEMO_STATES: Record<DashboardState, {
  locations: LocationDemoData[];
  complianceAlert?: { location: string; pillar: string; pillarScore: number; items: string[] };
  criticalItems?: ComplianceAlertItem[];
  attentionItems: AttentionItem[];
}> = {
  all_clear: {
    locations: [
      { id: 'downtown', name: 'Downtown Kitchen', foodOps: 97, foodDocs: 94, fireOps: 88, fireDocs: 95 },
      { id: 'airport', name: 'Airport Cafe', foodOps: 89, foodDocs: 86, fireOps: 85, fireDocs: 90 },
      { id: 'university', name: 'University Dining', foodOps: 94, foodDocs: 91, fireOps: 85, fireDocs: 92 },
    ],
    attentionItems: [
      { title: 'Prep cooler not logged since 10 AM', detail: 'Manual log required', actionLabel: 'Log Temp', actionRoute: '/temp-logs' },
    ],
  },
  warning: {
    locations: [
      { id: 'downtown', name: 'Downtown Kitchen', foodOps: 97, foodDocs: 94, fireOps: 88, fireDocs: 95 },
      { id: 'airport', name: 'Airport Cafe', foodOps: 82, foodDocs: 80, fireOps: 78, fireDocs: 82 },
      { id: 'university', name: 'University Dining', foodOps: 94, foodDocs: 91, fireOps: 85, fireDocs: 92 },
    ],
    complianceAlert: {
      location: 'Airport Cafe',
      pillar: 'Fire Safety',
      pillarScore: 80,
      items: [
        'Hood cleaning cert expires in 5 days',
        'Fire suppression inspection overdue',
        'Vendor insurance expires in 12 days',
      ],
    },
    attentionItems: [
      { title: 'Prep cooler not logged since 10 AM', detail: 'Manual log required', actionLabel: 'Log Temp', actionRoute: '/temp-logs' },
    ],
  },
  critical: {
    locations: [
      { id: 'downtown', name: 'Downtown Kitchen', foodOps: 97, foodDocs: 94, fireOps: 88, fireDocs: 95 },
      { id: 'airport', name: 'Airport Cafe', foodOps: 72, foodDocs: 65, fireOps: 58, fireDocs: 62 },
      { id: 'university', name: 'University Dining', foodOps: 55, foodDocs: 50, fireOps: 52, fireDocs: 58 },
    ],
    criticalItems: [
      { severity: 'critical', title: 'Health permit expired 3 days ago', actionLabel: 'Upload', actionRoute: '/documents', location: 'University Dining' },
      { severity: 'critical', title: 'Hood cleaning 2 months overdue', actionLabel: 'Schedule', actionRoute: '/vendors', location: 'Airport Cafe' },
      { severity: 'critical', title: 'Fire suppression failed inspection', actionLabel: 'View', actionRoute: '/documents', location: 'Airport Cafe' },
      { severity: 'warning', title: '3 food handler cards expiring this month', actionLabel: 'View', actionRoute: '/documents', location: 'University Dining' },
      { severity: 'warning', title: 'Vendor insurance expires in 8 days', actionLabel: 'Upload', actionRoute: '/documents', location: 'Airport Cafe' },
    ],
    attentionItems: [
      { title: 'Prep cooler not logged since 10 AM', detail: 'Manual log required', actionLabel: 'Log Temp', actionRoute: '/temp-logs' },
    ],
  },
};

// ===============================================
// HELPERS
// ===============================================

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

function ChecklistIcon({ status }: { status: DemoChecklist['status'] }) {
  if (status === 'done') return <CheckCircle2 size={18} className="text-green-500 shrink-0" />;
  if (status === 'in_progress') return <Hammer size={18} className="shrink-0" style={{ color: '#d4af37' }} />;
  return <Clock size={18} className="text-gray-400 shrink-0" />;
}

function TempStatusDot({ status }: { status: DemoTemperature['status'] }) {
  if (status === 'normal') return <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />;
  if (status === 'alert') return <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />;
}

function getLocationState(score: number, thresholds: ComplianceThresholds): 'all_clear' | 'warning' | 'critical' {
  if (score < thresholds.criticalLevel) return 'critical';
  if (score < thresholds.warningLevel) return 'warning';
  return 'all_clear';
}

// ===============================================
// STATUS BADGE
// ===============================================

function StatusBadge({ score, state, onClick }: { score: number; state: 'all_clear' | 'warning' | 'critical'; onClick: () => void }) {
  const config = {
    all_clear: { bg: '#dcfce7', color: '#16a34a', label: `Ready (${score}%)` },
    warning: { bg: '#fef3c7', color: '#d97706', label: `${score}% \u2193` },
    critical: { bg: '#fee2e2', color: '#dc2626', label: `${score}%` },
  }[state];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {state === 'all_clear' && <CheckCircle2 size={14} />}
      {state === 'warning' && <AlertTriangle size={14} />}
      {state === 'critical' && <ShieldAlert size={14} />}
      {config.label}
    </button>
  );
}

// ===============================================
// DAILY TASKS SECTION (shared across all states)
// ===============================================

function DailyTasks({ navigate }: { navigate: (path: string) => void }) {
  return (
    <>
      {/* TODAY label */}
      <SectionHeader>Today</SectionHeader>

      {/* Checklists — compact horizontal */}
      <Card>
        <SectionHeader>Checklists</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEMO_CHECKLISTS.map((cl) => (
            <button
              key={cl.id}
              type="button"
              onClick={() => navigate('/checklists')}
              className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <ChecklistIcon status={cl.status} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{cl.name}</p>
                <p className="text-xs text-gray-500">
                  {cl.status === 'done' && `${cl.assignee} \u00B7 ${cl.completedAt}`}
                  {cl.status === 'in_progress' && `${cl.completed}/${cl.items} \u00B7 ${cl.assignee}`}
                  {cl.status === 'not_started' && 'Not started'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Temperatures — compact grid */}
      <Card>
        <SectionHeader>Temperatures</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEMO_TEMPERATURES.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2.5 p-2.5 rounded-lg"
              style={{ backgroundColor: t.status === 'needs_log' ? '#fef9ee' : undefined }}
            >
              <TempStatusDot status={t.status} />
              <span className="text-sm font-medium text-gray-900 flex-1">{t.name}</span>
              {t.temp !== null ? (
                <span className="text-sm tabular-nums" style={{ color: t.status === 'alert' ? '#dc2626' : '#374151' }}>
                  {t.temp}{t.unit}
                </span>
              ) : (
                <span className="text-sm text-gray-300">&mdash;</span>
              )}
              {t.source === 'iot' && <Radio size={12} className="text-blue-400" />}
              {t.status === 'needs_log' && (
                <button
                  type="button"
                  onClick={() => navigate('/temp-logs')}
                  className="text-xs font-medium px-2 py-1 rounded hover:bg-white transition-colors"
                  style={{ color: '#1e4d6b' }}
                >
                  Log Temp →
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Vendor Schedule — simple list */}
      <Card>
        <SectionHeader>This Week</SectionHeader>
        <div className="space-y-2">
          {DEMO_VENDOR_SCHEDULE.map((vs, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigate('/vendors')}
              className="w-full flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <CalendarDays size={14} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-900">
                <span className="font-medium">{vs.day}:</span> {vs.service} &middot; {vs.vendor}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

// ===============================================
// SINGLE-LOCATION VIEW
// ===============================================

function SingleLocationView({
  locationName,
  score,
  locState,
  demoState,
  navigate,
  complianceAlert,
  criticalItems,
  attentionItems,
}: {
  locationName: string;
  score: InspectionReadinessScore;
  locState: 'all_clear' | 'warning' | 'critical';
  demoState: DashboardState;
  navigate: (path: string) => void;
  complianceAlert?: { location: string; pillar: string; pillarScore: number; items: string[] };
  criticalItems?: ComplianceAlertItem[];
  attentionItems: AttentionItem[];
}) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={18} style={{ color: '#1e4d6b' }} />
          <h2 className="text-lg font-semibold text-gray-900">{locationName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge score={score.overall} state={locState} onClick={() => navigate('/compliance')} />
          <span className="text-sm text-gray-400">{today}</span>
        </div>
      </div>

      {/* STATE 3: CRITICAL — red alert banner */}
      {locState === 'critical' && criticalItems && (
        <div
          className="rounded-lg p-4"
          style={{ borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2' }}
        >
          <p className="text-sm font-bold text-red-700 mb-3">
            <ShieldAlert size={16} className="inline mr-1.5" style={{ verticalAlign: 'text-bottom' }} />
            INSPECTION READINESS: {score.overall}% — ACTION REQUIRED
          </p>
          {/* Pillar cards inline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <PillarCard pillar="food_safety" score={score.foodSafety.score} opsScore={score.foodSafety.ops} docsScore={score.foodSafety.docs} />
            <PillarCard pillar="fire_safety" score={score.fireSafety.score} opsScore={score.fireSafety.ops} docsScore={score.fireSafety.docs} />
          </div>
          {/* Critical items */}
          <div className="space-y-2">
            {criticalItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.severity === 'critical' ? '#dc2626' : '#d4af37' }}
                />
                <span className="text-sm text-gray-800 flex-1">{item.title}</span>
                <button
                  type="button"
                  onClick={() => navigate(item.actionRoute)}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg text-white shrink-0"
                  style={{ backgroundColor: '#1e4d6b' }}
                >
                  {item.actionLabel} →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATE 2: WARNING — compliance alert card */}
      {locState === 'warning' && complianceAlert && (
        <div
          className="rounded-lg p-4"
          style={{ borderLeft: '4px solid #d4af37', backgroundColor: '#fffbeb' }}
        >
          <p className="text-sm font-bold mb-2" style={{ color: '#d97706' }}>
            <AlertTriangle size={16} className="inline mr-1.5" style={{ verticalAlign: 'text-bottom' }} />
            COMPLIANCE ALERT
          </p>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            {complianceAlert.pillar} dropped to {complianceAlert.pillarScore}%
          </p>
          <ul className="space-y-1 mb-3">
            {complianceAlert.items.map((item, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate('/compliance')}
            className="text-xs font-medium hover:underline"
            style={{ color: '#1e4d6b' }}
          >
            View Compliance Details →
          </button>
        </div>
      )}

      {/* Daily tasks */}
      <DailyTasks navigate={navigate} />

      {/* Needs Attention — operational items only (hidden if empty) */}
      {attentionItems.length > 0 && (
        <Card>
          <SectionHeader>{attentionItems.length} item{attentionItems.length > 1 ? 's' : ''} needs attention</SectionHeader>
          <div className="space-y-2">
            {attentionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ backgroundColor: '#eef4f8' }}
              >
                <Thermometer size={16} style={{ color: '#1e4d6b' }} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(item.actionRoute)}
                  className="text-xs font-medium shrink-0 px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#1e4d6b' }}
                >
                  {item.actionLabel} →
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ===============================================
// MAIN COMPONENT
// ===============================================

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { isDemoMode, companyName } = useDemo();

  // Demo state switcher
  const [demoState, setDemoState] = useState<DashboardState>('all_clear');
  const thresholds = DEFAULT_THRESHOLDS;
  const stateData = DEMO_STATES[demoState];

  // Compute scores for each location
  const locationScores = useMemo(() => {
    return stateData.locations.map((loc) => {
      const score = calculateInspectionReadiness(loc.foodOps, loc.foodDocs, loc.fireOps, loc.fireDocs);
      return { ...loc, score };
    });
  }, [stateData.locations]);

  // Org-wide score = average
  const orgScore = useMemo(() => {
    const avg = locationScores.reduce((sum, l) => sum + l.score.overall, 0) / locationScores.length;
    return Math.round(avg);
  }, [locationScores]);

  // Worst location determines org state
  const worstScore = Math.min(...locationScores.map(l => l.score.overall));
  const orgState = getLocationState(worstScore, thresholds);

  const isMultiLocation = locationScores.length > 1;
  const [selectedLocationId, setSelectedLocationId] = useState(locationScores[0]?.id || 'downtown');
  const selectedLoc = locationScores.find(l => l.id === selectedLocationId) || locationScores[0];
  const selectedLocState = getLocationState(selectedLoc.score.overall, thresholds);

  // Locations that need attention (below warning threshold)
  const problemLocations = locationScores.filter(l => l.score.overall < thresholds.warningLevel);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Single-location operator
  if (!isMultiLocation) {
    const loc = locationScores[0];
    const locState = getLocationState(loc.score.overall, thresholds);
    return (
      <div style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Demo state switcher */}
        {isDemoMode && (
          <DemoStateSwitcher value={demoState} onChange={setDemoState} />
        )}
        <SingleLocationView
          locationName={loc.name}
          score={loc.score}
          locState={locState}
          demoState={demoState}
          navigate={navigate}
          complianceAlert={stateData.complianceAlert}
          criticalItems={stateData.criticalItems}
          attentionItems={stateData.attentionItems}
        />
      </div>
    );
  }

  // --------------- Multi-Location View ---------------

  return (
    <div className="space-y-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Demo state switcher */}
      {isDemoMode && (
        <DemoStateSwitcher value={demoState} onChange={setDemoState} />
      )}

      {/* Org Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isDemoMode ? companyName : 'My Organization'}
            <span className="text-sm font-normal text-gray-400 ml-2">({locationScores.length} locations)</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge score={orgScore} state={orgState} onClick={() => navigate('/compliance')} />
          <span className="text-sm text-gray-400">{today}</span>
        </div>
      </div>

      {/* Location Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {locationScores.map((loc) => (
          <LocationCard
            key={loc.id}
            locationId={loc.id}
            locationName={loc.name}
            score={loc.score.overall}
            onClick={() => setSelectedLocationId(loc.id)}
            isSelected={loc.id === selectedLocationId}
          />
        ))}
      </div>

      {/* Locations needing attention (multi-location warning) */}
      {problemLocations.length > 0 && (
        <Card>
          <SectionHeader>{problemLocations.length} location{problemLocations.length > 1 ? 's' : ''} need{problemLocations.length === 1 ? 's' : ''} attention</SectionHeader>
          <div className="space-y-2">
            {problemLocations
              .sort((a, b) => a.score.overall - b.score.overall)
              .map((loc) => {
                const locSt = getLocationState(loc.score.overall, thresholds);
                const borderColor = locSt === 'critical' ? '#dc2626' : '#d4af37';
                // Show which pillar is worst
                const worstPillar = loc.score.foodSafety.score < loc.score.fireSafety.score
                  ? `Food Safety at ${loc.score.foodSafety.score}%`
                  : loc.score.fireSafety.score < loc.score.foodSafety.score
                    ? `Fire Safety at ${loc.score.fireSafety.score}%`
                    : `Food + Fire Safety`;
                return (
                  <div
                    key={loc.id}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ borderLeft: `4px solid ${borderColor}`, backgroundColor: locSt === 'critical' ? '#fef2f2' : '#fffbeb' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {loc.name} ({loc.score.overall}%) — {worstPillar}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedLocationId(loc.id)}
                      className="text-xs font-medium shrink-0 px-2.5 py-1 rounded hover:bg-white/50 transition-colors"
                      style={{ color: '#1e4d6b' }}
                    >
                      View {loc.name} →
                    </button>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Currently Viewing divider */}
      <div className="flex items-center gap-3 pt-1">
        <MapPin size={16} style={{ color: '#1e4d6b' }} />
        <span className="text-sm font-medium text-gray-700">Currently viewing: {selectedLoc.name}</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Selected location view (state-appropriate) */}
      <SingleLocationView
        locationName={selectedLoc.name}
        score={selectedLoc.score}
        locState={selectedLocState}
        demoState={demoState}
        navigate={navigate}
        complianceAlert={selectedLocState === 'warning' ? stateData.complianceAlert : undefined}
        criticalItems={selectedLocState === 'critical' ? stateData.criticalItems : undefined}
        attentionItems={stateData.attentionItems}
      />
    </div>
  );
}

// ===============================================
// DEMO STATE SWITCHER
// ===============================================

function DemoStateSwitcher({ value, onChange }: { value: DashboardState; onChange: (s: DashboardState) => void }) {
  const options: { key: DashboardState; label: string }[] = [
    { key: 'all_clear', label: 'All Clear' },
    { key: 'warning', label: 'Warning' },
    { key: 'critical', label: 'Critical' },
  ];

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-xs font-medium text-gray-400 uppercase" style={{ letterSpacing: '0.05em' }}>
        Dashboard State:
      </span>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              value === opt.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
