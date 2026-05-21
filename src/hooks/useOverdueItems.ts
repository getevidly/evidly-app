/**
 * useOverdueItems — C14
 *
 * Aggregates overdue items from task_instances, corrective_actions, and documents.
 * Kitchen_manager role only.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface OverdueItem {
  id: string;
  source: 'task' | 'corrective_action' | 'document';
  title: string;
  detail_text: string;
  days_late: number;
}

interface UseOverdueItemsResult {
  items: OverdueItem[];
  totalCount: number;
  loading: boolean;
  error: Error | null;
}

function daysLate(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

function lateSuffix(days: number): string {
  if (days === 0) return 'due today';
  if (days === 1) return '1 day late';
  return `${days} days late`;
}

export function useOverdueItems(): UseOverdueItemsResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;

  const [items, setItems] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isKM = userRole === 'kitchen_manager';

  useEffect(() => {
    if (!orgId || !isKM) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const now = new Date().toISOString();
        const today = new Date().toISOString().split('T')[0];

        const [tasksRes, caRes, docsRes] = await Promise.all([
          supabase
            .from('task_instances')
            .select('id, title, due_at')
            .eq('organization_id', orgId!)
            .eq('status', 'pending')
            .lt('due_at', now),
          supabase
            .from('corrective_actions')
            .select('id, title, due_date')
            .eq('organization_id', orgId!)
            .not('status', 'in', '("closed","archived","verified","dismissed")')
            .lt('due_date', today),
          supabase
            .from('documents')
            .select('id, title, expiration_date')
            .eq('organization_id', orgId!)
            .eq('status', 'active')
            .lt('expiration_date', today),
        ]);

        if (cancelled) return;

        const result: OverdueItem[] = [];

        for (const t of (tasksRes.data || [])) {
          const r = t as Record<string, unknown>;
          const late = daysLate(r.due_at as string);
          result.push({
            id: r.id as string,
            source: 'task',
            title: (r.title as string) || 'Task',
            detail_text: lateSuffix(late),
            days_late: late,
          });
        }

        for (const c of (caRes.data || [])) {
          const r = c as Record<string, unknown>;
          const late = daysLate(r.due_date as string);
          result.push({
            id: r.id as string,
            source: 'corrective_action',
            title: `CA: ${(r.title as string) || 'Corrective action'}`,
            detail_text: lateSuffix(late),
            days_late: late,
          });
        }

        for (const d of (docsRes.data || [])) {
          const r = d as Record<string, unknown>;
          const late = daysLate(r.expiration_date as string);
          result.push({
            id: r.id as string,
            source: 'document',
            title: `Document expired: ${(r.title as string) || 'Untitled'}`,
            detail_text: lateSuffix(late),
            days_late: late,
          });
        }

        // Sort most overdue first
        result.sort((a, b) => b.days_late - a.days_late);

        setItems(result.slice(0, 20));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, isKM]);

  return { items, totalCount: items.length, loading, error };
}
