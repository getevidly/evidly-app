import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface OpenItem {
  source: string;
  source_id: string;
  pillar: 'food_safety' | 'fire_safety' | null;
  urgency: 'urgent' | 'pulling' | 'review';
  title: string;
  location_id: string | null;
  detected_at: string;
}

export interface AdvisorBriefing {
  id: string;
  advisor_type: 'compliance_officer' | 'food_safety' | 'fire_safety';
  briefing_text: string;
  posture: 'solid' | 'watch' | 'alarm';
  open_items: OpenItem[];
  generated_at: string;
  valid_until: string;
  template_version: number;
  /** True when an org-level briefing was filtered for a single location */
  _locationFiltered?: boolean;
}

type AdvisorType = 'compliance_officer' | 'food_safety' | 'fire_safety';
const ADVISOR_TYPES: AdvisorType[] = ['compliance_officer', 'food_safety', 'fire_safety'];

export interface StalenessFlags {
  compliance_officer: boolean;
  food_safety: boolean;
  fire_safety: boolean;
}

interface UseAdvisorBriefingsResult {
  compliance_officer: AdvisorBriefing | null;
  food_safety: AdvisorBriefing | null;
  fire_safety: AdvisorBriefing | null;
  loading: boolean;
  error: Error | null;
  staleness: StalenessFlags;
  regenFailed: boolean;
}

function rowToBriefing(row: Record<string, unknown>): AdvisorBriefing {
  return {
    id: row.id as string,
    advisor_type: row.advisor_type as AdvisorType,
    briefing_text: row.briefing_text as string,
    posture: row.posture as 'solid' | 'watch' | 'alarm',
    open_items: Array.isArray(row.open_items) ? row.open_items : [],
    generated_at: row.generated_at as string,
    valid_until: row.valid_until as string,
    template_version: row.template_version as number,
  };
}

function filterBriefingForLocation(briefing: AdvisorBriefing, locationId: string): AdvisorBriefing {
  return {
    ...briefing,
    open_items: briefing.open_items.filter(
      item => item.location_id === locationId || item.location_id === null,
    ),
    _locationFiltered: true,
  };
}

export function useAdvisorBriefings(options?: { locationIdFilter?: string }): UseAdvisorBriefingsResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const locationIdFilter = options?.locationIdFilter;
  const [briefings, setBriefings] = useState<Record<AdvisorType, AdvisorBriefing | null>>({
    compliance_officer: null,
    food_safety: null,
    fire_safety: null,
  });
  const [staleness, setStaleness] = useState<StalenessFlags>({
    compliance_officer: false,
    food_safety: false,
    fire_safety: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [regenFailed, setRegenFailed] = useState(false);
  const [missingTypes, setMissingTypes] = useState<AdvisorType[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const regenInFlightRef = useRef<Set<string>>(new Set());

  // Phase 1 + Phase 2: fetch fresh rows, fall back to stale
  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        // Phase 1: fresh rows (valid_until > now)
        let freshQuery = supabase
          .from('advisor_briefings')
          .select('*')
          .eq('org_id', orgId)
          .gt('valid_until', new Date().toISOString())
          .order('generated_at', { ascending: false });
        if (locationIdFilter) {
          freshQuery = freshQuery.eq('location_id', locationIdFilter);
        } else {
          freshQuery = freshQuery.is('location_id', null);
        }
        const { data: freshData, error: freshErr } = await freshQuery;

        if (cancelled) return;
        if (freshErr) throw new Error(freshErr.message);

        const grouped: Record<AdvisorType, AdvisorBriefing | null> = {
          compliance_officer: null,
          food_safety: null,
          fire_safety: null,
        };
        const stale: StalenessFlags = {
          compliance_officer: false,
          food_safety: false,
          fire_safety: false,
        };

        for (const row of freshData || []) {
          const at = row.advisor_type as AdvisorType;
          if (ADVISOR_TYPES.includes(at) && !grouped[at]) {
            grouped[at] = rowToBriefing(row);
          }
        }

        // Phase 2: stale fallback for any missing advisor_type
        const missing = ADVISOR_TYPES.filter(at => !grouped[at]);
        if (missing.length > 0) {
          for (const at of missing) {
            let staleQuery = supabase
              .from('advisor_briefings')
              .select('*')
              .eq('org_id', orgId)
              .eq('advisor_type', at)
              .order('generated_at', { ascending: false })
              .limit(1);
            if (locationIdFilter) {
              staleQuery = staleQuery.eq('location_id', locationIdFilter);
            } else {
              staleQuery = staleQuery.is('location_id', null);
            }
            const { data: staleData } = await staleQuery;

            if (cancelled) return;

            if (staleData && staleData.length > 0) {
              grouped[at] = rowToBriefing(staleData[0]);
              stale[at] = true;
            }
          }
        }

        // Phase 2b: org-level fallback when location-specific not found
        if (locationIdFilter) {
          const stillMissing = ADVISOR_TYPES.filter(at => !grouped[at]);
          for (const at of stillMissing) {
            const { data: orgData } = await supabase
              .from('advisor_briefings')
              .select('*')
              .eq('org_id', orgId)
              .eq('advisor_type', at)
              .is('location_id', null)
              .order('generated_at', { ascending: false })
              .limit(1);

            if (cancelled) return;

            if (orgData && orgData.length > 0) {
              const briefing = rowToBriefing(orgData[0]);
              grouped[at] = filterBriefingForLocation(briefing, locationIdFilter);
              stale[at] = new Date(briefing.valid_until) < new Date();
            }
          }
        }

        const stillMissing = ADVISOR_TYPES.filter(at => !grouped[at]);
        setBriefings(grouped);
        setStaleness(stale);
        setMissingTypes(stillMissing);
        setRegenFailed(false);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, locationIdFilter, fetchKey]);

  // Phase 3: background regen for stale OR missing advisor_types
  useEffect(() => {
    if (loading || error || !orgId) return;

    const needsRegen = [
      ...(Object.keys(staleness) as AdvisorType[]).filter(t => staleness[t]),
      ...missingTypes,
    ];
    const unique = [...new Set(needsRegen)];
    if (unique.length === 0) return;

    const toRegen = unique.filter(t => !regenInFlightRef.current.has(t));
    if (toRegen.length === 0) return;

    let cancelled = false;
    toRegen.forEach(t => regenInFlightRef.current.add(t));

    Promise.allSettled(
      toRegen.map(advisor_type =>
        supabase.functions.invoke('generate-advisor-briefing', {
          body: { org_id: orgId, advisor_type, location_id: null, force_refresh: true },
        })
      )
    ).then(results => {
      toRegen.forEach(t => regenInFlightRef.current.delete(t));
      if (cancelled) return;
      const anySuccess = results.some(r => r.status === 'fulfilled' && !(r.value as { error?: unknown }).error);
      if (anySuccess) {
        setFetchKey(k => k + 1);
      } else if (missingTypes.length > 0) {
        // All invokes failed and no data to show — surface so cards don't hang
        setRegenFailed(true);
      }
    });

    return () => { cancelled = true; };
  }, [loading, error, orgId, staleness, missingTypes]);

  return { ...briefings, loading, error, staleness, regenFailed };
}
