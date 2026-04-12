import { useNavigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { useTooltip } from '../../hooks/useTooltip';
import { DEMO_ORG } from '../../data/demoData';
import { FONT, DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { CalendarCard } from './shared/CalendarCard';
import { KITCHEN_MANAGER_EVENTS, KITCHEN_MANAGER_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { SelfDiagCard } from './shared/SelfDiagCard';
import { NFPAReminder } from '../ui/NFPAReminder';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';
import { MetricCardRow } from './shared/MetricCardRow';
import { useDashboardStanding } from '../../hooks/useDashboardStanding';
import { DashboardSkeleton } from './shared/DashboardSkeleton';
import { ConfidenceBanner } from './shared/ConfidenceBanner';
import { TodaysOperations } from './shared/TodaysOperations';
import { AttentionItemList } from './shared/AttentionItemList';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ReadinessSignal } from '../../hooks/useDashboardStanding';
import { BODY_TEXT } from './shared/constants';
import { DashboardGreeting } from './DashboardGreeting';
import { useAuth } from '../../contexts/AuthContext';
import { TeamTaskStatus } from './shared/TeamTaskStatus';
import { MyTasksToday } from './shared/MyTasksToday';


// ── Inspection Readiness inline ─────────────────────────────

function InspectionReadiness({ signals }: { signals: ReadinessSignal[] }) {
  if (signals.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Inspection Readiness</h3>
      </div>
      <div>
        {signals.map((signal, i) => {
          const isCurrent = signal.status === 'current';
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid #F0F0F0' }}
            >
              {isCurrent
                ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                : <AlertCircle size={16} className="text-red-500 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: BODY_TEXT }}>{signal.label}</p>
                <p className="text-xs text-gray-500">{signal.detail}</p>
              </div>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{
                  backgroundColor: isCurrent ? '#dcfce7' : signal.status === 'overdue' ? '#fef2f2' : '#f3f4f6',
                  color: isCurrent ? '#16a34a' : signal.status === 'overdue' ? '#dc2626' : '#6b7280',
                }}
              >
                {signal.status === 'current' ? 'Current' : signal.status === 'overdue' ? 'Overdue' : 'Missing'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// KITCHEN MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════

export default function KitchenManagerDashboard() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { companyName, isDemoMode } = useDemo();
  const { profile } = useAuth();

  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const {
    locations, bannerStatus, bannerHeadline,
    todaysTasks, attentionItems, inspectionReadiness,
    loading,
  } = useDashboardStanding('kitchen_manager');

  // Single location for kitchen manager
  const locationName = locations.length > 0 ? locations[0].locationName : '';

  // Team completion metrics
  const checklistTasks = todaysTasks.filter(t => t.route === '/checklists');
  const checklistsDone = checklistTasks.filter(t => t.status === 'done').length;
  const tempTasks = todaysTasks.filter(t => t.route === '/temp-logs');
  const tempsLogged = tempTasks.filter(t => t.status === 'done').length;
  const overdueCAs = todaysTasks.filter(t => t.status === 'overdue').length;

  // Live mode empty state
  if (!isDemoMode && !loading && locations.length === 0) {
    return (
      <div className="space-y-6" style={FONT}>
        <DashboardHero
          firstName={DEMO_ROLE_NAMES[userRole]?.firstName || 'Manager'}
          orgName={companyName || 'Your Organization'}
        />
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-center py-8">
            <p className="text-sm font-medium text-gray-500">No data yet. Set up your locations and team to see your kitchen dashboard.</p>
            <button type="button" onClick={() => navigate('/checklists')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1E2D4D' }}>
              Set Up Checklists
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6" style={FONT}>
      <DashboardGreeting role="kitchen_manager" firstName={profile?.first_name} />

      {/* 1. HERO */}
      <DashboardHero
        firstName={DEMO_ROLE_NAMES[userRole]?.firstName || 'Manager'}
        orgName={companyName || DEMO_ORG.name}
        locationName={locationName}
      />

      {/* 2. ONBOARDING CHECKLIST */}
      <OnboardingChecklistCard />

      {/* 3. CONFIDENCE BANNER */}
      <ConfidenceBanner
        status={bannerStatus}
        headline={bannerHeadline}
        role="kitchen_manager"
      />

      {/* 3b. TEAM COMPLETION METRICS */}
      <MetricCardRow cards={[
        { label: 'Checklists', value: `${checklistsDone}/${checklistTasks.length}`, onClick: () => navigate('/checklists') },
        { label: 'Temps Logged', value: tempsLogged, onClick: () => navigate('/temp-logs') },
        { label: 'Team CAs', value: overdueCAs, color: overdueCAs > 0 ? '#dc2626' : undefined, onClick: overdueCAs > 0 ? () => navigate('/corrective-actions') : undefined },
      ]} />

      {/* 3c. TASK ASSIGNMENT WIDGETS */}
      <TeamTaskStatus />
      <MyTasksToday />

      {/* 4. TODAY'S TASKS */}
      <TodaysOperations tasks={todaysTasks} navigate={navigate} />

      {/* 5. WHAT NEEDS ATTENTION */}
      <AttentionItemList items={attentionItems} />

      {/* 6. INSPECTION READINESS */}
      <InspectionReadiness signals={inspectionReadiness} />

      {/* NFPA Monthly Reminder */}
      <NFPAReminder />

      {/* Self-Diagnosis */}
      <SelfDiagCard />

      {/* Schedule Calendar */}
      <ErrorBoundary level="widget">
        <CalendarCard
          events={isDemoMode ? KITCHEN_MANAGER_EVENTS : []}
          typeColors={KITCHEN_MANAGER_CALENDAR.typeColors}
          typeLabels={KITCHEN_MANAGER_CALENDAR.typeLabels}
          navigate={navigate}
          tooltipContent={scheduleCalendarTooltip}
        />
      </ErrorBoundary>
    </div>
  );
}
