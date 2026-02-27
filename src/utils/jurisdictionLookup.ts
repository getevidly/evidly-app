// src/utils/jurisdictionLookup.ts
// Looks up jurisdiction(s) for a given California address
// Uses county from geocoded address to match jurisdiction records

import { supabase } from '../lib/supabase';

interface JurisdictionMatch {
  jurisdictionId: string;
  county: string;
  city: string | null;
  agencyName: string;
  scoringType: string;
  gradingType: string;
  gradingConfig: Record<string, any>;
  passThreshold: number | null;
  foodSafetyWeight: number | null;
  facilitySafetyWeight: number | null;
  opsWeight: number | null;
  docsWeight: number | null;
  fireAhjName: string;
  layer: string; // food_primary | fire_primary | federal_overlay
}

// Main lookup function — called when user adds/edits a location address
export async function lookupJurisdiction(
  address: string,
  city: string,
  county: string,
  state: string,
  zip: string,
): Promise<JurisdictionMatch[]> {
  const matches: JurisdictionMatch[] = [];

  if (state !== 'CA' && state !== 'California') {
    // Out of state — return empty. JIE currently covers CA only.
    // SUGGESTION: Add other states here as JIE expands
    return [];
  }

  // Normalize county name (remove " County" suffix if present)
  const normalizedCounty = county.replace(/\s*County$/i, '').trim();

  // Step 1: Check for independent city match first
  // Long Beach, Pasadena, Berkeley, Vernon have their own health departments
  const { data: cityMatch } = await supabase
    .from('jurisdictions')
    .select('*')
    .eq('county', normalizedCounty)
    .eq('city', city)
    .eq('jurisdiction_type', 'food_safety')
    .eq('is_active', true)
    .limit(1);

  if (cityMatch && cityMatch.length > 0) {
    matches.push(mapToMatch(cityMatch[0], 'food_primary'));
  } else {
    // Step 2: County-level food safety jurisdiction
    const { data: countyMatch } = await supabase
      .from('jurisdictions')
      .select('*')
      .eq('county', normalizedCounty)
      .is('city', null)
      .in('jurisdiction_type', ['food_safety', 'both'])
      .eq('is_active', true)
      .limit(1);

    if (countyMatch && countyMatch.length > 0) {
      matches.push(mapToMatch(countyMatch[0], 'food_primary'));
    }
  }

  // Step 3: Facility safety jurisdiction (may differ from food safety)
  const { data: fireMatch } = await supabase
    .from('jurisdictions')
    .select('*')
    .eq('county', normalizedCounty)
    .eq('jurisdiction_type', 'facility_safety')
    .eq('is_active', true)
    .limit(1);

  if (fireMatch && fireMatch.length > 0) {
    matches.push(mapToMatch(fireMatch[0], 'fire_primary'));
  }

  // Step 4: Check for federal overlay (Yosemite, military bases, etc.)
  const federalOverlay = checkFederalOverlay(address, city, county, zip);
  if (federalOverlay) {
    matches.push(federalOverlay);
  }

  return matches;
}

// Auto-link jurisdiction to location in the database
export async function linkJurisdictionToLocation(
  locationId: string,
  jurisdictionMatches: JurisdictionMatch[],
): Promise<void> {
  const records = jurisdictionMatches.map(match => ({
    location_id: locationId,
    jurisdiction_id: match.jurisdictionId,
    jurisdiction_layer: match.layer,
    is_most_restrictive: false, // Will be calculated
    auto_detected: true,
  }));

  // Determine most restrictive
  if (records.length > 0) {
    // For now, food_primary is most restrictive (health dept drives the grade)
    const foodPrimary = records.find(r => r.jurisdiction_layer === 'food_primary');
    if (foodPrimary) foodPrimary.is_most_restrictive = true;
  }

  // Upsert — don't duplicate if already linked
  for (const record of records) {
    await supabase
      .from('location_jurisdictions')
      .upsert(record, {
        onConflict: 'location_id,jurisdiction_id,jurisdiction_layer',
      });
  }
}

function mapToMatch(row: any, layer: string): JurisdictionMatch {
  return {
    jurisdictionId: row.id,
    county: row.county,
    city: row.city,
    agencyName: row.agency_name,
    scoringType: row.scoring_type,
    gradingType: row.grading_type,
    gradingConfig: row.grading_config,
    passThreshold: row.pass_threshold,
    foodSafetyWeight: row.food_safety_weight ?? null,
    facilitySafetyWeight: row.facility_safety_weight ?? null,
    opsWeight: row.ops_weight ?? null,
    docsWeight: row.docs_weight ?? null,
    fireAhjName: row.fire_ahj_name,
    layer,
  };
}

function checkFederalOverlay(
  address: string,
  city: string,
  county: string,
  zip: string,
): JurisdictionMatch | null {
  // Yosemite National Park zip codes
  const yosemiteZips = ['95389'];
  if (yosemiteZips.includes(zip) || county === 'Mariposa') {
    // Check if address suggests NPS facility
    const npsKeywords = ['yosemite', 'ahwahnee', 'curry village', 'wawona', 'tuolumne meadows', 'badger pass'];
    const lowerAddress = (address + ' ' + city).toLowerCase();
    if (npsKeywords.some(kw => lowerAddress.includes(kw))) {
      return {
        jurisdictionId: 'federal-nps-yosemite', // Will need real UUID from jurisdictions table
        county: 'Mariposa',
        city: null,
        agencyName: 'National Park Service - Yosemite',
        scoringType: 'major_minor_reinspect',
        gradingType: 'pass_reinspect',
        gradingConfig: {},
        passThreshold: null,
        foodSafetyWeight: null,
        facilitySafetyWeight: null,
        opsWeight: null,
        docsWeight: null,
        fireAhjName: 'NPS Fire (Yosemite)',
        layer: 'federal_overlay',
      };
    }
  }

  // SUGGESTION: Add more federal facilities (military bases, national forests)
  return null;
}
