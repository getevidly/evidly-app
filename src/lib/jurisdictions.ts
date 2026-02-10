// ============================================================
// EvidLY Jurisdiction Profiles
// ============================================================
// Hierarchical compliance profiles: Federal → State → County → City
// More specific jurisdictions override less specific ones.
//
// TODO: Mariposa County profile (Yosemite/Aramark locations with NPS overlay)
// TODO: Arizona, Oregon, Texas, Florida jurisdiction profiles
// TODO: API to pull jurisdiction data from regulatory databases
// TODO: AI-powered jurisdiction detection from address geocoding
// TODO: Auto-updates when regulatory change alerts modify jurisdiction requirements
// TODO: San Francisco, San Diego, Sacramento, Los Angeles county profiles
// ============================================================

export type JurisdictionLevel = 'federal' | 'state' | 'county' | 'city';

export interface TemperatureThreshold {
  type: string;
  tempF: number;
  description: string;
  source: string;
}

export interface CookingTemp {
  foodType: string;
  requiredTempF: number;
  holdTimeSeconds: number;
  source: string;
}

export interface CoolingRequirement {
  stage: string;
  fromTempF: number;
  toTempF: number;
  maxHours: number;
  source: string;
}

export interface CertificationRequirement {
  type: string;
  description: string;
  renewalYears: number;
  approvedProviders?: string[];
  source: string;
}

export interface RequiredDocument {
  name: string;
  description: string;
  renewalFrequency: string;
  source: string;
}

export interface RequiredPosting {
  name: string;
  languages: string[];
  source: string;
}

export interface ServiceFrequency {
  service: string;
  frequencyDays: number;
  frequencyLabel: string;
  condition?: string;
  source: string;
}

export interface HealthDepartment {
  name: string;
  phone: string;
  website: string;
  inspectionFrequency: string;
  permitRenewal: string;
}

export interface JurisdictionProfile {
  id: string;
  name: string;
  level: JurisdictionLevel;
  parentId: string | null;
  temperatureThresholds: TemperatureThreshold[];
  cookingTemps: CookingTemp[];
  coolingRequirements: CoolingRequirement[];
  certifications: CertificationRequirement[];
  requiredDocuments: RequiredDocument[];
  requiredPostings: RequiredPosting[];
  serviceFrequencies: ServiceFrequency[];
  healthDepartment?: HealthDepartment;
  specialRequirements: string[];
}

// ── Federal (FDA Food Code 2022) ──────────────────────────────

