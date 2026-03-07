import { useNavigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import { useTooltip } from '../../hooks/useTooltip';
import { useDemo } from '../../contexts/DemoContext';
import { DEMO_ORG } from '../../data/demoData';
import { FONT, DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { CalendarCard } from './shared/CalendarCard';
import { FACILITIES_EVENTS, FACILITIES_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { SelfDiagCard } from './shared/SelfDiagCard';
import { NFPAReminder } from '../ui/NFPAReminder';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';
import { ServicesDueSoonWidget, AnnualVendorSpendWidget } from './VendorServiceWidgets';
import {
  VENDOR_DEMO_SERVICES,
  getDemoAnnualSpend,
  getDemoServiceLocationCount,
} from '../../data/vendorServicesDemoData';
import { useDashboardStanding } from '../../hooks/useDashboardStanding';
import { DashboardSkeleton } from './shared/DashboardSkeleton';
import { ConfidenceBanner } from './shared/ConfidenceBanner';
import { LocationStandingList } from './shared/LocationStandingList';
import { AttentionItemList } from './shared/AttentionItemList';


export default function FacilitiesDashboardNew() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { companyName, isDemoMode } = useDemo();

  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const {
    locations, bannerStatus, bannerHeadline,
    attentionItems, vendorSummary,
    loading,
  } = useDashboardStanding('facilities_manager');

  const attentionLocCount = locations.filter(
    s => s.foodSafety !== 'ok' || s.facilitySafety !== 'ok' || s.openItemCount > 0
  ).length;

  // Live mode empty state
  if (!isDemoMode && !loading && locations.length === 0) {
    return (
      <div className="space-y-6" style={FONT}>
        <DashboardHero
          orgName={companyName || 'Your Organization'}
        />
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="text-center py-8">
            <p className="text-sm font-medium text-gray-500">No facilities data yet. Add equipment and vendors to track maintenance.</p>
            <button type="button" onClick={() => navigate('/equipment')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
              Add Equipment
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
        orgName={companyName || DEMO_ORG.name}
      />

      {/* 2. ONBOARDING CHECKLIST */}
      <OnboardingChecklistCard />

      {/* 3. CONFIDENCE BANNER */}
      <ConfidenceBanner
        status={bannerStatus}
        headline={bannerHeadline}
        locationCount={locations.length}
        attentionCount={attentionLocCount}
      />

      {/* 4. LOCATION STANDING */}
      <LocationStandingList standings={locations} navigate={navigate} />

      {/* 5. WHAT NEEDS ATTENTION */}
      <AttentionItemList items={attentionItems} />

      {/* 6. VENDOR SPEND */}
      <AnnualVendorSpendWidget
        totalAnnualSpend={isDemoMode ? getDemoAnnualSpend() : (vendorSummary?.totalAnnualSpend ?? 0)}
        serviceCount={isDemoMode ? VENDOR_DEMO_SERVICES.length : (vendorSummary?.totalVendors ?? 0)}
        locationCount={isDemoMode ? getDemoServiceLocationCount() : locations.length}
      />

      {/* 7. SERVICES DUE SOON */}
      <ServicesDueSoonWidget
        services={isDemoMode ? VENDOR_DEMO_SERVICES : []}
      />

      {/* NFPA Monthly Reminder */}
      <NFPAReminder />

      {/* Self-Diagnosis */}
      <SelfDiagCard />

      {/* Schedule Calendar */}
      <ErrorBoundary level="widget">
        <CalendarCard
          events={FACILITIES_EVENTS}
          typeColors={FACILITIES_CALENDAR.typeColors}
          typeLabels={FACILITIES_CALENDAR.typeLabels}
          navigate={navigate}
          tooltipContent={scheduleCalendarTooltip}
        />
      </ErrorBoundary>
    </div>
  );
}
