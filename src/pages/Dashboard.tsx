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
import { ErrorState } from '../components/shared/PageStates';
import { X } from 'lucide-react';

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
    <div style={{
      background: '#FEF2F2',
      border: '2px solid #991B1B',
      borderRadius: 8,
      padding: '12px 16px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{ fontSize: 18 }}>🚨</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ color: '#991B1B', fontSize: 13 }}>
          Outbreak Alert
        </strong>
        <span style={{ fontSize: 13, color: '#374151', marginLeft: 8 }}>
          {outbreaks[0].title}
        </span>
      </div>
      <Link to="/insights/intelligence" style={{
        fontSize: 12, fontWeight: 700,
        color: '#991B1B', textDecoration: 'none',
      }}>View →</Link>
    </div>
  );
}

function IntelligenceBanner() {
  const { banner, dismiss } = useActiveBanner();
  if (!banner) return null;

  const isOutbreak = ['outbreak', 'health_alert', 'fda_recall', 'recall', 'allergen_alert'].includes(banner.signal_type);

  return (
    <div style={{
      background: isOutbreak ? '#FEF2F2' : '#EFF6FF',
      borderLeft: `4px solid ${isOutbreak ? '#DC2626' : '#1E2D4D'}`,
      borderRadius: 8,
      padding: '12px 16px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ color: isOutbreak ? '#991B1B' : '#1E2D4D', fontSize: 13 }}>
          {banner.title}
        </strong>
        {banner.summary && (
          <p style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
            {banner.summary}
          </p>
        )}
      </div>
      <Link to="/insights/intelligence" style={{
        fontSize: 12, fontWeight: 700,
        color: isOutbreak ? '#991B1B' : '#1E2D4D',
        textDecoration: 'none', flexShrink: 0,
      }}>View →</Link>
      <button
        type="button"
        onClick={dismiss}
        style={{ color: '#9CA3AF', flexShrink: 0, padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}
        title="Dismiss"
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
