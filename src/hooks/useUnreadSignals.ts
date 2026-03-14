/**
 * AUDIT-FIX-07 / P-5 — Unread intelligence signal count for bell badge
 *
 * Uses two-step fetch (signals + reads) computed in JS.
 * Replaces fragile PostgREST NOT IN subquery pattern.
 * Real-time subscription on intelligence_signals for INSERT/UPDATE events.
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

    // Step 1: Get all published signal IDs for this org
    const { data: signals, error: sigError } = await supabase
      .from('intelligence_signals')
      .select('id')
      .eq('is_published', true)
      .eq('org_id', orgId);

    if (sigError || !signals) {
      setUnreadCount(0);
      return;
    }

    // Step 2: Get all read signal IDs for this user
    const { data: reads } = await supabase
      .from('signal_reads')
      .select('signal_id')
      .eq('user_id', userId);

    // Step 3: Count in JS — reliable, no PostgREST filter fragility
    const readIds = new Set((reads || []).map(r => r.signal_id));
    const count = signals.filter(s => !readIds.has(s.id)).length;
    setUnreadCount(count);
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
