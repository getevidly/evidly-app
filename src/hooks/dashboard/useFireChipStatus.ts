import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface FireChip {
  nfpa: string;
  code: string;
  label: string;
  hasEvidence: boolean;
}

const NFPA_LABELS: Record<string, { nfpa: string; label: string }> = {
  hood_cleaning:     { nfpa: 'NFPA 96',  label: 'Hood (NFPA 96)' },
  fire_suppression:  { nfpa: 'NFPA 17A', label: 'Suppression (NFPA 17A)' },
  sprinkler_system:  { nfpa: 'NFPA 25',  label: 'Sprinkler (NFPA 25)' },
  fire_alarm:        { nfpa: 'NFPA 72',  label: 'Alarm (NFPA 72)' },
  fire_extinguishers:{ nfpa: 'NFPA 10',  label: 'Extinguishers (NFPA 10)' },
};

export function useFireChipStatus(locationId?: string | null): { chips: FireChip[]; loading: boolean } {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<{ chips: FireChip[]; loading: boolean }>({ chips: [], loading: true });

  useEffect(() => {
    if (!orgId) { setState({ chips: [], loading: false }); return; }
    let cancelled = false;

    (async () => {
      // Get state code from location
      let locQuery = supabase.from('locations').select('id, state').eq('organization_id', orgId).limit(1);
      if (locationId) locQuery = locQuery.eq('id', locationId);
      const { data: locData } = await locQuery.maybeSingle();
      if (cancelled) return;

      const stateCode = locData?.state || null;
      if (!stateCode) { setState({ chips: [], loading: false }); return; }

      // Get fire_safety counting requirements
      const { data: reqs } = await supabase
        .from('pillar_requirements')
        .select('requirement_code, action_type')
        .eq('state_code', stateCode)
        .eq('pillar', 'fire_safety')
        .eq('counts_toward_total', true);
      if (cancelled) return;

      const chips: FireChip[] = [];
      for (const req of reqs || []) {
        const meta = NFPA_LABELS[req.requirement_code];
        if (!meta) continue;

        let hasEvidence = false;
        if (req.action_type === 'identify_vendor') {
          const { count } = await supabase
            .from('location_service_schedules')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .not('vendor_id', 'is', null);
          if (cancelled) return;
          hasEvidence = (count ?? 0) > 0;
        } else {
          const { count } = await supabase
            .from('compliance_documents')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('category', req.requirement_code);
          if (cancelled) return;
          hasEvidence = (count ?? 0) > 0;
        }

        chips.push({ nfpa: meta.nfpa, code: req.requirement_code, label: meta.label, hasEvidence });
      }

      if (!cancelled) setState({ chips, loading: false });
    })();

    return () => { cancelled = true; };
  }, [orgId, locationId]);

  return state;
}
