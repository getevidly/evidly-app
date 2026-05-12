import { useState, useEffect, type ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useNewOnboarding } from '../../../lib/onboarding/featureFlag';

const SOFT_LOCK_ROUTES = ['/documents', '/vendors', '/services', '/calendar', '/tasks'];

interface OnboardingSoftLockProps {
  children: ReactNode;
}

/**
 * Wraps page content inside the Layout scroll area.
 * When soft-lock is active (feature flag on, responsibilities NOT locked,
 * current route is one of the 5 protected routes), replaces all page content
 * with a centered banner. Otherwise passes children through unchanged.
 */
export function OnboardingSoftLock({ children }: OnboardingSoftLockProps) {
  const isNew = useNewOnboarding();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { pathname } = useLocation();

  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!orgId || !isNew) return;
    let cancelled = false;

    async function check() {
      const { data } = await supabase
        .from('organizations')
        .select('metadata')
        .eq('id', orgId)
        .maybeSingle();
      if (cancelled) return;
      const meta = (data?.metadata as Record<string, unknown>) || {};
      setLocked(meta.responsibilities_locked === true);
    }

    check();
    return () => { cancelled = true; };
  }, [orgId, isNew]);

  // Soft-lock active when: feature flag on, orgId exists, NOT locked, on target route
  const softLockActive = isNew && !!orgId && locked === false && SOFT_LOCK_ROUTES.includes(pathname);

  if (!softLockActive) {
    return <>{children}</>;
  }

  // Replace entire page content with the soft-lock banner
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-24">
      <div
        className="w-full max-w-md rounded-lg px-6 py-6"
        style={{
          backgroundColor: '#FAF7F0',
          borderLeft: '3px solid #1E2D4D',
          boxShadow: '0 1px 4px rgba(30,45,77,0.08)',
        }}
      >
        <div className="flex items-start gap-3">
          <Info size={20} className="text-[#1E2D4D] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#1E2D4D] mb-1">
              Finish onboarding to start working here.
            </p>
            <p className="text-xs text-[#5A6478] mb-4">
              Complete your setup to unlock this page.
            </p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              Return to onboarding {'\u2192'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
