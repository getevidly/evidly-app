import { useMemo } from 'react';
import { useTeamRoles } from './useTeamRoles';
import { usePillarRequirements, type PillarRequirement } from './usePillarRequirements';

export interface DelegationSuggestion {
  role: string;
  roleLabel: string;
  pendingItems: PillarRequirement[];
  count: number;
}

interface UseDelegationSuggestionReturn {
  suggestions: DelegationSuggestion[];
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
 * but no team member filling that role. Returns invite suggestions.
 *
 * Rule: If 3+ items share a missing typical_role, show an invite banner
 * for that role during onboarding.
 */
export function useDelegationSuggestion(): UseDelegationSuggestionReturn {
  const { missingRoles, filledRoles, loading: teamLoading } = useTeamRoles();
  const { requirements, loading: reqLoading } = usePillarRequirements();

  const loading = teamLoading || reqLoading;

  const suggestions = useMemo(() => {
    if (loading || requirements.length === 0) return [];

    const result: DelegationSuggestion[] = [];

    for (const role of missingRoles) {
      const items = requirements.filter(r => r.typical_role === role);
      if (items.length >= 3) {
        result.push({
          role,
          roleLabel: ROLE_LABELS[role] || role,
          pendingItems: items,
          count: items.length,
        });
      }
    }

    // Sort by most items first
    return result.sort((a, b) => b.count - a.count);
  }, [missingRoles, requirements, loading]);

  return {
    suggestions,
    hasSuggestions: suggestions.length > 0,
    missingRoles,
    filledRoles,
    loading,
  };
}
