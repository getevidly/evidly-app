import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  DEMO_ALERTS,
  MONITORED_SOURCES,
  type RegulatoryAlert,
  type AlertStatus,
  type Jurisdiction,
  type MonitoredSource,
} from '../lib/regulatoryMonitor';
import { locations as demoLocations } from '../data/demoData';
import { demoLocationJurisdictions } from '../data/demoJurisdictions';
import type { DbRegulatorySource, DbChangeWithSource } from '../types/regulatory';
import { dbImpactToUiImpact, dbSourceToUiSource } from '../types/regulatory';

// ── Admin-facing change type ────────────────────────────

export interface AdminRegChange {
  id: string;
  sourceId: string;
  sourceShort: string;
  sourceName: string;
  changeType: string;
  title: string;
  summary: string;
  impactDescription: string;
  impactLevel: 'critical' | 'moderate' | 'informational';
  affectedPillars: string[];
  affectedStates: string[] | null;
  effectiveDate: string | null;
  sourceUrl: string;
  rawInputText: string | null;
  aiGenerated: boolean;
  published: boolean;
  publishedAt: string | null;
  affectedLocationCount: number;
  createdAt: string;
}

// ── Demo data for admin page (moved from AdminRegulatoryChanges.tsx) ──

const DEMO_ADMIN_CHANGES: AdminRegChange[] = [
  {
    id: 'rc-001',
    sourceId: '',
    sourceShort: 'calcode',
    sourceName: 'California Retail Food Code (CalCode)',
    changeType: 'amendment',
    title: 'CalCode §114099.7 — Grease trap sizing requirements updated',
    summary: 'California has updated minimum grease trap sizing for commercial kitchens producing over 200 meals per day. Minimum capacity increased from 30 to 50 gallons for high-volume operations.',
    impactDescription: 'Verify your grease trap meets the new 50-gallon minimum. If undersized, schedule replacement before July 1. Contact your plumbing vendor for assessment.',
    impactLevel: 'moderate',
    affectedPillars: ['facility_safety', 'vendor_compliance'],
    affectedStates: ['CA'],
    effectiveDate: '2026-07-01',
    sourceUrl: 'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx',
    rawInputText: null,
    aiGenerated: true,
    published: false,
    publishedAt: null,
    affectedLocationCount: 0,
    createdAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'rc-002',
    sourceId: '',
    sourceShort: 'fda_food_code',
    sourceName: 'FDA Food Code',
    changeType: 'guidance',
    title: 'FDA Guidance — Updated cold holding best practices',
    summary: 'The FDA has released updated guidance on cold holding procedures for ready-to-eat foods. The guidance recommends monitoring cold holding temperatures every 2 hours instead of every 4 hours for high-risk items.',
    impactDescription: 'Review your cold holding monitoring frequency. Consider increasing temperature checks to every 2 hours for high-risk items like cut leafy greens, sliced deli meats, and prepared salads.',
    impactLevel: 'informational',
    affectedPillars: ['food_safety'],
    affectedStates: null,
    effectiveDate: null,
    sourceUrl: 'https://www.fda.gov/food/retail-food-protection/fda-food-code',
    rawInputText: null,
    aiGenerated: true,
    published: false,
    publishedAt: null,
    affectedLocationCount: 0,
    createdAt: '2026-02-08T14:00:00Z',
  },
  {
    id: 'rc-003',
    sourceId: '',
    sourceShort: 'nfpa_96',
    sourceName: 'NFPA 96 (Ventilation & Fire Protection)',
    changeType: 'amendment',
    title: 'NFPA 96 (2024) Table 12.4 — Exhaust fan inspection frequency clarified',
    summary: 'NFPA 96 has clarified that exhaust fan inspection must occur at the same frequency as hood exhaust system cleaning. Fan bearing lubrication must be documented separately from cleaning.',
    impactDescription: 'Ensure your exhaust fan inspections are scheduled at the same frequency as hood cleaning. Ask your vendor to separately document fan bearing lubrication on each service report.',
    impactLevel: 'moderate',
    affectedPillars: ['facility_safety'],
    affectedStates: null,
    effectiveDate: '2026-07-01',
    sourceUrl: 'https://www.nfpa.org/codes-and-standards/nfpa-96-standard-development/96',
    rawInputText: null,
    aiGenerated: true,
    published: true,
    publishedAt: '2026-02-10T16:00:00Z',
    affectedLocationCount: 47,
    createdAt: '2026-02-06T10:00:00Z',
  },
];

// ── Return type ─────────────────────────────────────────