const FEDERAL: JurisdictionProfile = {
  id: 'federal-fda',
  name: 'Federal (FDA Food Code)',
  level: 'federal',
  parentId: null,
  temperatureThresholds: [
    { type: 'Cold Holding', tempF: 41, description: 'Maximum temperature for cold holding of TCS foods', source: 'FDA Food Code §3-501.16' },
    { type: 'Hot Holding', tempF: 135, description: 'Minimum temperature for hot holding of TCS foods', source: 'FDA Food Code §3-501.16' },
    { type: 'Reheating', tempF: 165, description: 'Minimum reheating temperature within 2 hours', source: 'FDA Food Code §3-403.11' },
  ],
  cookingTemps: [
    { foodType: 'Poultry', requiredTempF: 165, holdTimeSeconds: 15, source: 'FDA Food Code §3-401.11(A)' },
    { foodType: 'Ground Meat', requiredTempF: 155, holdTimeSeconds: 17, source: 'FDA Food Code §3-401.11(B)' },
    { foodType: 'Whole Muscle Meat', requiredTempF: 145, holdTimeSeconds: 15, source: 'FDA Food Code §3-401.11(C)' },
    { foodType: 'Fish', requiredTempF: 145, holdTimeSeconds: 15, source: 'FDA Food Code §3-401.11(C)' },
    { foodType: 'Eggs (for immediate service)', requiredTempF: 145, holdTimeSeconds: 15, source: 'FDA Food Code §3-401.11(C)' },
    { foodType: 'Eggs (held for later service)', requiredTempF: 155, holdTimeSeconds: 17, source: 'FDA Food Code §3-401.11(B)' },
    { foodType: 'Fruits/Vegetables (hot holding)', requiredTempF: 135, holdTimeSeconds: 0, source: 'FDA Food Code §3-401.11(D)' },
  ],
  coolingRequirements: [
    { stage: 'Stage 1', fromTempF: 135, toTempF: 70, maxHours: 2, source: 'FDA Food Code §3-501.14' },
    { stage: 'Stage 2', fromTempF: 70, toTempF: 41, maxHours: 4, source: 'FDA Food Code §3-501.14' },
  ],
  certifications: [],
  requiredDocuments: [],
  requiredPostings: [],
  serviceFrequencies: [
    { service: 'Hood Cleaning (High Volume)', frequencyDays: 90, frequencyLabel: 'Quarterly', condition: 'Solid fuel, high-volume charbroiling', source: 'NFPA 96 Table 11.4' },
    { service: 'Hood Cleaning (Moderate Volume)', frequencyDays: 180, frequencyLabel: 'Semi-annually', condition: 'Standard cooking operations', source: 'NFPA 96 Table 11.4' },
    { service: 'Hood Cleaning (Low Volume)', frequencyDays: 365, frequencyLabel: 'Annually', condition: 'Low-volume cooking, no grease-laden vapors', source: 'NFPA 96 Table 11.4' },
    { service: 'Fire Suppression System', frequencyDays: 180, frequencyLabel: 'Semi-annually', source: 'NFPA 96 §11.2.2' },
    { service: 'Fire Extinguisher Inspection', frequencyDays: 30, frequencyLabel: 'Monthly', source: 'NFPA 10 §7.2.1' },
    { service: 'Fire Extinguisher Professional Service', frequencyDays: 365, frequencyLabel: 'Annually', source: 'NFPA 10 §7.3.1' },
  ],
  specialRequirements: [
    'Date marking: 7 days max for ready-to-eat TCS food held at 41°F or below',
    'Consumer advisory required for raw/undercooked items on menu',
    'Bare hand contact with ready-to-eat foods prohibited',
    'Person in charge must be present during all hours of operation',
  ],
};

// ── California (CalCode) ──────────────────────────────────────

const CALIFORNIA: JurisdictionProfile = {
  id: 'state-ca',
  name: 'California (CalCode)',
  level: 'state',
  parentId: 'federal-fda',
  temperatureThresholds: [], // Inherits federal thresholds
  cookingTemps: [], // Inherits federal cooking temps
  coolingRequirements: [], // Inherits federal cooling (CalCode matches FDA here)
  certifications: [
    {
      type: 'Food Handler Certification',
      description: 'Required for all food employees within 30 days of hire',
      renewalYears: 3,
      approvedProviders: ['ServSafe', 'eFoodHandlers', 'StateFoodSafety', 'Learn2Serve', 'Always Food Safe'],
      source: 'CalCode §113948',
    },
    {
      type: 'Food Protection Manager Certification',
      description: 'At least one certified food protection manager per location',
      renewalYears: 5,
      approvedProviders: ['ServSafe Manager', 'Prometric', 'National Registry'],
      source: 'CalCode §113947.1',
    },
  ],
  requiredDocuments: [
    { name: 'Health Permit', description: 'Valid health permit from county environmental health', renewalFrequency: 'Annual', source: 'CalCode §114381' },
    { name: 'Business License', description: 'Valid business license from city/county', renewalFrequency: 'Annual', source: 'California Business & Professions Code' },
    { name: 'Food Handler Certificates', description: 'Current food handler cards for all food employees', renewalFrequency: 'Every 3 years', source: 'CalCode §113948' },
    { name: 'Manager Certification', description: 'Food protection manager certification', renewalFrequency: 'Every 5 years', source: 'CalCode §113947.1' },
    { name: 'Workers Compensation Insurance', description: 'Certificate of workers compensation insurance', renewalFrequency: 'Annual', source: 'California Labor Code §3700' },
    { name: 'General Liability Insurance', description: 'Certificate of general liability insurance', renewalFrequency: 'Annual', source: 'Business requirement' },
    { name: 'Fire Inspection Certificate', description: 'Annual fire inspection by local fire department', renewalFrequency: 'Annual', source: 'California Fire Code' },
    { name: 'Hood Cleaning Certificate', description: 'Professional hood/exhaust system cleaning certificate', renewalFrequency: 'Per NFPA 96 schedule', source: 'NFPA 96 / CalCode' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96 §11.2.2' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10 §7.3.1' },
    { name: 'Grease Trap Maintenance Record', description: 'Grease interceptor pumping and cleaning records', renewalFrequency: 'Per local requirement', source: 'Local pretreatment ordinance' },
    { name: 'Pest Control Service Agreement', description: 'Active pest control service contract', renewalFrequency: 'Ongoing (monthly service)', source: 'CalCode §114259' },
  ],
  requiredPostings: [
    { name: 'Health Permit', languages: ['English'], source: 'CalCode §114381' },
    { name: 'Handwashing Signage', languages: ['English', 'Spanish'], source: 'CalCode §113953.3' },
    { name: 'Employee Illness Reporting', languages: ['English', 'Spanish'], source: 'CalCode §113949.2' },
    { name: 'Consumer Advisory (raw items)', languages: ['English'], source: 'CalCode §114093' },
    { name: 'Choking Poster', languages: ['English'], source: 'California Health & Safety Code' },
    { name: 'Workers Compensation Notice', languages: ['English', 'Spanish'], source: 'California Labor Code' },
    { name: 'Minimum Wage Notice', languages: ['English', 'Spanish'], source: 'California Labor Code' },
    { name: 'Allergen Awareness (Big 9)', languages: ['English'], source: 'CalCode / FDA' },
  ],
  serviceFrequencies: [],
  specialRequirements: [
    'Handwashing signage must be posted in English and Spanish at all handwashing stations',
    'Consumer advisory required for raw or undercooked animal-derived foods',
    'Big 9 allergen awareness: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame',
    'Grease interceptor required for commercial kitchens discharging fats, oils, and grease (FOG)',
    'Mobile food facility permits require separate county process',
    'Temporary food facility permits required for events lasting 25 days or fewer',
  ],
};

