/**
 * INTEL-HUB-1 / INTEL-PIPELINE-1 / INTEL-FEED-1 — Intelligence Hub data hook
 *
 * Fetches intelligence insights via the `intelligence-feed` edge function
 * which uses service_role to bypass RLS.
 *
 * Demo mode: returns all items (published + pending_review) from the DB.
 *   Fallback: if edge function fails or returns 0 results, uses static DEMO_* data.
 * Live mode: returns only published items. No demo fallback — shows empty state.
 * Pipeline stats: fetched via intelligence-approve edge function (admin only).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  DEMO_INTELLIGENCE_INSIGHTS,
  DEMO_EXECUTIVE_SNAPSHOT,
  DEMO_RECALL_ALERTS,
  DEMO_OUTBREAK_ALERTS,
  DEMO_LEGISLATIVE_ITEMS,
  DEMO_INSPECTOR_PATTERNS,
  DEMO_COMPETITOR_EVENTS,
  DEMO_SOURCE_STATUS,
  type IntelligenceInsight,
  type ExecutiveSnapshot,
  type RecallAlert,
  type OutbreakAlert,
  type LegislativeItem,
  type InspectorPattern,
  type CompetitorEvent,
  type SourceStatus,
} from '../data/demoIntelligenceData';
import { DEMO_CLIENT_PROFILE, buildClientProfile, getDemoJurisdictionFilter, getDemoClientProfile, type ClientProfile } from '../lib/businessImpactContext';

export interface IntelligenceSubscription {
  id: string;
  active_sources: string[];
  alert_severity: ('critical' | 'high' | 'medium' | 'low')[];
  pillar_focus: 'food_safety' | 'fire_safety' | 'both';
  competitor_radius_miles: number;
  delivery_email: boolean;
  delivery_email_frequency: 'immediate' | 'daily' | 'weekly';
  delivery_sms: boolean;
  delivery_sms_threshold: 'critical' | 'high';
  executive_snapshot_frequency: 'daily' | 'weekly' | 'monthly';
  executive_snapshot_recipients: string[];
}

/** Pipeline-level stats from the intelligence-approve edge function */
export interface PipelineStats {
  pending: number;
  published_this_week: number;
  total_live: number;
  last_pipeline_run: string | null;
  /** Derived client-side from published insights */
  by_source: { source_id: string; source_name: string; count: number }[];
  by_category: { category: string; count: number }[];
}

const DEFAULT_SUBSCRIPTION: IntelligenceSubscription = {
  id: 'demo-sub-001',
  active_sources: DEMO_SOURCE_STATUS.map(s => s.id),
  alert_severity: ['critical', 'high', 'medium'],
  pillar_focus: 'both',
  competitor_radius_miles: 5,
  delivery_email: true,
  delivery_email_frequency: 'daily',
  delivery_sms: false,
  delivery_sms_threshold: 'critical',
  executive_snapshot_frequency: 'weekly',
  executive_snapshot_recipients: ['james.wilson@pacificcoastdining.com'],
};

const STORAGE_KEY = 'evidly_intelligence_subscription';
const READ_KEY = 'evidly_intelligence_read';
const DISMISSED_KEY = 'evidly_intelligence_dismissed';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Map DB snake_case row to camelCase IntelligenceInsight */
function mapDbInsight(row: any): IntelligenceInsight {
  return {
    ...row,
    personalizedBusinessImpact: row.personalized_business_impact ?? row.personalizedBusinessImpact,
  };
}

/** Derive source status from actual insights */
function deriveSourceStatus(insights: IntelligenceInsight[]): SourceStatus[] {
  const map = new Map<string, SourceStatus>();
  for (const i of insights) {
    const key = i.source_id || i.source_name || 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: i.source_name || key,
        type: i.source_type || 'unknown',
        jurisdictions: [],
        frequency: 'Daily',
        last_checked_at: i.published_at || i.created_at || new Date().toISOString(),
        next_check_at: '',
        new_events_this_week: 0,
        status: 'healthy' as const,
      });
    }
    const entry = map.get(key)!;
    entry.new_events_this_week++;
    // Track most recent timestamp
    const ts = i.published_at || i.created_at;
    if (ts && new Date(ts) > new Date(entry.last_checked_at)) {
      entry.last_checked_at = ts;
    }
    // Aggregate counties as jurisdictions
    for (const c of (i.affected_counties || [])) {
      if (c && !entry.jurisdictions.includes(c)) {
        entry.jurisdictions.push(c);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.new_events_this_week - a.new_events_this_week);
}

