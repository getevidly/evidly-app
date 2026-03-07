import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../contexts/DemoContext';
import { useRole } from '../../contexts/RoleContext';
import { useTooltip } from '../../hooks/useTooltip';
import { DEMO_ORG, LOCATIONS_WITH_SCORES } from '../../data/demoData';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import {
  PAGE_BG, FONT, JIE_LOC_MAP, KEYFRAMES,
  stagger, DEMO_ROLE_NAMES,
} from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { HeroJurisdictionSummary } from './shared/HeroJurisdictionSummary';
import { CalendarCard } from './shared/CalendarCard';
import { COMPLIANCE_EVENTS, COMPLIANCE_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';
import { useDashboardStanding } from '../../hooks/useDashboardStanding';
import { DashboardSkeleton } from './shared/DashboardSkeleton';
import { ConfidenceBanner } from './shared/ConfidenceBanner';
import { LocationStandingList } from './shared/LocationStandingList';
import { AttentionItemList } from './shared/AttentionItemList';


export default function ComplianceManagerDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();
  const { userRole } = useRole();

  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  // JIE: Dual-authority jurisdiction data — keep for HeroJurisdictionSummary
  const jieLocIds = useMemo(
    () => isDemoMode ? LOCATIONS_WITH_SCORES.map(l => JIE_LOC_MAP[l.id] || l.id) : [],
    [isDemoMode],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // Standing data
  const {
    locations, bannerStatus, bannerHeadline,
    attentionItems,
    loading,
  } = useDashboardStanding('compliance_manager');

  const attentionLocCount = locations.filter(
    s => s.foodSafety !== 'ok' || s.facilitySafety !== 'ok' || s.openItemCount > 0
  ).length;

  // Live mode empty state
  if (!isDemoMode && !loading && locations.length === 0) {
    return (
      <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
        <div style={{ padding: '20px 24px 0' }}>
          <DashboardHero
            firstName={DEMO_ROLE_NAMES.compliance_manager.firstName}
            orgName={companyName || 'Your Organization'}
          />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-white rounded-xl p-8 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <p className="text-sm font-medium text-gray-500">No compliance data yet. Add a location to begin compliance tracking.</p>
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

      {/* 1. HERO + Jurisdiction Summary */}
      <div style={{ padding: '20px 24px 0' }}>
        <DashboardHero
          firstName={DEMO_ROLE_NAMES.compliance_manager.firstName}
          orgName={companyName || DEMO_ORG.name}
          subtitle={`${locations.length} location${locations.length !== 1 ? 's' : ''}`}
          onSubtitleClick={() => navigate('/org-hierarchy')}
        >
          <HeroJurisdictionSummary jieScores={jieScores} jurisdictions={jurisdictions} navigate={navigate} userRole={userRole} />
        </DashboardHero>
      </div>

      {/* 2. ONBOARDING CHECKLIST */}
      <div style={{ padding: '0 24px' }}>
        <div className="mt-4">
          <OnboardingChecklistCard />
        </div>
      </div>

      {/* 3. CONFIDENCE BANNER */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(1)}>
        <ConfidenceBanner
          status={bannerStatus}
          headline={bannerHeadline}
          locationCount={locations.length}
          attentionCount={attentionLocCount}
        />
      </div>

      {/* 4. LOCATION STANDING */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(2)}>
        <LocationStandingList standings={locations} navigate={navigate} />
      </div>

      {/* 5. WHAT NEEDS ATTENTION */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(3)}>
        <AttentionItemList items={attentionItems} />
      </div>

      {/* 6. CALENDAR */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(4)}>
        <ErrorBoundary level="widget">
          <CalendarCard
            events={COMPLIANCE_EVENTS}
            typeColors={COMPLIANCE_CALENDAR.typeColors}
            typeLabels={COMPLIANCE_CALENDAR.typeLabels}
            navigate={navigate}
            tooltipContent={scheduleCalendarTooltip}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
