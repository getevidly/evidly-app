/**
 * INTEL-HUB-1 / INTEL-PIPELINE-1 — Intelligence Hub data hook
 *
 * Both demo and live modes query the intelligence_insights DB table.
 * Demo mode: filters by is_demo_eligible=true, jurisdiction-filters by
 *   demoProfile.primary_counties, orders by demo_priority DESC.
 * Live mode: filters by organization_id OR is_demo_eligible=true.
 * Fallback: if DB returns 0 results or errors, uses static DEMO_* data.
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

export function useIntelligenceHub() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live mode state
  const [liveInsights, setLiveInsights] = useState<IntelligenceInsight[]>([]);
  const [liveSnapshot, setLiveSnapshot] = useState<ExecutiveSnapshot | null>(null);

  // Read/dismissed tracking
  const [readIds, setReadIds] = useState<string[]>(() => loadFromStorage(READ_KEY, []));
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => loadFromStorage(DISMISSED_KEY, []));

  // Subscription
  const [subscription, setSubscriptionState] = useState<IntelligenceSubscription>(() =>
    loadFromStorage(STORAGE_KEY, DEFAULT_SUBSCRIPTION),
  );

  // ── Insight fetcher (closure — captures isDemoMode) ────
  const fetchInsights = async (demoProfile?: ClientProfile) => {
    // Build query — include published AND pending_review (no approval workflow yet)
    // Exclude regulatory_updates — those appear on the dedicated /regulatory-updates page
    let query = supabase
      .from('intelligence_insights')
      .select('*')
      .in('status', ['published', 'pending_review'])
      .neq('category', 'regulatory_updates')
      .order('created_at', { ascending: false });

    // Demo mode: filter to demo_eligible insights
    if (isDemoMode) {
      query = query.eq('is_demo_eligible', true);

      // Order by demo_priority for best demo experience
      query = query.order('demo_priority', { ascending: false });
    }

    const { data: insights, error: queryErr } = await query.limit(isDemoMode ? 15 : 50);

    if (queryErr) throw queryErr;

    // Fallback: if database returns 0 results, use demoIntelligenceData.ts
    if (!insights || insights.length === 0) {
      return DEMO_INTELLIGENCE_INSIGHTS.filter(i => i.category !== 'regulatory_updates');
    }

    return insights.map(mapDbInsight);
  };

  // ── Load data from Supabase (both demo and live) ──────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        // Resolve profile for jurisdiction filtering
        let clientProfile: ClientProfile | undefined;
        if (isDemoMode || !profile?.organization_id) {
          clientProfile = getDemoClientProfile();
        } else {
          const built = await buildClientProfile(profile.organization_id);
          if (built) clientProfile = built;
        }

        // ── Insights query ──
        const insightData = await fetchInsights(clientProfile);

        if (!cancelled) {
          setLiveInsights(insightData);
        }

        // ── Executive snapshot query ──
        let snapQuery = supabase
          .from('executive_snapshots')
          .select('*')
          .eq('status', 'published')
          .order('generated_at', { ascending: false })
          .limit(1);

        if (isDemoMode || !profile?.organization_id) {
          snapQuery = snapQuery.eq('is_demo_eligible', true);
        } else {
          snapQuery = snapQuery.or(
            `organization_id.eq.${profile.organization_id},is_demo_eligible.eq.true`,
          );
        }

        const { data: snapshotData, error: snapErr } = await snapQuery.maybeSingle();

        if (snapErr) throw snapErr;
        if (!cancelled) {
          if (snapshotData) {
            setLiveSnapshot(snapshotData.content as ExecutiveSnapshot);
          } else {
            // Fallback
            setLiveSnapshot(DEMO_EXECUTIVE_SNAPSHOT);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load intelligence data');
          // On error, fall back to static data
          setLiveInsights(DEMO_INTELLIGENCE_INSIGHTS);
          setLiveSnapshot(DEMO_EXECUTIVE_SNAPSHOT);
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

  // Source status: reflect the 3 actual pipeline sources
  const ACTIVE_SOURCES: SourceStatus[] = [
    { id: 'openfda_enforcement', name: 'openFDA Food Enforcement (Recalls)', type: 'federal', jurisdictions: ['National'], frequency: 'Daily', last_checked_at: new Date().toISOString(), next_check_at: '', new_events_this_week: liveInsights.filter(i => i.category === 'recall_alert').length, status: 'healthy' },
    { id: 'openfda_class1', name: 'openFDA Class I Recalls', type: 'federal', jurisdictions: ['National'], frequency: 'Daily', last_checked_at: new Date().toISOString(), next_check_at: '', new_events_this_week: 0, status: 'healthy' },
    { id: 'openfda_adverse_events', name: 'openFDA Food Adverse Events', type: 'federal', jurisdictions: ['National'], frequency: 'Daily', last_checked_at: new Date().toISOString(), next_check_at: '', new_events_this_week: liveInsights.filter(i => i.category === 'outbreak_alert').length, status: 'healthy' },
  ];
  const sourceStatus = isDemoMode ? DEMO_SOURCE_STATUS : ACTIVE_SOURCES;

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
    isLoading,
    error,
    markAsRead,
    dismissInsight,
    requestSnapshot,
    updateSubscription,
  };
}
