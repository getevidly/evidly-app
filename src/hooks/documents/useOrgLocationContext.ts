/**
 * useOrgLocationContext — fetches the org's primary location state and county.
 * Used by Documents PRP to determine state-level required-records reference.
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
      const { data: loc } = await supabase
        .from('locations')
        .select('state, county')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      setState({
        stateCode: loc?.state || null,
        county: loc?.county || null,
        loading: false,
      });
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId]);

  return state;
}
