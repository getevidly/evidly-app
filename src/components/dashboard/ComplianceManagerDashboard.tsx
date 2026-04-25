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
import { MetricCardRow } from './shared/MetricCardRow';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ReadinessSignal } from '../../hooks/useDashboardStanding';
import { BODY_TEXT } from './shared/constants';
import { useAuth } from '../../contexts/AuthContext';


function InspectionReadiness({ signals }: { signals: ReadinessSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <div className="bg-white rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Inspection Readiness</h3>
      </div>
      <div>
        {signals.map((signal, i) => {
          const isCurrent = signal.status === 'current';
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
              {isCurrent
                ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                : <AlertCircle size={16} className="text-red-500 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: BODY_TEXT }}>{signal.label}</p>
                <p className="text-xs text-[#1E2D4D]/50">{signal.detail}</p>
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

export default function ComplianceManagerDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();
  const { userRole } = useRole();
  const { profile } = useAuth();

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
    attentionItems, inspectionReadiness,
    loading,
  } = useDashboardStanding('compliance_manager');

  const criticalCAs = attentionItems.filter(i => i.severity === 'critical').length;
  const warningCAs = attentionItems.filter(i => i.severity === 'warning').length;

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
            <p className="text-sm font-medium text-[#1E2D4D]/50">No compliance data yet. Add a location to begin compliance tracking.</p>
            <button type="button" onClick={() => navigate('/locations')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1E2D4D' }}>
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
          role="compliance_manager"
        />
      </div>

      {/* 3b. CA PIPELINE METRICS */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(2)}>
        <MetricCardRow cards={[
          { label: 'Total CAs', value: attentionItems.length, onClick: () => navigate('/corrective-actions') },
          { label: 'Critical', value: criticalCAs, color: criticalCAs > 0 ? '#dc2626' : undefined },
          { label: 'Warning', value: warningCAs, color: warningCAs > 0 ? '#d97706' : undefined },
        ]} />
      </div>

      {/* 4. LOCATION STANDING */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(3)}>
        <LocationStandingList standings={locations} navigate={navigate} />
      </div>

      {/* 5. WHAT NEEDS ATTENTION */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(3)}>
        <AttentionItemList items={attentionItems} />
      </div>

      {/* 6. INSPECTION READINESS */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(4)}>
        <InspectionReadiness signals={inspectionReadiness} />
      </div>

      {/* 7. CALENDAR */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(4)}>
        <ErrorBoundary level="widget">
          <CalendarCard
            events={isDemoMode ? COMPLIANCE_EVENTS : []}
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
