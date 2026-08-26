import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ProofStats {
  filed: number;
  total: number;
  subtitle: string;
  loading: boolean;
}

/**
 * Returns filed/total obligation counts for a given pillar.
 * Queries pillar_requirements catalog (counts_toward_total rows only)
 * and checks compliance_documents + location_service_schedules for evidence.
 */
export function useProofStats(
  pillar: 'food_safety' | 'fire_safety',
  locationId?: string | null
): ProofStats {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<ProofStats>({ filed: 0, total: 0, subtitle: '', loading: true });

  useEffect(() => {
    if (!orgId) { setState({ filed: 0, total: 0, subtitle: '', loading: false }); return; }
    let cancelled = false;

    (async () => {
      // 1. Resolve state from org's first location
      let locQuery = supabase
        .from('locations')
        .select('id, state')
        .eq('organization_id', orgId)
        .limit(1);
      if (locationId) locQuery = locQuery.eq('id', locationId);
      const { data: locData } = await locQuery.maybeSingle();
      if (cancelled) return;

      const stateCode = locData?.state || null;
      if (!stateCode) { setState({ filed: 0, total: 0, subtitle: 'No location configured', loading: false }); return; }

      // 2. Fetch counting requirements for this pillar
      const { data: reqs } = await supabase
        .from('pillar_requirements')
        .select('requirement_code, action_type')
        .eq('state_code', stateCode)
        .eq('pillar', pillar)
        .eq('counts_toward_total', true);
      if (cancelled) return;

      const reqList = reqs || [];
      const total = reqList.length;
      if (total === 0) {
        setState({ filed: 0, total: 0, subtitle: 'No obligations configured', loading: false });
        return;
      }

      // 3. Check evidence for each requirement
      let filed = 0;
      for (const req of reqList) {
        let hasEvidence = false;

        if (req.action_type === 'identify_vendor') {
          // Check location_service_schedules for vendor assignment
          const { count } = await supabase
            .from('location_service_schedules')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .not('vendor_id', 'is', null);
          if (cancelled) return;
          hasEvidence = (count ?? 0) > 0;
        } else {
          // Check compliance_documents for an uploaded record.
          // The requirement code lives in TYPE; CATEGORY holds the document-tab
          // bucket (kitchen / service / business), so matching on category never hit.
          const { count } = await supabase
            .from('compliance_documents')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('type', req.requirement_code);
          if (cancelled) return;
          hasEvidence = (count ?? 0) > 0;
        }

        if (hasEvidence) filed++;
      }

      const subtitle = filed === total
        ? 'All records current'
        : `${total - filed} pending`;

      if (!cancelled) setState({ filed, total, subtitle, loading: false });
    })();

    return () => { cancelled = true; };
  }, [orgId, pillar, locationId]);

  return state;
}
