/**
 * useDriftRouting — fetches notification routing info for a drift catch.
 * Queries notifications WHERE source_type='drift_catch' AND source_id=driftCatchId
 * and joins user_profiles for recipient name + role.
 * Returns who was notified, their ack state, and escalation countdown.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DriftRecipient {
  user_id: string;
  full_name: string;
  role: string;
  acknowledged_at: string | null;
  escalation_deadline: string | null;
  escalated_at: string | null;
}

interface UseDriftRoutingResult {
  recipients: DriftRecipient[];
  loading: boolean;
}

export function useDriftRouting(driftCatchIds: string[]): Record<string, DriftRecipient[]> {
  const [routingMap, setRoutingMap] = useState<Record<string, DriftRecipient[]>>({});

  useEffect(() => {
    if (driftCatchIds.length === 0) {
      setRoutingMap({});
      return;
    }

    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('notifications')
        .select('source_id, user_id, acknowledged_at, escalation_deadline, escalated_at, user_profiles!inner(full_name, role)')
        .eq('source_type', 'drift_catch')
        .in('source_id', driftCatchIds);

      if (cancelled || error || !data) return;

      const grouped: Record<string, DriftRecipient[]> = {};
      for (const row of data) {
        const r = row as Record<string, unknown>;
        const sourceId = r.source_id as string;
        const profile = r.user_profiles as { full_name: string; role: string } | null;

        if (!grouped[sourceId]) grouped[sourceId] = [];
        grouped[sourceId].push({
          user_id: r.user_id as string,
          full_name: profile?.full_name || 'Unknown',
          role: profile?.role || 'unknown',
          acknowledged_at: (r.acknowledged_at as string) || null,
          escalation_deadline: (r.escalation_deadline as string) || null,
          escalated_at: (r.escalated_at as string) || null,
        });
      }

      setRoutingMap(grouped);
    }

    load();
    return () => { cancelled = true; };
  }, [driftCatchIds.join(',')]);

  return routingMap;
}
