/**
 * AUDIT-FIX-07 / P-4 — Intelligence feed data hook (unified)
 *
 * Reads from intelligence_signals (single source of truth).
 * Previously read from client_intelligence_feed delivery artifact.
 * Handles fetch, realtime subscription, and local dismiss.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface FeedRow {
  id: string;
  title: string;
  content_summary: string | null;
  category?: string;
  signal_type?: string;
  severity_score?: number | null;
  revenue_risk_level?: string;
  liability_risk_level?: string;
  cost_risk_level?: string;
  operational_risk_level?: string;
  workforce_risk_level?: string;
  recommended_action?: string;
  published_at?: string;
  created_at: string;
  // Backward-compat mapped fields for IntelligenceFeedWidget
  summary?: string;
  priority?: string;
  delivered_at?: string;
}

const severityToPriority = (score: number | null | undefined): string => {
  if (!score) return 'low';
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

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
        .from('intelligence_signals')
        .select('*')
        .eq('is_published', true)
        .eq('org_id', orgId)
        .order('published_at', { ascending: false })
        .limit(5);

      if (queryError) {
        setError('Unable to load updates');
      } else {
        // Map fields for backward compatibility with widget
        const mapped = (rows || []).map((r: any) => ({
          ...r,
          summary: r.content_summary || r.title,
          priority: severityToPriority(r.severity_score),
          delivered_at: r.published_at || r.created_at,
        }));
        setData(mapped);
      }
    } catch {
      setError('Unable to load updates');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => { if (orgId) refetch(); }, [refetch, orgId]);

  // Realtime subscription — unified on intelligence_signals
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel('intelligence-feed')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'intelligence_signals',
        filter: `org_id=eq.${orgId}`,
      }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, refetch]);

  // Mark actioned — local state only (no client_intelligence_feed write)
  const markActioned = useCallback(async (_id: string) => {
    // No-op — action tracking is now handled at the BI page level
  }, []);

  // Mark dismissed — local state removal
  const markDismissed = useCallback(async (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  }, []);

  return { data, isLoading, error, refetch, markActioned, markDismissed };
}
