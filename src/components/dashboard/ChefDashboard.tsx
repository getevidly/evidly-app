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
import { CARD_BG, CARD_BORDER, BODY_TEXT, NAVY } from './shared/constants';
import { useDashboardStanding } from '../../hooks/useDashboardStanding';
import { DashboardSkeleton } from './shared/DashboardSkeleton';
import { ConfidenceBanner } from './shared/ConfidenceBanner';
import { TodaysOperations } from './shared/TodaysOperations';
import { AttentionItemList } from './shared/AttentionItemList';
import { DashboardGreeting } from './DashboardGreeting';
import { useAuth } from '../../contexts/AuthContext';
import { MyTasksToday } from './shared/MyTasksToday';


export default function ChefDashboard() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { companyName, isDemoMode } = useDemo();
  const { profile } = useAuth();

  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const {
    locations, bannerStatus, bannerHeadline,
    todaysTasks, attentionItems,
    loading,
  } = useDashboardStanding('chef');

  // Single location for chef
  const locationName = locations.length > 0 ? locations[0].locationName : '';

  // Kitchen ops metrics derived from todaysTasks
  const tempTasks = todaysTasks.filter(t => t.route === '/temp-logs');
  const tempsLogged = tempTasks.filter(t => t.status === 'done').length;
  const tempExcursions = tempTasks.filter(t => t.status === 'overdue').length;

  // Live mode empty state
  if (!isDemoMode && !loading && locations.length === 0) {
    return (
      <div className="space-y-6" style={FONT}>
        <DashboardHero
          firstName={DEMO_ROLE_NAMES[userRole]?.firstName || 'Chef'}
          orgName={companyName || 'Your Organization'}
        />
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="text-center py-8">
            <p className="text-sm font-medium text-gray-500">No data yet. Set up your locations and team to see your kitchen dashboard.</p>
            <button type="button" onClick={() => navigate('/checklists')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
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
      <DashboardGreeting role="chef" firstName={profile?.first_name} />

      {/* 1. HERO */}
      <DashboardHero
        firstName={DEMO_ROLE_NAMES[userRole]?.firstName || 'Chef'}
        orgName={companyName || DEMO_ORG.name}
        locationName={locationName}
      />

      {/* 2. ONBOARDING CHECKLIST */}
      <OnboardingChecklistCard />

      {/* 3. CONFIDENCE BANNER */}
      <ConfidenceBanner
        status={bannerStatus}
        headline={bannerHeadline}
        role="chef"
      />

      {/* 3b. KITCHEN OPS METRICS */}
      <MetricCardRow cards={[
        { label: 'Temps Today', value: `${tempsLogged}/${tempTasks.length}`, onClick: () => navigate('/temp-logs') },
        { label: 'Cooling Active', value: 0 },
        { label: 'Excursions', value: tempExcursions, color: tempExcursions > 0 ? '#dc2626' : undefined, onClick: tempExcursions > 0 ? () => navigate('/temp-logs') : undefined },
      ]} />

      {/* 3c. MY TASK ASSIGNMENTS */}
      <MyTasksToday />

      {/* 4. TODAY'S TASKS */}
      <TodaysOperations tasks={todaysTasks} navigate={navigate} />

      {/* 5. WHAT NEEDS ATTENTION */}
      <AttentionItemList items={attentionItems} />

      {/* 5b. HACCP CCP SUMMARY */}
      <button
        type="button"
        onClick={() => navigate('/haccp')}
        className="w-full rounded-lg px-4 py-4 text-left"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>HACCP CCP Status</h3>
        <p className="text-[12px] text-gray-500 mt-1">No active CCPs for today</p>
        <p className="text-[11px] font-semibold mt-2" style={{ color: NAVY }}>View HACCP plan &rarr;</p>
      </button>

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
