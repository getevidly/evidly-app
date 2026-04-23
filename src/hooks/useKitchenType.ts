/**
 * Kitchen Type Hook — reads locations.kitchen_type for the current org.
 *
 * Demo mode: reads from sessionStorage `evidly_demo_lead`.
 * Auth mode: queries `locations.kitchen_type` for org's first location.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import type { KitchenType } from '../config/kitchenTypes';

const DEMO_LEAD_KEY = 'evidly_demo_lead';

export function useKitchenType(): { kitchenType: KitchenType | null; loading: boolean } {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const isDemo = isDemoMode || !profile?.organization_id;
  const orgId = profile?.organization_id || '';

  const [kitchenType, setKitchenType] = useState<KitchenType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      try {
        const raw = sessionStorage.getItem(DEMO_LEAD_KEY);
        if (raw) {
          const lead = JSON.parse(raw);
          setKitchenType(lead.kitchenType || lead.industry || lead.businessType || null);
        }
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from('locations')
          .select('kitchen_type')
          .eq('organization_id', orgId)
          .limit(1)
          .maybeSingle();

        if (data) {
          setKitchenType(data.kitchen_type || null);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [isDemo, orgId]);

  return { kitchenType, loading };
}
