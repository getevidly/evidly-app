import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Records-on-file counts for the dashboard "Records on file" block.
 *
 * Replaces the per-requirement N+1 in useProofStats with three queries, and
 * covers every pillar in pillar_requirements rather than just fire + food.
 *
 * Evidence join: compliance_documents.TYPE carries the requirement_code.
 * (compliance_documents.category carries the document-tab category —
 * kitchen / service / business — which is a different vocabulary.)
 */

export type RecordPillar = 'fire_safety' | 'food_safety' | 'business_records' | 'vendor_business';

/** Display order + labels. Also the priority order for "what's in motion". */
export const PILLAR_ORDER: { pillar: RecordPillar; label: string }[] = [
  { pillar: 'fire_safety', label: 'Fire safety' },
  { pillar: 'food_safety', label: 'Food safety' },
  { pillar: 'business_records', label: 'Business records' },
  { pillar: 'vendor_business', label: 'Vendor records' },
];

export interface PillarCount {
  pillar: RecordPillar;
  label: string;
  onFile: number;
  required: number;
}

export interface MissingRecord {
  code: string;
  label: string;
  pillar: RecordPillar;
  actionType: string;
}

export interface RecordsOnFile {
  onFile: number;
  required: number;
  gap: number;
  pillars: PillarCount[];
  /** Ranked by pillar priority, then sort_order. First entry is what's in motion. */
  missing: MissingRecord[];
  loading: boolean;
}

const EMPTY: RecordsOnFile = {
  onFile: 0, required: 0, gap: 0, pillars: [], missing: [], loading: true,
};

export function useRecordsOnFile(locationId?: string | null): RecordsOnFile {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<RecordsOnFile>(EMPTY);

  useEffect(() => {
    if (!orgId) { setState({ ...EMPTY, loading: false }); return; }
    let cancelled = false;

    (async () => {
      // 1. Resolve the jurisdiction the catalog is keyed on.
      let locQuery = supabase
        .from('locations')
        .select('id, state')
        .eq('organization_id', orgId)
        .limit(1);
      if (locationId) locQuery = locQuery.eq('id', locationId);
      const { data: locData } = await locQuery.maybeSingle();
      if (cancelled) return;

      const stateCode = locData?.state;
      if (!stateCode) { setState({ ...EMPTY, loading: false }); return; }

      // 2. Catalog + evidence, in parallel.
      const [reqRes, docRes, schedRes] = await Promise.all([
        supabase
          .from('pillar_requirements')
          .select('requirement_code, label, pillar, action_type, sort_order')
          .eq('state_code', stateCode)
          .eq('counts_toward_total', true),
        supabase
          .from('compliance_documents')
          .select('type')
          .eq('organization_id', orgId),
        supabase
          .from('location_service_schedules')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .not('vendor_id', 'is', null),
      ]);
      if (cancelled) return;

      const reqs = reqRes.data || [];
      if (reqs.length === 0) { setState({ ...EMPTY, loading: false }); return; }

      const filedTypes = new Set((docRes.data || []).map(d => d.type).filter(Boolean));
      const hasVendorSchedule = (schedRes.count ?? 0) > 0;

      const pillarIndex = new Map(PILLAR_ORDER.map((p, i) => [p.pillar, i]));
      const ranked = [...reqs].sort((a, b) => {
        const pa = pillarIndex.get(a.pillar as RecordPillar) ?? 99;
        const pb = pillarIndex.get(b.pillar as RecordPillar) ?? 99;
        if (pa !== pb) return pa - pb;
        return (a.sort_order ?? 99) - (b.sort_order ?? 99);
      });

      const isOnFile = (r: { requirement_code: string; action_type: string }) =>
        r.action_type === 'identify_vendor' ? hasVendorSchedule : filedTypes.has(r.requirement_code);

      const missing: MissingRecord[] = ranked
        .filter(r => !isOnFile(r))
        .map(r => ({
          code: r.requirement_code,
          label: r.label || r.requirement_code,
          pillar: r.pillar as RecordPillar,
          actionType: r.action_type,
        }));

      const pillars: PillarCount[] = PILLAR_ORDER
        .map(({ pillar, label }) => {
          const rows = ranked.filter(r => r.pillar === pillar);
          return { pillar, label, onFile: rows.filter(isOnFile).length, required: rows.length };
        })
        .filter(p => p.required > 0);

      const required = ranked.length;
      const onFile = ranked.filter(isOnFile).length;

      if (!cancelled) {
        setState({ onFile, required, gap: required - onFile, pillars, missing, loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [orgId, locationId]);

  return state;
}
