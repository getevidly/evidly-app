/**
 * NotificationContext.tsx — NOTIFICATION-SUPER-01
 *
 * Unified notification context backed by Supabase + realtime.
 * Demo mode: returns empty arrays (zero fake data).
 *
 * Preserves backward-compatible API:
 *   useNotifications() → { notifications, unreadCount, markAsRead, setNotifications }
 *
 * Also exposes new methods:
 *   markAllAsRead, dismiss, snooze, refetch, isLoading, unifiedNotifications
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNotificationData } from '../hooks/useNotificationData';
import type { UnifiedNotification } from '../components/notifications/notificationConstants';

// ── Legacy shape (backward compat for Checklists, DiagnosisWizard, Layout) ──

interface LegacyNotification {
  id: string;
  title: string;
  time: string;
  link: string;
  type: 'alert' | 'info' | 'success';
  locationId: string;
  read?: boolean;
}

// ── Context shape ────────────────────────────────────────────

interface NotificationContextType {
  // Legacy API (backward compat)
  notifications: LegacyNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  setNotifications: (notifications: LegacyNotification[]) => void;

  // New unified API
  unifiedNotifications: UnifiedNotification[];
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  snooze: (id: string, hours?: number) => void;
  refetch: () => void;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Unified data from Supabase
  const data = useNotificationData();

  // Legacy local notifications (pushed by Checklists, DiagnosisWizard, Layout realtime)
  const [localNotifications, setLocalNotificationsState] = useState<LegacyNotification[]>([]);

  // Merge: local notifications + mapped unified notifications
  const mappedUnified: LegacyNotification[] = data.notifications.map(n => ({
    id: n.id,
    title: n.title,
    time: n.createdAt,
    link: n.actionUrl || '',
    type: n.severity === 'urgent' ? 'alert' as const
      : n.severity === 'info' ? 'info' as const
      : 'info' as const,
    locationId: '',
    read: !!n.readAt,
  }));

  const mergedNotifications = [...localNotifications, ...mappedUnified];
  const mergedUnreadCount = mergedNotifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    // Try local first
    setLocalNotificationsState(prev => {
      const found = prev.find(n => n.id === id);
      if (found) {
        return prev.map(n => n.id === id ? { ...n, read: true } : n);
      }
      return prev;
    });
    // Also mark in unified (Supabase)
    data.markAsRead(id);
  }, [data]);

  const setNotifications = useCallback((newNotifications: LegacyNotification[]) => {
    setLocalNotificationsState(newNotifications.map(n => ({ ...n, read: n.read || false })));
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications: mergedNotifications,
      unreadCount: mergedUnreadCount,
      markAsRead,
      setNotifications,
      unifiedNotifications: data.notifications,
      markAllAsRead: data.markAllAsRead,
      dismiss: data.dismiss,
      snooze: data.snooze,
      refetch: data.refetch,
      isLoading: data.isLoading,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
