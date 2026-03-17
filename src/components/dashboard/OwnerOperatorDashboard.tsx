import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useEmulation, type EmulatedUser } from '../../contexts/EmulationContext';
import { GOLD, NAVY, BODY_TEXT, MUTED, FONT, DEMO_ROLE_NAMES } from './shared/constants';
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
import { IRRProgressCard } from './IRRProgressCard';
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
  TopRiskItemsWidget,
  InspectionProbabilityWidget,
  JurisdictionBenchmarkWidget,
  type RiskItem,
  type InspectionEstimate,
  type BenchmarkItem,
} from './shared/insights';
import { CATEGORY_ORG_TRENDS } from '../../data/trendDemoData';
import { MetricCardRow } from './shared/MetricCardRow';
import { DashboardGreeting } from './DashboardGreeting';


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
// MAIN COMPONENT
// ================================================================

export default function OwnerOperatorDashboard() {
  const navigate = useNavigate();
  const { isDemoMode, firstName: demoFirstName } = useDemo();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showStandingCard, setShowStandingCard] = useState(false);
  const [showInspectionBadge, setShowInspectionBadge] = useState(false);
  const [showTestimonialPrompt, setShowTestimonialPrompt] = useState(false);
  const { pendingMilestone, dismissMilestone } = useMilestoneCheck();

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

  const [activeTab, setActiveTab] = useState<'overview' | 'insights'>('overview');
  const { user, profile } = useAuth();
  const { userRole } = useRole();
  const { isEmulating, startEmulation, stopEmulation } = useEmulation();
  const [emulationConfirmRole, setEmulationConfirmRole] = useState<string | null>(null);

  // Standing data from hook — replaces all hardcoded data
  const {
    locations, bannerStatus, bannerHeadline,
    todaysTasks, attentionItems, vendorSummary,
    loading, error, refresh,
  } = useDashboardStanding('owner_operator');

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

  // Strategic Insights: role gate (owner_operator + executive only)
  const showInsightsTab = userRole === 'owner_operator' || userRole === 'executive';

  // Strategic Insights: no seeded data — in production, query Supabase for open CAs
  const insightsRiskItems: RiskItem[] = useMemo(() => {
    return [];
  }, []);

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
    <div style={{ ...FONT, backgroundColor: '#F5F6F8', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Error state */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
          <ErrorBanner message={error} onRetry={refresh} />
        </div>
      )}

      {/* Role-aware greeting */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5">
        <DashboardGreeting role="owner_operator" firstName={profile?.first_name} />
      </div>

      {/* Welcome greeting + date */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5">
        <h2 style={{ color: '#1E2D4D', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
          {greetingText}
        </h2>
        <p style={{ color: '#6B7F96', fontSize: '0.875rem', marginTop: '4px' }}>
          {todayStr}
        </p>
      </div>

      {/* Portfolio Health */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        {locations.length === 0 && criticalCAs === 0 && (vendorSummary?.overdue ?? 0) === 0 && (vendorSummary?.totalAnnualSpend ?? 0) === 0 && !isDemoMode ? (
          <div
            className="rounded-xl text-center"
            style={{
              background: '#F5F0E8',
              border: '0.5px solid #A08C5A',
              padding: '20px 24px',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 500, color: '#1E2D4D', margin: '0 0 8px' }}>
              Your compliance picture builds as you use EvidLY
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>
              Log your first temperature, complete a checklist, or add a vendor to see your standing update in real time.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/temp-logs"
                className="inline-block rounded-lg text-sm font-semibold transition-colors"
                style={{ padding: '8px 16px', backgroundColor: '#A08C5A', color: '#FFFFFF' }}
              >
                Log a temperature
              </Link>
              <Link
                to="/checklists"
                className="inline-block rounded-lg text-sm font-semibold transition-colors"
                style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', color: '#1E2D4D', border: '1px solid #D1D9E6' }}
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

      {/* Tab Bar (owner_operator + executive only) */}
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

      {/* STRATEGIC INSIGHTS TAB */}
      {showInsightsTab && activeTab === 'insights' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4 space-y-4">
          <ComplianceTrendWidget trendData={isDemoMode ? CATEGORY_ORG_TRENDS : []} />
          <TopRiskItemsWidget items={insightsRiskItems} />
          <InspectionProbabilityWidget locations={insightsInspectionData} />
          <JurisdictionBenchmarkWidget benchmarks={insightsBenchmarkData} />
        </div>
      )}

      {/* OVERVIEW TAB (default) */}
      {activeTab === 'overview' && <>

      {/* Onboarding Checklist */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <OnboardingChecklistCard />
      </div>

      {/* IRR Progress Card */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <IRRProgressCard />
      </div>

      {/* Confidence Banner */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <ConfidenceBanner
          status={bannerStatus}
          headline={bannerHeadline}
          locationCount={locations.length}
          attentionCount={attentionLocCount}
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
            className="bg-white rounded-lg"
            style={{ border: '1px solid #e5e7eb', padding: '16px 20px', textAlign: 'center' }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: '#0B1628', margin: '0 0 4px' }}>
              No tasks assigned yet
            </p>
            <p style={{ fontSize: 12, color: '#6B7F96', margin: '0 0 12px' }}>
              Invite your team and assign roles to see their daily task completion here.
            </p>
            <button
              type="button"
              onClick={() => navigate('/team')}
              className="text-xs font-semibold"
              style={{ color: '#A08C5A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
            background: '#FFFFFF',
            border: '1px solid #D1D9E6',
            borderRadius: 10,
            boxShadow: '0 1px 3px rgba(11,22,40,.06)',
          }}
        >
          <span style={{ fontSize: 13, color: '#3D5068', fontFamily: "'DM Sans', sans-serif" }}>
            Know another kitchen operator in California?
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowStandingCard(true)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: '#1E2D4D',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              Share My Standing
            </button>
            <Link
              to="/referrals"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#A08C5A',
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

      {/* Preview as Staff Role */}
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
  startEmulation: (user: EmulatedUser, admin: { adminRole: any; adminName: string; adminId: string }, orgId: string, orgName: string) => Promise<void>;
  confirmRole: string | null;
  setConfirmRole: (role: string | null) => void;
  navigate: (path: string) => void;
}

function PreviewAsStaffCard({ profile, userRole, isDemoMode, startEmulation, confirmRole, setConfirmRole, navigate }: PreviewAsStaffCardProps) {
  const handleStart = async (role: string) => {
    const staff = isDemoMode ? DEMO_STAFF[role] : null;
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
    await startEmulation(emUser, admin, profile?.organization_id || '', '');
    setConfirmRole(null);
    navigate('/dashboard');
  };

  const selectedRoleDef = EMULABLE_ROLES.find(r => r.role === confirmRole);
  const selectedStaff = (confirmRole && isDemoMode) ? DEMO_STAFF[confirmRole] : null;

  return (
    <>
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <span className="text-sm font-semibold" style={{ color: NAVY }}>Preview as Staff Role</span>
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
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
                  style={{ background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStart(confirmRole)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}
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
