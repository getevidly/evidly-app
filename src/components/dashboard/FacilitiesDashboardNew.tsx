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
import { PSECoverageRiskWidget } from './PSECoverageRiskWidget';
import { MetricCardRow } from './shared/MetricCardRow';
import { useDashboardStanding } from '../../hooks/useDashboardStanding';
import { DashboardSkeleton } from './shared/DashboardSkeleton';
import { ConfidenceBanner } from './shared/ConfidenceBanner';
import { LocationStandingList } from './shared/LocationStandingList';
import { AttentionItemList } from './shared/AttentionItemList';
import { DashboardGreeting } from './DashboardGreeting';
import { useAuth } from '../../contexts/AuthContext';


export default function FacilitiesDashboardNew() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { companyName, isDemoMode } = useDemo();
  const { profile } = useAuth();

  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const {
    locations, bannerStatus, bannerHeadline,
    attentionItems, vendorSummary,
    loading,
  } = useDashboardStanding('facilities_manager');

  const attentionLocCount = locations.filter(
    s => s.foodSafety !== 'ok' || s.facilitySafety !== 'ok' || s.openItemCount > 0
  ).length;

  const fmtSpend = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;

  // Live mode empty state
  if (!isDemoMode && !loading && locations.length === 0) {
    return (
      <div className="space-y-6" style={FONT}>
        <DashboardHero
          orgName={companyName || 'Your Organization'}
        />
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-center py-8">
            <p className="text-sm font-medium text-gray-500">No facilities data yet. Add equipment and vendors to track maintenance.</p>
            <button type="button" onClick={() => navigate('/equipment')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1E2D4D' }}>
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
      <DashboardGreeting role="facilities_manager" firstName={profile?.first_name} />

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
        role="facilities_manager"
      />

      {/* 3b. SERVICE METRICS */}
      <MetricCardRow cards={[
        { label: 'Services Active', value: vendorSummary?.totalVendors ?? 0, onClick: () => navigate('/vendors') },
        { label: 'Overdue', value: vendorSummary?.overdue ?? 0, color: (vendorSummary?.overdue ?? 0) > 0 ? '#dc2626' : undefined },
        { label: 'Due Soon', value: vendorSummary?.dueSoon ?? 0, color: (vendorSummary?.dueSoon ?? 0) > 0 ? '#d97706' : undefined },
        { label: 'Annual Cost', value: fmtSpend(vendorSummary?.totalAnnualSpend ?? 0) },
      ]} />

      {/* 4. LOCATION STANDING */}
      <LocationStandingList standings={locations} navigate={navigate} />

      {/* 5. WHAT NEEDS ATTENTION */}
      <AttentionItemList items={attentionItems} />

      {/* 6. VENDOR SPEND */}
      <AnnualVendorSpendWidget
        totalAnnualSpend={vendorSummary?.totalAnnualSpend ?? 0}
        serviceCount={vendorSummary?.totalVendors ?? 0}
        locationCount={locations.length}
      />

      {/* 7. SERVICES DUE SOON */}
      <ServicesDueSoonWidget
        services={[]}
      />

      {/* 7b. PSE ADVISORY */}
      <PSECoverageRiskWidget />

      {/* NFPA Monthly Reminder */}
      <NFPAReminder />

      {/* Self-Diagnosis */}
      <SelfDiagCard />

      {/* Schedule Calendar */}
      <ErrorBoundary level="widget">
        <CalendarCard
          events={isDemoMode ? FACILITIES_EVENTS : []}
          typeColors={FACILITIES_CALENDAR.typeColors}
          typeLabels={FACILITIES_CALENDAR.typeLabels}
          navigate={navigate}
          tooltipContent={scheduleCalendarTooltip}
        />
      </ErrorBoundary>
    </div>
  );
}
