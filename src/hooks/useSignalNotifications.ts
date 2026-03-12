/**
 * SIGNAL-NOTIFY-01 — Hook for intelligence signal notifications
 *
 * Returns critical/high unread signal notifications for the dashboard banner.
 * Demo mode: returns 2 hardcoded demo signal notifications.
 * Production: queries the notifications table filtered by type = 'intelligence_signal'.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

export interface SignalNotification {
  id: string;
  title: string;
  body: string | null;
  cic_pillar: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  is_read: boolean;
}

// ── Demo signal notifications (used only in demo mode) ──────────────
const DEMO_SIGNAL_NOTIFICATIONS: SignalNotification[] = [
  {
    id: 'demo-sig-notif-1',
    title: 'FDA Updates Retail Food Code — Cold Holding Clarification',
    body: 'FDA has issued a clarification on cold holding requirements for cut leafy greens. Operators should review current cold holding procedures and ensure TCS items are maintained at 41\u00B0F or below.',
    cic_pillar: 'revenue_risk',
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    is_read: false,
  },
  {
    id: 'demo-sig-notif-2',
    title: 'CalCode Amendment — Hood Cleaning Documentation Requirements',
    body: 'California is proposing stricter documentation requirements for hood cleaning and exhaust system maintenance under NFPA 96. Operators in California should ensure vendor service records are current and uploaded.',
    cic_pillar: 'liability_risk',
    priority: 'critical',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    is_read: false,
  },
];

export function useSignalNotifications() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [notifications, setNotifications] = useState<SignalNotification[]>(
    isDemoMode ? DEMO_SIGNAL_NOTIFICATIONS : [],
  );
  const [dismissed, setDismissed] = useState(false);

  // Production: fetch from Supabase
  useEffect(() => {
    if (isDemoMode || !orgId) return;

    async function fetch() {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, cic_pillar, priority, created_at, read_at')
        .eq('organization_id', orgId)
        .eq('type', 'intelligence_signal')
        .is('read_at', null)
        .in('priority', ['critical', 'high'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setNotifications(
          data.map((n: any) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            cic_pillar: n.cic_pillar,
            priority: n.priority,
            created_at: n.created_at,
            is_read: !!n.read_at,
          })),
        );
      }
    }

    fetch();
  }, [isDemoMode, orgId]);

  // Dismiss all (mark as read)
  const dismissAll = useCallback(async () => {
    setDismissed(true);

    if (isDemoMode) return;
    if (!orgId) return;

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('type', 'intelligence_signal')
      .is('read_at', null);
  }, [isDemoMode, orgId]);

  const criticalNotifications = dismissed ? [] : notifications;
  const hasCritical = criticalNotifications.length > 0;

  return { criticalNotifications, hasCritical, dismissAll };
}
