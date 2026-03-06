/**
 * useIntelligenceUnread — unread count for client intelligence feed
 *
 * In demo mode, returns a static count from demo data.
 * In auth mode, queries client_intelligence_feed for unread items
 * and subscribes to real-time changes.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';

export function useIntelligenceUnread(): number {
  const { isDemoMode } = useDemo();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: show 3 unread (matches demo feed items count minus 1)
      setCount(3);
      return;
    }

    // Auth mode: query actual unread count
    let cancelled = false;

    async function fetchCount() {
      const { count: unread } = await supabase
        .from('client_intelligence_feed')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_dismissed', false);
      if (!cancelled && unread != null) setCount(unread);
    }

    fetchCount();

    // Real-time subscription
    const channel = supabase
      .channel('intelligence-unread')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_intelligence_feed',
      }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [isDemoMode]);

  return count;
}