interface UseRegulatoryChangesReturn {
  alerts: RegulatoryAlert[];
  alertStatuses: Record<string, AlertStatus>;
  markAsRead: (changeId: string) => void;

  adminChanges: AdminRegChange[];
  sources: DbRegulatorySource[];
  monitoringSources: MonitoredSource[];
  jurisdictions: Jurisdiction[];
  analyzeWithAI: (sourceId: string, rawText: string, changeType: string, sourceUrl?: string) => Promise<void>;
  publishChange: (changeId: string) => Promise<void>;
  unpublishChange: (changeId: string) => Promise<void>;
  rejectChange: (changeId: string) => Promise<void>;
  updateSummary: (changeId: string, summary: string, impactDescription: string) => Promise<void>;

  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ── Hook ────────────────────────────────────────────────

export function useRegulatoryChanges(): UseRegulatoryChangesReturn {
  const { isDemoMode } = useDemo();
  const { user, profile } = useAuth();

  const [dbChanges, setDbChanges] = useState<DbChangeWithSource[]>([]);
  const [dbSources, setDbSources] = useState<DbRegulatorySource[]>([]);
  const [dbLocations, setDbLocations] = useState<Array<{ name: string; address: string; county?: string }>>([]);
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState<string | null>(null);

  // Demo mode local status overrides
  const [demoStatuses, setDemoStatuses] = useState<Record<string, AlertStatus>>({});

  // Wrap each Supabase query so a missing table or RLS block
  // returns {data: null, error} instead of throwing.
  const safeQuery = <T,>(promise: PromiseLike<{ data: T | null; error: any }>) =>
    Promise.resolve(promise).catch((err: any) => ({
      data: null as T | null,
      error: { message: err?.message ?? 'Query failed' },
    }));

  const fetchData = useCallback(async () => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [changesRes, sourcesRes, locationsRes] = await Promise.all([
      safeQuery(
        supabase
          .from('regulatory_changes')
          .select('*, regulatory_sources(*), regulatory_change_reads(*)')
          .order('created_at', { ascending: false })
      ),
      safeQuery(
        supabase
          .from('regulatory_sources')
          .select('*')
          .eq('active', true)
          .order('code_name')
      ),
      safeQuery(
        supabase
          .from('locations')
          .select('name, address, county')
          .eq('organization_id', profile.organization_id)
          .order('name')
      ),
    ]);

    // Missing tables / RLS blocks → warn and use empty, not error banner
    if (changesRes.error) {
      console.warn('[Regulatory] Changes query:', changesRes.error.message);
    }
    if (sourcesRes.error) {
      console.warn('[Regulatory] Sources query:', sourcesRes.error.message);
    }
    if (locationsRes.error) {
      console.warn('[Regulatory] Locations query:', locationsRes.error.message);
    }

    console.log('[Regulatory] sourcesRes:', { data: sourcesRes.data, error: sourcesRes.error, rowCount: Array.isArray(sourcesRes.data) ? sourcesRes.data.length : null });
    console.log('[Regulatory] changesRes:', { data: changesRes.data, error: changesRes.error, rowCount: Array.isArray(changesRes.data) ? changesRes.data.length : null });
    console.log('[Regulatory] locationsRes:', { data: locationsRes.data, error: locationsRes.error, rowCount: Array.isArray(locationsRes.data) ? locationsRes.data.length : null });

    setDbChanges((changesRes.data as any) ?? []);
    setDbSources((sourcesRes.data as any) ?? []);
    setDbLocations((locationsRes.data as any) ?? []);
    setLoading(false);
  }, [isDemoMode, profile?.organization_id]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchData]);

  // ── Derived: User-facing alerts ─────────────────────────

  const alerts = useMemo<RegulatoryAlert[]>(() => {
    if (isDemoMode) return DEMO_ALERTS;

    return dbChanges
      .filter(c => c.published && c.regulatory_sources)
      .map(row => {
        const src = row.regulatory_sources;
        const isReadByUser = row.regulatory_change_reads?.some(
          r => r.user_id === user?.id
        ) ?? false;

        return {
          id: row.id,
          source: dbSourceToUiSource(src),
          sourceDetail: src?.code_name ?? '',
          impactLevel: dbImpactToUiImpact(row.impact_level),
          status: (isReadByUser ? 'reviewed' : 'new') as AlertStatus,
          title: row.title,
          effectiveDate: row.effective_date ?? row.created_at?.split('T')[0] ?? '',
          postedDate: row.published_at?.split('T')[0] ?? row.created_at?.split('T')[0] ?? '',
          summary: row.summary,
          actionItems: row.impact_description
            ? row.impact_description.split('\n').filter(Boolean)
            : [],
          affectedAreas: (row.affected_pillars ?? []).map(p =>
            p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          ),
          affectedLocations: [],
          autoActions: [],
          fullRegulatoryText: row.raw_input_text ?? '',
          sourceUrl: row.source_url ?? '',
        } satisfies RegulatoryAlert;
      });
  }, [isDemoMode, dbChanges, user?.id]);

  // ── Derived: Alert read statuses ────────────────────────

  const alertStatuses = useMemo<Record<string, AlertStatus>>(() => {
    if (isDemoMode) return demoStatuses;

    const statuses: Record<string, AlertStatus> = {};
    for (const change of dbChanges) {
      if (!change.published) continue;
      const isRead = change.regulatory_change_reads?.some(
        r => r.user_id === user?.id
      );
      statuses[change.id] = isRead ? 'reviewed' : 'new';
    }
    return statuses;
  }, [isDemoMode, demoStatuses, dbChanges, user?.id]);

  // ── Derived: Jurisdictions from user locations ──────────

  const jurisdictions = useMemo<Jurisdiction[]>(() => {
    const locs = isDemoMode
      ? demoLocations.map(l => {
          const jData = demoLocationJurisdictions[`demo-loc-${l.urlId}`];
          return { name: l.name, address: l.address, county: jData?.county };
        })
      : dbLocations;

    if (locs.length === 0) return [];

    const seen = new Set<string>();
    const result: Jurisdiction[] = [];
    const states = new Set<string>();

    for (const loc of locs) {
      // Use county if available from DB
      if (loc.county) {
        const key = `county-${loc.county}`;
        if (!seen.has(key)) {
          seen.add(key);
          // Parse state from address
          const parts = (loc.address || '').split(',').map((p: string) => p.trim());
          const stateZip = parts[parts.length - 1] || '';
          const state = stateZip.split(' ')[0] || '';
          result.push({ name: loc.county, state, type: 'county' });
          if (state) states.add(state);
        }
        continue;
      }

      // Parse city + state from address: "street, city, state zip"
      const parts = (loc.address || '').split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        const stateZip = parts[parts.length - 1] || '';
        const state = stateZip.split(' ')[0] || '';
        const city = parts[parts.length - 2] || '';
        const key = `city-${city}-${state}`;
        if (city && state && !seen.has(key)) {
          seen.add(key);
          result.push({ name: city, state, type: 'city' });
        }
        if (state) states.add(state);
      }
    }

    // Add state-level entries
    for (const state of states) {
      const stateName = state === 'CA' ? 'California' : state;
      result.push({ name: stateName, state, type: 'state' });
    }

    return result;
  }, [isDemoMode, dbLocations]);

  // ── Derived: Monitoring sources for display ────────────

  const monitoringSources = useMemo<MonitoredSource[]>(() => {
    if (isDemoMode) return MONITORED_SOURCES;

    if (dbSources.length === 0) return [];

    return dbSources.map(s => ({
      name: s.code_name,
      abbreviation: s.code_short,
      type: s.jurisdiction_type === 'city' ? 'county' as const : s.jurisdiction_type,
      lastChecked: s.last_checked ?? s.created_at?.split('T')[0] ?? '',
      url: s.monitoring_url ?? '',
    }));
  }, [isDemoMode, dbSources]);

  // ── Derived: Admin changes ──────────────────────────────

  const adminChanges = useMemo<AdminRegChange[]>(() => {
    if (isDemoMode) return DEMO_ADMIN_CHANGES;

    return dbChanges
      .filter(row => row.regulatory_sources)
      .map(row => ({
      id: row.id,
      sourceId: row.source_id,
      sourceShort: row.regulatory_sources?.code_short ?? '',
      sourceName: row.regulatory_sources?.code_name ?? '',
      changeType: row.change_type,
      title: row.title,
      summary: row.summary,
      impactDescription: row.impact_description,
      impactLevel: row.impact_level,
      affectedPillars: row.affected_pillars,
      affectedStates: row.affected_states,
      effectiveDate: row.effective_date,
      sourceUrl: row.source_url ?? '',
      rawInputText: row.raw_input_text,
      aiGenerated: row.ai_generated,
      published: row.published,
      publishedAt: row.published_at,
      affectedLocationCount: row.affected_location_count,
      createdAt: row.created_at,
    }));
  }, [isDemoMode, dbChanges]);

  // ── Mutation: Mark as Read ──────────────────────────────

  const markAsRead = useCallback((changeId: string) => {
    if (isDemoMode) {
      setDemoStatuses(prev => ({ ...prev, [changeId]: 'reviewed' }));
      return;
    }

    if (!user?.id || !profile?.organization_id) return;

    // Optimistic update
    setDbChanges(prev =>
      prev.map(c => {
        if (c.id !== changeId) return c;
        return {
          ...c,
          regulatory_change_reads: [
            ...(c.regulatory_change_reads || []),
            {
              id: `temp-${Date.now()}`,
              change_id: changeId,
              user_id: user.id,
              organization_id: profile.organization_id,
              read_at: new Date().toISOString(),
            },
          ],
        };
      })
    );

    supabase
      .from('regulatory_change_reads')
      .upsert(
        {
          change_id: changeId,
          user_id: user.id,
          organization_id: profile.organization_id,
        },
        { onConflict: 'change_id,user_id' }
      )
      .then(({ error: err }) => {
        if (err) {
          console.error('[Regulatory] Mark read error:', err);
          toast.error('Failed to mark as reviewed');
        }
      });
  }, [isDemoMode, user?.id, profile?.organization_id]);

  // ── Mutation: Analyze with AI ───────────────────────────

  const analyzeWithAI = useCallback(async (
    sourceId: string,
    rawText: string,
    changeType: string,
    _sourceUrl?: string,
  ) => {
    if (isDemoMode) {
      toast.success('AI analysis simulated in demo mode');
      return;
    }

    const { error: fnErr } = await supabase.functions.invoke(
      'monitor-regulations',
      {
        body: {
          action: 'analyze',
          sourceId,
          rawChangeText: rawText,
          changeType,
        },
      }
    );

    if (fnErr) {
      console.error('[Regulatory] Analyze error:', fnErr);
      toast.error('AI analysis failed');
      throw fnErr;
    }

    toast.success('AI analysis complete — review before publishing');
    await fetchData();
  }, [isDemoMode, fetchData]);

  // ── Mutation: Publish ───────────────────────────────────

  const publishChange = useCallback(async (changeId: string) => {
    if (isDemoMode) {
      toast.success('Simulated publish in demo mode');
      return;
    }

    const { data, error: fnErr } = await supabase.functions.invoke(
      'monitor-regulations',
      {
        body: {
          action: 'publish',
          changeId,
        },
      }
    );

    if (fnErr) {
      console.error('[Regulatory] Publish error:', fnErr);
      toast.error('Failed to publish change');
      throw fnErr;
    }

    toast.success(`Change published — sent to ${data?.affected_locations ?? 0} locations`);
    await fetchData();
  }, [isDemoMode, fetchData]);

  // ── Mutation: Unpublish ─────────────────────────────────

  const unpublishChange = useCallback(async (changeId: string) => {
    if (isDemoMode) return;

    const { error: err } = await supabase
      .from('regulatory_changes')
      .update({
        published: false,
        published_at: null,
        affected_location_count: 0,
      })
      .eq('id', changeId);

    if (err) {
      toast.error('Failed to unpublish');
      throw err;
    }

    toast('Change unpublished');
    await fetchData();
  }, [isDemoMode, fetchData]);

  // ── Mutation: Reject ────────────────────────────────────

  const rejectChange = useCallback(async (changeId: string) => {
    if (isDemoMode) return;

    const { error: err } = await supabase
      .from('regulatory_changes')
      .delete()
      .eq('id', changeId);

    if (err) {
      toast.error('Failed to reject change');
      throw err;
    }

    toast('Change rejected and removed');
    setDbChanges(prev => prev.filter(c => c.id !== changeId));
  }, [isDemoMode]);

  // ── Mutation: Update Summary ────────────────────────────

  const updateSummary = useCallback(async (
    changeId: string,
    summary: string,
    impactDescription: string,
  ) => {
    if (isDemoMode) return;

    const { error: err } = await supabase
      .from('regulatory_changes')
      .update({ summary, impact_description: impactDescription })
      .eq('id', changeId);

    if (err) {
      toast.error('Failed to update summary');
      throw err;
    }

    toast.success('Summary updated');
    setDbChanges(prev =>
      prev.map(c =>
        c.id === changeId
          ? { ...c, summary, impact_description: impactDescription }
          : c
      )
    );
  }, [isDemoMode]);

  return {
    alerts,
    alertStatuses,
    markAsRead,
    adminChanges,
    sources: isDemoMode ? [] : dbSources,
    monitoringSources,
    jurisdictions,
    analyzeWithAI,
    publishChange,
    unpublishChange,
    rejectChange,
    updateSummary,
    loading,
    error,
    refresh: fetchData,
  };
}
