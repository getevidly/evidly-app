import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface RealtimeNotification {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  priority: string;
  created_at: string;
}

const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtimeNotifications(
  onNewNotification: (notification: RealtimeNotification) => void
) {
  const { profile } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef(onNewNotification);
  callbackRef.current = onNewNotification;

  const orgId = profile?.organization_id;

  const subscribe = useCallback(() => {
    if (!orgId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications:${orgId}`)
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
          callbackRef.current(payload.new as RealtimeNotification);
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
  }, [orgId]);

  useEffect(() => {
    subscribe();

    // Pause subscription when tab is hidden — saves connections
    const handleVisibility = () => {
      if (document.hidden) {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } else {
        subscribe();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Cleanup — always remove channel on unmount to prevent memory leaks
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(reconnectTimer.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);
}
