/**
 * useDriftCatches — C12
 *
 * Fetches drift_catches (last 90 days) with acknowledgments,
 * grouped client-side. Provides acknowledge() for per-role ack.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';

export interface DriftAck {
  user_id: string;
  role: string;
  user_full_name: string;
  acknowledged_at: string;
}

export interface DriftCatchRow {
  id: string;
  org_id: string;
  location_id: string;
  location_name: string;
  drift_type: string;
  pillar: 'food_safety' | 'fire_safety';
  status: string;
  severity: string;
  detected_at: string;
  resolved_at: string | null;
  source_table: string;
  source_record_id: string | null;
  expected_value: string | null;
  actual_value: string | null;
  estimated_savings_cents: number;
}

export interface DriftCatchWithAcks extends DriftCatchRow {
  acknowledgments: DriftAck[];
  userHasAcked: boolean;
}

interface UseDriftCatchesOptions {
  pillarFilter?: 'food_safety' | 'fire_safety';
  locationIdFilter?: string;
}

interface UseDriftCatchesResult {
  catches: DriftCatchWithAcks[];
  totalSaved: number;
  loading: boolean;
  error: Error | null;
  acknowledge: (driftCatchId: string) => void;
}

export function useDriftCatches(options?: UseDriftCatchesOptions): UseDriftCatchesResult {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;
  const userId = profile?.id;

  const [catches, setCatches] = useState<DriftCatchWithAcks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId || !userId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Fetch catches
        let catchQ = supabase
          .from('drift_catches')
          .select('*, locations!inner(name)')
          .eq('org_id', orgId)
          .gte('detected_at', ninetyDaysAgo.toISOString())
          .order('detected_at', { ascending: false })
          .limit(10);

        if (options?.pillarFilter) {
          catchQ = catchQ.eq('pillar', options.pillarFilter);
        }
        if (options?.locationIdFilter) {
          catchQ = catchQ.eq('location_id', options.locationIdFilter);
        }

        const { data: catchRows, error: catchErr } = await catchQ;
        if (cancelled) return;
        if (catchErr) throw new Error(catchErr.message);
        if (!catchRows || catchRows.length === 0) {
          setCatches([]);
          return;
        }

        // Fetch acks for these catches
        const catchIds = catchRows.map((r: Record<string, unknown>) => (r as { id: string }).id);
        const { data: ackRows, error: ackErr } = await supabase
          .from('drift_acknowledgments')
          .select('drift_catch_id, user_id, role, acknowledged_at, user_profiles!inner(full_name)')
          .in('drift_catch_id', catchIds);

        if (cancelled) return;
        if (ackErr) throw new Error(ackErr.message);

        // Group acks by drift_catch_id
        const ackMap = new Map<string, DriftAck[]>();
        for (const ack of ackRows || []) {
          const a = ack as Record<string, unknown>;
          const dcId = a.drift_catch_id as string;
          if (!ackMap.has(dcId)) ackMap.set(dcId, []);
          const profiles = a.user_profiles as { full_name: string } | null;
          ackMap.get(dcId)!.push({
            user_id: a.user_id as string,
            role: a.role as string,
            user_full_name: profiles?.full_name || 'Unknown',
            acknowledged_at: a.acknowledged_at as string,
          });
        }

        // Build result
        const result: DriftCatchWithAcks[] = catchRows.map((row: Record<string, unknown>) => {
          const r = row as Record<string, unknown>;
          const loc = r.locations as { name: string } | null;
          const id = r.id as string;
          const acks = ackMap.get(id) || [];
          return {
            id,
            org_id: r.org_id as string,
            location_id: r.location_id as string,
            location_name: loc?.name || '',
            drift_type: r.drift_type as string,
            pillar: r.pillar as 'food_safety' | 'fire_safety',
            status: r.status as string,
            severity: r.severity as string,
            detected_at: r.detected_at as string,
            resolved_at: (r.resolved_at as string) || null,
            source_table: r.source_table as string,
            source_record_id: (r.source_record_id as string) || null,
            expected_value: (r.expected_value as string) || null,
            actual_value: (r.actual_value as string) || null,
            estimated_savings_cents: (r.estimated_savings_cents as number) || 0,
            acknowledgments: acks,
            userHasAcked: acks.some(a => a.user_id === userId && a.role === userRole),
          };
        });

        setCatches(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, userId, userRole, options?.pillarFilter, options?.locationIdFilter]);

  const totalSaved = catches.reduce((sum, c) => sum + c.estimated_savings_cents, 0) / 100;

  const acknowledge = useCallback((driftCatchId: string) => {
    if (!orgId || !userId || !userRole) return;

    // Optimistic update
    setCatches(prev => prev.map(c => {
      if (c.id !== driftCatchId) return c;
      return {
        ...c,
        userHasAcked: true,
        acknowledgments: [
          ...c.acknowledgments,
          { user_id: userId, role: userRole, user_full_name: profile?.full_name || '', acknowledged_at: new Date().toISOString() },
        ],
      };
    }));

    supabase
      .from('drift_acknowledgments')
      .insert({ org_id: orgId, drift_catch_id: driftCatchId, user_id: userId, role: userRole })
      .then(({ error: insertErr }) => {
        if (insertErr && !insertErr.message.includes('duplicate')) {
          // Rollback
          setCatches(prev => prev.map(c => {
            if (c.id !== driftCatchId) return c;
            return {
              ...c,
              userHasAcked: false,
              acknowledgments: c.acknowledgments.filter(a => !(a.user_id === userId && a.role === userRole)),
            };
          }));
        }
      });
  }, [orgId, userId, userRole, profile?.full_name]);

  return { catches, totalSaved, loading, error, acknowledge };
}
