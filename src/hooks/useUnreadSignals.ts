/**
 * AUDIT-FIX-04 / FIX 1 — Unread intelligence signal count for bell badge
 *
 * Queries intelligence_signals WHERE is_published = true, scoped to org_id.
 * Uses signal_reads table to determine unread (no read record for current user).
 * Real-time subscription on intelligence_signals for INSERT/UPDATE events.
 * REQUIRED: cleanup via supabase.removeChannel.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

export function useUnreadSignals() {
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const userId = user?.id;

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (isDemoMode || !orgId || !userId) {
      setUnreadCount(0);
      return;
    }

    // Count published signals with no matching signal_reads record for this user
    const { count, error } = await supabase
      .from('intelligence_signals')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true)
      .eq('org_id', orgId)
      .not('id', 'in', `(SELECT signal_id FROM signal_reads WHERE user_id = '${userId}')`);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, [isDemoMode, orgId, userId]);

  // Initial fetch
  useEffect(() => { fetchCount(); }, [fetchCount]);

  // Real-time subscription
  useEffect(() => {
    if (isDemoMode || !orgId) return;

    const channel = supabase
      .channel('unread-signals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'intelligence_signals',
        filter: `org_id=eq.${orgId}`,
      }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isDemoMode, orgId, fetchCount]);

  return { unreadCount };
}
