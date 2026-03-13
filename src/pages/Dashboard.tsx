import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { SignalAlertBanner } from '../components/SignalAlertBanner';
import { useSignalNotifications } from '../hooks/useSignalNotifications';
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
import { ErrorState } from '../components/shared/PageStates';

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

export function Dashboard() {
  const { userRole } = useRole();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const [pageError, setPageError] = useState<string | null>(null);

  if (pageError) {
    return <ErrorState error={pageError} onRetry={() => { setPageError(null); }} />;
  }

  // Kitchen staff always sees their task list — no tabs
  if (userRole === 'kitchen_staff') {
    return <KitchenStaffTaskList />;
  }

  return (
    <div>
      <SignalAlertBanner />
      <OutbreakBanner />
      <CopilotBriefingCard />
      {tab === 'today' ? (
        <DashboardToday />
      ) : (
        <RoleDashboard userRole={userRole} />
      )}
    </div>
  );
}