// ── Fresno County (Downtown Kitchen) ──────────────────────────

const FRESNO_COUNTY: JurisdictionProfile = {
  id: 'county-fresno',
  name: 'Fresno County',
  level: 'county',
  parentId: 'state-ca',
  temperatureThresholds: [],
  cookingTemps: [],
  coolingRequirements: [],
  certifications: [],
  requiredDocuments: [],
  requiredPostings: [],
  serviceFrequencies: [],
  healthDepartment: {
    name: 'Fresno County Department of Environmental Health',
    phone: '(559) 600-3357',
    website: 'https://www.co.fresno.ca.us/departments/public-health/environmental-health',
    inspectionFrequency: 'Risk-based: high risk annually, moderate every 18 months',
    permitRenewal: 'Annual',
  },
  specialRequirements: [
    'Pre-operational inspection required for new food facilities',
    'Mobile food facility permits require separate Fresno County process',
    'Temporary food facility permits required for events and catering off-site',
    'Cottage food operations must register with Fresno County Environmental Health',
    'Plan review required for new construction or remodel of food facilities',
  ],
};

// ── Merced County (Airport Cafe) ──────────────────────────────

const MERCED_COUNTY: JurisdictionProfile = {
  id: 'county-merced',
  name: 'Merced County',
  level: 'county',
  parentId: 'state-ca',
  temperatureThresholds: [],
  cookingTemps: [],
  coolingRequirements: [],
  certifications: [],
  requiredDocuments: [],
  requiredPostings: [],
  serviceFrequencies: [],
  healthDepartment: {
    name: 'Merced County Division of Environmental Health',
    phone: '(209) 381-1100',
    website: 'https://www.co.merced.ca.us/departments/community-and-economic-development/environmental-health',
    inspectionFrequency: 'Annual for high-risk, 18 months for moderate-risk',
    permitRenewal: 'Annual',
  },
  specialRequirements: [
    'Standard CalCode enforcement',
    'Agricultural processing facilities have separate oversight',
    'Plan review required for new food facility construction',
    'Food facility operators must submit self-inspection reports',
  ],
};

// ── Stanislaus County (University Dining) ─────────────────────