/** Derive by_source and by_category breakdowns from published insights */
function deriveBreakdowns(insights: IntelligenceInsight[]) {
  const srcMap = new Map<string, { source_id: string; source_name: string; count: number }>();
  const catMap = new Map<string, number>();
  for (const i of insights) {
    const srcKey = i.source_id || i.source_name || 'unknown';
    const existing = srcMap.get(srcKey);
    if (existing) {
      existing.count++;
    } else {
      srcMap.set(srcKey, { source_id: srcKey, source_name: i.source_name || srcKey, count: 1 });
    }
    catMap.set(i.category, (catMap.get(i.category) || 0) + 1);
  }
  return {
    by_source: Array.from(srcMap.values()).sort((a, b) => b.count - a.count),
    by_category: Array.from(catMap.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
  };
}

export function useIntelligenceHub() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live mode state
  const [liveInsights, setLiveInsights] = useState<IntelligenceInsight[]>([]);
  const [liveSnapshot, setLiveSnapshot] = useState<ExecutiveSnapshot | null>(null);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Read/dismissed tracking
  const [readIds, setReadIds] = useState<string[]>(() => loadFromStorage(READ_KEY, []));
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => loadFromStorage(DISMISSED_KEY, []));

  // Subscription
  const [subscription, setSubscriptionState] = useState<IntelligenceSubscription>(() =>
    loadFromStorage(STORAGE_KEY, DEFAULT_SUBSCRIPTION),
  );

  // ── Insight fetcher via edge function ─────────────────
  const fetchInsights = async (): Promise<{ insights: IntelligenceInsight[]; lastUpdated: string | null }> => {
    const mode = isDemoMode ? 'demo' : 'live';

    const { data, error: fnErr } = await supabase.functions.invoke('intelligence-feed', {
      body: { mode, limit: 50 },
    });

    if (fnErr) throw fnErr;
    if (!data) throw new Error('No data returned from intelligence-feed');

    const insights: IntelligenceInsight[] = (data.insights || []).map(mapDbInsight);
    const lastUpdated: string | null = data.last_updated || null;

    // Fallback: only in demo mode when edge function returns 0 results
    if (insights.length === 0 && isDemoMode) {
      return {
        insights: DEMO_INTELLIGENCE_INSIGHTS.filter(i => i.category !== 'regulatory_updates'),
        lastUpdated: null,
      };
    }

    return { insights, lastUpdated };
  };

  // ── Pipeline stats fetcher (admin-only edge function) ────
  const fetchPipelineStats = async (publishedInsights: IntelligenceInsight[]) => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('intelligence-approve', {
        body: { action: 'stats' },
      });
      if (fnErr || !data) return null;

      const breakdowns = deriveBreakdowns(publishedInsights);
      return {
        pending: data.pending ?? 0,
        published_this_week: data.published_this_week ?? 0,
        total_live: data.total_live ?? 0,
        last_pipeline_run: data.last_pipeline_run || null,
        by_source: breakdowns.by_source,
        by_category: breakdowns.by_category,
      } as PipelineStats;
    } catch {
      // Non-admin users will get 401/403 — silently ignore
      return null;
    }
  };

  // ── Load data (both demo and live) ──────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        // ── Insights via edge function ──
        const { insights: insightData, lastUpdated } = await fetchInsights();

        if (!cancelled) {
          setLiveInsights(insightData);
          setLastUpdatedAt(lastUpdated);
        }

        // ── Pipeline stats (live mode only, fire-and-forget) ──
        if (!isDemoMode) {
          fetchPipelineStats(insightData).then(stats => {
            if (!cancelled && stats) setPipelineStats(stats);
          });
        }

        // ── Executive snapshot query ──
        let snapQuery = supabase
          .from('executive_snapshots')
          .select('*')
          .order('generated_at', { ascending: false })
          .limit(1);

        if (!isDemoMode && profile?.organization_id) {
          snapQuery = snapQuery
            .eq('status', 'published')
            .or(`organization_id.eq.${profile.organization_id},is_demo_eligible.eq.true`);
        }

        const { data: snapshotData, error: snapErr } = await snapQuery.maybeSingle();

        if (snapErr) throw snapErr;
        if (!cancelled) {
          if (snapshotData) {
            setLiveSnapshot(snapshotData.content as ExecutiveSnapshot);
          } else if (isDemoMode) {
            setLiveSnapshot(DEMO_EXECUTIVE_SNAPSHOT);
          } else {
            setLiveSnapshot(null);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load intelligence data');
          // On error, fall back to static data only in demo mode
          if (isDemoMode) {
            setLiveInsights(DEMO_INTELLIGENCE_INSIGHTS);
            setLiveSnapshot(DEMO_EXECUTIVE_SNAPSHOT);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isDemoMode, profile?.organization_id]);

  // ── Insights with read/dismissed state ─────────────────
  const insights = useMemo(() => {
    return liveInsights
      .filter(i => !dismissedIds.includes(i.id))
      .map(i => ({ ...i, read: readIds.includes(i.id) }));
  }, [liveInsights, readIds, dismissedIds]);

  // ── Executive snapshot ─────────────────────────────────
  const executiveSnapshot = useMemo(() => {
    return liveSnapshot;
  }, [liveSnapshot]);

  // ── Other data ─────────────────────────────────────────
  const recalls = isDemoMode ? DEMO_RECALL_ALERTS : [];
  const outbreaks = isDemoMode ? DEMO_OUTBREAK_ALERTS : [];
  const legislativeItems = isDemoMode ? DEMO_LEGISLATIVE_ITEMS : [];
  const inspectorPatterns = isDemoMode ? DEMO_INSPECTOR_PATTERNS : [];
  const competitorEvents = isDemoMode ? DEMO_COMPETITOR_EVENTS : [];

  // Source status: always derived from actual insights
  const sourceStatus = useMemo(() => {
    if (liveInsights.length > 0) return deriveSourceStatus(liveInsights);
    if (isDemoMode) return DEMO_SOURCE_STATUS;
    return [];
  }, [isDemoMode, liveInsights]);

  // ── Actions ────────────────────────────────────────────
  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      saveToStorage(READ_KEY, next);
      return next;
    });
  }, []);

  const dismissInsight = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      saveToStorage(DISMISSED_KEY, next);
      return next;
    });
    toast.success('Insight dismissed');
  }, []);

  const requestSnapshot = useCallback(async () => {
    if (isDemoMode) {
      toast.success('Executive brief generated');
      return DEMO_EXECUTIVE_SNAPSHOT;
    }
    // Live mode: call edge function
    try {
      setIsLoading(true);
      const { data, error: fnErr } = await supabase.functions.invoke('generate-executive-snapshot', {
        body: { organization_id: profile?.organization_id },
      });
      if (fnErr) throw fnErr;
      setLiveSnapshot(data as ExecutiveSnapshot);
      toast.success('Executive brief generated');
      return data as ExecutiveSnapshot;
    } catch (e: any) {
      toast.error('Failed to generate executive brief');
      setError(e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, profile?.organization_id]);

  const updateSubscription = useCallback((updates: Partial<IntelligenceSubscription>) => {
    setSubscriptionState(prev => {
      const next = { ...prev, ...updates };
      if (isDemoMode) {
        saveToStorage(STORAGE_KEY, next);
        toast.success('Preferences saved');
      } else {
        // Live mode: persist to Supabase
        supabase
          .from('intelligence_subscriptions')
          .upsert({ ...next, organization_id: profile?.organization_id })
          .then(({ error: upsertErr }) => {
            if (upsertErr) toast.error('Failed to save preferences');
            else toast.success('Preferences saved');
          });
      }
      return next;
    });
  }, [isDemoMode, profile?.organization_id]);

  return {
    insights,
    executiveSnapshot,
    recalls,
    outbreaks,
    legislativeItems,
    inspectorPatterns,
    competitorEvents,
    sourceStatus,
    subscription,
    pipelineStats,
    lastUpdatedAt,
    isLoading,
    error,
    markAsRead,
    dismissInsight,
    requestSnapshot,
    updateSubscription,
  };
}
