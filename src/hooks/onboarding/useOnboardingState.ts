import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePillarRequirements, type PillarRequirement } from './usePillarRequirements';

export type RequirementStatus = 'done' | 'pending' | 'skipped';

export interface RequirementState {
  requirement: PillarRequirement;
  status: RequirementStatus;
}

export interface PillarState {
  pillar: 'food_safety' | 'fire_safety';
  items: RequirementState[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
}

interface UseOnboardingStateReturn {
  foodSafety: PillarState;
  fireSafety: PillarState;
  overallComplete: boolean;
  loading: boolean;
  skippedItems: string[];
  skipItem: (requirementCode: string) => Promise<void>;
  unskipItem: (requirementCode: string) => Promise<void>;
  refreshState: () => void;
}

/**
 * Master onboarding state hook. Combines pillar requirements with
 * data-driven completion detection per action_type:
 *   - upload: compliance_documents row exists for that category
 *   - route_out: relevant table has rows (temperature_logs, haccp docs)
 *   - confirm: org.onboarding_skipped_items includes the code (manual confirm)
 *   - invite: user_invitations sent for the typical_role
 */
export function useOnboardingState(): UseOnboardingStateReturn {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { requirements, foodSafety: fsReqs, fireSafety: firReqs, loading: reqLoading } = usePillarRequirements();

  const [skippedItems, setSkippedItems] = useState<string[]>([]);
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch org's skipped items and detect completion states
  useEffect(() => {
    if (!orgId || reqLoading) {
      setLoading(reqLoading);
      return;
    }

    let cancelled = false;

    async function detect() {
      setLoading(true);

      // 1. Get org's skipped items
      const { data: orgData } = await supabase
        .from('organizations')
        .select('onboarding_skipped_items')
        .eq('id', orgId)
        .maybeSingle();

      if (cancelled) return;
      const skipped: string[] = (orgData?.onboarding_skipped_items as string[]) || [];
      setSkippedItems(skipped);

      // 2. Detect completion for each requirement
      const map: Record<string, boolean> = {};

      for (const req of requirements) {
        if (skipped.includes(req.requirement_code)) {
          map[req.requirement_code] = false; // skipped, not done
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
              // temperature_logs uses facility_id (= location_id), not organization_id
              const { data: orgLocs } = await supabase
                .from('locations')
                .select('id')
                .eq('organization_id', orgId);
              if (cancelled) return;
              const locIds = (orgLocs || []).map(l => l.id);
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
            // Confirm items are "done" when explicitly confirmed via skipped_items
            // (confirm = user clicks "I have this" without uploading)
            map[req.requirement_code] = skipped.includes(req.requirement_code);
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
    }

    detect();
    return () => { cancelled = true; };
  }, [orgId, requirements, reqLoading, refreshKey]);

  const buildPillarState = useCallback(
    (pillar: 'food_safety' | 'fire_safety', reqs: PillarRequirement[]): PillarState => {
      const items: RequirementState[] = reqs.map(req => {
        const isSkipped = skippedItems.includes(req.requirement_code);
        const isDone = completionMap[req.requirement_code] ?? false;
        return {
          requirement: req,
          status: isSkipped ? 'skipped' : isDone ? 'done' : 'pending',
        };
      });
      const completedCount = items.filter(i => i.status === 'done').length;
      return {
        pillar,
        items,
        completedCount,
        totalCount: items.length,
        isComplete: items.length > 0 && items.every(i => i.status === 'done' || i.status === 'skipped'),
      };
    },
    [skippedItems, completionMap]
  );

  const foodSafety = useMemo(() => buildPillarState('food_safety', fsReqs), [buildPillarState, fsReqs]);
  const fireSafety = useMemo(() => buildPillarState('fire_safety', firReqs), [buildPillarState, firReqs]);
  const overallComplete = foodSafety.isComplete && fireSafety.isComplete;

  const skipItem = useCallback(async (requirementCode: string) => {
    if (!orgId) return;
    const updated = [...skippedItems, requirementCode];
    setSkippedItems(updated);
    await supabase
      .from('organizations')
      .update({ onboarding_skipped_items: updated })
      .eq('id', orgId);
  }, [orgId, skippedItems]);

  const unskipItem = useCallback(async (requirementCode: string) => {
    if (!orgId) return;
    const updated = skippedItems.filter(c => c !== requirementCode);
    setSkippedItems(updated);
    await supabase
      .from('organizations')
      .update({ onboarding_skipped_items: updated })
      .eq('id', orgId);
  }, [orgId, skippedItems]);

  const refreshState = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return {
    foodSafety,
    fireSafety,
    overallComplete,
    loading,
    skippedItems,
    skipItem,
    unskipItem,
    refreshState,
  };
}
