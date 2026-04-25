import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { FONT } from './shared/constants';
import { colors, shadows, radius, typography, transitions } from '../../lib/designSystem';
import { useDashboardStanding } from '../../hooks/useDashboardStanding';
import { DashboardSkeleton } from './shared/DashboardSkeleton';
import { ConfidenceBanner } from './shared/ConfidenceBanner';
import { LocationStandingList } from './shared/LocationStandingList';
import { TodaysOperations } from './shared/TodaysOperations';
import { AttentionItemList } from './shared/AttentionItemList';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';
import { ReScoreAlertsWidget } from './ReScoreAlertsWidget';
import { PSECoverageRiskWidget } from './PSECoverageRiskWidget';
import { K2CWidget } from '../referral/K2CWidget';
import { K2CInviteModal } from '../referral/K2CInviteModal';
import { demoReferral } from '../../data/demoData';
import { IntelligenceFeedWidget } from './IntelligenceFeedWidget';
import { AnnualVendorSpendWidget, ServicesDueSoonWidget } from './VendorServiceWidgets';
import { PortfolioExpenseSummary } from '../services/PortfolioExpenseSummary';
import { PortfolioRiskCard } from './PortfolioRiskCard';
import { StandingCardModal } from '../ambassador/StandingCardModal';
import { MilestoneCelebrationModal } from '../ambassador/MilestoneCelebrationModal';
import { useMilestoneCheck } from '../../hooks/useMilestoneCheck';
import { demoStandingCard } from '../../data/ambassadorDemoData';
import { MILESTONE_CONFIG, type StandingCardData } from '../../lib/ambassadorSystem';
import { InspectionBadgeModal } from '../social-proof/InspectionBadgeModal';
import { TestimonialCollectionModal } from '../social-proof/TestimonialCollectionModal';
import type { InspectionBadgeData } from '../social-proof/InspectionBadge';
import {
  ComplianceTrendWidget,
  InspectionProbabilityWidget,
  JurisdictionBenchmarkWidget,
  type InspectionEstimate,
  type BenchmarkItem,
} from './shared/insights';
import { CATEGORY_ORG_TRENDS } from '../../data/trendDemoData';
import { MetricCardRow } from './shared/MetricCardRow';


// ================================================================
// ERROR BANNER
// ================================================================

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: radius.lg,
        background: colors.dangerSoft, border: `1px solid ${colors.danger}30`,
      }}
    >
      <AlertTriangle size={18} style={{ color: colors.danger, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.danger, margin: 0 }}>
          Dashboard data could not be loaded
        </p>
        <p style={{ fontSize: typography.size.xs, color: colors.danger, margin: '2px 0 0', opacity: 0.8 }}>{message}</p>
      </div>
      <button
        type="button" onClick={onRetry}
        style={{
          fontSize: typography.size.xs, fontWeight: typography.weight.semibold,
          padding: '6px 12px', borderRadius: radius.md,
          color: colors.white, background: colors.danger,
          border: 'none', cursor: 'pointer', flexShrink: 0,
        }}
      >
        Retry
      </button>
    </div>
  );
}


// ================================================================
// MAIN COMPONENT
// ================================================================

