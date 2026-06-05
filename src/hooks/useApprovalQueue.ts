/**
 * useApprovalQueue — C14
 *
 * Fetches corrective actions awaiting verification (completed but not verified).
 * Kitchen_manager role only.
 *
 * TODO: task_instances PIC sign-off pending approvals not surfaced in C14 —
 * needs approval-tracking column on task_instances or separate review_queue table.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface ApprovalItem {
  id: string;
  title: string;
  meta_text: string;
  why_text: string | null;
  why_reg: string | null;
  why_rec: string | null;
  icon: string;
  source_table: 'corrective_actions';
  source_id: string;
  primary_action_label: string;
  secondary_action_label: string | null;
}

interface UseApprovalQueueResult {
  items: ApprovalItem[];
  loading: boolean;
  error: Error | null;
}

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  } catch { return ''; }
}

function iconForCA(pillar: string | null, severity: string | null): string {
  if (severity === 'critical') return 'ti-alert-triangle';
  if (pillar === 'food_safety') return 'ti-temperature';
  if (pillar === 'fire_safety') return 'ti-flame';
  return 'ti-file-text';
}

export function useApprovalQueue(options?: { locationIdFilter?: string }): UseApprovalQueueResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;
  const locationIdFilter = options?.locationIdFilter;

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isKM = userRole === 'kitchen_manager';

  useEffect(() => {
    if (!orgId || !isKM) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        let q = supabase
          .from('corrective_actions')
          .select('id, title, description, severity, pillar, assignee_name, regulation_reference, completed_at')
          .eq('organization_id', orgId!)
          .not('status', 'in', '("closed","archived","dismissed")')
          .not('completed_at', 'is', null)
          .is('verified_at', null)
          .order('completed_at', { ascending: true })
          .limit(20);
        if (locationIdFilter) {
          q = q.or(`location_id.eq.${locationIdFilter},location_id.is.null`);
        }
        const { data, error: qErr } = await q;

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        const result: ApprovalItem[] = (data || []).map(r => {
          const row = r as Record<string, unknown>;
          const severity = (row.severity as string) || null;
          const pillar = (row.pillar as string) || null;
          const completedAt = row.completed_at as string;
          const assignee = (row.assignee_name as string) || '';
          const desc = (row.description as string) || '';
          const regRef = (row.regulation_reference as string) || null;

          const metaParts: string[] = [];
          if (severity) metaParts.push(severity);
          if (assignee) metaParts.push(assignee);
          if (completedAt) metaParts.push(fmtTime(completedAt));

          return {
            id: row.id as string,
            title: (row.title as string) || 'Corrective action',
            meta_text: metaParts.join(' · '),
            why_text: desc.length > 200 ? desc.slice(0, 200) + '…' : (desc || null),
            why_reg: regRef,
            why_rec: null,
            icon: iconForCA(pillar, severity),
            source_table: 'corrective_actions' as const,
            source_id: row.id as string,
            primary_action_label: 'Verify',
            secondary_action_label: 'Edit',
          };
        });

        setItems(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, isKM, locationIdFilter]);

  return { items, loading, error };
}
