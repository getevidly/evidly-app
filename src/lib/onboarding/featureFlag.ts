import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../supabase';
import { useState, useEffect } from 'react';

/**
 * Returns true when org has new onboarding enabled via metadata flag.
 * Checks organizations.metadata->>'new_onboarding_enabled' = 'true'
 */
export function useNewOnboarding(): boolean {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    async function check() {
      const { data } = await supabase
        .from('organizations')
        .select('metadata')
        .eq('id', orgId)
        .maybeSingle();

      if (cancelled) return;

      const meta = data?.metadata as Record<string, unknown> | null;
      setEnabled(meta?.new_onboarding_enabled === 'true' || meta?.new_onboarding_enabled === true);
    }

    check();
    return () => { cancelled = true; };
  }, [orgId]);

  return enabled;
}
