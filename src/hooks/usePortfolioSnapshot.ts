/**
 * usePortfolioSnapshot — C14
 *
 * Per-location rollup: logs done today, open actions, doc-current ratio, status.
 * Executive role only.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface PortfolioRow {
  location_id: string;
  location_name: string;
  logs_done: number;
  logs_total: number;
  open_actions: number;
  docs_current: number;
  docs_total: number;
  status: 'ready' | 'watch' | 'alarm';
}

interface UsePortfolioSnapshotResult {
  rows: PortfolioRow[];
  loading: boolean;
  error: Error | null;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function usePortfolioSnapshot(): UsePortfolioSnapshotResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;

  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isExec = userRole === 'executive' || userRole === 'platform_admin';

  useEffect(() => {
    if (!orgId || !isExec) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const today = todayDate();
        const thirtyDaysOut = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];

        const [locsRes, tasksRes, decisionsRes, docsRes] = await Promise.all([
          supabase
            .from('locations')
            .select('id, name')
            .eq('organization_id', orgId!)
            .order('name'),
          supabase
            .from('task_instances')
            .select('location_id, status')
            .eq('organization_id', orgId!)
            .eq('date', today),
          supabase
            .from('owner_decisions')
            .select('location_id')
            .eq('org_id', orgId!)
            .eq('status', 'open'),
          supabase
            .from('documents')
            .select('location_id, expiration_date')
            .eq('organization_id', orgId!)
            .eq('status', 'active'),
        ]);

        if (cancelled) return;

        const locs = locsRes.data || [];
        const tasks = tasksRes.data || [];
        const decisions = decisionsRes.data || [];
        const docs = docsRes.data || [];

        // Per-location task stats
        const tasksByLoc = new Map<string, { done: number; total: number }>();
        for (const t of tasks) {
          const r = t as Record<string, unknown>;
          const lid = r.location_id as string;
          if (!lid) continue;
          if (!tasksByLoc.has(lid)) tasksByLoc.set(lid, { done: 0, total: 0 });
          const s = tasksByLoc.get(lid)!;
          s.total++;
          if (r.status === 'completed') s.done++;
        }

        // Per-location open actions
        const actionsByLoc = new Map<string, number>();
        for (const d of decisions) {
          const lid = (d as Record<string, unknown>).location_id as string | null;
          if (!lid) continue;
          actionsByLoc.set(lid, (actionsByLoc.get(lid) || 0) + 1);
        }

        // Per-location doc stats
        const docsByLoc = new Map<string, { current: number; total: number }>();
        for (const d of docs) {
          const r = d as Record<string, unknown>;
          const lid = (r.location_id as string) || '__org__';
          if (!docsByLoc.has(lid)) docsByLoc.set(lid, { current: 0, total: 0 });
          const s = docsByLoc.get(lid)!;
          s.total++;
          const expDate = r.expiration_date as string | null;
          if (!expDate || expDate > today) {
            s.current++;
          }
        }

        const result: PortfolioRow[] = locs.map(loc => {
          const l = loc as { id: string; name: string };
          const ts = tasksByLoc.get(l.id) || { done: 0, total: 0 };
          const openActions = actionsByLoc.get(l.id) || 0;
          const ds = docsByLoc.get(l.id) || { current: 0, total: 0 };
          // Add org-wide docs to each location
          const orgDocs = docsByLoc.get('__org__') || { current: 0, total: 0 };

          const docsCurrent = ds.current + orgDocs.current;
          const docsTotal = ds.total + orgDocs.total;

          let status: 'ready' | 'watch' | 'alarm' = 'ready';
          if (docsTotal > 0 && docsCurrent === 0) {
            status = 'alarm';
          } else if (openActions > 0 || ts.done < ts.total) {
            status = 'watch';
          }

          // Check for expiring docs (within 30 days)
          if (status === 'ready') {
            for (const dd of docs) {
              const dr = dd as Record<string, unknown>;
              const dLid = (dr.location_id as string) || '__org__';
              if (dLid !== l.id && dLid !== '__org__') continue;
              const exp = dr.expiration_date as string | null;
              if (exp && exp >= today && exp <= thirtyDaysOut) {
                status = 'watch';
                break;
              }
            }
          }

          return {
            location_id: l.id,
            location_name: l.name,
            logs_done: ts.done,
            logs_total: ts.total,
            open_actions: openActions,
            docs_current: docsCurrent,
            docs_total: docsTotal,
            status,
          };
        });

        setRows(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, isExec]);

  return { rows, loading, error };
}
