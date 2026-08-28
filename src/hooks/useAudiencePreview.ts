/**
 * useAudiencePreview — who would receive a signal, from the live correlator.
 *
 * Calls correlate-signal in preview mode, which runs the identical gates the
 * real correlation run uses (national whitelist, county gate, requirement
 * match, not-applicable title belt) and the digest's own paying/trial gate.
 * Preview writes nothing.
 *
 * One batched call per visible page of the queue — never one call per row, and
 * never the whole pool at once. The function caps a request at 100 signals.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type MatchType = 'national' | 'county' | 'requirement';
export type AudienceMode = 'full' | 'teaser' | 'skip';

export interface AudienceMatch {
  type: MatchType;
  reason: string;
  relevance: number;
  county?: string;
  requirement_code?: string;
}

export interface AudienceOrg {
  org_id: string;
  org_name: string;
  mode: AudienceMode;
  matches: AudienceMatch[];
}

export interface SignalAudience {
  signal_id: string;
  title: string;
  category: string;
  /** Non-null when the title belt skipped it, e.g. 'not_applicable_title'. */
  skipped_reason: string | null;
  audience: AudienceOrg[];
  totals: {
    orgs: number;
    full: number;
    teaser: number;
    skip: number;
    by_match_type: { national: number; county: number; requirement: number };
  };
}

/** Batch cap the edge function enforces. */
export const PREVIEW_BATCH_CAP = 100;

export function useAudiencePreview(signalIds: string[]) {
  const [byId, setById] = useState<Record<string, SignalAudience>>({});
  const [orgsConsidered, setOrgsConsidered] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Identity-stable key: the caller rebuilds the id array every render.
  const key = signalIds.join(',');
  const idsRef = useRef(signalIds);
  idsRef.current = signalIds;

  const run = useCallback(async () => {
    const ids = idsRef.current.slice(0, PREVIEW_BATCH_CAP);
    if (ids.length === 0) {
      setById({});
      setOrgsConsidered(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('correlate-signal', {
        body: { preview: true, signal_ids: ids },
      });
      if (fnErr) throw new Error(fnErr.message);
      const next: Record<string, SignalAudience> = {};
      for (const s of (data?.signals || []) as SignalAudience[]) next[s.signal_id] = s;
      setById(next);
      setOrgsConsidered(typeof data?.orgs_considered === 'number' ? data.orgs_considered : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useAudiencePreview] preview failed:', msg);
      setError(msg);
      setById({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
    // key, not the array — the caller's array identity churns every render.
  }, [key, run]);

  return { byId, orgsConsidered, loading, error, refresh: run };
}

/** "Reaches 3 organizations · 2 National, 1 Fresno County" — the queue line. */
export function reachSummary(a: SignalAudience | undefined): string {
  if (!a) return 'Reach not loaded';
  if (a.skipped_reason) return 'Reaches no organizations — marked not applicable';
  if (a.totals.orgs === 0) return 'Reaches no organizations — publishing would deliver nothing';
  const t = a.totals.by_match_type;
  const parts: string[] = [];
  if (t.national) parts.push(`${t.national} National`);
  if (t.county) parts.push(`${t.county} County`);
  if (t.requirement) parts.push(`${t.requirement} Requirement`);
  const noun = a.totals.orgs === 1 ? 'organization' : 'organizations';
  return `Reaches ${a.totals.orgs} ${noun} · ${parts.join(', ')}`;
}

/** The chip label for one match — "National", "Fresno County", "KEC". */
export function matchChipLabel(m: AudienceMatch): string {
  if (m.type === 'county') return m.county ? `${m.county} County` : 'County';
  if (m.type === 'requirement') return m.requirement_code || 'Requirement';
  return 'National';
}
