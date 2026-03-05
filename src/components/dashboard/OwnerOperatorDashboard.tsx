import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Check,
  CheckCircle2, Hammer, AlertCircle,
  UtensilsCrossed, Flame, ArrowRight,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useEmulation, type EmulatedUser } from '../../contexts/EmulationContext';
import { DEMO_ROLE_NAMES } from './shared/constants';
import {
  useDashboardData,
  type TaskItem,
  type LocationWithScores,
  type ImpactItem,
} from '../../hooks/useDashboardData';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import type { LocationScore, LocationJurisdiction } from '../../types/jurisdiction';
import { GOLD, NAVY, BODY_TEXT, FONT, JIE_LOC_MAP, MUTED } from './shared/constants';
import { ReScoreAlertsWidget } from './ReScoreAlertsWidget';
import { K2CWidget } from '../referral/K2CWidget';
import { K2CInviteModal } from '../referral/K2CInviteModal';
import { demoReferral } from '../../data/demoData';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';
import { HealthBanner, type HealthStatus } from './shared/HealthBanner';
import {
  ComplianceTrendWidget,
  TopRiskItemsWidget,
  InspectionProbabilityWidget,
  JurisdictionBenchmarkWidget,
  type RiskItem,
  type InspectionEstimate,
  type BenchmarkItem,
} from './shared/insights';
import { CATEGORY_ORG_TRENDS } from '../../data/trendDemoData';
import { DEMO_CORRECTIVE_ACTIONS } from '../../data/correctiveActionsDemoData';
import { IntelligenceFeedWidget } from './IntelligenceFeedWidget';
import { AnnualVendorSpendWidget, ServicesDueSoonWidget } from './VendorServiceWidgets';
import {
  VENDOR_DEMO_SERVICES,
  getDemoAnnualSpend,
  getDemoServiceLocationCount,
} from '../../data/vendorServicesDemoData';


// ================================================================
// LOCATION STATUS ROW (traffic light)
// ================================================================

interface LocationStatusInfo {
  locId: string;
  name: string;
  status: 'all_clear' | 'warning' | 'action_required';
  statusText: string;
}

function getLocationStatusInfo(
  loc: LocationWithScores,
  jieScore: LocationScore | null,
  _jurisdictionData: LocationJurisdiction | null,
): LocationStatusInfo {
  const foodStatus = jieScore?.foodSafety?.status ?? 'unknown';
  const fireStatus = jieScore?.facilitySafety?.status ?? 'unknown';
  const fireDetails = jieScore?.facilitySafety?.details as Record<string, any> | null;

  if (foodStatus === 'failing' || fireStatus === 'failing') {
    const issues: string[] = [];
    if (foodStatus === 'failing') {
      const summary = (jieScore?.foodSafety?.details as Record<string, any>)?.summary;
      issues.push(summary || 'Food safety violations');
    }
    if (fireStatus === 'failing') {
      issues.push('Facility safety non-compliant');
    }
    return { locId: loc.id, name: loc.name, status: 'action_required', statusText: issues.join(' \u00b7 ') };
  }

  if (foodStatus === 'at_risk' || fireStatus === 'at_risk') {
    const issues: string[] = [];
    if (foodStatus === 'at_risk') issues.push('Food safety at risk');
    if (fireStatus === 'at_risk') issues.push('Fire cert due soon');
    if (fireDetails) {
      if (fireDetails.hoodStatus === 'due_soon') issues.push('Hood cert due soon');
      if (fireDetails.ansulStatus === 'due_soon') issues.push('Ansul cert due soon');
    }
    return { locId: loc.id, name: loc.name, status: 'warning', statusText: issues.join(' \u00b7 ') };
  }

  return { locId: loc.id, name: loc.name, status: 'all_clear', statusText: 'All Clear' };
}

