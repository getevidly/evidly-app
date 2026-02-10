// ============================================================
// California Zip Code → County Mapping
// ============================================================
// Maps zip code ranges to county jurisdiction IDs for auto-detection.
// Covers all 58 California counties with primary zip ranges.
// ============================================================

export interface ZipCountyMapping {
  zipStart: number;
  zipEnd: number;
  countyId: string;
  countyName: string;
}

// California zip code ranges by county (sorted by zip start)
// Source: USPS zip code assignments for California (900xx–961xx)
const CA_ZIP_RANGES: ZipCountyMapping[] = [
  // Los Angeles County (900xx–917xx, 935xx)
  { zipStart: 90001, zipEnd: 90899, countyId: 'county-la', countyName: 'Los Angeles County' },
  { zipStart: 91001, zipEnd: 91899, countyId: 'county-la', countyName: 'Los Angeles County' },
  { zipStart: 90001, zipEnd: 91608, countyId: 'county-la', countyName: 'Los Angeles County' },
  // Ventura County (910xx, 930xx)
  { zipStart: 91319, zipEnd: 91377, countyId: 'county-ventura', countyName: 'Ventura County' },
  { zipStart: 93001, zipEnd: 93099, countyId: 'county-ventura', countyName: 'Ventura County' },
  // Santa Barbara County (931xx)
  { zipStart: 93101, zipEnd: 93199, countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' },
  // San Luis Obispo County (934xx)
  { zipStart: 93401, zipEnd: 93499, countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' },
  // Kern County (932xx, 935xx)
  { zipStart: 93200, zipEnd: 93399, countyId: 'county-kern', countyName: 'Kern County' },
  { zipStart: 93500, zipEnd: 93599, countyId: 'county-kern', countyName: 'Kern County' },
  // San Bernardino County (917xx, 923xx-925xx)
  { zipStart: 91701, zipEnd: 91799, countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  { zipStart: 92301, zipEnd: 92427, countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  // Riverside County (925xx)
  { zipStart: 92501, zipEnd: 92599, countyId: 'county-riverside', countyName: 'Riverside County' },
  { zipStart: 92201, zipEnd: 92299, countyId: 'county-riverside', countyName: 'Riverside County' },
  // Orange County (926xx-928xx)
  { zipStart: 92602, zipEnd: 92899, countyId: 'county-orange', countyName: 'Orange County' },
  // San Diego County (919xx-921xx)
  { zipStart: 91901, zipEnd: 92199, countyId: 'county-san-diego', countyName: 'San Diego County' },
  // Imperial County (922xx)
  { zipStart: 92227, zipEnd: 92283, countyId: 'county-imperial', countyName: 'Imperial County' },
  // Fresno County (936xx-937xx)
  { zipStart: 93600, zipEnd: 93799, countyId: 'county-fresno', countyName: 'Fresno County' },
  // Tulare County (932xx partial)
  { zipStart: 93201, zipEnd: 93298, countyId: 'county-tulare', countyName: 'Tulare County' },
  // Kings County (932xx partial)
  { zipStart: 93230, zipEnd: 93246, countyId: 'county-kings', countyName: 'Kings County' },
  // Madera County (936xx partial)
  { zipStart: 93636, zipEnd: 93645, countyId: 'county-madera', countyName: 'Madera County' },
  // Merced County (953xx)
  { zipStart: 95300, zipEnd: 95399, countyId: 'county-merced', countyName: 'Merced County' },
  // Stanislaus County (953xx-954xx)
  { zipStart: 95307, zipEnd: 95397, countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  // San Joaquin County (952xx)
  { zipStart: 95200, zipEnd: 95299, countyId: 'county-san-joaquin', countyName: 'San Joaquin County' },
  // Sacramento County (956xx-958xx)
  { zipStart: 95600, zipEnd: 95899, countyId: 'county-sacramento', countyName: 'Sacramento County' },
  { zipStart: 94203, zipEnd: 94299, countyId: 'county-sacramento', countyName: 'Sacramento County' },
  // Alameda County (945xx)
  { zipStart: 94501, zipEnd: 94599, countyId: 'county-alameda', countyName: 'Alameda County' },
  // Contra Costa County (945xx partial)
  { zipStart: 94505, zipEnd: 94598, countyId: 'county-contra-costa', countyName: 'Contra Costa County' },
  // San Francisco County (941xx)
  { zipStart: 94100, zipEnd: 94199, countyId: 'county-sf', countyName: 'San Francisco County' },
  // San Mateo County (940xx)
  { zipStart: 94000, zipEnd: 94099, countyId: 'county-san-mateo', countyName: 'San Mateo County' },
  // Santa Clara County (950xx-951xx)
  { zipStart: 95000, zipEnd: 95199, countyId: 'county-santa-clara', countyName: 'Santa Clara County' },
  // Santa Cruz County (950xx partial)
  { zipStart: 95001, zipEnd: 95077, countyId: 'county-santa-cruz', countyName: 'Santa Cruz County' },
  // Monterey County (939xx)
  { zipStart: 93901, zipEnd: 93999, countyId: 'county-monterey', countyName: 'Monterey County' },
  // Marin County (949xx)
  { zipStart: 94901, zipEnd: 94999, countyId: 'county-marin', countyName: 'Marin County' },
  // Sonoma County (954xx)
  { zipStart: 95400, zipEnd: 95499, countyId: 'county-sonoma', countyName: 'Sonoma County' },
  // Napa County (945xx partial)
  { zipStart: 94558, zipEnd: 94599, countyId: 'county-napa', countyName: 'Napa County' },
  // Solano County (945xx partial)
  { zipStart: 94503, zipEnd: 94592, countyId: 'county-solano', countyName: 'Solano County' },
  // Yolo County (956xx partial)
  { zipStart: 95605, zipEnd: 95698, countyId: 'county-yolo', countyName: 'Yolo County' },
  // Placer County (956xx-957xx)
  { zipStart: 95601, zipEnd: 95747, countyId: 'county-placer', countyName: 'Placer County' },
  // El Dorado County (956xx partial)
  { zipStart: 95613, zipEnd: 95726, countyId: 'county-el-dorado', countyName: 'El Dorado County' },
  // Butte County (959xx)
  { zipStart: 95901, zipEnd: 95999, countyId: 'county-butte', countyName: 'Butte County' },
  // Shasta County (960xx)
  { zipStart: 96001, zipEnd: 96099, countyId: 'county-shasta', countyName: 'Shasta County' },
  // Humboldt County (955xx)
  { zipStart: 95501, zipEnd: 95599, countyId: 'county-humboldt', countyName: 'Humboldt County' },
  // Siskiyou County (960xx partial)
  { zipStart: 96014, zipEnd: 96097, countyId: 'county-siskiyou', countyName: 'Siskiyou County' },
  // Tehama County (960xx partial)
  { zipStart: 96021, zipEnd: 96090, countyId: 'county-tehama', countyName: 'Tehama County' },
  // Mendocino County (954xx-955xx)
  { zipStart: 95410, zipEnd: 95587, countyId: 'county-mendocino', countyName: 'Mendocino County' },
  // Lake County (954xx partial)
  { zipStart: 95422, zipEnd: 95493, countyId: 'county-lake', countyName: 'Lake County' },
  // San Benito County (950xx partial)
  { zipStart: 95023, zipEnd: 95075, countyId: 'county-san-benito', countyName: 'San Benito County' },
  // Tuolumne County (953xx partial)
  { zipStart: 95305, zipEnd: 95389, countyId: 'county-tuolumne', countyName: 'Tuolumne County' },
  // Mariposa County (953xx partial)
  { zipStart: 95306, zipEnd: 95389, countyId: 'county-mariposa', countyName: 'Mariposa County' },
  // Inyo County (935xx partial)
  { zipStart: 93513, zipEnd: 93592, countyId: 'county-inyo', countyName: 'Inyo County' },
  // Mono County (935xx partial)
  { zipStart: 93517, zipEnd: 96133, countyId: 'county-mono', countyName: 'Mono County' },
];

// Specific zip-to-county overrides for ambiguous zips (more precise than ranges)
const SPECIFIC_ZIP_OVERRIDES: Record<string, { countyId: string; countyName: string }> = {
  // Fresno area
  '93650': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93701': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93702': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93703': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93704': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93705': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93706': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93710': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93711': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93720': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93721': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93722': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93726': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93727': { countyId: 'county-fresno', countyName: 'Fresno County' },
  '93728': { countyId: 'county-fresno', countyName: 'Fresno County' },
  // Merced area
  '95340': { countyId: 'county-merced', countyName: 'Merced County' },
  '95341': { countyId: 'county-merced', countyName: 'Merced County' },
  '95348': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  // Modesto/Stanislaus
  '95350': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  '95351': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  '95354': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  '95355': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  '95356': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  '95357': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  '95358': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' },
  // Sacramento
  '95814': { countyId: 'county-sacramento', countyName: 'Sacramento County' },
  '95816': { countyId: 'county-sacramento', countyName: 'Sacramento County' },
  '95819': { countyId: 'county-sacramento', countyName: 'Sacramento County' },
  '95822': { countyId: 'county-sacramento', countyName: 'Sacramento County' },
  '95825': { countyId: 'county-sacramento', countyName: 'Sacramento County' },
  // San Francisco
  '94102': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94103': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94104': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94105': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94107': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94108': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94109': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94110': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94111': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94112': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94114': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94115': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94116': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94117': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94118': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94121': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94122': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94123': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94124': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94127': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94129': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94130': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94131': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94132': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94133': { countyId: 'county-sf', countyName: 'San Francisco County' },
  '94134': { countyId: 'county-sf', countyName: 'San Francisco County' },
  // LA specific
  '90001': { countyId: 'county-la', countyName: 'Los Angeles County' },
  '90012': { countyId: 'county-la', countyName: 'Los Angeles County' },
  '90024': { countyId: 'county-la', countyName: 'Los Angeles County' },
  '90036': { countyId: 'county-la', countyName: 'Los Angeles County' },
  '90045': { countyId: 'county-la', countyName: 'Los Angeles County' },
  '90064': { countyId: 'county-la', countyName: 'Los Angeles County' },
  '90210': { countyId: 'county-la', countyName: 'Los Angeles County' },
  '90401': { countyId: 'county-la', countyName: 'Los Angeles County' },
  // San Diego
  '92101': { countyId: 'county-san-diego', countyName: 'San Diego County' },
  '92102': { countyId: 'county-san-diego', countyName: 'San Diego County' },
  '92103': { countyId: 'county-san-diego', countyName: 'San Diego County' },
  '92104': { countyId: 'county-san-diego', countyName: 'San Diego County' },
  '92109': { countyId: 'county-san-diego', countyName: 'San Diego County' },
  '92110': { countyId: 'county-san-diego', countyName: 'San Diego County' },
  '92126': { countyId: 'county-san-diego', countyName: 'San Diego County' },
  // Orange County
  '92602': { countyId: 'county-orange', countyName: 'Orange County' },
  '92614': { countyId: 'county-orange', countyName: 'Orange County' },
  '92626': { countyId: 'county-orange', countyName: 'Orange County' },
  '92660': { countyId: 'county-orange', countyName: 'Orange County' },
  '92683': { countyId: 'county-orange', countyName: 'Orange County' },
  '92701': { countyId: 'county-orange', countyName: 'Orange County' },
  '92802': { countyId: 'county-orange', countyName: 'Orange County' },
  // Santa Clara / San Jose
  '95110': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' },
  '95112': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' },
  '95113': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' },
  '95125': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' },
  '95128': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' },
  '95131': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' },
  '95132': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' },
  // Alameda / Oakland
  '94501': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94536': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94538': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94550': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94560': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94577': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94587': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94601': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94602': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94607': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94609': { countyId: 'county-alameda', countyName: 'Alameda County' },
  '94612': { countyId: 'county-alameda', countyName: 'Alameda County' },
};

/**
 * Detect county from California zip code.
 * First checks specific overrides, then falls back to zip range matching.
 */
export function getCountyFromZip(zip: string): { countyId: string; countyName: string } | null {
  // 1. Check specific overrides first (most accurate)
  const override = SPECIFIC_ZIP_OVERRIDES[zip];
  if (override) return override;

  // 2. Fall back to range-based matching
  const zipNum = parseInt(zip, 10);
  if (isNaN(zipNum)) return null;

  // Check California zip range (900xx - 961xx)
  if (zipNum < 90001 || zipNum > 96162) return null;

  for (const range of CA_ZIP_RANGES) {
    if (zipNum >= range.zipStart && zipNum <= range.zipEnd) {
      return { countyId: range.countyId, countyName: range.countyName };
    }
  }

  return null;
}

/**
 * Detect if a state abbreviation or name indicates California.
 */
export function isCaliforniaState(state: string): boolean {
  const normalized = state.trim().toUpperCase();
  return normalized === 'CA' || normalized === 'CALIFORNIA';
}

/**
 * Detect if a zip code is in California (900xx-961xx range).
 */
export function isCaliforniaZip(zip: string): boolean {
  const zipNum = parseInt(zip, 10);
  if (isNaN(zipNum)) return false;
  return zipNum >= 90001 && zipNum <= 96162;
}

/**
 * Full jurisdiction detection: returns the complete jurisdiction chain
 * based on zip code and/or state.
 */
export function detectJurisdiction(input: {
  zip?: string;
  state?: string;
  city?: string;
}): {
  isCalifornnia: boolean;
  jurisdictionChain: string[];
  countyId: string | null;
  countyName: string | null;
  detectionMethod: 'zip' | 'state' | 'none';
} {
  const isCa =
    (input.state && isCaliforniaState(input.state)) ||
    (input.zip && isCaliforniaZip(input.zip));

  if (!isCa) {
    return {
      isCalifornnia: false,
      jurisdictionChain: ['federal-fda'],
      countyId: null,
      countyName: null,
      detectionMethod: 'none',
    };
  }

  // Detected California — build chain
  const chain: string[] = ['federal-fda', 'state-ca'];
  let countyId: string | null = null;
  let countyName: string | null = null;
  let detectionMethod: 'zip' | 'state' = input.zip ? 'zip' : 'state';

  // Try to detect county from zip
  if (input.zip) {
    const county = getCountyFromZip(input.zip);
    if (county) {
      countyId = county.countyId;
      countyName = county.countyName;
      chain.push(county.countyId);
    }
  }

  return {
    isCalifornnia: true,
    jurisdictionChain: chain,
    countyId,
    countyName,
    detectionMethod,
  };
}