const STANISLAUS_COUNTY: JurisdictionProfile = {
  id: 'county-stanislaus',
  name: 'Stanislaus County',
  level: 'county',
  parentId: 'state-ca',
  temperatureThresholds: [],
  cookingTemps: [],
  coolingRequirements: [],
  certifications: [],
  requiredDocuments: [],
  requiredPostings: [],
  serviceFrequencies: [],
  healthDepartment: {
    name: 'Stanislaus County Environmental Resources Department',
    phone: '(209) 525-6700',
    website: 'https://www.stancounty.com/er/environmental-health.shtm',
    inspectionFrequency: 'Risk-based: high risk annually, moderate every 18 months',
    permitRenewal: 'Annual',
  },
  specialRequirements: [
    'Standard CalCode enforcement',
    'Retail food facilities, mobile food, and temporary events all under Environmental Resources Dept',
    'Plan review required for all new food facilities and significant remodels',
  ],
};

// ── City of Modesto (overlay for University Dining) ───────────

const MODESTO_CITY: JurisdictionProfile = {
  id: 'city-modesto',
  name: 'City of Modesto',
  level: 'city',
  parentId: 'county-stanislaus',
  temperatureThresholds: [],
  cookingTemps: [],
  coolingRequirements: [],
  certifications: [],
  requiredDocuments: [
    { name: 'City of Modesto Business License', description: 'Required in addition to county health permit', renewalFrequency: 'Annual', source: 'Modesto Municipal Code' },
  ],
  requiredPostings: [],
  serviceFrequencies: [],
  specialRequirements: [
    'City of Modesto business license required in addition to Stanislaus County health permit',
    'Modesto business license must be displayed at the food establishment',
  ],
};

// ── Los Angeles County (future expansion) ─────────────────────
// TODO: Implement LA County profile for expansion
// - Restaurant grading system: A/B/C letter grades posted publicly
// - More frequent inspections for high-risk facilities
// - Additional requirements beyond CalCode
// - LA County Dept of Public Health, Environmental Health Division
// - Phone: (888) 700-9995
// - Website: https://ehservices.publichealth.lacounty.gov/

// ── All Profiles ──────────────────────────────────────────────

export const ALL_JURISDICTIONS: JurisdictionProfile[] = [
  FEDERAL,
  CALIFORNIA,
  FRESNO_COUNTY,
  MERCED_COUNTY,
  STANISLAUS_COUNTY,
  MODESTO_CITY,
];

/**
 * Get a jurisdiction profile by ID.
 */
export function getJurisdiction(id: string): JurisdictionProfile | undefined {
  return ALL_JURISDICTIONS.find(j => j.id === id);
}

/**
 * Get the full jurisdiction chain (most general to most specific) for a given jurisdiction.
 */
export function getJurisdictionChain(jurisdictionId: string): JurisdictionProfile[] {
  const chain: JurisdictionProfile[] = [];
  let current = getJurisdiction(jurisdictionId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? getJurisdiction(current.parentId) : undefined;
  }
  return chain;
}

// ── Demo Location → Jurisdiction Mapping ──────────────────────

export interface LocationJurisdiction {
  locationName: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  jurisdictionChain: string[]; // jurisdiction IDs from most general to most specific
}

export const DEMO_LOCATION_JURISDICTIONS: LocationJurisdiction[] = [
  {
    locationName: 'Downtown Kitchen',
    address: '1245 Fulton Street',
    city: 'Fresno',
    county: 'Fresno County',
    state: 'CA',
    zip: '93721',
    lat: 36.7378,
    lng: -119.7871,
    jurisdictionChain: ['federal-fda', 'state-ca', 'county-fresno'],
  },
  {
    locationName: 'Airport Cafe',
    address: '1636 Macready Drive',
    city: 'Merced',
    county: 'Merced County',
    state: 'CA',
    zip: '95340',
    lat: 37.2847,
    lng: -120.5139,
    jurisdictionChain: ['federal-fda', 'state-ca', 'county-merced'],
  },
  {
    locationName: 'University Dining',
    address: '1 University Circle',
    city: 'Modesto',
    county: 'Stanislaus County',
    state: 'CA',
    zip: '95348',
    lat: 37.6393,
    lng: -120.9969,
    jurisdictionChain: ['federal-fda', 'state-ca', 'county-stanislaus', 'city-modesto'],
  },
];
