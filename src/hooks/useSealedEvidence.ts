/**
 * useSealedEvidence — per-pillar counts of sealed incidents and corrective
 * actions for the viewer's organization.
 *
 * Live query only. Nothing is stored, cached or derived into a score: the panel
 * reports how many records carry a seal, and that is all it reports.
 *
 * Counts cover the last 12 months. The "most recent seal" line is deliberately
 * unbounded — an org whose last seal predates the window still has seals, and
 * saying otherwise would be wrong.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * incidents.category and corrective_actions.category carry identical CHECK
 * constraints over these three values, so one key reads both tables.
 */
export type EvidencePillar = 'fire_safety' | 'food_safety' | 'facility_services';

/** Mock order: Fire, Food, Facility. Always all three, zeros included. */
export const EVIDENCE_PILLARS: readonly { key: EvidencePillar; label: string }[] = [
  { key: 'fire_safety', label: 'Fire Safety' },
  { key: 'food_safety', label: 'Food Safety' },
  { key: 'facility_services', label: 'Facility Services' },
] as const;

export interface PillarTally {
  key: EvidencePillar;
  label: string;
  incidents: number;
  correctiveActions: number;
}

interface Result {
  rows: PillarTally[];
  /** Newest seal in either table, all time. Null when the org has none. */
  mostRecentSealAt: string | null;
  hasAnySeals: boolean;
  loading: boolean;
  error: string | null;
}

const emptyRows = (): PillarTally[] =>
  EVIDENCE_PILLARS.map(p => ({ key: p.key, label: p.label, incidents: 0, correctiveActions: 0 }));

export function useSealedEvidence(): Result {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [rows, setRows] = useState<PillarTally[]>(emptyRows());
  const [mostRecentSealAt, setMostRecentSealAt] = useState<string | null>(null);
  const [hasAnySeals, setHasAnySeals] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setRows(emptyRows());
      setMostRecentSealAt(null);
      setHasAnySeals(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      const sinceIso = since.toISOString();

      // The !inner embeds are safe here: incidents and corrective_actions carry
      // the same org-scoped SELECT policy as their seal tables, so the join
      // cannot drop a row the viewer is otherwise allowed to see.
      const [incRes, caRes, incNewest, caNewest] = await Promise.all([
        supabase
          .from('incident_seals')
          .select('sealed_at, incidents!inner(category)')
          .eq('organization_id', orgId)
          .gte('sealed_at', sinceIso),
        supabase
          .from('corrective_action_seals')
          .select('sealed_at, corrective_actions!inner(category)')
          .eq('organization_id', orgId)
          .gte('sealed_at', sinceIso),
        supabase
          .from('incident_seals')
          .select('sealed_at')
          .eq('organization_id', orgId)
          .order('sealed_at', { ascending: false })
          .limit(1),
        supabase
          .from('corrective_action_seals')
          .select('sealed_at')
          .eq('organization_id', orgId)
          .order('sealed_at', { ascending: false })
          .limit(1),
      ]);

      if (cancelled) return;

      const firstErr = incRes.error || caRes.error || incNewest.error || caNewest.error;
      if (firstErr) {
        console.error('[useSealedEvidence] query failed:', firstErr);
        setError(firstErr.message);
        setRows(emptyRows());
        setMostRecentSealAt(null);
        setHasAnySeals(false);
        setLoading(false);
        return;
      }

      const tally = new Map<EvidencePillar, PillarTally>(
        emptyRows().map(r => [r.key, r]),
      );

      for (const row of (incRes.data || []) as unknown as Array<{ incidents: { category: string } | null }>) {
        const key = row.incidents?.category as EvidencePillar | undefined;
        if (key && tally.has(key)) tally.get(key)!.incidents++;
      }
      for (const row of (caRes.data || []) as unknown as Array<{ corrective_actions: { category: string } | null }>) {
        const key = row.corrective_actions?.category as EvidencePillar | undefined;
        if (key && tally.has(key)) tally.get(key)!.correctiveActions++;
      }

      const newest = [
        incNewest.data?.[0]?.sealed_at as string | undefined,
        caNewest.data?.[0]?.sealed_at as string | undefined,
      ].filter(Boolean) as string[];
      newest.sort();

      setRows(EVIDENCE_PILLARS.map(p => tally.get(p.key)!));
      setMostRecentSealAt(newest.length ? newest[newest.length - 1] : null);
      setHasAnySeals(newest.length > 0);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orgId]);

  return { rows, mostRecentSealAt, hasAnySeals, loading, error };
}
