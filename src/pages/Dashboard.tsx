import { useState, useEffect } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { SignalAlertBanner } from '../components/SignalAlertBanner';
import { useSignalNotifications } from '../hooks/useSignalNotifications';
import { useActiveBanner } from '../hooks/useActiveBanner';
import { getSignalRenderType, SIGNAL_TYPES } from '../constants/signalTypes';
import OwnerOperatorDashboard from '../components/dashboard/OwnerOperatorDashboard';
import ExecutiveDashboard from '../components/dashboard/ExecutiveDashboard';
import ComplianceManagerDashboard from '../components/dashboard/ComplianceManagerDashboard';
import ChefDashboard from '../components/dashboard/ChefDashboard';
import KitchenManagerDashboard from '../components/dashboard/KitchenManagerDashboard';
import KitchenStaffTaskList from '../components/dashboard/KitchenStaffTaskList';
import FacilitiesDashboardNew from '../components/dashboard/FacilitiesDashboardNew';
import { DashboardToday } from '../components/dashboard/DashboardToday';
import { CopilotBriefingCard } from '../components/copilot/CopilotBriefingCard';
import { WelcomeModal } from '../components/WelcomeModal';
import { PushOptInBanner } from '../components/PushOptInBanner';
import { ErrorState } from '../components/shared/PageStates';
import { X } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

// ── Dashboard ────────────────────────────────────────────
// Role visibility for above-fold items is now handled inside each
// role-specific dashboard component per DASH-ROLE-FIX-1 spec.

function RoleDashboard({ userRole }: { userRole: string }) {
  switch (userRole) {
    case 'owner_operator':
      return <OwnerOperatorDashboard />;
    case 'executive':
      return <ExecutiveDashboard />;
    case 'compliance_manager':
      return <ComplianceManagerDashboard />;
    case 'chef':
      return <ChefDashboard />;
    case 'facilities_manager':
      return <FacilitiesDashboardNew />;
    case 'kitchen_manager':
      return <KitchenManagerDashboard />;
    case 'kitchen_staff':
      return <KitchenStaffTaskList />;
    case 'platform_admin':
      return <Navigate to="/admin" replace />;
    default:
      return <OwnerOperatorDashboard />;
  }
}

function OutbreakBanner() {
  const { criticalNotifications } = useSignalNotifications();
  const outbreaks = criticalNotifications.filter(
    n => !n.is_read && getSignalRenderType(n.signal_type) === SIGNAL_TYPES.OUTBREAK
  );
  if (outbreaks.length === 0) return null;

  return (
    <div className="bg-red-50 border-2 border-[#991B1B] rounded-xl px-4 py-3 mb-3 flex items-center gap-3 animate-fade-in">
      <span className="text-lg">🚨</span>
      <div className="flex-1 min-w-0">
        <strong className="text-[#991B1B] text-[13px]">Outbreak Alert</strong>
        <span className="text-[13px] text-[#1E2D4D]/80 ml-2">{outbreaks[0].title}</span>
      </div>
      <Link to="/insights/intelligence" className="text-xs font-bold text-[#991B1B] shrink-0 hover:underline underline-offset-2">
        View →
      </Link>
    </div>
  );
}

function IntelligenceBanner() {
  const { banner, dismiss } = useActiveBanner();
  if (!banner) return null;

  const isOutbreak = ['outbreak', 'health_alert', 'fda_recall', 'recall', 'allergen_alert'].includes(banner.signal_type);

  return (
    <div className={`rounded-xl px-4 py-3 mb-3 flex items-center gap-3 border-l-4 animate-fade-in ${
      isOutbreak ? 'bg-red-50 border-l-red-600' : 'bg-blue-50 border-l-[#1E2D4D]'
    }`}>
      <div className="flex-1 min-w-0">
        <strong className={`text-[13px] ${isOutbreak ? 'text-[#991B1B]' : 'text-[#1E2D4D]'}`}>
          {banner.title}
        </strong>
        {banner.summary && (
          <p className="text-xs text-[#1E2D4D]/70 mt-0.5">{banner.summary}</p>
        )}
      </div>
      <Link
        to="/insights/intelligence"
        className={`text-xs font-bold shrink-0 hover:underline underline-offset-2 ${
          isOutbreak ? 'text-[#991B1B]' : 'text-[#1E2D4D]'
        }`}
      >
        View →
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="text-[#1E2D4D]/30 shrink-0 p-1 hover:text-[#1E2D4D]/60 transition-colors"
        title="Dismiss"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function Dashboard() {
  const { userRole } = useRole();
  const { user, profile } = useAuth();
  const { isDemoMode, firstName: demoFirstName } = useDemo();
  usePageTitle('Dashboard');
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const [pageError, setPageError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Show WelcomeModal exactly once per user (first login)
  useEffect(() => {
    const seen = localStorage.getItem('evidly_welcome_seen');
    if (!seen) {
      setShowWelcome(true);
    }
  }, []);

  const welcomeFirstName = isDemoMode
    ? (demoFirstName || 'there')
    : (profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there');

  if (pageError) {
    return <ErrorState error={pageError} onRetry={() => { setPageError(null); }} />;
  }

  // Kitchen staff always sees their task list — no tabs
  if (userRole === 'kitchen_staff') {
    return <KitchenStaffTaskList />;
  }

  return (
    <div>
      {showWelcome && (
        <WelcomeModal
          firstName={welcomeFirstName}
          onDismiss={() => setShowWelcome(false)}
        />
      )}
      <SignalAlertBanner />
      {!showWelcome && <PushOptInBanner />}
      <OutbreakBanner />
      <IntelligenceBanner />
      <CopilotBriefingCard />
      {tab === 'today' ? (
        <DashboardToday />
      ) : (
        <RoleDashboard userRole={userRole} />
      )}
    </div>
  );
}
