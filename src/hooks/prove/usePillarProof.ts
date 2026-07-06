/**
 * usePillarProof — per-pillar proof-of-work count for the dashboard.
 *
 * Reads the canonical requirements catalog (onboarding_pillar_requirements, keyed
 * by state_code) and checks real evidence tables for each requirement. Returns
 * completedCount / totalCount per pillar — same definition as the old path but
 * with ZERO dependency on the onboarding flow, its hooks, or its lifecycle state.
 *
 * Evidence checks per action_type (mirrors the original completion detection):
 *   upload         → compliance_documents row exists (org_id + category)
 *   route_out      → temperature_logs (facility_id) or compliance_documents (haccp_plan)
 *   confirm        → organizations.onboarding_confirmed_items includes the code
 *   identify_vendor→ location_service_schedules with non-null vendor_id
 *   invite         → user_invitations sent for the typical_role
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// requirement_code → service_type_definitions.code (inlined from workConstants)
const REQ_TO_SERVICE: Record<string, string> = {
  hood_cleaning: 'KEC',
  fire_suppression: 'FS',
  fire_alarm: 'FA',
  sprinkler_system: 'SP',
  fire_extinguishers: 'FE',
  pest_control: 'PC',
};

export interface PillarProof {
  completedCount: number;
  totalCount: number;
}

interface UsePillarProofReturn {
  foodSafety: PillarProof;
  fireSafety: PillarProof;
  loading: boolean;
}

export function usePillarProof(): UsePillarProofReturn {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({});
  const [requirements, setRequirements] = useState<
    { requirement_code: string; pillar: string; action_type: string; typical_role: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);

      // 1. Derive state from org's first location
      const { data: locData } = await supabase
        .from('locations')
        .select('id, state')
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;

      const state = locData?.state || null;
      if (!state) { setRequirements([]); setLoading(false); return; }

      // 2. Fetch canonical requirements catalog for this state
      const { data: reqs } = await supabase
        .from('onboarding_pillar_requirements')
        .select('requirement_code, pillar, action_type, typical_role')
        .eq('state_code', state)
        .order('pillar')
        .order('sort_order');
      if (cancelled) return;

      const reqList = (reqs || []) as typeof requirements;
      setRequirements(reqList);

      // 3. Org-level flags (confirmed items, skipped items)
      const { data: orgData } = await supabase
        .from('organizations')
        .select('onboarding_skipped_items, onboarding_confirmed_items')
        .eq('id', orgId)
        .maybeSingle();
      if (cancelled) return;

      const skipped: string[] = (orgData?.onboarding_skipped_items as string[]) || [];
      const confirmed: string[] = (orgData?.onboarding_confirmed_items as string[]) || [];

      // 4. All org locations (needed for temperature_logs + vendor schedules)
      const { data: orgLocs } = await supabase
        .from('locations')
        .select('id')
        .eq('organization_id', orgId);
      if (cancelled) return;
      const locIds = (orgLocs || []).map((l: { id: string }) => l.id);

      // 5. Detect completion for each requirement
      const map: Record<string, boolean> = {};

      for (const req of reqList) {
        // Skipped and not confirmed = not proven
        if (skipped.includes(req.requirement_code) && !confirmed.includes(req.requirement_code)) {
          map[req.requirement_code] = false;
          continue;
        }

        switch (req.action_type) {
          case 'upload': {
            const { count } = await supabase
              .from('compliance_documents')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', orgId)
              .eq('category', req.requirement_code);
            if (cancelled) return;
            map[req.requirement_code] = (count ?? 0) > 0;
            break;
          }
          case 'route_out': {
            if (req.requirement_code === 'temperature_logs') {
              let hasTempLogs = false;
              if (locIds.length > 0) {
                const { count } = await supabase
                  .from('temperature_logs')
                  .select('id', { count: 'exact', head: true })
                  .in('facility_id', locIds);
                if (cancelled) return;
                hasTempLogs = (count ?? 0) > 0;
              }
              map[req.requirement_code] = hasTempLogs;
            } else if (req.requirement_code === 'haccp_plan') {
              const { count } = await supabase
                .from('compliance_documents')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('category', 'haccp_plan');
              if (cancelled) return;
              map[req.requirement_code] = (count ?? 0) > 0;
            } else {
              map[req.requirement_code] = false;
            }
            break;
          }
          case 'confirm': {
            map[req.requirement_code] = confirmed.includes(req.requirement_code);
            break;
          }
          case 'identify_vendor': {
            const serviceCode = REQ_TO_SERVICE[req.requirement_code];
            if (!serviceCode) { map[req.requirement_code] = false; break; }
            const { count } = await supabase
              .from('location_service_schedules')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', orgId)
              .eq('service_type_code', serviceCode)
              .not('vendor_id', 'is', null);
            if (cancelled) return;
            map[req.requirement_code] = (count ?? 0) > 0;
            break;
          }
          case 'invite': {
            const { count } = await supabase
              .from('user_invitations')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', orgId)
              .eq('role', req.typical_role);
            if (cancelled) return;
            map[req.requirement_code] = (count ?? 0) > 0;
            break;
          }
        }
      }

      if (cancelled) return;
      setCompletionMap(map);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orgId]);

  const foodSafety = useMemo((): PillarProof => {
    const items = requirements.filter(r => r.pillar === 'food_safety');
    const done = items.filter(r => completionMap[r.requirement_code] === true).length;
    return { completedCount: done, totalCount: items.length };
  }, [requirements, completionMap]);

  const fireSafety = useMemo((): PillarProof => {
    const items = requirements.filter(r => r.pillar === 'fire_safety');
    const done = items.filter(r => completionMap[r.requirement_code] === true).length;
    return { completedCount: done, totalCount: items.length };
  }, [requirements, completionMap]);

  return { foodSafety, fireSafety, loading };
}
