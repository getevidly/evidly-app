/**
 * NotificationPanel — Right-edge slide panel for all notifications.
 * Replaces the old dropdown pattern in NotificationCenter.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCheck, Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationFilters, type FilterValue } from './NotificationFilters';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterValue>('all');

  const {
    unifiedNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    snooze,
  } = useNotifications();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid closing on the same click that opened
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const filtered = filter === 'all'
    ? unifiedNotifications
    : unifiedNotifications.filter(n => n.category === filter);

  const handleNavigate = (url: string) => {
    onClose();
    navigate(url);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 animate-fade-in" />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="notification-panel"
        className="fixed right-0 top-0 h-full z-50 bg-white shadow-2xl flex flex-col"
        style={{
          width: '420px',
          maxWidth: '100vw',
          animation: 'slideInRight 200ms ease-out',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: '#faf8f3' }}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#1E2D4D]">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#1E2D4D', color: 'white' }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: '#1E2D4D' }}
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2.5 -m-1 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <NotificationFilters
          filter={filter}
          onFilterChange={setFilter}
          notifications={unifiedNotifications}
        />

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No notifications</p>
              <p className="text-xs text-gray-400 mt-1">
                Alerts will appear here as your team uses EvidLY.
              </p>
            </div>
          ) : (
            filtered.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onNavigate={handleNavigate}
                onMarkAsRead={markAsRead}
                onSnooze={snooze}
                onDismiss={dismiss}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-[#FAF7F0] flex-shrink-0">
          <button
            onClick={() => handleNavigate('/settings/notifications')}
            className="w-full text-center text-xs font-semibold hover:underline"
            style={{ color: '#1E2D4D' }}
          >
            Notification Preferences
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
