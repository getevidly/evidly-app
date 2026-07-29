import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface BusinessReq {
  code: string;
  label: string;
  hasEvidence: boolean;
  isConditional: boolean;
}

export interface BusinessProofStatus {
  requirements: BusinessReq[];
  filedCount: number;
  countingTotal: number;
  loading: boolean;
}

export function useBusinessProofStatus(locationId?: string | null): BusinessProofStatus {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<BusinessProofStatus>({
    requirements: [], filedCount: 0, countingTotal: 0, loading: true,
  });

  useEffect(() => {
    if (!orgId) { setState({ requirements: [], filedCount: 0, countingTotal: 0, loading: false }); return; }
    let cancelled = false;

    (async () => {
      // Get state code
      let locQuery = supabase.from('locations').select('id, state').eq('organization_id', orgId).limit(1);
      if (locationId) locQuery = locQuery.eq('id', locationId);
      const { data: locData } = await locQuery.maybeSingle();
      if (cancelled) return;

      const stateCode = locData?.state || null;
      if (!stateCode) { setState({ requirements: [], filedCount: 0, countingTotal: 0, loading: false }); return; }

      // Get business_records requirements
      const { data: reqs } = await supabase
        .from('pillar_requirements')
        .select('requirement_code, display_label, counts_toward_total, is_conditional')
        .eq('state_code', stateCode)
        .eq('pillar', 'business_records')
        .order('sort_order', { ascending: true });
      if (cancelled) return;

      const reqList = reqs || [];
      const results: BusinessReq[] = [];
      let filedCount = 0;
      let countingTotal = 0;

      for (const req of reqList) {
        const { count } = await supabase
          .from('compliance_documents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('category', req.requirement_code);
        if (cancelled) return;

        const hasEvidence = (count ?? 0) > 0;
        if (hasEvidence && req.counts_toward_total) filedCount++;
        if (req.counts_toward_total) countingTotal++;

        results.push({
          code: req.requirement_code,
          label: req.display_label || req.requirement_code.replace(/_/g, ' '),
          hasEvidence,
          isConditional: req.is_conditional ?? false,
        });
      }

      if (!cancelled) setState({ requirements: results, filedCount, countingTotal, loading: false });
    })();

    return () => { cancelled = true; };
  }, [orgId, locationId]);

  return state;
}
