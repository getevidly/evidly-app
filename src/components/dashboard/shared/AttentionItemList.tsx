/**
 * AttentionItemList — Renders attention items from real data
 *
 * Renders nothing when no items exist (not "No items found").
 * Each item shows severity badge, location, description, resolve link.
 */

import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { BODY_TEXT, NAVY } from './constants';
import type { AttentionItem } from '../../../hooks/useDashboardStanding';

interface AttentionItemListProps {
  items: AttentionItem[];
}

export function AttentionItemList({ items }: AttentionItemListProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>What Needs Attention</h3>
      </div>
      <div>
        {items.map(item => {
          const isCritical = item.severity === 'critical';
          const Icon = isCritical ? AlertCircle : AlertTriangle;
          const iconColor = isCritical ? '#dc2626' : '#d97706';
          const bgColor = isCritical ? '#fef2f2' : '#fffbeb';
          const labelColor = isCritical ? '#991b1b' : '#92400e';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.route)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              style={{ borderBottom: '1px solid #F0F0F0', backgroundColor: bgColor }}
            >
              <Icon size={16} className="shrink-0 mt-0.5" style={{ color: iconColor }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: iconColor, color: '#FFFFFF' }}>
                    {item.severity}
                  </span>
                  {item.locationName && (
                    <span className="text-xs font-medium" style={{ color: '#6B7F96' }}>
                      {item.locationName}
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: labelColor }}>
                  {item.description}
                </p>
              </div>
              <span className="text-xs font-medium shrink-0 mt-1" style={{ color: NAVY }}>
                Resolve &rarr;
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
