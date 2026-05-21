/**
 * useTeamHeadsUp — C15
 *
 * Fetches today's notifications for the current kitchen_staff user.
 * Source: notifications table, filtered to today + not dismissed.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface HeadsUpItem {
  id: string;
  label: string;
  detail: string | null;
  time_ago: string;
  kind: 'assigned' | 'info' | 'alert';
}

interface UseTeamHeadsUpResult {
  items: HeadsUpItem[];
  loading: boolean;
  error: Error | null;
}

function computeTimeAgo(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffMin = Math.round((now.getTime() - then.getTime()) / 60_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffMin < 1440) {
    const h = Math.floor(diffMin / 60);
    return `${h}h ago`;
  }
  return 'yesterday';
}

function mapKind(severity: string | null, category: string | null, type: string | null): 'assigned' | 'info' | 'alert' {
  if (severity === 'urgent') return 'alert';
  if (category === 'team' || (type && type.startsWith('assignment'))) return 'assigned';
  return 'info';
}

export function useTeamHeadsUp(): UseTeamHeadsUpResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;
  const userId = profile?.id;

  const [items, setItems] = useState<HeadsUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isStaff = userRole === 'kitchen_staff';

  useEffect(() => {
    if (!orgId || !userId || !isStaff) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data, error: qErr } = await supabase
          .from('notifications')
          .select('id, title, body, severity, category, type, created_at')
          .eq('user_id', userId!)
          .eq('organization_id', orgId!)
          .gte('created_at', todayStart.toISOString())
          .is('dismissed_at', null)
          .order('created_at', { ascending: false })
          .limit(10);

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        const result: HeadsUpItem[] = (data || []).map(r => {
          const row = r as Record<string, unknown>;
          return {
            id: row.id as string,
            label: (row.title as string) || 'Notification',
            detail: (row.body as string) || null,
            time_ago: computeTimeAgo(row.created_at as string),
            kind: mapKind(
              (row.severity as string) || null,
              (row.category as string) || null,
              (row.type as string) || null,
            ),
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
  }, [orgId, userId, isStaff]);

  return { items, loading, error };
}
