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
import { useDashboardStanding } from '../../hooks/useDashboardStanding';
import { DashboardSkeleton } from './shared/DashboardSkeleton';
import { ConfidenceBanner } from './shared/ConfidenceBanner';
import { TodaysOperations } from './shared/TodaysOperations';
import { AttentionItemList } from './shared/AttentionItemList';


export default function ChefDashboard() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { companyName, isDemoMode } = useDemo();

  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const {
    locations, bannerStatus, bannerHeadline,
    todaysTasks, attentionItems,
    loading,
  } = useDashboardStanding('chef');

  // Single location for chef
  const locationName = locations.length > 0 ? locations[0].locationName : '';

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
      />

      {/* 4. TODAY'S TASKS */}
      <TodaysOperations tasks={todaysTasks} navigate={navigate} />

      {/* 5. WHAT NEEDS ATTENTION */}
      <AttentionItemList items={attentionItems} />

      {/* NFPA Monthly Reminder */}
      <NFPAReminder />

      {/* Self-Diagnosis */}
      <SelfDiagCard />

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
    </div>
  );
}
