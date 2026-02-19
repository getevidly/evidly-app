/**
 * DASHBOARD-8 v2 — "Where Do I Start" Section
 *
 * Renders a severity-ranked priority list with action buttons.
 * Used in all dashboard views (except Kitchen Staff) to answer
 * "What should I tackle first?"
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { FONT, BODY_TEXT, stagger } from './constants';
import { SectionTooltip } from '../../ui/SectionTooltip';

export interface PriorityItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail?: string;
  actionLabel: string;
  route: string;
}

interface WhereDoIStartSectionProps {
  items: PriorityItem[];
  /** Stagger animation start index */
  staggerOffset?: number;
  /** Optional tooltip content for the section header */
  tooltipContent?: string;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    bg: '#fef2f2',
    border: '#fecaca',
    iconColor: '#dc2626',
    badgeBg: '#dc2626',
    badgeText: '#fff',
    label: 'Critical',
  },
  warning: {
    icon: AlertCircle,
    bg: '#fffbeb',
    border: '#fde68a',
    iconColor: '#d97706',
    badgeBg: '#d97706',
    badgeText: '#fff',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bg: '#eff6ff',
    border: '#bfdbfe',
    iconColor: '#2563eb',
    badgeBg: '#2563eb',
    badgeText: '#fff',
    label: 'Info',
  },
};

export function WhereDoIStartSection({ items, staggerOffset = 0, tooltipContent }: WhereDoIStartSectionProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div style={{ ...FONT, animation: `fadeInUp 0.4s ease-out ${staggerOffset * 0.1}s both` }}>
      <h3
        className="text-base font-bold mb-3 flex items-center"
        style={{ color: BODY_TEXT }}
      >
        Where Do I Start?
        {tooltipContent && <SectionTooltip content={tooltipContent} />}
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => {
          const config = SEVERITY_CONFIG[item.severity];
          const Icon = config.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-all hover:shadow-sm"
              style={{
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
                ...stagger(staggerOffset + i),
              }}
              onClick={() => navigate(item.route)}
            >
              <Icon className="w-5 h-5 flex-shrink-0" style={{ color: config.iconColor }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: config.badgeBg, color: config.badgeText }}
                  >
                    {config.label}
                  </span>
                  <span className="text-sm font-semibold truncate" style={{ color: BODY_TEXT }}>
                    {item.title}
                  </span>
                </div>
                {item.detail && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.detail}</p>
                )}
              </div>
              <span
                className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 px-2.5 py-1 rounded-md transition-colors"
                style={{ color: '#1e4d6b', backgroundColor: 'rgba(30,77,107,0.08)' }}
              >
                {item.actionLabel}
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
