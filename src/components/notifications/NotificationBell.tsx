/**
 * NotificationBell — Bell icon with unread badge.
 * Sits in TopBar and toggles the NotificationPanel.
 */

import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { unreadCount, unifiedNotifications } = useNotifications();
  const urgentUnread = unifiedNotifications.filter(n => !n.readAt && n.severity === 'urgent').length;

  return (
    <button
      data-testid="notification-bell"
      onClick={onClick}
      className="relative p-2 rounded-md transition-colors duration-150"
      style={{ color: '#1E2D4D' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(160,140,90,0.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
          style={{
            backgroundColor: urgentUnread > 0 ? '#dc2626' : '#d97706',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            width: '18px',
            height: '18px',
            borderRadius: '9999px',
            lineHeight: '18px',
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
