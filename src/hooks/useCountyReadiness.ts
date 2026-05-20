/**
 * useCountyReadiness — C13a
 *
 * Fetches county-level readiness from location_jurisdictions + jurisdictions,
 * computes gap counts from drift_catches, owner_decisions, and expiring documents.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CountyLocation {
  id: string;
  name: string;
}

export interface CountyReadiness {
  county: string;
  state: string;
  agency_name: string;
  data_source_tier: number | null;
  jurisdiction_layer: string;
  locations: CountyLocation[];
  location_count: number;
  open_gap_count: number;
  open_drift_count: number;
  open_decision_count: number;
  expiring_docs_count: number;
  status: 'ready' | 'watch' | 'alarm';
  gap_summary: string | null;
  last_inspection_result_display: 'TBD';
}

interface UseCountyReadinessResult {
  counties: CountyReadiness[];
  totalLocations: number;
  totalCounties: number;
  loading: boolean;
  error: Error | null;
}

type GapCounts = Map<string, number>;

function groupKey(county: string, state: string, layer: string): string {
  return `${county}|${state}|${layer}`;
}

export function useCountyReadiness(): UseCountyReadinessResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [counties, setCounties] = useState<CountyReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        // Fetch jurisdiction → location mapping
        const { data: jRows, error: jErr } = await supabase
          .from('location_jurisdictions')
          .select('location_id, jurisdiction_layer, is_most_restrictive, jurisdictions!inner(county, state, agency_name, data_source_tier), locations!inner(id, name, organization_id)')
          .eq('locations.organization_id', orgId)
          .eq('is_most_restrictive', true);

        if (cancelled) return;
        if (jErr) throw new Error(jErr.message);

        if (!jRows || jRows.length === 0) {
          setCounties([]);
          return;
        }

        // Parallel gap count queries
        const [driftRes, decisionRes, docsRes] = await Promise.all([
          supabase
            .from('drift_catches')
            .select('location_id')
            .eq('org_id', orgId)
            .eq('status', 'open'),
          supabase
            .from('owner_decisions')
            .select('location_id, priority')
            .eq('org_id', orgId)
            .eq('status', 'open'),
          supabase
            .from('documents')
            .select('location_id')
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .gte('expiration_date', new Date().toISOString().split('T')[0])
            .lte('expiration_date', new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]),
        ]);

        if (cancelled) return;

        // Build location-level gap counts
        const driftByLoc: GapCounts = new Map();
        for (const r of driftRes.data || []) {
          const lid = (r as { location_id: string }).location_id;
          driftByLoc.set(lid, (driftByLoc.get(lid) || 0) + 1);
        }

        const decisionByLoc: GapCounts = new Map();
        const urgentLocs = new Set<string>();
        for (const r of decisionRes.data || []) {
          const d = r as { location_id: string | null; priority: string };
          const lid = d.location_id || '__org__';
          decisionByLoc.set(lid, (decisionByLoc.get(lid) || 0) + 1);
          if (d.priority === 'urgent') urgentLocs.add(lid);
        }

        const docsByLoc: GapCounts = new Map();
        for (const r of docsRes.data || []) {
          const lid = (r as { location_id: string | null }).location_id || '__org__';
          docsByLoc.set(lid, (docsByLoc.get(lid) || 0) + 1);
        }

        // Group by county
        const grouped = new Map<string, {
          county: string; state: string; agency_name: string;
          data_source_tier: number | null; jurisdiction_layer: string;
          locations: CountyLocation[];
        }>();

        for (const row of jRows) {
          const r = row as Record<string, unknown>;
          const j = r.jurisdictions as { county: string; state: string; agency_name: string; data_source_tier: number | null };
          const loc = r.locations as { id: string; name: string };
          const layer = r.jurisdiction_layer as string;
          const key = groupKey(j.county, j.state, layer);

          if (!grouped.has(key)) {
            grouped.set(key, {
              county: j.county, state: j.state, agency_name: j.agency_name,
              data_source_tier: j.data_source_tier, jurisdiction_layer: layer,
              locations: [],
            });
          }
          const g = grouped.get(key)!;
          if (!g.locations.some(l => l.id === loc.id)) {
            g.locations.push({ id: loc.id, name: loc.name });
          }
        }

        // Compute county-level readiness
        const result: CountyReadiness[] = [];
        for (const g of grouped.values()) {
          const countyLocIds = g.locations.map(l => l.id);
          let driftCount = 0;
          let decisionCount = 0;
          let docsCount = 0;
          let hasUrgent = false;

          for (const lid of countyLocIds) {
            driftCount += driftByLoc.get(lid) || 0;
            decisionCount += decisionByLoc.get(lid) || 0;
            docsCount += docsByLoc.get(lid) || 0;
            if (urgentLocs.has(lid)) hasUrgent = true;
          }
          // Org-wide decisions/docs count toward all counties
          decisionCount += decisionByLoc.get('__org__') || 0;
          docsCount += docsByLoc.get('__org__') || 0;
          if (urgentLocs.has('__org__')) hasUrgent = true;

          const totalGaps = driftCount + decisionCount + docsCount;
          let status: 'ready' | 'watch' | 'alarm' = 'ready';
          if (totalGaps >= 3 || hasUrgent) status = 'alarm';
          else if (totalGaps >= 1) status = 'watch';

          let gapSummary: string | null = null;
          if (driftCount > 0) {
            const locName = g.locations[0]?.name || '';
            gapSummary = `${driftCount} drift catch${driftCount === 1 ? '' : 'es'} open (${locName})`;
          } else if (docsCount > 0) {
            gapSummary = `${docsCount} document${docsCount === 1 ? '' : 's'} expiring within 30 days`;
          } else if (decisionCount > 0) {
            gapSummary = `${decisionCount} decision${decisionCount === 1 ? '' : 's'} awaiting action`;
          }

          result.push({
            ...g,
            location_count: g.locations.length,
            open_gap_count: totalGaps,
            open_drift_count: driftCount,
            open_decision_count: decisionCount,
            expiring_docs_count: docsCount,
            status,
            gap_summary: gapSummary,
            last_inspection_result_display: 'TBD',
          });
        }

        result.sort((a, b) => {
          const rank = { alarm: 0, watch: 1, ready: 2 };
          return rank[a.status] - rank[b.status] || a.county.localeCompare(b.county);
        });

        setCounties(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId]);

  const totalLocations = new Set(counties.flatMap(c => c.locations.map(l => l.id))).size;
  const totalCounties = counties.length;

  return { counties, totalLocations, totalCounties, loading, error };
}
