import { createContext, useContext, useState, ReactNode } from 'react';

interface Notification {
  id: string;
  title: string;
  time: string;
  link: string;
  type: 'alert' | 'info' | 'success';
  locationId: string;
  read?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotificationsState] = useState<Notification[]>(() => {
    const saved = sessionStorage.getItem('evidly_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
    sessionStorage.setItem('evidly_notifications', JSON.stringify(updated));
    setNotificationsState(updated);
  };

  const setNotifications = (newNotifications: Notification[]) => {
    const notifs = newNotifications.map(n => ({ ...n, read: n.read || false }));
    sessionStorage.setItem('evidly_notifications', JSON.stringify(notifs));
    setNotificationsState(notifs);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, setNotifications }}>
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
