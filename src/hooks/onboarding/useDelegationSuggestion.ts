import { useMemo, useCallback } from 'react';
import { useTeamRoles } from './useTeamRoles';
import { usePillarRequirements, type PillarRequirement } from './usePillarRequirements';

export interface DelegationSuggestion {
  role: string;
  roleLabel: string;
  pendingItems: PillarRequirement[];
  count: number;
}

interface UseDelegationSuggestionReturn {
  /** Get suggestions scoped to a single pillar (>=3 threshold) */
  getSuggestionsForPillar: (pillar: 'food_safety' | 'fire_safety') => DelegationSuggestion[];
  hasSuggestions: boolean;
  /** Roles that have no active member or pending invite */
  missingRoles: string[];
  /** Roles that have an active member or pending invite */
  filledRoles: Set<string>;
  loading: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  compliance_manager: 'Compliance Officer',
  facilities_manager: 'Facilities Manager',
  kitchen_manager: 'Kitchen Manager',
  chef: 'Chef',
  executive: 'Executive',
  owner_operator: 'Owner/Operator',
  kitchen_staff: 'Kitchen Staff',
};

/**
 * Identifies roles that have 3+ pending onboarding items assigned to them
 * within a SINGLE pillar, but no team member filling that role.
 *
 * Scoping rule: counts are per-pillar, not global. A role must have >=3
 * items within the requested pillar to trigger a banner.
 */
export function useDelegationSuggestion(): UseDelegationSuggestionReturn {
  const { missingRoles, filledRoles, loading: teamLoading } = useTeamRoles();
  const { requirements, loading: reqLoading } = usePillarRequirements();

  const loading = teamLoading || reqLoading;

  const getSuggestionsForPillar = useCallback(
    (pillar: 'food_safety' | 'fire_safety'): DelegationSuggestion[] => {
      if (loading || requirements.length === 0) return [];

      const pillarReqs = requirements.filter(r => r.pillar === pillar);
      const result: DelegationSuggestion[] = [];

      for (const role of missingRoles) {
        const items = pillarReqs.filter(r => r.typical_role === role);
        if (items.length >= 3) {
          result.push({
            role,
            roleLabel: ROLE_LABELS[role] || role,
            pendingItems: items,
            count: items.length,
          });
        }
      }

      return result.sort((a, b) => b.count - a.count);
    },
    [missingRoles, requirements, loading]
  );

  // hasSuggestions = true if either pillar has at least one suggestion
  const hasSuggestions = useMemo(() => {
    return getSuggestionsForPillar('food_safety').length > 0
      || getSuggestionsForPillar('fire_safety').length > 0;
  }, [getSuggestionsForPillar]);

  return {
    getSuggestionsForPillar,
    hasSuggestions,
    missingRoles,
    filledRoles,
    loading,
  };
}
