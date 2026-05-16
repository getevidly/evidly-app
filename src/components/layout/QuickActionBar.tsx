import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  ClipboardCheck,
  Handshake,
  Thermometer,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Log Temp', subtitle: 'Record a reading', icon: Thermometer, route: '/temp-logs', iconBg: '#fef2f2', iconColor: '#ef4444' },
  { label: 'Run Checklist', subtitle: 'Start a checklist', icon: ClipboardCheck, route: '/checklists', iconBg: 'rgba(160,140,90,0.08)', iconColor: '#A08C5A' },
  { label: 'Shift Intel', subtitle: 'Current shift', icon: Handshake, route: '/current-shift', iconBg: '#f0fdf4', iconColor: '#16a34a' },
  { label: 'Report Incident', subtitle: 'Log an incident', icon: AlertTriangle, route: '/incidents', iconBg: '#fefce8', iconColor: '#d97706' },
] as const;

export function QuickActionBar() {
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-14 lg:bottom-0 left-0 right-0 lg:left-60 z-[35] bg-white/95 backdrop-blur-sm"
      style={{ borderTop: '1px solid #E8EDF5' }}
    >
      <div className="px-3 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full py-2">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {QUICK_ACTIONS.map((link) => (
            <button
              key={link.route}
              type="button"
              onClick={() => navigate(link.route)}
              className="group bg-white rounded-xl p-2.5 sm:p-4 flex items-center gap-1.5 sm:gap-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-[#1E2D4D]/15 transition-all duration-200"
              style={{ border: '1px solid #e5e7eb' }}
            >
              <div className="p-1.5 sm:p-2 rounded-lg shrink-0" style={{ backgroundColor: link.iconBg, color: link.iconColor }}>
                <link.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium block truncate" style={{ color: '#1E2D4D' }}>{link.label}</span>
                <span className="text-xs hidden sm:block truncate" style={{ color: '#6b7280' }}>{link.subtitle}</span>
              </div>
              <ChevronRight
                size={14}
                className="ml-auto shrink-0 text-[#1E2D4D]/30 group-hover:text-[#1E2D4D]/70 group-hover:translate-x-1 transition-all duration-200 hidden sm:block"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
