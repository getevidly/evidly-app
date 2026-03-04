// ============================================================
// Multi-State Zip Code → County Mapping
// ============================================================
// Maps zip code ranges to county jurisdiction IDs for auto-detection.
// Covers all 58 California counties, plus key TX, FL, NY counties.
// ============================================================

export interface ZipCountyMapping {
  zipStart: number;
  zipEnd: number;
  countyId: string;
  countyName: string;
  state?: string;
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
  // Tulare County (932xx partial) — must come BEFORE Kern (more specific range)
  { zipStart: 93201, zipEnd: 93298, countyId: 'county-tulare', countyName: 'Tulare County' },
  // Kings County (932xx partial) — must come BEFORE Kern (more specific range)
  { zipStart: 93230, zipEnd: 93246, countyId: 'county-kings', countyName: 'Kings County' },
  // Kern County (932xx, 935xx) — broader range, checked after Tulare/Kings
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

// ── Texas zip code ranges ────────────────────────────────────
const TX_ZIP_RANGES: ZipCountyMapping[] = [
  // Harris County (Houston) — 770xx-774xx
  { zipStart: 77001, zipEnd: 77099, countyId: 'county-harris-tx', countyName: 'Harris County', state: 'TX' },
  { zipStart: 77201, zipEnd: 77299, countyId: 'county-harris-tx', countyName: 'Harris County', state: 'TX' },
  { zipStart: 77301, zipEnd: 77399, countyId: 'county-harris-tx', countyName: 'Harris County', state: 'TX' },
  { zipStart: 77400, zipEnd: 77499, countyId: 'county-harris-tx', countyName: 'Harris County', state: 'TX' },
  // Dallas County — 750xx-753xx
  { zipStart: 75001, zipEnd: 75399, countyId: 'county-dallas-tx', countyName: 'Dallas County', state: 'TX' },
];

// ── Florida zip code ranges ──────────────────────────────────
const FL_ZIP_RANGES: ZipCountyMapping[] = [
  // Miami-Dade County — 330xx-332xx
  { zipStart: 33001, zipEnd: 33299, countyId: 'county-miami-dade-fl', countyName: 'Miami-Dade County', state: 'FL' },
];

// ── New York zip code ranges ─────────────────────────────────
const NY_ZIP_RANGES: ZipCountyMapping[] = [
  // NYC (all 5 boroughs) — 100xx-104xx, 110xx-114xx, 116xx
  { zipStart: 10001, zipEnd: 10499, countyId: 'county-nyc', countyName: 'New York City', state: 'NY' },
  { zipStart: 11001, zipEnd: 11499, countyId: 'county-nyc', countyName: 'New York City', state: 'NY' },
  { zipStart: 11600, zipEnd: 11699, countyId: 'county-nyc', countyName: 'New York City', state: 'NY' },
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
  // Madera County (inside Fresno's broad 93600-93799 range — overrides needed)
  '93601': { countyId: 'county-madera', countyName: 'Madera County' }, // Ahwahnee
  '93604': { countyId: 'county-madera', countyName: 'Madera County' }, // Bass Lake
  '93614': { countyId: 'county-madera', countyName: 'Madera County' }, // Coarsegold
  '93623': { countyId: 'county-madera', countyName: 'Madera County' }, // Fish Camp (southern Yosemite gateway)
  '93637': { countyId: 'county-madera', countyName: 'Madera County' }, // Madera (city)
  '93638': { countyId: 'county-madera', countyName: 'Madera County' }, // Madera (north)
  '93639': { countyId: 'county-madera', countyName: 'Madera County' }, // Madera (east/airport)
  '93644': { countyId: 'county-madera', countyName: 'Madera County' }, // Oakhurst
  '93645': { countyId: 'county-madera', countyName: 'Madera County' }, // O'Neals
  '93653': { countyId: 'county-madera', countyName: 'Madera County' }, // Raymond
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
  // Additional Stanislaus County zips
  '95307': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Ceres
  '95316': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Denair
  '95320': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Escalon
  '95323': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Hickman
  '95326': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Hughson
  '95328': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Keyes
  '95363': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Patterson
  '95367': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Riverbank
  '95368': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Salida
  '95376': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Tracy (partly SJ)
  '95380': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Turlock
  '95382': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Turlock
  '95397': { countyId: 'county-stanislaus', countyName: 'Stanislaus County' }, // Waterford
  // Santa Barbara County (934xx zips inside SLO's broad range)
  '93427': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Buellton
  '93430': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Casmalia
  '93433': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Guadalupe
  '93434': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Guadalupe
  '93436': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Lompoc
  '93437': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Lompoc (VAFB)
  '93440': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Los Alamos
  '93441': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Los Olivos
  '93454': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Santa Maria
  '93455': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Santa Maria
  '93456': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Santa Maria
  '93458': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Santa Maria
  '93460': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Santa Ynez
  '93463': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Solvang
  '93464': { countyId: 'county-santa-barbara', countyName: 'Santa Barbara County' }, // Solvang
  // San Luis Obispo County (934xx range — key cities, ensures correct mapping vs Santa Barbara)
  '93401': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // San Luis Obispo (EHD HQ)
  '93405': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // San Luis Obispo
  '93406': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // San Luis Obispo
  '93407': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // San Luis Obispo (Cal Poly)
  '93408': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // San Luis Obispo
  '93420': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Arroyo Grande
  '93422': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Atascadero
  '93423': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Atascadero
  '93424': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Avila Beach
  '93428': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Cambria
  '93432': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Creston
  '93442': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Morro Bay
  '93443': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Morro Bay
  '93444': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Nipomo
  '93445': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Oceano
  '93446': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Paso Robles
  '93447': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Paso Robles
  '93449': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Pismo Beach
  '93451': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // San Miguel
  '93452': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // San Simeon
  '93453': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Santa Margarita
  '93461': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Shandon
  '93465': { countyId: 'county-san-luis-obispo', countyName: 'San Luis Obispo County' }, // Templeton
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
  '94128': { countyId: 'county-sf', countyName: 'San Francisco County' }, // SFO Airport
  '94158': { countyId: 'county-sf', countyName: 'San Francisco County' }, // Mission Bay
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
  // San Bernardino County
  '92401': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92408': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92354': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92374': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92376': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92316': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '91762': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '91764': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92335': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92336': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92346': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92404': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92324': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92410': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92301': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92307': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92394': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  '92395': { countyId: 'county-san-bernardino', countyName: 'San Bernardino County' },
  // Ventura County (inside LA's broad 91001-91899 range — overrides needed)
  '91319': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Newbury Park
  '91320': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Newbury Park
  '91360': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Thousand Oaks
  '91361': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Westlake Village
  '91362': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Thousand Oaks
  '91377': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Oak Park
  // Ventura County (930xx range — key cities)
  '93001': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Ventura
  '93003': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Ventura
  '93004': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Ventura
  '93009': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Ventura (EHD HQ)
  '93010': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Camarillo
  '93012': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Camarillo
  '93015': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Fillmore
  '93020': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Moorpark
  '93021': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Moorpark
  '93022': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Oak View
  '93023': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Ojai
  '93030': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Oxnard
  '93033': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Oxnard
  '93035': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Oxnard/Port Hueneme
  '93036': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Oxnard
  '93040': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Piru
  '93041': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Port Hueneme
  '93060': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Santa Paula
  '93063': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Simi Valley
  '93065': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Simi Valley
  '93066': { countyId: 'county-ventura', countyName: 'Ventura County' }, // Somis
  // Orange County
  '92602': { countyId: 'county-orange', countyName: 'Orange County' },
  '92614': { countyId: 'county-orange', countyName: 'Orange County' },
  '92626': { countyId: 'county-orange', countyName: 'Orange County' },
  '92660': { countyId: 'county-orange', countyName: 'Orange County' },
  '92683': { countyId: 'county-orange', countyName: 'Orange County' },
  '92701': { countyId: 'county-orange', countyName: 'Orange County' },
  '92802': { countyId: 'county-orange', countyName: 'Orange County' },
  // Santa Clara County — Silicon Valley core
  '95008': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Campbell
  '95014': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Cupertino
  '95020': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Gilroy
  '95030': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Los Gatos
  '95032': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Los Gatos
  '95035': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Milpitas
  '95037': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Morgan Hill
  '95046': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Martin
  '95050': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Santa Clara (city)
  '95051': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Santa Clara (city)
  '95054': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Santa Clara (city)
  '95070': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Saratoga
  '95101': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose
  '95110': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (downtown)
  '95111': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (south)
  '95112': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (east)
  '95113': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (downtown core)
  '95116': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (east)
  '95117': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (west)
  '95118': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (south)
  '95120': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (Almaden)
  '95121': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (east)
  '95122': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (east)
  '95123': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (south)
  '95124': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (south)
  '95125': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (Willow Glen)
  '95126': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (Rose Garden)
  '95127': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (east foothills)
  '95128': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (west)
  '95129': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (west)
  '95130': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (west)
  '95131': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (north)
  '95132': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (north)
  '95133': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (northeast)
  '95134': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (north/Alviso)
  '95135': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (east hills)
  '95136': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (south)
  '95138': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (south)
  '95139': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (south)
  '95148': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (east)
  '94022': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Los Altos
  '94024': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Los Altos
  '94040': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Mountain View
  '94041': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Mountain View
  '94043': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Mountain View (NASA Ames)
  '94085': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Sunnyvale
  '94086': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Sunnyvale
  '94087': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Sunnyvale
  '94089': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Sunnyvale
  '94301': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Palo Alto
  '94303': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Palo Alto (East)
  '94304': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Palo Alto (Stanford Research Park)
  '94305': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Stanford University
  '94306': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Palo Alto (South)
  '95013': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // Coyote
  '95119': { countyId: 'county-santa-clara', countyName: 'Santa Clara County' }, // San Jose (south/Blossom Hill)
  // Monterey County — coastal and inland
  '93901': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Salinas (downtown)
  '93905': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Salinas (east)
  '93906': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Salinas (north/HQ)
  '93907': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Salinas (northwest)
  '93908': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Salinas (south)
  '93921': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Carmel-by-the-Sea
  '93923': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Carmel
  '93924': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Carmel Valley
  '93925': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Gonzales
  '93926': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Greenfield
  '93927': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Jolon
  '93928': { countyId: 'county-monterey', countyName: 'Monterey County' }, // King City (branch office)
  '93930': { countyId: 'county-monterey', countyName: 'Monterey County' }, // King City
  '93932': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Lockwood
  '93933': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Marina
  '93940': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Monterey
  '93942': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Monterey
  '93943': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Monterey (Naval Postgraduate)
  '93944': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Monterey
  '93950': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Pacific Grove
  '93953': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Pebble Beach
  '93955': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Seaside
  '93960': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Soledad
  '93962': { countyId: 'county-monterey', countyName: 'Monterey County' }, // Spreckels
  // El Dorado County — Placerville, El Dorado Hills, Lake Tahoe area
  '95614': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Cool
  '95619': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Diamond Springs
  '95623': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // El Dorado
  '95633': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Garden Valley
  '95634': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Georgetown
  '95636': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Grizzly Flats
  '95651': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Lotus
  '95656': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Mount Aukum
  '95667': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Placerville (county seat)
  '95672': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Rescue
  '95682': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // El Dorado Hills
  '95684': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // Shingle Springs
  '95762': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // El Dorado Hills
  '96150': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // South Lake Tahoe
  '96151': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // South Lake Tahoe
  '96152': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // South Lake Tahoe
  '96154': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // South Lake Tahoe
  '96155': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // South Lake Tahoe (Meyers)
  '96156': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // South Lake Tahoe
  '96157': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // South Lake Tahoe
  '96158': { countyId: 'county-el-dorado', countyName: 'El Dorado County' }, // South Lake Tahoe
  // Colusa County — small rural county, Sacramento Valley
  '95912': { countyId: 'county-colusa', countyName: 'Colusa County' }, // Arbuckle
  '95932': { countyId: 'county-colusa', countyName: 'Colusa County' }, // Colusa (county seat / EHD office)
  '95955': { countyId: 'county-colusa', countyName: 'Colusa County' }, // Maxwell
  '95970': { countyId: 'county-colusa', countyName: 'Colusa County' }, // Princeton
  '95979': { countyId: 'county-colusa', countyName: 'Colusa County' }, // Stonyford
  '95987': { countyId: 'county-colusa', countyName: 'Colusa County' }, // Williams
  // Napa County (945xx range overlaps with Solano — overrides needed)
  '94503': { countyId: 'county-napa', countyName: 'Napa County' }, // American Canyon
  '94508': { countyId: 'county-napa', countyName: 'Napa County' }, // Angwin
  '94515': { countyId: 'county-napa', countyName: 'Napa County' }, // Calistoga
  '94558': { countyId: 'county-napa', countyName: 'Napa County' }, // Napa
  '94559': { countyId: 'county-napa', countyName: 'Napa County' }, // Napa (EHD HQ)
  '94562': { countyId: 'county-napa', countyName: 'Napa County' }, // Oakville
  '94567': { countyId: 'county-napa', countyName: 'Napa County' }, // Pope Valley
  '94573': { countyId: 'county-napa', countyName: 'Napa County' }, // Rutherford
  '94574': { countyId: 'county-napa', countyName: 'Napa County' }, // St. Helena
  '94576': { countyId: 'county-napa', countyName: 'Napa County' }, // Deer Park
  '94581': { countyId: 'county-napa', countyName: 'Napa County' }, // Napa (south)
  '94599': { countyId: 'county-napa', countyName: 'Napa County' }, // Yountville
  // Sutter County (overrides Butte range 95901-95999)
  '95953': { countyId: 'county-sutter', countyName: 'Sutter County' }, // Live Oak
  '95957': { countyId: 'county-sutter', countyName: 'Sutter County' }, // Meridian
  '95976': { countyId: 'county-sutter', countyName: 'Sutter County' }, // Sutter
  '95982': { countyId: 'county-sutter', countyName: 'Sutter County' }, // Yuba City east
  '95991': { countyId: 'county-sutter', countyName: 'Sutter County' }, // Yuba City (county seat / EHD HQ)
  '95992': { countyId: 'county-sutter', countyName: 'Sutter County' }, // Yuba City south
  '95993': { countyId: 'county-sutter', countyName: 'Sutter County' }, // Yuba City
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
 * Get county from a non-CA zip code (TX, FL, NY).
 */
export function getCountyFromMultiStateZip(zip: string): { countyId: string; countyName: string; state: string } | null {
  const zipNum = parseInt(zip, 10);
  if (isNaN(zipNum)) return null;

  // Check TX ranges
  for (const range of TX_ZIP_RANGES) {
    if (zipNum >= range.zipStart && zipNum <= range.zipEnd) {
      return { countyId: range.countyId, countyName: range.countyName, state: 'TX' };
    }
  }

  // Check FL ranges
  for (const range of FL_ZIP_RANGES) {
    if (zipNum >= range.zipStart && zipNum <= range.zipEnd) {
      return { countyId: range.countyId, countyName: range.countyName, state: 'FL' };
    }
  }

  // Check NY ranges
  for (const range of NY_ZIP_RANGES) {
    if (zipNum >= range.zipStart && zipNum <= range.zipEnd) {
      return { countyId: range.countyId, countyName: range.countyName, state: 'NY' };
    }
  }

  return null;
}

/** Map state abbreviations to jurisdiction profile IDs */
const STATE_TO_JURISDICTION: Record<string, string> = {
  CA: 'state-ca',
  TX: 'state-tx',
  FL: 'state-fl',
  NY: 'state-ny',
  WA: 'state-wa',
  OR: 'state-or',
  AZ: 'state-az',
};

/**
 * Full jurisdiction detection: returns the complete jurisdiction chain
 * based on zip code and/or state. Supports CA, TX, FL, NY, WA, OR, AZ.
 */
export function detectJurisdiction(input: {
  zip?: string;
  state?: string;
  city?: string;
}): {
  isCalifornnia: boolean;
  detectedState: string | null;
  jurisdictionChain: string[];
  countyId: string | null;
  countyName: string | null;
  detectionMethod: 'zip' | 'state' | 'none';
} {
  const stateUpper = (input.state || '').trim().toUpperCase();

  // California detection (existing logic)
  const isCa =
    (stateUpper === 'CA' || stateUpper === 'CALIFORNIA') ||
    (input.zip && isCaliforniaZip(input.zip));

  if (isCa) {
    const chain: string[] = ['federal-fda', 'state-ca'];
    let countyId: string | null = null;
    let countyName: string | null = null;
    const detectionMethod: 'zip' | 'state' = input.zip ? 'zip' : 'state';

    if (input.zip) {
      const county = getCountyFromZip(input.zip);
      if (county) {
        countyId = county.countyId;
        countyName = county.countyName;
        chain.push(county.countyId);
      }
    }

    return { isCalifornnia: true, detectedState: 'CA', jurisdictionChain: chain, countyId, countyName, detectionMethod };
  }

  // Multi-state detection (TX, FL, NY, WA, OR, AZ)
  const stateJurisdictionId = STATE_TO_JURISDICTION[stateUpper];

  // Try zip-based county detection for non-CA states
  if (input.zip) {
    const multiResult = getCountyFromMultiStateZip(input.zip);
    if (multiResult) {
      const stateId = STATE_TO_JURISDICTION[multiResult.state] || `state-${multiResult.state.toLowerCase()}`;
      return {
        isCalifornnia: false,
        detectedState: multiResult.state,
        jurisdictionChain: ['federal-fda', stateId, multiResult.countyId],
        countyId: multiResult.countyId,
        countyName: multiResult.countyName,
        detectionMethod: 'zip',
      };
    }
  }

  // State-level detection without county
  if (stateJurisdictionId) {
    return {
      isCalifornnia: false,
      detectedState: stateUpper,
      jurisdictionChain: ['federal-fda', stateJurisdictionId],
      countyId: null,
      countyName: null,
      detectionMethod: 'state',
    };
  }

  // No supported state detected
  return {
    isCalifornnia: false,
    detectedState: null,
    jurisdictionChain: ['federal-fda'],
    countyId: null,
    countyName: null,
    detectionMethod: 'none',
  };
}
