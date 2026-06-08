/**
 * useCountyReadiness — C13a
 *
 * Fetches county-level readiness from locations.jurisdiction_id → jurisdictions,
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
        // Fetch locations with their jurisdiction via FK
        const { data: jRows, error: jErr } = await supabase
          .from('locations')
          .select('id, name, organization_id, jurisdictions!inner(county, state, agency_name, fire_ahj_name, data_source_tier)')
          .eq('organization_id', orgId);

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

        // Group by county — produce food_safety + fire_safety rows per location
        const grouped = new Map<string, {
          county: string; state: string; agency_name: string;
          data_source_tier: number | null; jurisdiction_layer: string;
          locations: CountyLocation[];
        }>();

        for (const row of jRows) {
          const loc = row as any;
          const j = loc.jurisdictions as { county: string; state: string; agency_name: string; fire_ahj_name: string | null; data_source_tier: number | null };
          if (!j) continue;

          // Food safety row
          const foodKey = groupKey(j.county, j.state, 'food_safety');
          if (!grouped.has(foodKey)) {
            grouped.set(foodKey, {
              county: j.county, state: j.state, agency_name: j.agency_name,
              data_source_tier: j.data_source_tier, jurisdiction_layer: 'food_safety',
              locations: [],
            });
          }
          const foodG = grouped.get(foodKey)!;
          if (!foodG.locations.some(l => l.id === loc.id)) {
            foodG.locations.push({ id: loc.id, name: loc.name });
          }

          // Fire safety row
          const fireKey = groupKey(j.county, j.state, 'fire_safety');
          if (!grouped.has(fireKey)) {
            grouped.set(fireKey, {
              county: j.county, state: j.state, agency_name: j.fire_ahj_name || 'Pending AHJ verification',
              data_source_tier: j.data_source_tier, jurisdiction_layer: 'fire_safety',
              locations: [],
            });
          }
          const fireG = grouped.get(fireKey)!;
          if (!fireG.locations.some(l => l.id === loc.id)) {
            fireG.locations.push({ id: loc.id, name: loc.name });
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
