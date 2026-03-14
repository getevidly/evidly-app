/**
 * AUDIT-FIX-04 / FIX 5 — Mark a signal as read for the current user
 *
 * Upserts into signal_reads on conflict do nothing.
 * Call when a signal card is clicked/opened.
 */

import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

export function useMarkSignalRead() {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const userId = user?.id;

  const markRead = useCallback(async (signalId: string) => {
    if (isDemoMode || !userId) return;

    await supabase
      .from('signal_reads')
      .upsert(
        { signal_id: signalId, user_id: userId },
        { onConflict: 'signal_id,user_id' },
      );
  }, [isDemoMode, userId]);

  return { markRead };
}
