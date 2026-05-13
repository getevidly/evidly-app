import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

type ViewMode = 'owner' | 'invitee';

interface OnboardingViewContextValue {
  viewMode: ViewMode;
  assignedToUserId: string | null;
  assignedRequirementCodes: Set<string>;
  loading: boolean;
}

const OnboardingViewContext = createContext<OnboardingViewContextValue>({
  viewMode: 'owner',
  assignedToUserId: null,
  assignedRequirementCodes: new Set(),
  loading: true,
});

const OWNER_ROLES = ['owner_operator', 'owner', 'executive'];

export function OnboardingViewProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const orgId = profile?.organization_id;
  const role = profile?.role;

  const [assignedCodes, setAssignedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !userId) {
      setLoading(false);
      return;
    }

    // Owners don't need to look up assignments
    if (role && OWNER_ROLES.includes(role)) {
      setAssignedCodes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAssignments() {
      setLoading(true);
      const { data } = await supabase
        .from('organizations')
        .select('onboarding_team_invited')
        .eq('id', orgId)
        .maybeSingle();

      if (cancelled) return;

      const entries = (data?.onboarding_team_invited as Array<{ requirement_code: string; assigned_to_user_id?: string }>) || [];
      const codes = entries
        .filter(e => e.assigned_to_user_id === userId)
        .map(e => e.requirement_code);

      setAssignedCodes(codes);
      setLoading(false);
    }

    fetchAssignments();
    return () => { cancelled = true; };
  }, [orgId, userId, role]);

  const value = useMemo<OnboardingViewContextValue>(() => {
    const isOwner = !role || OWNER_ROLES.includes(role);
    return {
      viewMode: isOwner ? 'owner' : 'invitee',
      assignedToUserId: userId,
      assignedRequirementCodes: new Set(assignedCodes),
      loading,
    };
  }, [role, userId, assignedCodes, loading]);

  return (
    <OnboardingViewContext.Provider value={value}>
      {children}
    </OnboardingViewContext.Provider>
  );
}

export function useOnboardingView() {
  return useContext(OnboardingViewContext);
}
