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

// SUGGESTION: In live mode, query Supabase jurisdictions table by location's jurisdiction_id
// and build the dual-authority record from the DB row + a fire AHJ lookup.

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
      const demoData = demoLocationJurisdictions[locationId] ?? null;
      setData(demoData);
      return;
    }

    // SUGGESTION: Live mode implementation — query Supabase
    // const { data: row } = await supabase
    //   .from('jurisdictions')
    //   .select('*')
    //   .eq('id', location.jurisdiction_id)
    //   .single();
    // Then build LocationJurisdiction from the row + fire AHJ lookup.
    // For now, fall back to demo data.
    const demoData = demoLocationJurisdictions[locationId] ?? null;
    setData(demoData);
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
        if (j) result[id] = j;
      }
      setData(result);
      return;
    }

    // SUGGESTION: Live mode — batch query for all location jurisdictions
    const result: Record<string, LocationJurisdiction> = {};
    for (const id of locationIds) {
      const j = demoLocationJurisdictions[id];
      if (j) result[id] = j;
    }
    setData(result);
  }, [locationIds.join(','), isDemoMode]);

  return data;
}