function LocationStatusRow({ info, navigate }: { info: LocationStatusInfo; navigate: (path: string) => void }) {
  const dotColor = info.status === 'all_clear' ? '#16a34a'
    : info.status === 'warning' ? '#d97706' : '#dc2626';
  const textColor = info.status === 'all_clear' ? '#16a34a'
    : info.status === 'warning' ? '#92400e' : '#991b1b';

  return (
    <button
      type="button"
      onClick={() => navigate(`/dashboard?location=${info.locId}`)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      style={{ borderBottom: '1px solid #F0F0F0' }}
    >
      <span className="shrink-0 rounded-full" style={{ width: 12, height: 12, backgroundColor: dotColor }} />
      <span className="text-sm font-semibold flex-1" style={{ color: BODY_TEXT }}>{info.name}</span>
      <span className="text-xs font-medium" style={{ color: textColor }}>{info.statusText}</span>
      <span className="text-xs font-medium shrink-0" style={{ color: NAVY }}>View &rarr;</span>
    </button>
  );
}


// ================================================================
// TODAY'S TASKS (flat list, no tabs)
// ================================================================

const MAX_VISIBLE_TASKS = 6;

function TodaysTasks({ navigate, tasks }: { navigate: (path: string) => void; tasks: TaskItem[] }) {
  const done = tasks.filter(tk => tk.status === 'done').length;
  const visible = tasks.slice(0, MAX_VISIBLE_TASKS);
  const hasMore = tasks.length > MAX_VISIBLE_TASKS;

  return (
    <div className="bg-white rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Today's Tasks</h3>
        <span className="text-xs font-medium" style={{ color: NAVY }}>{done}/{tasks.length} complete</span>
      </div>
      <div>
        {tasks.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">No tasks scheduled.</p>
          </div>
        )}
        {visible.map(task => {
          const isOverdue = task.status === 'overdue';
          const isDone = task.status === 'done';
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => navigate(task.route)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              style={{
                borderBottom: '1px solid #F0F0F0',
                backgroundColor: isOverdue ? '#fef2f2' : undefined,
              }}
            >
              {isDone && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
              {task.status === 'in_progress' && <Hammer size={16} className="shrink-0" style={{ color: GOLD }} />}
              {task.status === 'pending' && <span className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300" />}
              {isOverdue && <AlertCircle size={16} className="text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {task.label}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-[11px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                  {task.time}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => navigate('/checklists')}
          className="w-full px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
          style={{ color: NAVY }}
        >
          View all {tasks.length} tasks &rarr;
        </button>
      )}
    </div>
  );
}


// ================================================================
// SKELETON LOADER
// ================================================================

function DashboardSkeleton() {
  return (
    <div style={{ ...FONT, backgroundColor: '#F5F6F8', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg p-5 animate-pulse" style={{ height: i === 4 ? 200 : 60 }}>
            <div className="w-32 h-3 bg-gray-200 rounded mb-3" />
            <div className="w-full h-3 bg-gray-100 rounded" />
          </div>
        ))}
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
// RISK TYPE HELPERS
// ================================================================

type RiskType = 'liability' | 'revenue' | 'cost' | 'operational';
const RISK_ORDER: Record<RiskType, number> = { liability: 0, revenue: 1, cost: 2, operational: 3 };

function getRiskType(item: ImpactItem): RiskType {
  if (item.pillar === 'Facility Safety' && item.severity === 'critical') return 'liability';
  if (item.pillar === 'Food Safety' && item.severity === 'critical') return 'liability';
  if (item.pillar === 'Facility Safety') return 'cost';
  if (item.pillar === 'Food Safety') return 'revenue';
  return 'operational';
}

const RISK_LABEL_COLOR: Record<RiskType, { bg: string; text: string; label: string }> = {
  liability: { bg: '#fef2f2', text: '#991b1b', label: 'Liability' },
  revenue: { bg: '#fffbeb', text: '#92400e', label: 'Revenue' },
  cost: { bg: '#f0f4ff', text: '#3730a3', label: 'Cost' },
  operational: { bg: '#f0fdf4', text: '#166534', label: 'Operational' },
};


// ================================================================
// MAIN COMPONENT
// ================================================================

export default function OwnerOperatorDashboard() {
  const navigate = useNavigate();
  const { isDemoMode, firstName: demoFirstName } = useDemo();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights'>('overview');
  const { user, profile } = useAuth();
  const { userRole } = useRole();
  const { isEmulating, startEmulation, stopEmulation } = useEmulation();
  const [emulationConfirmRole, setEmulationConfirmRole] = useState<string | null>(null);
  const { data, loading, error, refresh } = useDashboardData();

  // JIE: Dual-authority jurisdiction data per location
  const locations = data.locations ?? [];
  const jieLocIds = useMemo(
    () => locations.map(l => JIE_LOC_MAP[l.id] || l.id),
    [locations],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // Single vs multi-location detection
  const isSingleLocation = locations.length === 1;

  // Build location status rows
  const locationStatusRows = useMemo(
    () => locations.map(loc => {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      return getLocationStatusInfo(loc, jieScores[jieLocId] || null, jurisdictions[jieLocId] || null);
    }),
    [locations, jieScores, jurisdictions],
  );

  // Multi-location: only show red and yellow rows (filter out green)
  const nonGreenRows = useMemo(
    () => locationStatusRows.filter(r => r.status !== 'all_clear'),
    [locationStatusRows],
  );
  const allGreen = !isSingleLocation && nonGreenRows.length === 0;

  // ── Health Banner derivation ──
  const healthStatus: HealthStatus = useMemo(() => {
    const impactItems = data.impact ?? [];
    const tasks = data.tasks ?? [];
    const hasCritical = impactItems.some(i => i.severity === 'critical');
    const hasOverdueTasks = tasks.some(t => t.status === 'overdue');
    const anyFailing = locations.some(loc => {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      const score = jieScores[jieLocId];
      return score?.foodSafety?.status === 'failing' || score?.facilitySafety?.status === 'failing';
    });

    if (anyFailing || hasCritical) return 'risk';
    if (hasOverdueTasks || impactItems.length > 0) return 'attention';
    return 'healthy';
  }, [data.impact, data.tasks, locations, jieScores]);

  const healthMessage = useMemo(() => {
    if (healthStatus === 'healthy') return 'All operations running smoothly \u2014 no outstanding issues.';
    if (healthStatus === 'risk') {
      const criticalItems = (data.impact ?? []).filter(i => i.severity === 'critical');
      if (criticalItems.length > 0) return criticalItems[0].action;
      return 'Critical compliance issue requires immediate attention.';
    }
    const overdue = (data.tasks ?? []).filter(t => t.status === 'overdue');
    if (overdue.length > 0) return `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} need attention.`;
    return `${(data.impact ?? []).length} item${(data.impact ?? []).length > 1 ? 's' : ''} need attention.`;
  }, [healthStatus, data.impact, data.tasks]);

  // ── "What Needs Attention" — risk-ranked impact items ──
  const attentionItems = useMemo(() => {
    const impactItems = data.impact ?? [];
    return [...impactItems].sort((a, b) => {
      const riskDiff = RISK_ORDER[getRiskType(a)] - RISK_ORDER[getRiskType(b)];
      if (riskDiff !== 0) return riskDiff;
      return a.severity === 'critical' ? -1 : 1;
    });
  }, [data.impact]);

  // ── "Do This Next" — top 3 actions ──
  const doThisNext = useMemo(() => attentionItems.slice(0, 3), [attentionItems]);

  // ── "Today's Operations" summary ──
  const opsSummary = useMemo(() => {
    const moduleStatuses = data.moduleStatuses ?? [];
    const deadlines = data.deadlines ?? [];
    const tasks = data.tasks ?? [];

    const checklistMod = moduleStatuses.find(m => m.id === 'mod-checklists');
    const tempMod = moduleStatuses.find(m => m.id === 'mod-temp');
    const openCAs = (data.impact ?? []).filter(i => i.severity === 'critical').length;
    const soonestCert = deadlines.filter(d => d.severity !== 'normal').sort((a, b) => a.daysLeft - b.daysLeft)[0];

    return {
      tempLogs: tempMod?.metric ?? `${tasks.filter(t => t.status === 'done').length}/${tasks.length}`,
      checklists: checklistMod?.metric ?? '\u2014',
      openCAs,
      certExpiring: soonestCert ? `${soonestCert.label} \u2014 ${soonestCert.dueDate}` : 'None upcoming',
    };
  }, [data]);

  // Greeting + date
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const rawFirstName = isDemoMode
    ? (DEMO_ROLE_NAMES[userRole]?.firstName || demoFirstName)
    : (profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]);
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const greetFirstName = rawFirstName ? capitalize(rawFirstName) : null;
  const isSetupComplete = isDemoMode ? true : (profile?.onboarding_completed ?? true);
  const greetingText = isSetupComplete
    ? `Welcome back${greetFirstName ? `, ${greetFirstName}` : ''}!`
    : `Welcome${greetFirstName ? `, ${greetFirstName}` : ''}! Let's get started.`;

  // ── Strategic Insights: role gate (owner_operator + executive only) ──
  const showInsightsTab = userRole === 'owner_operator' || userRole === 'executive';

  // ── Strategic Insights: demo data ──
  const insightsRiskItems: RiskItem[] = useMemo(() => {
    if (!isDemoMode) return [];
    return DEMO_CORRECTIVE_ACTIONS
      .filter(ca => ca.status === 'created' || ca.status === 'in_progress')
      .map(ca => ({
        id: ca.id,
        title: ca.title,
        location: ca.location,
        severity: ca.severity,
        category: ca.category === 'food_safety' ? 'Food Safety'
          : ca.category === 'facility_safety' ? 'Facility Safety' : 'Operational',
        dueDate: ca.dueDate,
        route: `/corrective-actions/${ca.id}`,
      }));
  }, [isDemoMode]);

  const insightsInspectionData: InspectionEstimate[] = useMemo(() => {
    if (!isDemoMode) return [];
    const daysAgoStr = (d: number) => {
      const dt = new Date(); dt.setDate(dt.getDate() - d);
      return dt.toISOString().slice(0, 10);
    };
    return [
      { name: 'Downtown', lastInspectionDate: daysAgoStr(120), frequencyDays: 365, jurisdictionName: 'Fresno County' },
      { name: 'Airport', lastInspectionDate: daysAgoStr(240), frequencyDays: 365, jurisdictionName: 'Merced County' },
      { name: 'University', lastInspectionDate: daysAgoStr(330), frequencyDays: 365, jurisdictionName: 'Stanislaus County' },
    ];
  }, [isDemoMode]);

  const insightsBenchmarkData: BenchmarkItem[] = useMemo(() => {
    if (!isDemoMode) return [];
    return [
      { locationName: 'Downtown', yourScore: 94, jurisdictionAvg: 78, jurisdictionName: 'Fresno County', delta: 16 },
      { locationName: 'Airport', yourScore: 81, jurisdictionAvg: 82, jurisdictionName: 'Merced County', delta: -1 },
      { locationName: 'University', yourScore: 68, jurisdictionAvg: 75, jurisdictionName: 'Stanislaus County', delta: -7 },
    ];
  }, [isDemoMode]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ ...FONT, backgroundColor: '#F5F6F8', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Error state */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
          <ErrorBanner message={error} onRetry={refresh} />
        </div>
      )}

      {/* Welcome greeting + date */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5">
        <h2 style={{ color: '#1E2D4D', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
          {greetingText}
        </h2>
        <p style={{ color: '#6B7F96', fontSize: '0.875rem', marginTop: '4px' }}>
          {todayStr}
        </p>
      </div>

      {/* ─── Tab Bar (owner_operator + executive only) ────────── */}
      {showInsightsTab && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: '#EEF1F7' }}>
            {(['overview', 'insights'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-all"
                style={{
                  backgroundColor: activeTab === tab ? '#1e4d6b' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : '#3D5068',
                }}
              >
                {tab === 'overview' ? 'Overview' : 'Strategic Insights'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── STRATEGIC INSIGHTS TAB ──────────────────────────── */}
      {showInsightsTab && activeTab === 'insights' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4 space-y-4">
          <ComplianceTrendWidget trendData={isDemoMode ? CATEGORY_ORG_TRENDS : []} />
          <TopRiskItemsWidget items={insightsRiskItems} />
          <InspectionProbabilityWidget locations={insightsInspectionData} />
          <JurisdictionBenchmarkWidget benchmarks={insightsBenchmarkData} />
        </div>
      )}

      {/* ─── OVERVIEW TAB (default) ──────────────────────────── */}
      {activeTab === 'overview' && <>

      {/* ─── ELEMENT 0: Onboarding Checklist ────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <OnboardingChecklistCard />
      </div>

      {/* ─── ELEMENT 1: Health Banner ───────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <HealthBanner status={healthStatus} scope="Business Health" message={healthMessage} />
      </div>

      {/* ─── ELEMENT 2: Where Things Stand (per-location pillar cards) ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Where Things Stand</h3>
        <div className="space-y-3">
          {locations.map(loc => {
            const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
            const score = jieScores[jieLocId];
            const jur = jurisdictions[jieLocId];

            const foodStatus = score?.foodSafety?.status ?? 'unknown';
            const foodGrade = score?.foodSafety?.gradeDisplay ?? 'Pending';
            const foodSummary = (score?.foodSafety?.details as Record<string, any>)?.summary;
            const foodAgency = jur?.foodSafety?.agency_name ?? 'Health Dept';
            const foodGradingType = jur?.foodSafety?.grading_type;

            const fireStatus = score?.facilitySafety?.status ?? 'unknown';
            const fireGrade = score?.facilitySafety?.grade ?? 'Pending';
            const fireAgency = jur?.facilitySafety?.agency_name ?? 'Fire AHJ';

            const foodStatusColor = foodStatus === 'passing' ? '#16a34a' : foodStatus === 'failing' ? '#dc2626' : foodStatus === 'at_risk' ? '#d97706' : '#6b7280';
            const fireStatusColor = fireStatus === 'passing' ? '#16a34a' : fireStatus === 'failing' ? '#dc2626' : fireStatus === 'at_risk' ? '#d97706' : '#6b7280';

            return (
              <div key={loc.id}>
                {!isSingleLocation && (
                  <p className="text-xs font-medium text-gray-400 mb-1.5 ml-1">{loc.name}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {/* Food Safety Pillar */}
                  <button
                    type="button"
                    onClick={() => navigate('/compliance')}
                    className="bg-white rounded-lg p-4 text-left transition-all hover:shadow-md"
                    style={{ border: '1px solid #e5e7eb', borderLeft: `3px solid ${foodStatusColor}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <UtensilsCrossed size={14} style={{ color: MUTED }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Food Safety</span>
                    </div>
                    <p className="text-lg font-bold" style={{ color: foodStatusColor }}>{foodGrade}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{foodAgency}</p>
                    {foodGradingType && (
                      <p className="text-[10px] text-gray-400">{foodGradingType}</p>
                    )}
                    {foodSummary && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{foodSummary}</p>
                    )}
                  </button>

                  {/* Facility Safety Pillar */}
                  <button
                    type="button"
                    onClick={() => navigate('/facility-safety')}
                    className="bg-white rounded-lg p-4 text-left transition-all hover:shadow-md"
                    style={{ border: '1px solid #e5e7eb', borderLeft: `3px solid ${fireStatusColor}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Flame size={14} style={{ color: MUTED }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Facility Safety</span>
                    </div>
                    <p className="text-lg font-bold" style={{ color: fireStatusColor }}>{fireGrade}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{fireAgency}</p>
                    <p className="text-[10px] text-gray-400">NFPA 96</p>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── ELEMENT 3: What Needs Attention ─────────────────── */}
      {attentionItems.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">What Needs Attention</h3>
          <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
            {attentionItems.slice(0, 5).map(item => {
              const riskType = getRiskType(item);
              const riskStyle = RISK_LABEL_COLOR[riskType];
              const isCritical = item.severity === 'critical';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  style={{ borderBottom: '1px solid #F0F0F0' }}
                >
                  {isCritical
                    ? <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    : <AlertCircle size={16} className="text-amber-500 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800">{item.action}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{item.location} &middot; {item.pillar}</p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: riskStyle.bg, color: riskStyle.text }}
                  >
                    {riskStyle.label}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{
                    backgroundColor: isCritical ? '#fef2f2' : '#fffbeb',
                    color: isCritical ? '#991b1b' : '#92400e',
                  }}>
                    {isCritical ? 'High' : 'Medium'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ELEMENT 4: Do This Next (max 3 actions) ─────────── */}
      {doThisNext.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Do This Next</h3>
          <div className="space-y-2">
            {doThisNext.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white text-left transition-all hover:shadow-md"
                style={{ border: '1px solid #e5e7eb' }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: NAVY }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800">{item.action}</p>
                  <p className="text-[11px] text-gray-500">{item.location}</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── ELEMENT 5: Today's Operations ────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Today's Operations</h3>
        <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <button type="button" onClick={() => navigate('/temp-logs')} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <span className="text-[13px] text-gray-700">Temp Logs</span>
            <span className="text-[13px] font-semibold" style={{ color: NAVY }}>{opsSummary.tempLogs}</span>
          </button>
          <button type="button" onClick={() => navigate('/checklists')} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <span className="text-[13px] text-gray-700">Checklists</span>
            <span className="text-[13px] font-semibold" style={{ color: NAVY }}>{opsSummary.checklists}</span>
          </button>
          <button type="button" onClick={() => navigate('/corrective-actions')} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <span className="text-[13px] text-gray-700">Open CAs</span>
            <span className={`text-[13px] font-semibold ${opsSummary.openCAs > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {opsSummary.openCAs}
            </span>
          </button>
          <button type="button" onClick={() => navigate('/documents')} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
            <span className="text-[13px] text-gray-700">Cert Expiring</span>
            <span className="text-[13px] font-semibold text-gray-600">{opsSummary.certExpiring}</span>
          </button>
        </div>
      </div>

      {/* ─── ELEMENT 6: Today's Tasks ────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <TodaysTasks navigate={navigate} tasks={data.tasks ?? []} />
      </div>

      {/* ─── ELEMENT 7: Re-Score Alerts Widget ───────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <ReScoreAlertsWidget navigate={navigate} />
      </div>

      {/* ─── ELEMENT 8: Intelligence Feed Widget ──────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <IntelligenceFeedWidget />
      </div>

      {/* ─── ELEMENT 9a: Annual Vendor Spend (OO only) ────────────── */}
      {userRole === 'owner_operator' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <AnnualVendorSpendWidget
            totalAnnualSpend={isDemoMode ? getDemoAnnualSpend() : 0}
            serviceCount={isDemoMode ? VENDOR_DEMO_SERVICES.length : 0}
            locationCount={isDemoMode ? getDemoServiceLocationCount() : 0}
          />
        </div>
      )}

      {/* ─── ELEMENT 9b: Services Due Soon (OO only) ──────────────── */}
      {userRole === 'owner_operator' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <ServicesDueSoonWidget
            services={isDemoMode ? VENDOR_DEMO_SERVICES : []}
          />
        </div>
      )}

      {/* ─── ELEMENT 9: Location Status Rows (multi-location only) ── */}
      {!isSingleLocation && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          {allGreen ? (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Check size={16} style={{ color: '#16a34a' }} />
                <span className="text-sm" style={{ color: '#6B7280' }}>All locations compliant</span>
              </div>
              <span className="text-sm" style={{ color: '#6B7280' }}>{todayStr}</span>
            </div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              {nonGreenRows.map(info => (
                <LocationStatusRow key={info.locId} info={info} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ELEMENT 9: K2C Widget (always visible) ─────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <K2CWidget onInviteClick={() => setShowInviteModal(true)} />
      </div>

      {/* ─── ELEMENT 10: Preview as Staff Role ─────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <PreviewAsStaffCard
          profile={profile}
          userRole={userRole}
          isDemoMode={isDemoMode}
          startEmulation={startEmulation}
          confirmRole={emulationConfirmRole}
          setConfirmRole={setEmulationConfirmRole}
          navigate={navigate}
        />
      </div>

      <K2CInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        referralCode={demoReferral.referralCode}
      />

      </>}
    </div>
  );
}

// ================================================================
// PREVIEW AS STAFF ROLE — Owner/Operator Emulation Card
// ================================================================

const EMULABLE_ROLES: { role: string; label: string; color: string }[] = [
  { role: 'chef', label: 'Chef', color: '#d97706' },
  { role: 'kitchen_manager', label: 'Kitchen Manager', color: '#dc2626' },
  { role: 'kitchen_staff', label: 'Kitchen Staff', color: '#6b7280' },
  { role: 'facilities_manager', label: 'Facilities Manager', color: '#059669' },
  { role: 'compliance_manager', label: 'Compliance Manager', color: '#2563eb' },
];

// Demo staff users for each emulable role
const DEMO_STAFF: Record<string, { id: string; full_name: string; email: string }> = {
  chef: { id: 'demo-chef', full_name: 'James Park', email: 'james@pacificcoast.com' },
  kitchen_manager: { id: 'demo-km', full_name: 'Michael Torres', email: 'michael@pacificcoast.com' },
  kitchen_staff: { id: 'demo-ks', full_name: 'Ana Torres', email: 'ana@pacificcoast.com' },
  facilities_manager: { id: 'demo-fm', full_name: 'Lisa Nguyen', email: 'lisa@pacificcoast.com' },
  compliance_manager: { id: 'demo-cm', full_name: 'Maria Rodriguez', email: 'maria@pacificcoast.com' },
};

interface PreviewAsStaffCardProps {
  profile: any;
  userRole: string;
  isDemoMode: boolean;
  startEmulation: (user: EmulatedUser, admin: { adminRole: any; adminName: string; adminId: string }) => Promise<void>;
  confirmRole: string | null;
  setConfirmRole: (role: string | null) => void;
  navigate: (path: string) => void;
}

function PreviewAsStaffCard({ profile, userRole, isDemoMode, startEmulation, confirmRole, setConfirmRole, navigate }: PreviewAsStaffCardProps) {
  const handleStart = async (role: string) => {
    const staff = DEMO_STAFF[role];
    if (!staff) return;
    const emUser: EmulatedUser = {
      id: staff.id,
      full_name: staff.full_name,
      email: staff.email,
      role: role as any,
    };
    const admin = {
      adminRole: userRole as any,
      adminName: profile?.full_name || 'Owner',
      adminId: profile?.id || 'owner',
    };
    await startEmulation(emUser, admin);
    setConfirmRole(null);
    navigate('/dashboard');
  };

  const selectedRoleDef = EMULABLE_ROLES.find(r => r.role === confirmRole);
  const selectedStaff = confirmRole ? DEMO_STAFF[confirmRole] : null;

  return (
    <>
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <span className="text-sm font-semibold" style={{ color: NAVY, fontFamily: FONT }}>Preview as Staff Role</span>
          <span className="text-xs" style={{ color: MUTED }}>See EvidLY as your team does</span>
        </div>
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {EMULABLE_ROLES.map((r) => (
            <button
              key={r.role}
              onClick={() => setConfirmRole(r.role)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: '#f8fafc', border: '1px solid #e5e7eb',
                color: r.color, cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmRole && selectedRoleDef && selectedStaff && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setConfirmRole(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" style={{ fontFamily: FONT }} onClick={(e) => e.stopPropagation()}>
              <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-sm font-bold" style={{ color: '#0B1628' }}>Start Staff Preview</h3>
                <p className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>This session will be logged</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm" style={{ color: '#374151' }}>
                  You are about to view EvidLY as:
                </p>
                <div className="px-3 py-2.5 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <div className="text-sm font-bold" style={{ color: '#0B1628' }}>{selectedStaff.full_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: selectedRoleDef.color }}>
                      {selectedRoleDef.label}
                    </span>
                  </div>
                </div>
                <div className="text-xs px-2 py-1.5 rounded" style={{ background: '#eef4f8', color: NAVY }}>
                  Usage tracking is paused during preview.
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmRole(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontFamily: FONT }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStart(confirmRole)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT }}
                >
                  Start Emulation
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