export default function OwnerOperatorDashboard() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showStandingCard, setShowStandingCard] = useState(false);
  const [showInspectionBadge, setShowInspectionBadge] = useState(false);
  const [showTestimonialPrompt, setShowTestimonialPrompt] = useState(false);
  const { pendingMilestone, dismissMilestone } = useMilestoneCheck();
  const { user, profile } = useAuth();
  const { userRole } = useRole();
  // Standing card data: demo uses demoStandingCard, production would assemble from real data
  const standingCardData: StandingCardData = isDemoMode
    ? demoStandingCard
    : { orgName: profile?.full_name || 'My Kitchen', city: 'California', isAmbassador: false, daysActive: 0, tempLogs: 0, checklistsCompleted: 0, kecStatus: 'Not Started', documentsOnFile: 0, referralCode: '' };

  // Inspection badge data (SOCIAL-PROOF-01)
  const inspectionBadgeData: InspectionBadgeData = {
    orgName: isDemoMode ? demoStandingCard.orgName : (profile?.full_name || 'My Kitchen'),
    city: isDemoMode ? demoStandingCard.city : 'California',
    inspectionDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    referralCode: isDemoMode ? demoStandingCard.referralCode : '',
  };

  // Chain: milestone dismiss → if first_inspection_passed → InspectionBadge → Testimonial
  const handleMilestoneDismiss = () => {
    const key = pendingMilestone ? (Object.entries(MILESTONE_CONFIG).find(([, v]) => v === pendingMilestone)?.[0]) : null;
    dismissMilestone();
    if (key === 'first_inspection_passed') {
      setShowInspectionBadge(true);
    }
  };

  // Standing data from hook — replaces all hardcoded data
  const {
    locations, bannerStatus, bannerHeadline,
    todaysTasks, attentionItems, vendorSummary,
    loading, error, refresh,
  } = useDashboardStanding('owner_operator');

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

  // Attention count for banner
  const attentionLocCount = locations.filter(
    s => s.foodSafety !== 'ok' || s.facilitySafety !== 'ok' || s.openItemCount > 0
  ).length;

  // Portfolio health metrics
  const fmtSpend = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
  const criticalCAs = attentionItems.filter(i => i.severity === 'critical').length;

  // Team task metrics derived from todaysTasks
  const checklistTasks = todaysTasks.filter(t => t.route === '/checklists');
  const checklistsDone = checklistTasks.filter(t => t.status === 'done').length;
  const tempTasks = todaysTasks.filter(t => t.route === '/temp-logs');
  const tempsLogged = tempTasks.filter(t => t.status === 'done').length;
  const overdueCAs = todaysTasks.filter(t => t.status === 'overdue' && t.route === '/corrective-actions').length;

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ ...FONT, backgroundColor: '#FAF7F0', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Error state */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
          <ErrorBanner message={error} onRetry={refresh} />
        </div>
      )}

      {/* Portfolio Health */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        {locations.length === 0 && criticalCAs === 0 && (vendorSummary?.overdue ?? 0) === 0 && (vendorSummary?.totalAnnualSpend ?? 0) === 0 && !isDemoMode ? (
          <div
            style={{
              background: colors.goldGlow,
              border: `1px solid ${colors.gold}40`,
              borderRadius: radius.xl,
              padding: '20px 24px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.medium, color: colors.navy, margin: '0 0 8px' }}>
              Your compliance picture builds as you use EvidLY
            </p>
            <p style={{ fontSize: typography.size.sm, color: colors.textSecondary, margin: '0 0 16px' }}>
              Log your first temperature, complete a checklist, or add a vendor to see your standing update in real time.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/temp-logs"
                style={{
                  display: 'inline-block', borderRadius: radius.md,
                  fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                  padding: '8px 16px', background: colors.gold, color: colors.white,
                  textDecoration: 'none', transition: `background ${transitions.fast}`,
                }}
              >
                Log a temperature
              </Link>
              <Link
                to="/checklists"
                style={{
                  display: 'inline-block', borderRadius: radius.md,
                  fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                  padding: '8px 16px', background: colors.white, color: colors.navy,
                  border: `1px solid ${colors.border}`, textDecoration: 'none',
                  transition: `background ${transitions.fast}`,
                }}
              >
                Start a checklist
              </Link>
            </div>
          </div>
        ) : (
          <MetricCardRow cards={[
            { label: 'Locations', value: locations.length, onClick: () => navigate('/locations') },
            { label: 'Open CAs', value: criticalCAs, color: criticalCAs > 0 ? '#dc2626' : undefined, onClick: () => navigate('/corrective-actions') },
            { label: 'Service Gaps', value: vendorSummary?.overdue ?? 0, color: (vendorSummary?.overdue ?? 0) > 0 ? '#d97706' : undefined, onClick: () => navigate('/vendors') },
            { label: 'Annual Spend', value: fmtSpend(vendorSummary?.totalAnnualSpend ?? 0), onClick: () => navigate('/vendors') },
          ]} />
        )}
      </div>

      {/* Onboarding Checklist */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <OnboardingChecklistCard />
      </div>

      {/* Confidence Banner */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <ConfidenceBanner
          status={bannerStatus}
          headline={bannerHeadline}
          locationCount={locations.length}
          attentionCount={attentionLocCount}
          role="owner_operator"
        />
      </div>

      {/* Location Standing */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <LocationStandingList standings={locations} navigate={navigate} />
      </div>

      {/* Team Tasks Summary */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        {todaysTasks.length === 0 && !isDemoMode ? (
          <div
            style={{
              background: colors.white, borderRadius: radius.xl,
              border: `1px solid ${colors.border}`, boxShadow: shadows.sm,
              padding: '16px 20px', textAlign: 'center',
            }}
          >
            <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.navy, margin: '0 0 4px' }}>
              No tasks assigned yet
            </p>
            <p style={{ fontSize: typography.size.xs, color: colors.textSecondary, margin: '0 0 12px' }}>
              Invite your team and assign roles to see their daily task completion here.
            </p>
            <button
              type="button" onClick={() => navigate('/team')}
              style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Invite team →
            </button>
          </div>
        ) : (
          <MetricCardRow cards={[
            { label: 'Checklists', value: `${checklistsDone}/${checklistTasks.length}`, onClick: () => navigate('/checklists') },
            { label: 'Temps Logged', value: tempsLogged, onClick: () => navigate('/temp-logs') },
            { label: 'CAs Overdue', value: overdueCAs, color: overdueCAs > 0 ? '#dc2626' : undefined, onClick: () => navigate('/corrective-actions') },
          ]} />
        )}
      </div>

      {/* Today's Tasks */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <TodaysOperations tasks={todaysTasks} navigate={navigate} />
      </div>

      {/* What Needs Attention */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <AttentionItemList items={attentionItems} />
      </div>

      {/* Re-Score Alerts Widget */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <ReScoreAlertsWidget navigate={navigate} />
      </div>

      {/* PSE Coverage Risk Alert */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <PSECoverageRiskWidget />
      </div>

      {/* Intelligence Feed Widget */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <IntelligenceFeedWidget />
      </div>

      {/* Portfolio Risk Forecast */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <PortfolioRiskCard />
      </div>

      {/* Strategic Insights */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <ComplianceTrendWidget trendData={isDemoMode ? CATEGORY_ORG_TRENDS : []} />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <InspectionProbabilityWidget locations={insightsInspectionData} />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <JurisdictionBenchmarkWidget benchmarks={insightsBenchmarkData} />
      </div>

      {/* Annual Vendor Spend (OO only) */}
      {userRole === 'owner_operator' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <AnnualVendorSpendWidget
            totalAnnualSpend={vendorSummary?.totalAnnualSpend ?? 0}
            serviceCount={vendorSummary?.totalVendors ?? 0}
            locationCount={locations.length}
          />
        </div>
      )}

      {/* Services Due Soon (OO only) */}
      {userRole === 'owner_operator' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <ServicesDueSoonWidget
            services={[]}
          />
        </div>
      )}

      {/* Portfolio Service Spend (OO only) */}
      {userRole === 'owner_operator' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <PortfolioExpenseSummary />
        </div>
      )}

      {/* Share My Standing CTA */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: colors.white,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            boxShadow: shadows.sm,
          }}
        >
          <span style={{ fontSize: typography.size.sm, color: colors.textSecondary }}>
            Know another kitchen operator in California?
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowStandingCard(true)}
              style={{
                fontSize: typography.size.xs,
                fontWeight: typography.weight.semibold,
                color: colors.white,
                background: colors.navy,
                border: 'none',
                borderRadius: radius.sm,
                padding: '6px 14px',
                cursor: 'pointer',
                transition: `background ${transitions.fast}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = colors.navyHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = colors.navy; }}
            >
              Share My Standing
            </button>
            <Link
              to="/referrals"
              style={{
                fontSize: typography.size.xs,
                fontWeight: typography.weight.semibold,
                color: colors.gold,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Share EvidLY →
            </Link>
          </div>
        </div>
      </div>

      {/* K2C Widget */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <K2CWidget onInviteClick={() => setShowInviteModal(true)} />
      </div>

      <K2CInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        referralCode={isDemoMode ? demoReferral.referralCode : ''}
      />

      <StandingCardModal
        isOpen={showStandingCard}
        onClose={() => setShowStandingCard(false)}
        data={standingCardData}
      />

      <MilestoneCelebrationModal
        milestone={pendingMilestone}
        onDismiss={handleMilestoneDismiss}
      />

      <InspectionBadgeModal
        isOpen={showInspectionBadge}
        onClose={() => { setShowInspectionBadge(false); setShowTestimonialPrompt(true); }}
        data={inspectionBadgeData}
      />

      <TestimonialCollectionModal
        isOpen={showTestimonialPrompt}
        onClose={() => setShowTestimonialPrompt(false)}
        userId={user?.id || ''}
        orgId={profile?.org_id || ''}
        authorName={profile?.full_name || ''}
        roleTitle={userRole || ''}
        orgName={isDemoMode ? demoStandingCard.orgName : (profile?.full_name || '')}
        county={isDemoMode ? 'fresno' : ''}
        city={isDemoMode ? demoStandingCard.city : ''}
      />

    </div>
  );
}

