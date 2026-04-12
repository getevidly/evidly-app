/**
 * HealthBanner — top-of-dashboard health status indicator
 *
 * Displays a single-line health summary with colored left border,
 * icon, and tinted background based on status.
 *
 * status: 'healthy' | 'attention' | 'risk'
 * scope: role-scoped label e.g. "Business Health", "Kitchen Health"
 * message: one-line plain-language summary
 */

import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export type HealthStatus = 'healthy' | 'attention' | 'risk';

interface HealthBannerProps {
  status: HealthStatus;
  scope: string;
  message: string;
}

const STATUS_CONFIG = {
  healthy: {
    borderColor: '#16a34a',
    bgColor: '#f0fdf4',
    iconColor: '#16a34a',
    textColor: '#166534',
    subTextColor: '#15803d',
    Icon: CheckCircle2,
  },
  attention: {
    borderColor: '#d97706',
    bgColor: '#fffbeb',
    iconColor: '#d97706',
    textColor: '#92400e',
    subTextColor: '#a16207',
    Icon: AlertTriangle,
  },
  risk: {
    borderColor: '#dc2626',
    bgColor: '#fef2f2',
    iconColor: '#dc2626',
    textColor: '#991b1b',
    subTextColor: '#b91c1c',
    Icon: AlertCircle,
  },
} as const;

export function HealthBanner({ status, scope, message }: HealthBannerProps) {
  const config = STATUS_CONFIG[status];
  const { Icon } = config;

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-3"
      style={{
        backgroundColor: config.bgColor,
        borderLeft: `4px solid ${config.borderColor}`,
      }}
    >
      <Icon size={18} className="shrink-0" style={{ color: config.iconColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: config.textColor }}>
          {scope}
        </p>
        <p className="text-xs" style={{ color: config.subTextColor }}>
          {message}
        </p>
      </div>
    </div>
  );
}
