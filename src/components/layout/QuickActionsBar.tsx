import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';
import { checkPermission } from '../../hooks/usePermission';

interface QuickAction {
  emoji: string;
  label: string;
  route: string;
  permission: string;
}

// 5 emoji buttons per role (per DASHBOARD-8 v2 spec)
const ROLE_ACTIONS: Record<UserRole, QuickAction[]> = {
  owner_operator: [
    { emoji: '📋', label: 'Checklists', route: '/checklists', permission: 'bottom.checklists' },
    { emoji: '🌡️', label: 'Temps', route: '/temp-logs', permission: 'bottom.temps' },
    { emoji: '🔥', label: 'Fire Safety', route: '/fire-safety', permission: 'bottom.fire-safety' },
    { emoji: '📊', label: 'Reporting', route: '/reports', permission: 'bottom.reports' },
    { emoji: '🔔', label: 'Alerts', route: '/analysis', permission: 'bottom.alerts' },
  ],
  executive: [
    { emoji: '📊', label: 'Reporting', route: '/reports', permission: 'bottom.reports' },
    { emoji: '📍', label: 'Locations', route: '/org-hierarchy', permission: 'bottom.locations' },
    { emoji: '📈', label: 'Benchmarks', route: '/benchmarks', permission: 'bottom.benchmarks' },
    { emoji: '📰', label: 'Regulatory', route: '/regulatory-alerts', permission: 'bottom.regulatory' },
    { emoji: '⚙️', label: 'Settings', route: '/settings', permission: 'bottom.settings' },
  ],
  compliance_manager: [
    { emoji: '✅', label: 'Compliance', route: '/scoring-breakdown', permission: 'bottom.compliance' },
    { emoji: '🔎', label: 'Self-Inspect', route: '/self-inspection', permission: 'bottom.self-inspect' },
    { emoji: '⚠️', label: 'Violations', route: '/analysis', permission: 'bottom.violations' },
    { emoji: '📰', label: 'Regulatory', route: '/regulatory-alerts', permission: 'bottom.regulatory' },
    { emoji: '🔔', label: 'Alerts', route: '/analysis', permission: 'bottom.alerts' },
  ],
  chef: [
    { emoji: '📋', label: 'Checklists', route: '/checklists', permission: 'bottom.checklists' },
    { emoji: '🌡️', label: 'Temps', route: '/temp-logs', permission: 'bottom.temps' },
    { emoji: '📱', label: 'QR Scan', route: '/temp-logs/scan', permission: 'bottom.qr-scan' },
    { emoji: '👥', label: 'Team', route: '/team', permission: 'bottom.team' },
    { emoji: '⚠️', label: 'Incidents', route: '/incidents', permission: 'bottom.incidents' },
  ],
  facilities_manager: [
    { emoji: '🔥', label: 'Fire Safety', route: '/fire-safety', permission: 'bottom.fire-safety' },
    { emoji: '🔧', label: 'Equipment', route: '/equipment', permission: 'bottom.equipment' },
    { emoji: '📅', label: 'Schedule', route: '/calendar', permission: 'bottom.schedule' },
    { emoji: '👷', label: 'Vendors', route: '/vendors', permission: 'bottom.vendors' },
    { emoji: '🔔', label: 'Alerts', route: '/analysis', permission: 'bottom.alerts' },
  ],
  kitchen_manager: [
    { emoji: '📋', label: 'Checklists', route: '/checklists', permission: 'bottom.checklists' },
    { emoji: '🌡️', label: 'Temps', route: '/temp-logs', permission: 'bottom.temps' },
    { emoji: '📱', label: 'QR Scan', route: '/temp-logs/scan', permission: 'bottom.qr-scan' },
    { emoji: '👥', label: 'Team', route: '/team', permission: 'bottom.team' },
    { emoji: '⚠️', label: 'Incidents', route: '/incidents', permission: 'bottom.incidents' },
  ],
  kitchen_staff: [
    { emoji: '📋', label: 'Tasks', route: '/dashboard', permission: 'bottom.tasks' },
    { emoji: '🌡️', label: 'Temp', route: '/temp-logs', permission: 'bottom.temps' },
    { emoji: '📱', label: 'QR Scan', route: '/temp-logs/scan', permission: 'bottom.qr-scan' },
    { emoji: '📷', label: 'Photo', route: '/photo-evidence', permission: 'bottom.photo' },
    { emoji: '⚠️', label: 'Report', route: '/incidents', permission: 'bottom.report' },
  ],
};

export function QuickActionsBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useRole();

  const actions = useMemo(() => {
    const roleActions = ROLE_ACTIONS[userRole] || [];
    // Permission system runs alongside role-based action list
    return roleActions.filter(a => checkPermission(userRole, a.permission));
  }, [userRole]);

  if (actions.length === 0) return null;

  // Kitchen staff: full-width (no sidebar offset)
  const isKitchenStaff = userRole === 'kitchen_staff';

  return (
    <>
      {/* Desktop — fixed bottom bar */}
      <div
        className={`hidden md:flex fixed bottom-0 ${isKitchenStaff ? 'left-0' : 'left-0 lg:left-60'} right-0 z-[100] bg-white border-t justify-center items-center gap-6`}
        style={{
          padding: '8px 32px',
          borderColor: '#e2e8f0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {actions.map((action) => {
          const isActive = location.pathname === action.route;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#eef4f8]'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-lg leading-none">{action.emoji}</span>
              <span
                className="text-[9px] font-bold leading-tight"
                style={{ color: isActive ? '#1e4d6b' : '#6b7280' }}
              >
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile — above MobileTabBar (which is h-14 at bottom-0) */}
      <div
        className="md:hidden fixed bottom-14 left-0 right-0 z-[100] bg-white border-t"
        style={{
          height: 56,
          borderColor: '#e2e8f0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${actions.length}, 1fr)` }}>
          {actions.map((action) => {
            const isActive = location.pathname === action.route;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? '' : 'active:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: 'rgba(30,77,107,0.1)' } : undefined}
              >
                <span className="text-base leading-none">{action.emoji}</span>
                <span
                  className="text-[9px] font-bold"
                  style={{ color: isActive ? '#1e4d6b' : '#6b7280' }}
                >
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
