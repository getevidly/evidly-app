// ═══════════════════════════════════════════════════════════
// src/hooks/useJurisdiction.ts
// Returns DUAL-AUTHORITY jurisdiction data for a single location.
// Each location has its OWN jurisdiction — no shared global jurisdiction.
// DEMO mode: reads from demoJurisdictions.ts
// LIVE mode: queries Supabase jurisdictions table
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import type { LocationJurisdiction } from '../types/jurisdiction';
import { demoLocationJurisdictions, DEMO_JURISDICTIONS, ALL_CA_JURISDICTIONS, type DemoJurisdiction } from '../data/demoJurisdictions';
import { demoFireJurisdictionConfigs } from '../data/demoFireJurisdictionConfigs';
import { supabase } from '../lib/supabase';

// ── Demo-only helper ─────────────────────────────────────────────────────────
// Only called when isDemoMode === true

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

// ── Live mode: query Supabase jurisdiction_configs ───────────────────────────
async function fetchLiveJurisdiction(locationId: string): Promise<LocationJurisdiction | null> {
  // First get the location's jurisdiction_id
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('jurisdiction_id, name')
    .eq('id', locationId)
    .maybeSingle();

  if (locError || !location?.jurisdiction_id) {
    console.error('[useJurisdiction] Could not find location or jurisdiction_id:', locError);
    return null;
  }

  // Then get the jurisdiction config
  const { data: config, error: configError } = await supabase
    .from('jurisdictions')
    .select('*')
    .eq('id', location.jurisdiction_id)
    .maybeSingle();

  if (configError || !config) {
    console.error('[useJurisdiction] Could not find jurisdiction config:', configError);
    return null;
  }

  // Build the dual-authority LocationJurisdiction from DB row
  return {
    location_id: locationId,
    county: config.county,
    state: config.state || 'CA',
    foodSafety: {
      pillar: 'food_safety',
      agency_id: config.food_agency_id || config.id,
      agency_name: config.food_agency_name || config.agency_name,
      authority_type: config.food_authority_type || 'county_health',
      scoring_type: config.food_scoring_type || config.scoring_type,
      grading_type: config.food_grading_type || config.grading_type,
      grading_config: config.food_grading_config || config.grading_config || {},
      pass_threshold: config.food_pass_threshold ?? config.pass_threshold ?? null,
      warning_threshold: config.food_warning_threshold ?? config.warning_threshold ?? null,
      grade_label: config.food_grade_label || null,
      grade_explanation: config.food_grade_explanation || null,
      inspection_frequency: config.food_inspection_frequency || null,
    },
    facilitySafety: {
      pillar: 'facility_safety',
      agency_id: config.fire_agency_id || config.id,
      agency_name: config.fire_agency_name || config.agency_name,
      authority_type: config.fire_authority_type || 'fire_marshal',
      scoring_type: 'pass_fail',
      grading_type: 'pass_fail',
      grading_config: {},
      pass_threshold: null,
      warning_threshold: null,
      grade_label: null,
      grade_explanation: null,
      inspection_frequency: config.fire_inspection_frequency || null,
      fire_jurisdiction_config: config.fire_jurisdiction_config || null,
    },
  };
}

// ── useJurisdiction ──────────────────────────────────────────────────────────
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

    // DEMO MODE: read from local demo data, no DB calls
    if (isDemoMode) {
      const raw = demoLocationJurisdictions[locationId] ?? null;
      setData(raw ? withFireConfig(raw) : null);
      return;
    }

    // LIVE MODE: query Supabase
    // Never use demo data for authenticated production users
    let cancelled = false;
    fetchLiveJurisdiction(locationId).then(result => {
      if (!cancelled) setData(result);
    });

    return () => { cancelled = true; };
  }, [locationId, isDemoMode]);

  return data;
}

// ── useAllLocationJurisdictions ──────────────────────────────────────────────
export function useAllLocationJurisdictions(
  locationIds: string[],
  isDemoMode: boolean,
): Record<string, LocationJurisdiction> {
  const [data, setData] = useState<Record<string, LocationJurisdiction>>({});

  useEffect(() => {
    if (locationIds.length === 0) {
      setData({});
      return;
    }

    // DEMO MODE: build from local demo data
    if (isDemoMode) {
      const result: Record<string, LocationJurisdiction> = {};
      for (const id of locationIds) {
        const j = demoLocationJurisdictions[id];
        if (j) result[id] = withFireConfig(j);
      }
      setData(result);
      return;
    }

    // LIVE MODE: batch fetch all locations from Supabase
    // Never use demo data for authenticated production users
    let cancelled = false;

    Promise.all(locationIds.map(id => fetchLiveJurisdiction(id).then(j => ({ id, j }))))
      .then(results => {
        if (cancelled) return;
        const result: Record<string, LocationJurisdiction> = {};
        for (const { id, j } of results) {
          if (j) result[id] = j;
        }
        setData(result);
      });

    return () => { cancelled = true; };
  }, [locationIds.join(','), isDemoMode]);

  return data;
}

// ── useJurisdictionByCountyCity ──────────────────────────────────────────────
// Read-only helper — resolves a DemoJurisdiction by county + optional city.
// Used for public-facing pages (ScoreTable, CountyCompliance) — always reads
// from static configs, never from user data.
export function useJurisdictionByCountyCity(
  county: string,
  city?: string,
): DemoJurisdiction | null {
  return useMemo(() => {
    if (city) {
      const cityMatch = DEMO_JURISDICTIONS.find(
        (j) => j.county === county && j.city === city,
      );
      if (cityMatch) return cityMatch;
    }

    const countyMatch = DEMO_JURISDICTIONS.find(
      (j) => j.county === county && !j.city,
    );
    if (countyMatch) return countyMatch;

    const allMatch = ALL_CA_JURISDICTIONS.find((j) =>
      city
        ? j.county === county && j.city === city
        : j.county === county && !j.city,
    );
    if (!allMatch) return null;

    return {
      id: `all-ca-${allMatch.county.toLowerCase().replace(/\s/g, '-')}${allMatch.city ? `-${allMatch.city.toLowerCase().replace(/\s/g, '-')}` : ''}`,
      county: allMatch.county,
      city: allMatch.city,
      agencyName: allMatch.agencyName,
      scoringType: allMatch.scoringType,
      gradingType: allMatch.gradingType,
      gradingConfig: {},
      passThreshold: null,
      warningThreshold: null,
      criticalThreshold: null,
      fireAhjName: '',
      hoodCleaningDefault: 'Semi-annual',
      facilityCount: allMatch.facilityCount ?? 0,
      dataSourceTier: allMatch.tier,
      gradeLabel: 'N/A',
      gradeExplanation: 'Not configured',
      passFailLabel: 'No Grade',
      demoScore: 0,
      demoGrade: 'N/A',
      demoPassFail: 'no_grade',
    } satisfies DemoJurisdiction;
  }, [county, city]);
}
