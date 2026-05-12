import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface PillarRequirement {
  id: string;
  state_code: string;
  pillar: 'food_safety' | 'fire_safety';
  requirement_code: string;
  label: string;
  description: string | null;
  citation: string | null;
  action_type: 'upload' | 'route_out' | 'confirm' | 'invite' | 'identify_vendor';
  typical_role: string;
  sort_order: number;
}

interface UsePillarRequirementsReturn {
  requirements: PillarRequirement[];
  foodSafety: PillarRequirement[];
  fireSafety: PillarRequirement[];
  loading: boolean;
  error: string | null;
  stateCode: string | null;
}

/**
 * Fetches onboarding_pillar_requirements for the org's state.
 * Derives state from the org's first location.state column.
 * Returns empty arrays for states with no seeded requirements.
 */
export function usePillarRequirements(): UsePillarRequirementsReturn {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [requirements, setRequirements] = useState<PillarRequirement[]>([]);
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      // Step 1: Get org's state from first location
      const { data: locData } = await supabase
        .from('locations')
        .select('state')
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const state = locData?.state || null;
      setStateCode(state);

      if (!state) {
        // No location or no jurisdiction — return empty (non-CA org)
        setRequirements([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch requirements for this state
      const { data, error: reqErr } = await supabase
        .from('onboarding_pillar_requirements')
        .select('*')
        .eq('state_code', state)
        .order('pillar')
        .order('sort_order');

      if (cancelled) return;

      if (reqErr) {
        setError(reqErr.message);
        setRequirements([]);
      } else {
        setRequirements((data || []) as PillarRequirement[]);
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId]);

  const foodSafety = requirements.filter(r => r.pillar === 'food_safety');
  const fireSafety = requirements.filter(r => r.pillar === 'fire_safety');

  return { requirements, foodSafety, fireSafety, loading, error, stateCode };
}
