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

interface JurisdictionThresholds {
  warningLevel: number;
  criticalLevel: number;
  source: string;
  jurisdiction: string;
  autoAssigned: boolean;
  explanation: string;
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

type DashboardFilter = 'all' | 'attention' | 'critical';

// ===============================================
// THRESHOLDS
// ===============================================

const DEMO_JURISDICTION_THRESHOLDS: JurisdictionThresholds = {
  warningLevel: 85,
  criticalLevel: 70,
  source: 'CA Health & Safety Code + NFPA 96 2024',
  jurisdiction: 'Sacramento County, California',
  autoAssigned: true,
  explanation: 'Based on Sacramento County health department requirements and NFPA 96 2024 fire safety standards.',
};

// ===============================================
// FIXED DEMO DATA — scores never change
// ===============================================

// Sub-scores calibrated so the scoring engine produces:
// Downtown Kitchen → 94%, Airport Cafe → 82%, University Dining → 68%
const DEMO_LOCATIONS: LocationDemoData[] = [
  { id: 'downtown', name: 'Downtown Kitchen', foodOps: 97, foodDocs: 94, fireOps: 88, fireDocs: 95 },
  { id: 'airport', name: 'Airport Cafe', foodOps: 85, foodDocs: 82, fireOps: 78, fireDocs: 82 },
  { id: 'university', name: 'University Dining', foodOps: 72, foodDocs: 68, fireOps: 62, fireDocs: 66 },
];

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

const DEMO_ATTENTION_ITEMS: AttentionItem[] = [
  { title: 'Prep cooler not logged since 10 AM', detail: 'Manual log required', actionLabel: 'Log Temp', actionRoute: '/temp-logs' },
];

// Per-location compliance alerts (based on fixed scores)
const AIRPORT_COMPLIANCE_ALERT = {
  location: 'Airport Cafe',
  pillar: 'Fire Safety',
  pillarScore: 80,
  jurisdictionMessage: 'Sacramento County requires approximately 70% to pass inspection. Airport Cafe is at 82%, below your safety buffer of 85%.',
  items: [
    'Hood cleaning cert expires in 5 days',
    'Fire suppression inspection overdue',
    'Vendor insurance expires in 12 days',
  ],
};

const UNIVERSITY_CRITICAL_ITEMS: ComplianceAlertItem[] = [
  { severity: 'critical', title: 'Health permit expired 3 days ago', actionLabel: 'Upload', actionRoute: '/documents', location: 'University Dining' },
  { severity: 'critical', title: 'Hood cleaning 2 months overdue', actionLabel: 'Schedule', actionRoute: '/vendors', location: 'University Dining' },
  { severity: 'critical', title: 'Fire suppression failed inspection', actionLabel: 'View', actionRoute: '/documents', location: 'University Dining' },
  { severity: 'warning', title: '3 food handler cards expiring this month', actionLabel: 'View', actionRoute: '/documents', location: 'University Dining' },
];

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

function getLocationState(score: number, thresholds: JurisdictionThresholds): 'all_clear' | 'warning' | 'critical' {
  if (score < thresholds.criticalLevel) return 'critical';
  if (score < thresholds.warningLevel) return 'warning';
  return 'all_clear';
}

// ===============================================
// STATUS BADGE
// ===============================================

function StatusBadge({
  score,
  state,
  thresholds,
  onClick,
}: {
  score: number;
  state: 'all_clear' | 'warning' | 'critical';
  thresholds: JurisdictionThresholds;
  onClick: () => void;
}) {
  const config = {
    all_clear: {
      bg: '#dcfce7',
      color: '#16a34a',
      label: `Ready (${score})`,
      tooltip: `Above ${thresholds.jurisdiction} threshold (${thresholds.warningLevel}%)`,
    },
    warning: {
      bg: '#fef3c7',
      color: '#d97706',
      label: `${score} \u2014 Below threshold (${thresholds.warningLevel})`,
      tooltip: `Below ${thresholds.jurisdiction} safety buffer of ${thresholds.warningLevel}%`,
    },
    critical: {
      bg: '#fee2e2',
      color: '#dc2626',
      label: `${score} \u2014 Will fail inspection`,
      tooltip: `Below ${thresholds.jurisdiction} passing threshold of ${thresholds.criticalLevel}%`,
    },
  }[state];

  return (
    <button
      type="button"
      onClick={onClick}
      title={config.tooltip}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 shrink-0"
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
// DAILY TASKS SECTION
// ===============================================

function DailyTasks({ navigate }: { navigate: (path: string) => void }) {
  return (
    <>
      <SectionHeader>Today</SectionHeader>

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
                  Log Temp &rarr;
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

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
  locationId,
  score,
  locState,
  thresholds,
  navigate,
  attentionItems,
}: {
  locationName: string;
  locationId: string;
  score: InspectionReadinessScore;
  locState: 'all_clear' | 'warning' | 'critical';
  thresholds: JurisdictionThresholds;
  navigate: (path: string) => void;
  attentionItems: AttentionItem[];
}) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Derive alerts from the location's actual score
  const complianceAlert = locationId === 'airport' ? AIRPORT_COMPLIANCE_ALERT : undefined;
  const criticalItems = locationId === 'university' ? UNIVERSITY_CRITICAL_ITEMS : undefined;

  return (
    <div className="space-y-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={18} style={{ color: '#1e4d6b' }} />
          <h2 className="text-lg font-semibold text-gray-900">{locationName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge score={score.overall} state={locState} thresholds={thresholds} onClick={() => navigate('/scoring-breakdown')} />
          <span className="text-sm text-gray-400">{today}</span>
        </div>
      </div>

      {/* CRITICAL alert */}
      {locState === 'critical' && criticalItems && (
        <div
          className="rounded-lg p-4"
          style={{ borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2' }}
        >
          <p className="text-sm font-bold text-red-700 mb-2">
            <ShieldAlert size={16} className="inline mr-1.5" style={{ verticalAlign: 'text-bottom' }} />
            INSPECTION READINESS: {score.overall} &mdash; ACTION REQUIRED
          </p>
          <p className="text-sm text-gray-700 mb-4">
            Based on {thresholds.jurisdiction} requirements, this location would likely fail inspection.
            Passing threshold: {thresholds.criticalLevel}%.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <PillarCard pillar="food_safety" score={score.foodSafety.score} opsScore={score.foodSafety.ops} docsScore={score.foodSafety.docs} />
            <PillarCard pillar="fire_safety" score={score.fireSafety.score} opsScore={score.fireSafety.ops} docsScore={score.fireSafety.docs} />
          </div>
          <p className="text-xs font-semibold uppercase text-red-600 mb-2" style={{ letterSpacing: '0.05em' }}>
            Critical Items
          </p>
          <div className="space-y-2">
            {criticalItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.severity === 'critical' ? '#dc2626' : '#d4af37' }}
                />
                <span className="text-sm text-gray-800 flex-1">
                  {item.title}
                  {item.location && (
                    <span className="text-xs text-gray-400 ml-1.5">({item.location})</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(item.actionRoute)}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg text-white shrink-0"
                  style={{ backgroundColor: '#1e4d6b' }}
                >
                  {item.actionLabel} &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WARNING alert */}
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
            {complianceAlert.pillar} dropped to {complianceAlert.pillarScore}
          </p>
          <p className="text-sm text-gray-600 mb-3">
            {complianceAlert.jurisdictionMessage}
          </p>
          <ul className="space-y-1 mb-3">
            {complianceAlert.items.map((item, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate('/scoring-breakdown')}
            className="text-xs font-medium hover:underline"
            style={{ color: '#1e4d6b' }}
          >
            View Compliance Details &rarr;
          </button>
        </div>
      )}

      {/* Daily tasks */}
      <DailyTasks navigate={navigate} />

      {/* Needs Attention */}
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
                  {item.actionLabel} &rarr;
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
// FILTER TABS
// ===============================================

function FilterTabs({
  value,
  onChange,
  attentionCount,
  criticalCount,
}: {
  value: DashboardFilter;
  onChange: (f: DashboardFilter) => void;
  attentionCount: number;
  criticalCount: number;
}) {
  const tabs: { key: DashboardFilter; label: string }[] = [
    { key: 'all', label: 'All Locations' },
    { key: 'attention', label: `Needs Attention (${attentionCount})` },
    { key: 'critical', label: `Critical (${criticalCount})` },
  ];

  return (
    <div className="flex items-center gap-1 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === tab.key
              ? 'text-[#1e4d6b] bg-[#eef4f8]'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          style={value === tab.key ? { borderBottom: '2px solid #1e4d6b' } : undefined}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ===============================================
// MAIN COMPONENT
// ===============================================

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { isDemoMode, companyName } = useDemo();

  const thresholds = DEMO_JURISDICTION_THRESHOLDS;

  // Compute scores for each location (fixed — never change)
  const locationScores = useMemo(() => {
    return DEMO_LOCATIONS.map((loc) => {
      const score = calculateInspectionReadiness(loc.foodOps, loc.foodDocs, loc.fireOps, loc.fireDocs);
      return { ...loc, score };
    });
  }, []);

  // Filter state
  const [filter, setFilter] = useState<DashboardFilter>('all');

  // Count locations in each category
  const attentionCount = useMemo(
    () => locationScores.filter(l => l.score.overall < thresholds.warningLevel).length,
    [locationScores, thresholds.warningLevel],
  );
  const criticalCount = useMemo(
    () => locationScores.filter(l => l.score.overall < thresholds.criticalLevel).length,
    [locationScores, thresholds.criticalLevel],
  );

  // Filtered locations (for the card row)
  const filteredLocations = useMemo(() => {
    switch (filter) {
      case 'attention':
        return locationScores.filter(l => l.score.overall < thresholds.warningLevel);
      case 'critical':
        return locationScores.filter(l => l.score.overall < thresholds.criticalLevel);
      default:
        return locationScores;
    }
  }, [locationScores, filter, thresholds]);

  // Org-wide score = average of ALL locations (not filtered)
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
        <SingleLocationView
          locationName={loc.name}
          locationId={loc.id}
          score={loc.score}
          locState={locState}
          thresholds={thresholds}
          navigate={navigate}
          attentionItems={DEMO_ATTENTION_ITEMS}
        />
      </div>
    );
  }

  // --------------- Multi-Location View ---------------

  return (
    <div className="space-y-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Org Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isDemoMode ? companyName : 'My Organization'}
            <span className="text-sm font-normal text-gray-400 ml-2">({locationScores.length} locations)</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge score={orgScore} state={orgState} thresholds={thresholds} onClick={() => navigate('/scoring-breakdown')} />
          <span className="text-sm text-gray-400">{today}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      {isDemoMode && (
        <FilterTabs
          value={filter}
          onChange={setFilter}
          attentionCount={attentionCount}
          criticalCount={criticalCount}
        />
      )}

      {/* Location Cards — filtered */}
      {filteredLocations.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {filteredLocations.map((loc) => (
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
      ) : (
        <div className="flex items-center gap-2 py-6 justify-center rounded-lg bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span className="text-green-600 font-medium text-sm">All locations are above this threshold &#x2705;</span>
        </div>
      )}

      {/* Locations below inspection threshold */}
      {problemLocations.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={16} className="text-red-600" />
            <SectionHeader>
              {problemLocations.length} location{problemLocations.length > 1 ? 's' : ''} below inspection threshold
            </SectionHeader>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {thresholds.jurisdiction} passing threshold: {thresholds.criticalLevel}% &middot; Source: {thresholds.source}
          </p>
          <div className="space-y-2">
            {problemLocations
              .sort((a, b) => a.score.overall - b.score.overall)
              .map((loc) => {
                const locSt = getLocationState(loc.score.overall, thresholds);
                const borderColor = locSt === 'critical' ? '#dc2626' : '#d4af37';
                const worstPillar = loc.score.foodSafety.score < loc.score.fireSafety.score
                  ? `Food Safety at ${loc.score.foodSafety.score}`
                  : loc.score.fireSafety.score < loc.score.foodSafety.score
                    ? `Fire Safety at ${loc.score.fireSafety.score}`
                    : `Food + Fire Safety both critical`;
                const failMessage = locSt === 'critical'
                  ? 'Would fail inspection'
                  : `Below safety buffer of ${thresholds.warningLevel}%`;
                return (
                  <div
                    key={loc.id}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ borderLeft: `4px solid ${borderColor}`, backgroundColor: locSt === 'critical' ? '#fef2f2' : '#fffbeb' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {loc.name} ({loc.score.overall}%) &mdash; {failMessage}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {worstPillar}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedLocationId(loc.id)}
                      className="text-xs font-medium shrink-0 px-2.5 py-1 rounded hover:bg-white/50 transition-colors"
                      style={{ color: '#1e4d6b' }}
                    >
                      View {loc.name} &rarr;
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

      {/* Selected location view */}
      <SingleLocationView
        locationName={selectedLoc.name}
        locationId={selectedLoc.id}
        score={selectedLoc.score}
        locState={selectedLocState}
        thresholds={thresholds}
        navigate={navigate}
        attentionItems={DEMO_ATTENTION_ITEMS}
      />
    </div>
  );
}
