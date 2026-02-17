import { useLocation, useNavigate } from 'react-router-dom';
import { Thermometer, ClipboardCheck, FileUp, AlertTriangle, Camera, Brain, Wrench, Flame, QrCode } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';

interface QuickAction {
  icon: typeof Thermometer;
  label: string;
  route: string;
}

// Role-specific quick actions
const ROLE_ACTIONS: Record<UserRole, QuickAction[]> = {
  management: [
    { icon: Thermometer, label: 'Log Temp', route: '/temp-logs' },
    { icon: QrCode, label: 'Scan QR', route: '/temp-logs/scan' },
    { icon: ClipboardCheck, label: 'Checklist', route: '/checklists' },
    { icon: Flame, label: 'Fire Check', route: '/fire-safety' },
    { icon: FileUp, label: 'Upload Doc', route: '/documents' },
    { icon: Camera, label: 'Photo', route: '/photo-evidence' },
    { icon: Brain, label: 'AI Advisor', route: '/copilot' },
  ],
  executive: [], // Executive uses StrategicActionsBar in its own dashboard
  kitchen_manager: [
    { icon: Thermometer, label: 'Log Temp', route: '/temp-logs' },
    { icon: QrCode, label: 'Scan QR', route: '/temp-logs/scan' },
    { icon: ClipboardCheck, label: 'Checklist', route: '/checklists' },
    { icon: Flame, label: 'Fire Check', route: '/fire-safety' },
    { icon: FileUp, label: 'Upload Doc', route: '/documents' },
    { icon: AlertTriangle, label: 'Report Issue', route: '/incidents' },
  ],
  facilities: [
    { icon: Flame, label: 'Fire Check', route: '/fire-safety' },
    { icon: FileUp, label: 'Upload Doc', route: '/documents' },
    { icon: AlertTriangle, label: 'Report Issue', route: '/incidents' },
    { icon: Wrench, label: 'Equipment Log', route: '/equipment' },
  ],
  kitchen: [
    { icon: Thermometer, label: 'Log Temp', route: '/temp-logs' },
    { icon: QrCode, label: 'Scan QR', route: '/temp-logs/scan' },
    { icon: ClipboardCheck, label: 'Checklist', route: '/checklists' },
    { icon: Camera, label: 'Photo', route: '/photo-evidence' },
    { icon: AlertTriangle, label: 'Report Issue', route: '/playbooks' },
  ],
};

export function QuickActionsBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useRole();

  const actions = ROLE_ACTIONS[userRole] || [];
  if (actions.length === 0) return null;

  return (
    <>
      {/* Desktop — position: fixed, bottom: 0, offset by sidebar at lg */}
      <div
        className="hidden md:flex fixed bottom-0 left-0 lg:left-60 right-0 z-[100] bg-white border-t justify-center items-center gap-3"
        style={{
          padding: '10px 32px',
          borderColor: '#e2e8f0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const isActive = location.pathname === action.route;
          return (
            <button
              key={action.route + action.label}
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

      {/* Mobile — above MobileTabBar (which is h-14 at bottom-0) */}
      <div
        className="md:hidden fixed bottom-14 left-0 right-0 z-[100] bg-white border-t"
        style={{
          height: 56,
          borderColor: '#e2e8f0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${actions.length}, 1fr)` }}>
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = location.pathname === action.route;
            return (
              <button
                key={action.route + action.label}
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
