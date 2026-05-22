/**
 * useOrgLocationContext — fetches the org's primary location state + county.
 * Used by Documents PRP to determine if required-docs reference is available.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface OrgLocationContext {
  stateCode: string | null;
  county: string | null;
  loading: boolean;
}

export function useOrgLocationContext(): OrgLocationContext {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<OrgLocationContext>({
    stateCode: null,
    county: null,
    loading: true,
  });

  useEffect(() => {
    if (!orgId) {
      setState({ stateCode: null, county: null, loading: false });
      return;
    }

    let cancelled = false;

    async function fetch() {
      const { data } = await supabase
        .from('locations')
        .select('state, county')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      setState({
        stateCode: data?.state || null,
        county: data?.county || null,
        loading: false,
      });
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId]);

  return state;
}
