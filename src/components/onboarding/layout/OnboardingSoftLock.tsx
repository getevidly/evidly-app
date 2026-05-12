import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useNewOnboarding } from '../../../lib/onboarding/featureFlag';

const SOFT_LOCK_ROUTES = ['/documents', '/vendors', '/services', '/calendar', '/tasks'];

export function OnboardingSoftLock() {
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

  // Self-gate: render null unless all conditions met
  if (!isNew) return null;
  if (!orgId) return null;
  if (locked !== false) return null;
  if (!SOFT_LOCK_ROUTES.includes(pathname)) return null;

  return (
    <div
      className="mx-4 sm:mx-6 lg:mx-8 mt-4 mb-0 max-w-[1200px] rounded-lg flex items-center gap-3 px-4 py-3 text-sm"
      style={{
        backgroundColor: '#FAF7F0',
        borderLeft: '3px solid #1E2D4D',
      }}
    >
      <Info size={16} className="text-[#1E2D4D] flex-shrink-0" />
      <span className="text-[#1E2D4D] flex-1">
        Finish onboarding to start working here.
      </span>
      <Link
        to="/onboarding"
        className="text-[#1E2D4D] font-medium hover:underline whitespace-nowrap"
      >
        Return to onboarding &rarr;
      </Link>
    </div>
  );
}
