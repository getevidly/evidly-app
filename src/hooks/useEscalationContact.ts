/**
 * useEscalationContact — C15
 *
 * Fetches the kitchen_manager for the current org as the escalation contact.
 * Falls back to null if no kitchen_manager exists.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface EscalationManager {
  full_name: string;
  phone: string | null;
  role_label: string;
}

interface UseEscalationContactResult {
  manager: EscalationManager | null;
  loading: boolean;
  error: Error | null;
}

export function useEscalationContact(): UseEscalationContactResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;

  const [manager, setManager] = useState<EscalationManager | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isStaff = userRole === 'kitchen_staff';

  useEffect(() => {
    if (!orgId || !isStaff) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const { data, error: qErr } = await supabase
          .from('user_profiles')
          .select('full_name, phone')
          .eq('organization_id', orgId!)
          .eq('role', 'kitchen_manager')
          .eq('is_suspended', false)
          .limit(1);

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        if (data && data.length > 0) {
          const r = data[0] as { full_name: string; phone: string | null };
          setManager({
            full_name: r.full_name,
            phone: r.phone || null,
            role_label: 'Kitchen Manager',
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, isStaff]);

  return { manager, loading, error };
}
