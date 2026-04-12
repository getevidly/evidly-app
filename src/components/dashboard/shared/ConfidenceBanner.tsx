/**
 * ConfidenceBanner — Standing-based status banner for all dashboard roles
 *
 * Three states: covered (green), attention (amber), risk (red).
 * Headline is always dynamic — constructed from real standing data.
 */

import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { BannerStatus } from '../../../hooks/useDashboardStanding';
import { CONFIDENCE_BANNER_COPY } from '../../../config/emotionalCopy';

interface ConfidenceBannerProps {
  status: BannerStatus;
  headline: string;
  locationCount?: number;
  attentionCount?: number;
  role?: string;
}

const STATUS_CONFIG = {
  covered: {
    borderColor: '#16a34a',
    bgColor: '#f0fdf4',
    iconColor: '#16a34a',
    textColor: '#166534',
    subTextColor: '#15803d',
    label: 'All Clear',
    Icon: CheckCircle2,
  },
  attention: {
    borderColor: '#d97706',
    bgColor: '#fffbeb',
    iconColor: '#d97706',
    textColor: '#92400e',
    subTextColor: '#a16207',
    label: 'Needs Attention',
    Icon: AlertTriangle,
  },
  risk: {
    borderColor: '#dc2626',
    bgColor: '#fef2f2',
    iconColor: '#dc2626',
    textColor: '#991b1b',
    subTextColor: '#b91c1c',
    label: 'Action Required',
    Icon: AlertCircle,
  },
} as const;

export function ConfidenceBanner({ status, headline, locationCount, attentionCount, role }: ConfidenceBannerProps) {
  // Hide entirely when there's no meaningful data (new user with 0 locations)
  if (locationCount === 0) return null;

  const config = STATUS_CONFIG[status];
  const { Icon } = config;

  // Map banner status to emotional copy status key
  const copyKey = status === 'covered' ? 'strong' : status === 'attention' ? 'moderate' : 'needs_attention';
  const roleCopy = role && CONFIDENCE_BANNER_COPY[role]?.[copyKey];

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
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: config.textColor }}>
            {config.label}
          </p>
          {locationCount !== undefined && attentionCount !== undefined && attentionCount > 0 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: config.borderColor, color: '#FFFFFF' }}
            >
              {attentionCount}/{locationCount}
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: config.subTextColor }}>
          {roleCopy || headline}
        </p>
      </div>
    </div>
  );
}
