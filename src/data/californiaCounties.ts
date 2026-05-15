/**
 * California counties grouped by 10 metro regions.
 * Used for Vendor Network county filter (optgroup pattern).
 */

export const CA_COUNTIES_BY_REGION: Record<string, string[]> = {
  'Greater Sacramento': [
    'El Dorado', 'Placer', 'Sacramento', 'Sutter', 'Yolo', 'Yuba',
  ],
  'Bay Area': [
    'Alameda', 'Contra Costa', 'Marin', 'Napa', 'San Francisco',
    'San Mateo', 'Santa Clara', 'Solano', 'Sonoma',
  ],
  'San Joaquin Valley': [
    'Fresno', 'Kern', 'Kings', 'Madera', 'Merced', 'San Joaquin',
    'Stanislaus', 'Tulare',
  ],
  'Greater Los Angeles': [
    'Los Angeles', 'Orange', 'Riverside', 'San Bernardino', 'Ventura',
  ],
  'San Diego Region': [
    'Imperial', 'San Diego',
  ],
  'Central Coast': [
    'Monterey', 'San Benito', 'San Luis Obispo', 'Santa Barbara',
    'Santa Cruz',
  ],
  'North Coast': [
    'Del Norte', 'Humboldt', 'Lake', 'Mendocino',
  ],
  'Sierra / Mountain': [
    'Alpine', 'Amador', 'Calaveras', 'Inyo', 'Mariposa', 'Mono',
    'Nevada', 'Plumas', 'Sierra', 'Tuolumne',
  ],
  'North State': [
    'Butte', 'Colusa', 'Glenn', 'Lassen', 'Modoc', 'Shasta',
    'Siskiyou', 'Tehama', 'Trinity',
  ],
  'Other': [
    'Santa Clara (South)', 'San Mateo (Coast)',
  ],
};

/** Flat array of all CA counties (for validation). */
export const CA_COUNTIES_FLAT: string[] = Object.values(CA_COUNTIES_BY_REGION).flat();

/** Reverse lookup: county → region. */
export const CA_REGION_OF_COUNTY: Record<string, string> = {};
for (const [region, counties] of Object.entries(CA_COUNTIES_BY_REGION)) {
  for (const county of counties) {
    CA_REGION_OF_COUNTY[county] = region;
  }
}
