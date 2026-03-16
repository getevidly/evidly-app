/**
 * NotificationItem — Single notification row with severity dot, action buttons.
 */

import { Check, Clock, X, ChevronRight } from 'lucide-react';
import { SEVERITY_CONFIG, CATEGORY_COLORS, timeAgo, type UnifiedNotification } from './notificationConstants';
import type { NotificationCategory } from '../../constants/statusColors';
import {
  ClipboardCheck, ShieldAlert, FileText, Truck, Users, Settings,
} from 'lucide-react';

const CATEGORY_ICON_MAP: Record<string, typeof ClipboardCheck> = {
  compliance: ClipboardCheck,
  safety: ShieldAlert,
  documents: FileText,
  vendors: Truck,
  team: Users,
  system: Settings,
};

interface NotificationItemProps {
  notification: UnifiedNotification;
  onNavigate: (url: string) => void;
  onMarkAsRead: (id: string) => void;
  onSnooze: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function NotificationItem({
  notification: n,
  onNavigate,
  onMarkAsRead,
  onSnooze,
  onDismiss,
}: NotificationItemProps) {
  const sev = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
  const isUnread = !n.readAt;
  const catColors = CATEGORY_COLORS[n.category as NotificationCategory];
  const CategoryIcon = CATEGORY_ICON_MAP[n.category] || Settings;

  const handleClick = () => {
    if (isUnread) onMarkAsRead(n.id);
    if (n.actionUrl) onNavigate(n.actionUrl);
  };

  return (
    <div
      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
      style={{ backgroundColor: isUnread ? '#fafbff' : 'white' }}
    >
      <div className="px-4 py-3 flex gap-3" onClick={handleClick}>
        {/* Category icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
          style={{ backgroundColor: catColors?.bg || '#f8fafc' }}
        >
          <CategoryIcon className="h-4 w-4" style={{ color: catColors?.color || '#6B7F96' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {isUnread && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sev.dot }}
                />
              )}
              <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                {n.title}
              </span>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
              {timeAgo(n.createdAt)}
            </span>
          </div>

          {n.body && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
          )}

          {/* Severity badge + action buttons */}
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: sev.bg, color: sev.color, fontSize: '10px' }}
            >
              {sev.label}
            </span>

            {n.actionLabel && n.actionUrl && (
              <button
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                className="text-xs font-medium flex items-center gap-0.5 hover:underline"
                style={{ color: '#1e4d6b' }}
              >
                {n.actionLabel} <ChevronRight className="h-3 w-3" />
              </button>
            )}

            <div className="flex gap-1 ml-auto" onClick={e => e.stopPropagation()}>
              {isUnread && (
                <button
                  onClick={() => onMarkAsRead(n.id)}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  title="Mark as read"
                >
                  <Check className="h-3 w-3 text-gray-400" />
                </button>
              )}
              <button
                onClick={() => onSnooze(n.id)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title="Snooze 24h"
              >
                <Clock className="h-3 w-3 text-gray-400" />
              </button>
              <button
                onClick={() => onDismiss(n.id)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title="Dismiss"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
