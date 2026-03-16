/**
 * useNotificationData.ts — NOTIFICATION-SUPER-01
 *
 * Combined fetch + realtime hook for the unified notifications table.
 * Used internally by NotificationContext.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { mapDbRow, type UnifiedNotification } from '../components/notifications/notificationConstants';

const FETCH_LIMIT = 50;
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useNotificationData() {
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const userId = user?.id;

  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch notifications from DB ────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', orgId)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(FETCH_LIMIT);

      if (error) {
        console.warn('[useNotificationData] Fetch error:', error.message);
        setNotifications([]);
        return;
      }

      // Filter out snoozed notifications client-side
      const now = new Date().toISOString();
      const active = (data || []).filter(row => {
        const snoozed = row.snoozed_until;
        return !snoozed || snoozed < now;
      });

      setNotifications(active.map(mapDbRow));
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, orgId]);

  // ── Initial fetch ──────────────────────────────────────────
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Realtime subscription ──────────────────────────────────
  const subscribe = useCallback(() => {
    if (isDemoMode || !orgId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notif-unified:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          reconnectAttempts.current = 0;
          const newNotif = mapDbRow(payload.new as Record<string, unknown>);
          setNotifications(prev => [newNotif, ...prev]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttempts.current = 0;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts.current);
            reconnectAttempts.current++;
            reconnectTimer.current = setTimeout(subscribe, delay);
          }
        }
      });

    channelRef.current = channel;
  }, [isDemoMode, orgId]);

  useEffect(() => {
    subscribe();

    const handleVisibility = () => {
      if (document.hidden) {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } else {
        subscribe();
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(reconnectTimer.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe, fetchNotifications]);

  // ── Mutations ──────────────────────────────────────────────

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
    );
    if (!isDemoMode) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    }
  }, [isDemoMode]);

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || now })));
    if (!isDemoMode && orgId) {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('organization_id', orgId)
        .is('read_at', null);
    }
  }, [isDemoMode, orgId]);

  const dismiss = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!isDemoMode) {
      await supabase
        .from('notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id);
    }
  }, [isDemoMode]);

  const snooze = useCallback(async (id: string, hours = 24) => {
    const until = new Date(Date.now() + hours * 3600000).toISOString();
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!isDemoMode) {
      await supabase
        .from('notifications')
        .update({ snoozed_until: until })
        .eq('id', id);
    }
  }, [isDemoMode]);

  // ── Computed values ────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.readAt).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismiss,
    snooze,
    refetch: fetchNotifications,
  };
}
