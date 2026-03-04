// ═══════════════════════════════════════════════════════════
// src/hooks/useJurisdiction.ts
// Returns DUAL-AUTHORITY jurisdiction data for a single location.
// Each location has its OWN jurisdiction — no shared global jurisdiction.
// DEMO mode: reads from demoJurisdictions.ts
// LIVE mode: queries Supabase jurisdictions table
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { LocationJurisdiction } from '../types/jurisdiction';
import { demoLocationJurisdictions } from '../data/demoJurisdictions';
import { demoFireJurisdictionConfigs } from '../data/demoFireJurisdictionConfigs';

// SUGGESTION: In live mode, query Supabase jurisdictions table by location's jurisdiction_id
// and build the dual-authority record from the DB row + fire_jurisdiction_config column.

// Merge fire jurisdiction config into a LocationJurisdiction record
function withFireConfig(j: LocationJurisdiction): LocationJurisdiction {
  const fireConfig = demoFireJurisdictionConfigs[j.location_id];
  if (!fireConfig) return j;
  return {
    ...j,
    facilitySafety: {
      ...j.facilitySafety,
      fire_jurisdiction_config: fireConfig,
    },
  };
}

export function useJurisdiction(
  locationId: string | null,
  isDemoMode: boolean,
): LocationJurisdiction | null {
  const [data, setData] = useState<LocationJurisdiction | null>(null);

  useEffect(() => {
    if (!locationId) {
      setData(null);
      return;
    }

    if (isDemoMode) {
      const raw = demoLocationJurisdictions[locationId] ?? null;
      setData(raw ? withFireConfig(raw) : null);
      return;
    }

    // SUGGESTION: Live mode — query Supabase jurisdictions table including fire_jurisdiction_config column
    // const { data: row } = await supabase
    //   .from('jurisdictions')
    //   .select('*, fire_jurisdiction_config')
    //   .eq('id', location.jurisdiction_id)
    //   .single();
    // Then build LocationJurisdiction with fire_jurisdiction_config from the DB row.
    // For now, fall back to demo data.
    const raw = demoLocationJurisdictions[locationId] ?? null;
    setData(raw ? withFireConfig(raw) : null);
  }, [locationId, isDemoMode]);

  return data;
}

// Returns jurisdiction data for ALL demo locations at once
export function useAllLocationJurisdictions(
  locationIds: string[],
  isDemoMode: boolean,
): Record<string, LocationJurisdiction> {
  const [data, setData] = useState<Record<string, LocationJurisdiction>>({});

  useEffect(() => {
    if (isDemoMode) {
      const result: Record<string, LocationJurisdiction> = {};
      for (const id of locationIds) {
        const j = demoLocationJurisdictions[id];
        if (j) result[id] = withFireConfig(j);
      }
      setData(result);
      return;
    }

    // SUGGESTION: Live mode — batch query including fire_jurisdiction_config column
    const result: Record<string, LocationJurisdiction> = {};
    for (const id of locationIds) {
      const j = demoLocationJurisdictions[id];
      if (j) result[id] = withFireConfig(j);
    }
    setData(result);
  }, [locationIds.join(','), isDemoMode]);

  return data;
}
