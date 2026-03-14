/**
 * AUDIT-FIX-04 / FIX 2 — Active intelligence banner for dashboard
 *
 * Queries intelligence_signals for the highest-priority unread
 * outbreak or game_plan signal. Returns banner data + dismiss function.
 * Real-time subscription with cleanup.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

export interface BannerSignal {
  id: string;
  title: string;
  summary: string;
  signal_type: string;
  priority: string;
}

export function useActiveBanner() {
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const userId = user?.id;

  const [banner, setBanner] = useState<BannerSignal | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchBanner = useCallback(async () => {
    if (isDemoMode || !orgId || !userId) {
      setBanner(null);
      return;
    }

    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('id, title, summary, signal_type, priority')
      .eq('is_published', true)
      .eq('org_id', orgId)
      .in('signal_type', ['outbreak', 'game_plan', 'health_alert', 'fda_recall', 'recall', 'allergen_alert'])
      .order('priority', { ascending: true })
      .limit(1);

    if (!error && data && data.length > 0) {
      setBanner(data[0]);
    } else {
      setBanner(null);
    }
  }, [isDemoMode, orgId, userId]);

  useEffect(() => { fetchBanner(); }, [fetchBanner]);

  // Real-time subscription
  useEffect(() => {
    if (isDemoMode || !orgId) return;

    const channel = supabase
      .channel('active-banner')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'intelligence_signals',
        filter: `org_id=eq.${orgId}`,
      }, () => {
        fetchBanner();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isDemoMode, orgId, fetchBanner]);

  const dismiss = useCallback(async () => {
    if (!banner) return;
    setDismissed(prev => new Set(prev).add(banner.id));
    // Mark as read in signal_reads
    if (userId && !isDemoMode) {
      await supabase
        .from('signal_reads')
        .upsert(
          { signal_id: banner.id, user_id: userId },
          { onConflict: 'signal_id,user_id' },
        );
    }
  }, [banner, userId, isDemoMode]);

  const activeBanner = banner && !dismissed.has(banner.id) ? banner : null;

  return { banner: activeBanner, dismiss };
}
