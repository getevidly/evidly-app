import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OrgSummary {
  orgName: string;
  locationCount: number;
  countyCount: number;
  timezone: string;
  loading: boolean;
  error: Error | null;
}

export function useOrgSummary(): OrgSummary {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<Omit<OrgSummary, 'loading' | 'error'>>({
    orgName: '',
    locationCount: 0,
    countyCount: 0,
    timezone: 'America/Los_Angeles',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function fetch() {
      try {
        const [orgRes, locRes, countyRes] = await Promise.all([
          supabase.from('organizations').select('name, timezone').eq('id', orgId).single(),
          supabase.from('locations').select('id').eq('organization_id', orgId).eq('status', 'active'),
          supabase.from('location_jurisdiction_profiles').select('county').eq('organization_id', orgId),
        ]);

        if (cancelled) return;

        if (orgRes.error) throw new Error(orgRes.error.message);

        const uniqueCounties = new Set(
          (countyRes.data || []).map((r: { county: string | null }) => r.county).filter(Boolean)
        );

        setState({
          orgName: orgRes.data?.name || '',
          locationCount: locRes.data?.length || 0,
          countyCount: uniqueCounties.size,
          timezone: orgRes.data?.timezone || 'America/Los_Angeles',
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId]);

  return { ...state, loading, error };
}
