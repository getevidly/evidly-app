import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../contexts/DemoContext';
import { useRole } from '../../contexts/RoleContext';
import { useTooltip } from '../../hooks/useTooltip';
import { DEMO_ORG } from '../../data/demoData';
import { PAGE_BG, FONT, KEYFRAMES, DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { CalendarCard } from './shared/CalendarCard';
import { EXECUTIVE_EVENTS, EXECUTIVE_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';
import { useDashboardStanding } from '../../hooks/useDashboardStanding';
import { DashboardSkeleton } from './shared/DashboardSkeleton';
import { ConfidenceBanner } from './shared/ConfidenceBanner';
import { LocationStandingList } from './shared/LocationStandingList';
import { AttentionItemList } from './shared/AttentionItemList';
import { AnnualVendorSpendWidget } from './VendorServiceWidgets';
import { PortfolioExpenseSummary } from '../services/PortfolioExpenseSummary';
import { PortfolioRiskCard } from './PortfolioRiskCard';
import { MetricCardRow } from './shared/MetricCardRow';
import { DashboardGreeting } from './DashboardGreeting';
import { useAuth } from '../../contexts/AuthContext';


export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();
  const { userRole } = useRole();
  const { profile } = useAuth();

  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const {
    locations, bannerStatus, bannerHeadline,
    attentionItems, vendorSummary,
    loading, error,
  } = useDashboardStanding('executive');

  const attentionLocCount = locations.filter(
    s => s.foodSafety !== 'ok' || s.facilitySafety !== 'ok' || s.openItemCount > 0
  ).length;

  const fmtSpend = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
  const criticalCAs = attentionItems.filter(i => i.severity === 'critical').length;

  // Live mode empty state
  if (!isDemoMode && !loading && locations.length === 0) {
    return (
      <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
        <DashboardHero
          firstName={DEMO_ROLE_NAMES.executive.firstName}
          orgName={companyName || 'Your Organization'}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-white rounded-xl p-8 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <p className="text-sm font-medium text-gray-500">No portfolio data yet. Add locations to see your executive overview.</p>
            <button type="button" onClick={() => navigate('/locations')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
              Add Location
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{KEYFRAMES}</style>

      <div className="px-4 sm:px-6 pt-4">
        <DashboardGreeting role="executive" firstName={profile?.first_name} />
      </div>

      {/* 1. HERO */}
      <DashboardHero
        firstName={DEMO_ROLE_NAMES.executive.firstName}
        orgName={companyName || DEMO_ORG.name}
        subtitle={`${locations.length} location${locations.length !== 1 ? 's' : ''}`}
        onSubtitleClick={() => navigate('/org-hierarchy')}
      />

      {/* 1b. PORTFOLIO METRICS */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <MetricCardRow cards={[
          { label: 'Locations', value: locations.length, onClick: () => navigate('/locations') },
          { label: 'Gaps', value: attentionLocCount, color: attentionLocCount > 0 ? '#d97706' : undefined },
          { label: 'Annual Spend', value: fmtSpend(vendorSummary?.totalAnnualSpend ?? 0), onClick: () => navigate('/vendors') },
          { label: 'Open CAs', value: criticalCAs, color: criticalCAs > 0 ? '#dc2626' : undefined, onClick: () => navigate('/corrective-actions') },
        ]} />
      </div>

      {/* 2. ONBOARDING CHECKLIST */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <OnboardingChecklistCard />
      </div>

      {/* 3. CONFIDENCE BANNER */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <ConfidenceBanner
          status={bannerStatus}
          headline={bannerHeadline}
          locationCount={locations.length}
          attentionCount={attentionLocCount}
          role="executive"
        />
      </div>

      {/* 4. LOCATION STANDING */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <LocationStandingList standings={locations} navigate={navigate} />
      </div>

      {/* 5. WHAT NEEDS ATTENTION */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <AttentionItemList items={attentionItems} />
      </div>

      {/* 5b. PORTFOLIO RISK FORECAST */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <PortfolioRiskCard />
      </div>

      {/* 6. ANNUAL VENDOR SPEND */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <AnnualVendorSpendWidget
          totalAnnualSpend={vendorSummary?.totalAnnualSpend ?? 0}
          serviceCount={vendorSummary?.totalVendors ?? 0}
          locationCount={locations.length}
        />
      </div>

      {/* 6b. PORTFOLIO SERVICE SPEND */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <PortfolioExpenseSummary />
      </div>

      {/* 7. CALENDAR */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <ErrorBoundary level="widget">
          <CalendarCard
            events={isDemoMode ? EXECUTIVE_EVENTS : []}
            typeColors={EXECUTIVE_CALENDAR.typeColors}
            typeLabels={EXECUTIVE_CALENDAR.typeLabels}
            navigate={navigate}
            tooltipContent={scheduleCalendarTooltip}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
