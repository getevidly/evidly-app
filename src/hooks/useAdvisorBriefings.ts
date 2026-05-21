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

export function useAdvisorBriefings(): UseAdvisorBriefingsResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
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
  const [fetchKey, setFetchKey] = useState(0);
  const regenInFlightRef = useRef<Set<string>>(new Set());

  // Phase 1 + Phase 2: fetch fresh rows, fall back to stale
  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        // Phase 1: fresh rows (valid_until > now)
        const { data: freshData, error: freshErr } = await supabase
          .from('advisor_briefings')
          .select('*')
          .eq('org_id', orgId)
          .is('location_id', null)
          .gt('valid_until', new Date().toISOString())
          .order('generated_at', { ascending: false });

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
            const { data: staleData } = await supabase
              .from('advisor_briefings')
              .select('*')
              .eq('org_id', orgId)
              .eq('advisor_type', at)
              .is('location_id', null)
              .order('generated_at', { ascending: false })
              .limit(1);

            if (cancelled) return;

            if (staleData && staleData.length > 0) {
              grouped[at] = rowToBriefing(staleData[0]);
              stale[at] = true;
            }
          }
        }

        setBriefings(grouped);
        setStaleness(stale);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, fetchKey]);

  // Phase 3: background regen for stale advisor_types
  useEffect(() => {
    if (loading || error || !orgId) return;

    const staleTypes = (Object.keys(staleness) as AdvisorType[]).filter(t => staleness[t]);
    if (staleTypes.length === 0) return;

    const toRegen = staleTypes.filter(t => !regenInFlightRef.current.has(t));
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
      }
    });

    return () => { cancelled = true; };
  }, [loading, error, orgId, staleness]);

  return { ...briefings, loading, error, staleness };
}
