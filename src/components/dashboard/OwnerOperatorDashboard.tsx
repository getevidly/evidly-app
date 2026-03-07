import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { K2CWidget } from '../referral/K2CWidget';
import { K2CInviteModal } from '../referral/K2CInviteModal';
import { demoReferral } from '../../data/demoData';
import { IntelligenceFeedWidget } from './IntelligenceFeedWidget';
import { AnnualVendorSpendWidget, ServicesDueSoonWidget } from './VendorServiceWidgets';
import {
  VENDOR_DEMO_SERVICES,
  getDemoAnnualSpend,
  getDemoServiceLocationCount,
} from '../../data/vendorServicesDemoData';
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
import { DEMO_CORRECTIVE_ACTIONS } from '../../data/correctiveActionsDemoData';


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

  // Strategic Insights: demo data
  const insightsRiskItems: RiskItem[] = useMemo(() => {
    if (!isDemoMode) return [];
    return DEMO_CORRECTIVE_ACTIONS
      .filter(ca => ca.status === 'created' || ca.status === 'in_progress')
      .map(ca => ({
        id: ca.id,
        title: ca.title,
        location: ca.location,
        severity: ca.severity,
        category: ca.category === 'food_safety' ? 'Food Safety'
          : ca.category === 'facility_safety' ? 'Facility Safety' : 'Operational',
        dueDate: ca.dueDate,
        route: `/corrective-actions/${ca.id}`,
      }));
  }, [isDemoMode]);

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

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ ...FONT, backgroundColor: '#F5F6F8', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Error state */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
          <ErrorBanner message={error} onRetry={refresh} />
        </div>
      )}

      {/* Welcome greeting + date */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5">
        <h2 style={{ color: '#1E2D4D', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
          {greetingText}
        </h2>
        <p style={{ color: '#6B7F96', fontSize: '0.875rem', marginTop: '4px' }}>
          {todayStr}
        </p>
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

      {/* Intelligence Feed Widget */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <IntelligenceFeedWidget />
      </div>

      {/* Annual Vendor Spend (OO only) */}
      {userRole === 'owner_operator' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <AnnualVendorSpendWidget
            totalAnnualSpend={isDemoMode ? getDemoAnnualSpend() : (vendorSummary?.totalAnnualSpend ?? 0)}
            serviceCount={isDemoMode ? VENDOR_DEMO_SERVICES.length : (vendorSummary?.totalVendors ?? 0)}
            locationCount={isDemoMode ? getDemoServiceLocationCount() : locations.length}
          />
        </div>
      )}

      {/* Services Due Soon (OO only) */}
      {userRole === 'owner_operator' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <ServicesDueSoonWidget
            services={isDemoMode ? VENDOR_DEMO_SERVICES : []}
          />
        </div>
      )}

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
  startEmulation: (user: EmulatedUser, admin: { adminRole: any; adminName: string; adminId: string }) => Promise<void>;
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
    await startEmulation(emUser, admin);
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
