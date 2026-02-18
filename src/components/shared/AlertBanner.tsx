import { ShieldAlert, AlertTriangle, Info, X } from 'lucide-react';

export interface AlertBannerItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location?: string;
  pillar?: string;
  actionLabel: string;
  route: string;
}

const SEVERITY_CONFIG = {
  critical: {
    bg: '#fef2f2',
    border: '#fecaca',
    icon: ShieldAlert,
    iconClass: 'text-red-500',
    textColor: '#991b1b',
    btnBg: '#dc2626',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    textColor: '#92400e',
    btnBg: '#d97706',
  },
  info: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: Info,
    iconClass: 'text-blue-500',
    textColor: '#1e40af',
    btnBg: '#2563eb',
  },
} as const;

export function AlertBanner({ alerts, onDismiss, navigate }: {
  alerts: AlertBannerItem[];
  onDismiss: (id: string) => void;
  navigate: (path: string) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2" style={{ animation: 'slideDown 0.3s ease-out' }}>
      {alerts.map(alert => {
        const config = SEVERITY_CONFIG[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className="flex items-center gap-3 px-4 py-3 rounded-[10px]"
            style={{
              backgroundColor: config.bg,
              border: `1px solid ${config.border}`,
            }}
          >
            <Icon size={18} className={`${config.iconClass} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: config.textColor }}>
                {alert.message}
              </p>
              {(alert.location || alert.pillar) && (
                <p className="text-[11px] text-gray-500">
                  {[alert.location, alert.pillar].filter(Boolean).join(' \u00B7 ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(alert.route)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md text-white shrink-0"
              style={{ backgroundColor: config.btnBg }}
            >
              {alert.actionLabel}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              className="p-1 rounded hover:bg-black/5 shrink-0 transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
