/**
 * useDecisionsQueue — C13a
 *
 * Fetches open owner_decisions for the org.
 * Role-filtered: facilities_manager sees only fire-related decisions.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface OwnerDecision {
  id: string;
  decision_type: string;
  title: string;
  regulatory_citation: string | null;
  priority: 'urgent' | 'soon' | 'review';
  assigned_role: string;
  status: string;
  due_by: string | null;
  source_table: string;
  source_record_id: string | null;
  decision_value: {
    citation_clause?: string;
    cost_narrative?: string;
    cost_exposure?: number;
    penalty_range?: string;
    alternatives_clause?: string;
    [key: string]: unknown;
  } | null;
  location_id: string | null;
  location_name: string | null;
  created_at: string;
}

interface UseDecisionsQueueResult {
  decisions: OwnerDecision[];
  openCount: number;
  urgentCount: number;
  loading: boolean;
  error: Error | null;
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, soon: 1, review: 2 };

const FIRE_DECISION_TYPES = ['service_schedule', 'contract_renewal'];

export function useDecisionsQueue(options?: { locationIdFilter?: string }): UseDecisionsQueueResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;
  const locationIdFilter = options?.locationIdFilter;

  const [decisions, setDecisions] = useState<OwnerDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        let q = supabase
          .from('owner_decisions')
          .select('*, locations(name)')
          .eq('org_id', orgId)
          .eq('status', 'open')
          .order('created_at', { ascending: true });

        if (locationIdFilter) {
          q = q.or(`location_id.eq.${locationIdFilter},location_id.is.null`);
        }

        // facilities_manager: fire-related decisions only
        if (userRole === 'facilities_manager') {
          q = q.or(`assigned_role.eq.facilities_manager,decision_type.in.(${FIRE_DECISION_TYPES.join(',')})`);
        }

        const { data, error: qErr } = await q;
        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        const rows: OwnerDecision[] = (data || []).map((r: Record<string, unknown>) => {
          const loc = r.locations as { name: string } | null;
          return {
            id: r.id as string,
            decision_type: r.decision_type as string,
            title: r.title as string,
            regulatory_citation: (r.regulatory_citation as string) || null,
            priority: r.priority as 'urgent' | 'soon' | 'review',
            assigned_role: r.assigned_role as string,
            status: r.status as string,
            due_by: (r.due_by as string) || null,
            source_table: r.source_table as string,
            source_record_id: (r.source_record_id as string) || null,
            decision_value: (r.decision_value as Record<string, unknown>) || null,
            location_id: (r.location_id as string) || null,
            location_name: loc?.name || null,
            created_at: r.created_at as string,
          };
        });

        // Client-side sort: priority → due_by → created_at
        rows.sort((a, b) => {
          const pDiff = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
          if (pDiff !== 0) return pDiff;
          if (a.due_by && b.due_by) return a.due_by.localeCompare(b.due_by);
          if (a.due_by && !b.due_by) return -1;
          if (!a.due_by && b.due_by) return 1;
          return a.created_at.localeCompare(b.created_at);
        });

        setDecisions(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, userRole, locationIdFilter]);

  const openCount = decisions.length;
  const urgentCount = decisions.filter(d => d.priority === 'urgent').length;

  return { decisions, openCount, urgentCount, loading, error };
}
