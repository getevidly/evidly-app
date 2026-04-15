import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';
import { checkPermission } from '../../hooks/usePermission';
import { useDemo } from '../../contexts/DemoContext';
import { useMobile } from '../../hooks/useMobile';
import { QuickTempSheet } from '../temp-logs/QuickTempSheet';

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
    { emoji: '🔥', label: 'Fire Safety', route: '/facility-safety', permission: 'bottom.facility-safety' },
    { emoji: '📊', label: 'Reporting', route: '/reports', permission: 'bottom.reports' },
    { emoji: '🔍', label: 'Inspector', route: '/inspector-mode', permission: 'bottom.corrective-actions' },
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
    { emoji: '🔧', label: 'Fix Items', route: '/corrective-actions', permission: 'bottom.corrective-actions' },
  ],
  chef: [
    { emoji: '📋', label: 'Checklists', route: '/checklists', permission: 'bottom.checklists' },
    { emoji: '🌡️', label: 'Temps', route: '/temp-logs', permission: 'bottom.temps' },
    { emoji: '📱', label: 'QR Scan', route: '/temp-logs/scan', permission: 'bottom.qr-scan' },
    { emoji: '👥', label: 'Team', route: '/team', permission: 'bottom.team' },
    { emoji: '⚠️', label: 'Incidents', route: '/incidents', permission: 'bottom.incidents' },
  ],
  facilities_manager: [
    { emoji: '🔥', label: 'Fire Safety', route: '/facility-safety', permission: 'bottom.facility-safety' },
    { emoji: '🔧', label: 'Equipment', route: '/equipment', permission: 'bottom.equipment' },
    { emoji: '📝', label: 'Request Svc', route: '/vendors?tab=requests', permission: 'bottom.schedule' },
    { emoji: '👷', label: 'Vendors', route: '/vendors', permission: 'bottom.vendors' },
    { emoji: '🔔', label: 'Alerts', route: '/analysis', permission: 'bottom.alerts' },
  ],
  kitchen_manager: [
    { emoji: '📋', label: 'Checklists', route: '/checklists', permission: 'bottom.checklists' },
    { emoji: '🌡️', label: 'Temps', route: '/temp-logs', permission: 'bottom.temps' },
    { emoji: '📱', label: 'QR Scan', route: '/temp-logs/scan', permission: 'bottom.qr-scan' },
    { emoji: '👥', label: 'Team', route: '/team', permission: 'bottom.team' },
    { emoji: '📝', label: 'Assign', route: '/tasks?action=new', permission: 'bottom.assign-task' },
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
  const { isDemoMode, presenterMode } = useDemo();
  const { isMobile } = useMobile();
  const [showQuickTemp, setShowQuickTemp] = useState(false);
  const showDemoCTA = isDemoMode && !presenterMode;

  const actions = useMemo(() => {
    const roleActions = ROLE_ACTIONS[userRole] || [];
    // Permission system runs alongside role-based action list
    return roleActions.filter(a => checkPermission(userRole, a.permission));
  }, [userRole]);

  // Kitchen staff uses dedicated bottom nav — no quick actions
  if (userRole === 'kitchen_staff') return null;
  if (actions.length === 0) return null;

  return (
    <>
      {/* Desktop — fixed bottom bar (lg+ only, matches sidebar breakpoint) */}
      <div
        data-testid="quick-actions-bar"
        className="hidden lg:flex fixed bottom-0 left-0 lg:left-60 right-0 z-40 bg-white border-t justify-center items-center gap-6"
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
                  : 'hover:bg-[#FAF7F0]'
              }`}
            >
              <span className="text-lg leading-none">{action.emoji}</span>
              <span
                className="text-[11px] font-bold leading-tight"
                style={{ color: isActive ? '#1E2D4D' : '#6b7280' }}
              >
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile — above MobileTabBar (h-14 at bottom-0) + DemoCTABar when in demo */}
      <div
        data-testid="quick-actions-bar-mobile"
        className={`lg:hidden fixed left-0 right-0 z-40 bg-white border-t ${showDemoCTA ? 'bottom-[7rem]' : 'bottom-14'}`}
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
                onClick={() => {
                  if (isMobile && action.route === '/temp-logs') {
                    setShowQuickTemp(true);
                  } else {
                    navigate(action.route);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? '' : 'active:bg-[#FAF7F0]'
                }`}
                style={isActive ? { backgroundColor: 'rgba(30,77,107,0.1)' } : undefined}
              >
                <span className="text-base leading-none">{action.emoji}</span>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: isActive ? '#1E2D4D' : '#6b7280' }}
                >
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <QuickTempSheet open={showQuickTemp} onClose={() => setShowQuickTemp(false)} />
    </>
  );
}
