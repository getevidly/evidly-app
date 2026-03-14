/**
 * AUDIT-FIX-04 / FIX 4 — Intelligence feed data hook
 *
 * Extracted from IntelligenceFeedWidget to remove direct supabase.from() calls.
 * Handles fetch, realtime subscription, action, and dismiss.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface FeedRow {
  id: string;
  title: string;
  summary: string;
  category?: string;
  signal_type?: string;
  priority: string;
  revenue_risk_level?: string;
  revenue_risk_note?: string;
  liability_risk_level?: string;
  liability_risk_note?: string;
  cost_risk_level?: string;
  cost_risk_note?: string;
  operational_risk_level?: string;
  operational_risk_note?: string;
  opp_revenue_level?: string;
  opp_revenue_note?: string;
  opp_liability_level?: string;
  opp_liability_note?: string;
  opp_cost_level?: string;
  opp_cost_note?: string;
  opp_operational_level?: string;
  opp_operational_note?: string;
  relevance_reason?: string;
  recommended_action?: string;
  action_deadline?: string;
  feed_type?: string;
  delivered_at?: string;
  created_at: string;
  is_actioned?: boolean;
  is_dismissed?: boolean;
}

export function useIntelligenceFeed(orgId: string | undefined) {
  const [data, setData] = useState<FeedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: rows, error: queryError } = await supabase
        .from('client_intelligence_feed')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_dismissed', false)
        .order('delivered_at', { ascending: false })
        .limit(5);

      if (queryError) {
        setError('Unable to load updates');
      } else {
        setData(rows || []);
      }
    } catch {
      setError('Unable to load updates');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => { if (orgId) refetch(); }, [refetch, orgId]);

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel('intelligence-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'client_intelligence_feed',
        filter: `organization_id=eq.${orgId}`,
      }, (payload) => {
        setData(prev => [payload.new as FeedRow, ...prev].slice(0, 5));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  const markActioned = useCallback(async (id: string) => {
    await supabase
      .from('client_intelligence_feed')
      .update({ is_actioned: true, actioned_at: new Date().toISOString() })
      .eq('id', id);
  }, []);

  const markDismissed = useCallback(async (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
    await supabase
      .from('client_intelligence_feed')
      .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
      .eq('id', id);
  }, []);

  return { data, isLoading, error, refetch, markActioned, markDismissed };
}
