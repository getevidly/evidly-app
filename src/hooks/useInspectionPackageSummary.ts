import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface InspectionPackageSummary {
  locationCount: number;
  countyCount: number;
  evidenceItemCount: number;
  lastRefreshedAt: Date | null;
  loading: boolean;
  error: Error | null;
}

export function useInspectionPackageSummary(options?: { locationIdFilter?: string }): InspectionPackageSummary {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const locationIdFilter = options?.locationIdFilter;
  const [state, setState] = useState<Omit<InspectionPackageSummary, 'loading' | 'error'>>({
    locationCount: 0,
    countyCount: 0,
    evidenceItemCount: 0,
    lastRefreshedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function fetch() {
      try {
        const today = new Date().toISOString().split('T')[0];

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [locRes, countyRes, docRes, evidenceRes] = await Promise.all([
          locationIdFilter
            ? supabase.from('locations').select('id').eq('id', locationIdFilter).eq('status', 'active')
            : supabase.from('locations').select('id').eq('organization_id', orgId).eq('status', 'active'),
          supabase.from('location_jurisdiction_profiles').select('county').eq('organization_id', orgId),
          (() => {
            let q = supabase.from('documents').select('id, updated_at, expiration_date')
              .eq('organization_id', orgId).eq('status', 'active');
            if (locationIdFilter) q = q.or(`location_id.eq.${locationIdFilter},location_id.is.null`);
            return q;
          })(),
          // 3g: count HACCP evidence items from unified view (last 30 days)
          (() => {
            let q = supabase.from('vw_haccp_evidence').select('evidence_id', { count: 'exact', head: true })
              .eq('organization_id', orgId)
              .gte('occurred_at', thirtyDaysAgo);
            if (locationIdFilter) q = q.eq('location_id', locationIdFilter);
            return q;
          })(),
        ]);

        if (cancelled) return;

        const uniqueCounties = new Set(
          (countyRes.data || []).map((r: { county: string | null }) => r.county).filter(Boolean)
        );

        const currentDocs = (docRes.data || []).filter((d: { expiration_date: string | null }) =>
          !d.expiration_date || d.expiration_date >= today
        );

        let maxUpdated: Date | null = null;
        for (const d of docRes.data || []) {
          if (d.updated_at) {
            const dt = new Date(d.updated_at);
            if (!maxUpdated || dt > maxUpdated) maxUpdated = dt;
          }
        }

        const evidenceCount = evidenceRes.count ?? 0;

        setState({
          locationCount: locRes.data?.length || 0,
          countyCount: uniqueCounties.size,
          evidenceItemCount: currentDocs.length + evidenceCount,
          lastRefreshedAt: maxUpdated,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId, locationIdFilter]);

  return { ...state, loading, error };
}
