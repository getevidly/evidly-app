import { useLocation, useNavigate } from 'react-router-dom';
import { Thermometer, ClipboardCheck, FileUp, AlertTriangle } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';

interface QuickAction {
  icon: typeof Thermometer;
  label: string;
  route: string;
}

const ALL_ACTIONS: QuickAction[] = [
  { icon: Thermometer, label: 'Log Temp', route: '/temp-logs' },
  { icon: ClipboardCheck, label: 'Checklist', route: '/checklists' },
  { icon: FileUp, label: 'Upload Doc', route: '/documents' },
  { icon: AlertTriangle, label: 'Report Issue', route: '/incidents' },
];

const ROLE_ACTIONS: Record<UserRole, string[]> = {
  management: ['/temp-logs', '/checklists', '/documents', '/incidents'],
  kitchen_manager: ['/temp-logs', '/checklists', '/documents', '/incidents'],
  kitchen: ['/temp-logs', '/checklists', '/incidents'],
  facilities: ['/documents', '/incidents'],
  executive: [], // hidden
};

export function QuickActionsBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useRole();

  const allowedRoutes = ROLE_ACTIONS[userRole] || [];
  if (allowedRoutes.length === 0) return null;

  const actions = ALL_ACTIONS.filter(a => allowedRoutes.includes(a.route));

  return (
    <>
      {/* Desktop — position: fixed, bottom: 0, offset by sidebar at lg */}
      <div
        className="hidden md:flex fixed bottom-0 left-0 lg:left-60 right-0 z-40 bg-white border-t border-gray-200 justify-center items-center gap-3"
        style={{ padding: '8px 16px', fontFamily: 'Inter, sans-serif' }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const isActive = location.pathname === action.route;
          return (
            <button
              key={action.route}
              onClick={() => navigate(action.route)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              style={isActive ? { backgroundColor: '#1e4d6b' } : undefined}
            >
              <Icon size={18} />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Mobile — above MobileTabBar (which is h-16 at bottom-0) */}
      <div
        className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200"
        style={{ height: 56, fontFamily: 'Inter, sans-serif' }}
      >
        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${actions.length}, 1fr)` }}>
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = location.pathname === action.route;
            return (
              <button
                key={action.route}
                onClick={() => navigate(action.route)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? '' : 'active:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: 'rgba(30,77,107,0.1)' } : undefined}
              >
                <Icon size={18} style={{ color: isActive ? '#1e4d6b' : '#6b7280' }} />
                <span
                  className="text-[10px] font-medium"
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
