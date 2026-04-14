/**
 * 5-State County Data — CA, OR, WA, NV, AZ
 *
 * Single source of truth for county lists across all signup,
 * admin, and demo flows. Replaces 3 duplicated CA_COUNTIES arrays.
 */

export type StateAbbrev = 'CA' | 'OR' | 'WA' | 'NV' | 'AZ';

export const SUPPORTED_STATES: { abbrev: StateAbbrev; name: string }[] = [
  { abbrev: 'CA', name: 'California' },
  { abbrev: 'OR', name: 'Oregon' },
  { abbrev: 'WA', name: 'Washington' },
  { abbrev: 'NV', name: 'Nevada' },
  { abbrev: 'AZ', name: 'Arizona' },
];

export const STATE_COUNTIES: Record<StateAbbrev, string[]> = {
  // ── California (58 counties) ──────────────────────────────
  CA: [
    'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa',
    'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn',
    'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen',
    'Los Angeles', 'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced',
    'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange', 'Placer',
    'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino',
    'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo',
    'San Mateo', 'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta',
    'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter',
    'Tehama', 'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba',
  ],

  // ── Oregon (36 counties) ──────────────────────────────────
  OR: [
    'Baker', 'Benton', 'Clackamas', 'Clatsop', 'Columbia', 'Coos',
    'Crook', 'Curry', 'Deschutes', 'Douglas', 'Gilliam', 'Grant',
    'Harney', 'Hood River', 'Jackson', 'Jefferson', 'Josephine',
    'Klamath', 'Lake', 'Lane', 'Lincoln', 'Linn', 'Malheur', 'Marion',
    'Morrow', 'Multnomah', 'Polk', 'Sherman', 'Tillamook', 'Umatilla',
    'Union', 'Wallowa', 'Wasco', 'Washington', 'Wheeler', 'Yamhill',
  ],

  // ── Washington (39 counties) ──────────────────────────────
  WA: [
    'Adams', 'Asotin', 'Benton', 'Chelan', 'Clallam', 'Clark',
    'Columbia', 'Cowlitz', 'Douglas', 'Ferry', 'Franklin', 'Garfield',
    'Grant', 'Grays Harbor', 'Island', 'Jefferson', 'King', 'Kitsap',
    'Kittitas', 'Klickitat', 'Lewis', 'Lincoln', 'Mason', 'Okanogan',
    'Pacific', 'Pend Oreille', 'Pierce', 'San Juan', 'Skagit',
    'Skamania', 'Snohomish', 'Spokane', 'Stevens', 'Thurston',
    'Wahkiakum', 'Walla Walla', 'Whatcom', 'Whitman', 'Yakima',
  ],

  // ── Nevada (17 counties including Carson City) ────────────
  NV: [
    'Carson City', 'Churchill', 'Clark', 'Douglas', 'Elko', 'Esmeralda',
    'Eureka', 'Humboldt', 'Lander', 'Lincoln', 'Lyon', 'Mineral',
    'Nye', 'Pershing', 'Storey', 'Washoe', 'White Pine',
  ],

  // ── Arizona (15 counties) ─────────────────────────────────
  AZ: [
    'Apache', 'Cochise', 'Coconino', 'Gila', 'Graham', 'Greenlee',
    'La Paz', 'Maricopa', 'Mohave', 'Navajo', 'Pima', 'Pinal',
    'Santa Cruz', 'Yavapai', 'Yuma',
  ],
};

export interface IndependentJurisdiction {
  value: string;
  label: string;
  county: string;
  state: StateAbbrev;
}

export const INDEPENDENT_JURISDICTIONS: IndependentJurisdiction[] = [
  // California — cities with independent health departments
  { value: 'city:ca:berkeley', label: 'City of Berkeley', county: 'Alameda', state: 'CA' },
  { value: 'city:ca:long_beach', label: 'City of Long Beach', county: 'Los Angeles', state: 'CA' },
  { value: 'city:ca:pasadena', label: 'City of Pasadena', county: 'Los Angeles', state: 'CA' },
  { value: 'city:ca:vernon', label: 'City of Vernon', county: 'Los Angeles', state: 'CA' },
  // Nevada — Carson City is a consolidated city-county (independent)
  { value: 'city:nv:carson_city', label: 'Carson City', county: 'Carson City', state: 'NV' },
];

/** Get county names for a given state */
export function getCountiesForState(state: StateAbbrev): string[] {
  return STATE_COUNTIES[state] || [];
}

/** Get independent jurisdictions for a given state */
export function getIndependentJurisdictionsForState(state: StateAbbrev): IndependentJurisdiction[] {
  return INDEPENDENT_JURISDICTIONS.filter(j => j.state === state);
}

/** Convert county name + state to prefixed slug (e.g. county:ca:fresno) */
export function countyToSlug(county: string, state: StateAbbrev): string {
  return `county:${state.toLowerCase()}:${county.toLowerCase().replace(/\s+/g, '_')}`;
}
