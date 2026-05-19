import { useState, useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';

interface OnboardingGuardProps {
  children: ReactNode;
}

/**
 * OnboardingGuard — gates all authenticated routes behind org-level onboarding.
 *
 * Reads `organizations.onboarding_completed` (NOT user_profiles — those are
 * different flags). Subscribes to realtime updates so the guard reacts
 * immediately when evaluateOnboardingComplete() flips the column.
 *
 * Exempt: admin users, demo mode, unauthenticated, no-org users.
 *
 * Redirect rule:
 *   onboarding incomplete + not on /onboarding → redirect to /onboarding
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { profile, loading: authLoading, isAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const location = useLocation();
  const [orgComplete, setOrgComplete] = useState<boolean | null>(null);

  const orgId = profile?.organization_id;

  useEffect(() => {
    // Admin / demo / no org → skip fetch, guard will pass through
    if (isAdmin || isDemoMode || !orgId) return;

    let cancelled = false;

    // Initial fetch
    supabase
      .from('organizations')
      .select('onboarding_completed')
      .eq('id', orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setOrgComplete(data?.onboarding_completed ?? false);
        }
      });

    // Realtime subscription — reacts when evaluateOnboardingComplete flips the flag
    const channel = supabase
      .channel(`onboarding-guard:${orgId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'organizations',
        filter: `id=eq.${orgId}`,
      }, (payload) => {
        if (!cancelled && payload.new?.onboarding_completed !== undefined) {
          setOrgComplete(Boolean(payload.new.onboarding_completed));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orgId, isAdmin, isDemoMode]);

  // Reset when exemption conditions change
  useEffect(() => {
    if (isAdmin || isDemoMode || !orgId) {
      setOrgComplete(null);
    }
  }, [isAdmin, isDemoMode, orgId]);

  // Auth still loading → spinner
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated → render children (ProtectedLayout handles auth redirect)
  if (!profile) return <>{children}</>;

  // Admin / demo / no org → skip guard
  if (isAdmin || isDemoMode || !orgId) return <>{children}</>;

  // Org onboarding state still loading → spinner
  if (orgComplete === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" />
      </div>
    );
  }

  // Onboarding NOT complete → force /onboarding
  if (!orgComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
