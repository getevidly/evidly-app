/**
 * SIGNAL-NOTIFY-01 — Hook for intelligence signal notifications
 *
 * Returns critical/high unread signal notifications for the dashboard banner.
 * Queries the notifications table filtered by type = 'intelligence_signal'.
 * No published signals = empty state (no fake data).
 *
 * AUDIT-FIX-04 / FIX 6: Added realtime subscription with cleanup.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SignalNotification {
  id: string;
  title: string;
  body: string | null;
  cic_pillar: string | null;
  signal_type: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  is_read: boolean;
}

export function useSignalNotifications() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [notifications, setNotifications] = useState<SignalNotification[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const fetchSignalNotifications = useCallback(async () => {
    if (!orgId) return;

    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, cic_pillar, signal_type, priority, created_at, read_at')
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
          signal_type: n.signal_type || null,
          priority: n.priority,
          created_at: n.created_at,
          is_read: !!n.read_at,
        })),
      );
    }
  }, [orgId]);

  // Initial fetch
  useEffect(() => {
    fetchSignalNotifications();
  }, [fetchSignalNotifications]);

  // Real-time subscription with cleanup (FIX 6)
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('signal-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        fetchSignalNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, fetchSignalNotifications]);

  const dismissAll = useCallback(async () => {
    setDismissed(true);
    if (!orgId) return;

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('type', 'intelligence_signal')
      .is('read_at', null);
  }, [orgId]);

  const criticalNotifications = dismissed ? [] : notifications;
  const hasCritical = criticalNotifications.length > 0;

  return { criticalNotifications, hasCritical, dismissAll };
}
