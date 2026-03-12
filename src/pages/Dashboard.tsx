import { useSearchParams } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { SignalAlertBanner } from '../components/SignalAlertBanner';
import OwnerOperatorDashboard from '../components/dashboard/OwnerOperatorDashboard';
import ExecutiveDashboard from '../components/dashboard/ExecutiveDashboard';
import ComplianceManagerDashboard from '../components/dashboard/ComplianceManagerDashboard';
import ChefDashboard from '../components/dashboard/ChefDashboard';
import KitchenManagerDashboard from '../components/dashboard/KitchenManagerDashboard';
import KitchenStaffTaskList from '../components/dashboard/KitchenStaffTaskList';
import FacilitiesDashboardNew from '../components/dashboard/FacilitiesDashboardNew';
import { DashboardToday } from '../components/dashboard/DashboardToday';

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

export function Dashboard() {
  const { userRole } = useRole();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';

  // Kitchen staff always sees their task list — no tabs
  if (userRole === 'kitchen_staff') {
    return <KitchenStaffTaskList />;
  }

  return (
    <div>
      <SignalAlertBanner />
      {tab === 'today' ? (
        <DashboardToday />
      ) : (
        <RoleDashboard userRole={userRole} />
      )}
    </div>
  );
}
