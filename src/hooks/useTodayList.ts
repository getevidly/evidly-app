/**
 * useTodayList — C13b
 *
 * Fetches task_instances due today, optionally filtered by pillar or user.
 * Returns top 5 items sorted: incomplete first, then by due_at ASC.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TodayItem {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  pillar: 'food_safety' | 'fire_safety' | null;
  scope_text: string;
  detail_text: string;
}

interface UseTodayListOptions {
  pillarFilter?: 'food_safety' | 'fire_safety';
  userIdFilter?: string;
}

interface UseTodayListResult {
  items: TodayItem[];
  totalToday: number;
  doneToday: number;
  loading: boolean;
  error: Error | null;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  } catch { return ''; }
}

export function useTodayList(options?: UseTodayListOptions): UseTodayListResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [items, setItems] = useState<TodayItem[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [doneToday, setDoneToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const pillarFilter = options?.pillarFilter;
  const userIdFilter = options?.userIdFilter;

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const today = todayDate();

        let q = supabase
          .from('task_instances')
          .select('id, title, status, due_at, completed_at, pillar, location_id, definition_id, locations(name)')
          .eq('organization_id', orgId)
          .eq('date', today)
          .order('due_at', { ascending: true });

        if (pillarFilter) {
          q = q.eq('pillar', pillarFilter);
        }
        if (userIdFilter) {
          q = q.eq('assigned_to', userIdFilter);
        }

        const { data, error: qErr } = await q;
        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        const rows = data || [];
        const total = rows.length;
        const done = rows.filter(r => (r as Record<string, unknown>).status === 'completed').length;

        // Build TodayItem list — group by definition_id for rollup
        const byDef = new Map<string, {
          ids: string[];
          title: string;
          status: string;
          due_at: string | null;
          completed_at: string | null;
          pillar: string | null;
          locations: string[];
          doneCount: number;
          totalCount: number;
        }>();

        for (const raw of rows) {
          const r = raw as Record<string, unknown>;
          const defId = r.definition_id as string;
          const loc = r.locations as { name: string } | null;
          const locName = loc?.name || 'Unknown';
          const status = r.status as string;

          if (!byDef.has(defId)) {
            byDef.set(defId, {
              ids: [],
              title: r.title as string,
              status,
              due_at: (r.due_at as string) || null,
              completed_at: (r.completed_at as string) || null,
              pillar: (r.pillar as string) || null,
              locations: [],
              doneCount: 0,
              totalCount: 0,
            });
          }
          const entry = byDef.get(defId)!;
          entry.ids.push(r.id as string);
          entry.totalCount++;
          if (status === 'completed') entry.doneCount++;
          if (!entry.locations.includes(locName)) entry.locations.push(locName);
          // Keep worst status (pending > completed for display)
          if (status !== 'completed') entry.status = status;
        }

        const result: TodayItem[] = [];
        for (const entry of byDef.values()) {
          let scopeText: string;
          if (entry.locations.length > 1) {
            scopeText = entry.totalCount === entry.locations.length
              ? 'All locations'
              : `${entry.locations.length} sites`;
          } else {
            scopeText = entry.locations[0] || '';
          }

          let detailText: string;
          if (entry.totalCount > 1) {
            detailText = `${entry.doneCount} of ${entry.totalCount} done`;
          } else if (entry.status === 'completed' && entry.completed_at) {
            detailText = `Done ${fmtTime(entry.completed_at)}`;
          } else if (entry.due_at) {
            detailText = `Due ${fmtTime(entry.due_at)}`;
          } else {
            detailText = '';
          }

          result.push({
            id: entry.ids[0],
            title: entry.title,
            status: entry.status,
            due_at: entry.due_at,
            completed_at: entry.completed_at,
            pillar: entry.pillar as TodayItem['pillar'],
            scope_text: scopeText,
            detail_text: detailText,
          });
        }

        // Sort: incomplete first, then by due_at ASC
        result.sort((a, b) => {
          const aComplete = a.status === 'completed' ? 1 : 0;
          const bComplete = b.status === 'completed' ? 1 : 0;
          if (aComplete !== bComplete) return aComplete - bComplete;
          if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
          if (a.due_at && !b.due_at) return -1;
          if (!a.due_at && b.due_at) return 1;
          return 0;
        });

        setItems(result.slice(0, 5));
        setTotalToday(total);
        setDoneToday(done);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, pillarFilter, userIdFilter]);

  return { items, totalToday, doneToday, loading, error };
}
