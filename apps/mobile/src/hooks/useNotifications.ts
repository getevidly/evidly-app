import { useState } from 'react';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'job_assigned' | 'qa_feedback' | 'schedule_change' | 'system_alert';
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'New Job Assigned',
    body: 'Thai Orchid - GFX service scheduled for March 17 at 9:00 AM',
    type: 'job_assigned',
    read: false,
    created_at: '2026-03-15T06:30:00Z',
    data: { job_id: 'j8' },
  },
  {
    id: 'n2',
    title: 'QA Feedback',
    body: 'Report for Cafe Parisien has been approved',
    type: 'qa_feedback',
    read: false,
    created_at: '2026-03-14T15:00:00Z',
    data: { report_id: 'r2', job_id: 'j6' },
  },
  {
    id: 'n3',
    title: 'Schedule Update',
    body: 'Golden Dragon Restaurant moved from 10:00 AM to 11:00 AM',
    type: 'schedule_change',
    read: true,
    created_at: '2026-03-14T12:00:00Z',
    data: { job_id: 'j2' },
  },
];

export function useNotifications() {
  const [notifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markRead: async (_notificationId: string) => {
      throw new Error('Not implemented in demo mode');
    },
    requestPermission: async () => {
      throw new Error('Not implemented in demo mode');
    },
  };
}
