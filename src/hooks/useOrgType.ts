/**
 * PHASE-0-S1 — Org Industry Type Hook
 *
 * Returns the current organization's industry type.
 * Demo mode: reads from sessionStorage `evidly_demo_lead`.
 * Auth mode: queries `organizations.industry_type` via Supabase.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';

const DEMO_LEAD_KEY = 'evidly_demo_lead';

export function useOrgType(): { orgType: string | null; loading: boolean } {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const isDemo = isDemoMode || !profile?.organization_id;
  const orgId = profile?.organization_id || '';

  const [orgType, setOrgType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      try {
        const raw = sessionStorage.getItem(DEMO_LEAD_KEY);
        if (raw) {
          const lead = JSON.parse(raw);
          setOrgType(lead.industry || lead.businessType || null);
        }
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from('organizations')
          .select('industry_type')
          .eq('id', orgId)
          .maybeSingle();

        if (data) {
          setOrgType(data.industry_type || null);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [isDemo, orgId]);

  return { orgType, loading };
}
