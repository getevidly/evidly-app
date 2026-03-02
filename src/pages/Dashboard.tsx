import { useSearchParams } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
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

const NAVY = '#1e4d6b';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';

  // Kitchen staff always sees their task list — no tabs
  if (userRole === 'kitchen_staff') {
    return <KitchenStaffTaskList />;
  }

  const setTab = (t: string) => {
    const next = new URLSearchParams(searchParams);
    if (t === 'overview') {
      next.delete('tab');
    } else {
      next.set('tab', t);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: '2px solid #e5e7eb' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'today', label: 'Today' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="px-4 py-2 text-sm font-semibold transition-colors relative"
            style={{
              color: tab === t.id ? NAVY : '#6b7280',
              marginBottom: '-2px',
              borderBottom: tab === t.id ? `2px solid ${NAVY}` : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'today' ? (
        <DashboardToday />
      ) : (
        <RoleDashboard userRole={userRole} />
      )}
    </div>
  );
}
