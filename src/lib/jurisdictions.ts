// ============================================================
// EvidLY Jurisdiction Profiles
// ============================================================
// Hierarchical compliance profiles: Federal → State → County → City
// More specific jurisdictions override less specific ones.
//
// TODO: Arizona, Oregon, Texas, Florida jurisdiction profiles
// TODO: API to pull jurisdiction data from regulatory databases
// TODO: AI-powered jurisdiction detection from address geocoding
// TODO: Auto-updates when regulatory change alerts modify jurisdiction requirements
// TODO: International jurisdictions (for enterprise/global chains)
// TODO: County health dept API integrations for real-time inspection data
// TODO: Insurance carrier requirement overlays
// ============================================================

import { ADDITIONAL_COUNTIES } from './californiaCounties';

// ── Core Types ──────────────────────────────────────────────

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

export interface InspectionSystem {
  type: 'letter_grade' | 'color_placard' | 'pass_fail' | 'score_only' | 'disclosure_only' | 'standard';
  details: string;
  grades?: { label: string; range: string }[];
}

export interface MinimumWageInfo {
  general: number;
  fastFood?: number;
  healthcare?: number;
  source: string;
  effectiveDate: string;
}

export interface CaliforniaStateLaw {
  id: string;
  billNumber: string;
  name: string;
  effectiveDate: string;
  description: string;
  requirements: string[];
  affectedBusinessTypes: string[];
  penalties?: string;
  exemptions?: string[];
  status: 'effective' | 'upcoming' | 'phased';
}

export interface CityOrdinance {
  cityName: string;
  county: string;
  minimumWage?: number;
  minimumWageEffective?: string;
  hasIndependentHealthDept: boolean;
  healthDeptName?: string;
  healthDeptPhone?: string;
  additionalOrdinances: string[];
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
  inspectionSystem?: InspectionSystem;
  minimumWage?: MinimumWageInfo;
  populationTier?: 'large' | 'medium' | 'small';
  specialRequirements: string[];
}

// ── Federal (FDA Food Code 2022 + NFPA + OSHA) ─────────────

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
    { foodType: 'Stuffed Items', requiredTempF: 165, holdTimeSeconds: 15, source: 'FDA Food Code §3-401.11(A)' },
    { foodType: 'Microwave Cooking', requiredTempF: 165, holdTimeSeconds: 0, source: 'FDA Food Code §3-401.12 (stand 2 min after)' },
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
    { service: 'Hood Cleaning (Solid Fuel)', frequencyDays: 30, frequencyLabel: 'Monthly', condition: 'Solid fuel cooking (wood, charcoal, pellets)', source: 'NFPA 96 Table 11.4' },
    { service: 'Hood Cleaning (High Volume)', frequencyDays: 90, frequencyLabel: 'Quarterly', condition: '24-hour operations, wok cooking, charbroiling', source: 'NFPA 96 Table 11.4' },
    { service: 'Hood Cleaning (Moderate Volume)', frequencyDays: 180, frequencyLabel: 'Semi-annually', condition: 'Standard cooking operations', source: 'NFPA 96 Table 11.4' },
    { service: 'Hood Cleaning (Low Volume)', frequencyDays: 365, frequencyLabel: 'Annually', condition: 'Churches, day camps, seasonal, low-volume', source: 'NFPA 96 Table 11.4' },
    { service: 'Fire Suppression System', frequencyDays: 180, frequencyLabel: 'Semi-annually', source: 'NFPA 96 §11.2.2 / NFPA 17A' },
    { service: 'Fire Extinguisher Visual Inspection', frequencyDays: 30, frequencyLabel: 'Monthly', condition: 'Staff visual check', source: 'NFPA 10 §7.2.1' },
    { service: 'Fire Extinguisher Professional Service', frequencyDays: 365, frequencyLabel: 'Annually', source: 'NFPA 10 §7.3.1' },
    { service: 'Fire Extinguisher 6-Year Maintenance', frequencyDays: 2190, frequencyLabel: 'Every 6 years', source: 'NFPA 10 §7.3.3' },
    { service: 'Fire Extinguisher Hydrostatic Test', frequencyDays: 4380, frequencyLabel: 'Every 12 years', source: 'NFPA 10 §8.3.1' },
  ],
  specialRequirements: [
    'Date marking: 7 days max for ready-to-eat TCS food held at 41°F or below (day 1 = day of preparation)',
    'Consumer advisory required for raw/undercooked items on menu',
    'Bare hand contact with ready-to-eat foods prohibited',
    'Person in charge must be present during all hours of operation',
    'Thermometer calibration: accurate to ±2°F, calibrated regularly',
    'Cross-contamination: separate cutting boards/equipment for raw and ready-to-eat',
    'NFPA 96: Automatic fire suppression (UL 300 wet chemical) required for all hoods/ducts',
    'NFPA 96: Manual pull station required, automatic gas/electric shut-offs on suppression activation',
    'NFPA 10: Class K extinguisher required in ALL commercial kitchens',
    'OSHA: Hazard Communication required (GHS labels, SDS sheets)',
    'OSHA: Recordkeeping for injuries/illnesses (OSHA 300 log)',
  ],
};

// ── California (CalCode + Cal/OSHA) ─────────────────────────

const CALIFORNIA: JurisdictionProfile = {
  id: 'state-ca',
  name: 'California (CalCode)',
  level: 'state',
  parentId: 'federal-fda',
  temperatureThresholds: [], // Inherits federal thresholds
  cookingTemps: [], // Inherits federal cooking temps
  coolingRequirements: [], // Inherits federal cooling (CalCode matches FDA)
  certifications: [
    {
      type: 'Food Handler Certification',
      description: 'Required for all food employees within 30 days of hire. Employer must pay all costs (SB 476). Training must occur during work hours.',
      renewalYears: 3,
      approvedProviders: ['ServSafe', 'eFoodHandlers', 'StateFoodSafety', 'Learn2Serve', 'Always Food Safe', '360training'],
      source: 'CalCode §113948 / SB 476',
    },
    {
      type: 'Food Protection Manager Certification',
      description: 'At least one certified food protection manager per location at all times during operating hours',
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
    { name: 'Hood Cleaning Certificate', description: 'Professional hood/exhaust system cleaning certificate — must clean to bare metal', renewalFrequency: 'Per NFPA 96 schedule', source: 'NFPA 96 / CalCode' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96 §11.2.2' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10 §7.3.1' },
    { name: 'Grease Trap Maintenance Record', description: 'Grease interceptor pumping and cleaning records', renewalFrequency: 'Per local requirement', source: 'Local pretreatment ordinance' },
    { name: 'Pest Control Service Agreement', description: 'Active pest control service contract', renewalFrequency: 'Ongoing (monthly service)', source: 'CalCode §114259' },
    { name: 'Indoor Heat Illness Prevention Plan (IHIPP)', description: 'Written plan required for all indoor workplaces including commercial kitchens', renewalFrequency: 'Ongoing — maintain for 12 months min', source: 'Cal/OSHA §3396' },
    { name: 'Pest Prevention Training Records', description: 'Training records for all employees on pest prevention procedures', renewalFrequency: 'Ongoing', source: 'AB 1147 / H&S Code §114266' },
    // California Fire Code (CFC) — Title 24, Part 9 documents
    { name: 'Fire Prevention Permit', description: 'Fire prevention permit from local fire authority (AHJ) — separate from health department permit. Permit fees vary by jurisdiction.', renewalFrequency: 'Annual', source: 'CFC §105.6' },
    { name: 'UL 300 Suppression System Compliance Certificate', description: 'Certificate verifying UL 300 compliant wet chemical fire suppression system installed on all Type I commercial cooking hoods', renewalFrequency: 'Upon installation / modification', source: 'CFC Ch. 6.07 / NFPA 96' },
    { name: 'SDS (Safety Data Sheets) Binder', description: 'Safety Data Sheets for all cleaning chemicals and hazardous materials — must be accessible to all employees at all times', renewalFrequency: 'Ongoing — update when products change', source: 'CFC Ch. 50 / OSHA 29 CFR 1910.1200' },
  ],
  requiredPostings: [
    { name: 'Health Permit', languages: ['English'], source: 'CalCode §114381' },
    { name: 'Handwashing Signage', languages: ['English', 'Spanish'], source: 'CalCode §113953.3' },
    { name: 'Employee Illness Reporting', languages: ['English', 'Spanish'], source: 'CalCode §113949.2' },
    { name: 'Consumer Advisory (raw items)', languages: ['English'], source: 'CalCode §114093' },
    { name: 'Choking Poster', languages: ['English'], source: 'California Health & Safety Code' },
    { name: 'Workers Compensation Notice', languages: ['English', 'Spanish'], source: 'California Labor Code' },
    { name: 'Minimum Wage Notice', languages: ['English', 'Spanish'], source: 'California Labor Code' },
    { name: 'Allergen Awareness (Big 9)', languages: ['English'], source: 'CalCode / FDA (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy, sesame)' },
    { name: 'Cal/OSHA Indoor Heat Illness Prevention', languages: ['English', 'Spanish'], source: 'Cal/OSHA §3396' },
    { name: 'Workplace Know Your Rights', languages: ['English', 'Spanish'], source: 'SB 294 (annual posting required)' },
  ],
  serviceFrequencies: [
    // CFC-specific service frequencies (supplement federal NFPA entries)
    { service: 'Hood Filter Cleaning', frequencyDays: 7, frequencyLabel: 'Weekly (min)', condition: 'Staff cleaning of removable hood filters — more frequent for high-volume', source: 'CFC Ch. 6.07 / NFPA 96 §11.6' },
    { service: 'Fire Suppression Tamper Check', frequencyDays: 30, frequencyLabel: 'Monthly', condition: 'Staff visual: verify seals intact, nozzles unobstructed, gauge in range', source: 'CFC Ch. 6 / NFPA 96 §11.2.1' },
    { service: 'Fire Prevention Permit Renewal', frequencyDays: 365, frequencyLabel: 'Annually', source: 'CFC §105.6 — local fire authority (AHJ)' },
  ],
  minimumWage: {
    general: 16.90,
    fastFood: 20.00,
    healthcare: 18.63,
    source: 'California Labor Code / AB 1228',
    effectiveDate: '2026-01-01',
  },
  specialRequirements: [
    'Handwashing signage must be posted in English and Spanish at all handwashing stations',
    'Consumer advisory required for raw or undercooked animal-derived foods',
    'Big 9 allergen awareness: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame',
    'Grease interceptor required for commercial kitchens discharging fats, oils, and grease (FOG)',
    'Mobile food facility permits require separate county process',
    'Temporary food facility permits required for events lasting 25 days or fewer',
    'SB 476: Employers MUST pay all costs for food handler card/training — cannot require card as a prerequisite',
    'Cal/OSHA §3396: Indoor heat protection at 82°F (or 82°F for commercial kitchens as high-radiant-heat areas)',
    'Cal/OSHA §3396: At 87°F implement engineering controls (AC, fans), admin controls, work-rest schedules',
    'SB 1053: Single-use carry-out bags completely eliminated (Jan 1, 2026)',
    'AB 1147: Written pest prevention policy, employee training, and monitoring records required',
    'SB 294: Written notice of workers\' rights to all current employees, annual notices required',
    // California Fire Code (CFC) — Title 24, Part 9 (2022 edition, effective Jan 1, 2023)
    'CFC Ch. 6: Fire suppression system required for ALL Type I commercial cooking hoods',
    'CFC Ch. 6: Automatic shutdown of fuel/electrical supply upon suppression system activation',
    'CFC Ch. 6: Manual pull station required within 10-20 ft travel distance of egress path',
    'CFC Ch. 6.07: Adopts NFPA 96 by reference with California amendments',
    'CFC Ch. 6.07: UL 300 compliant wet chemical suppression systems mandatory for all Type I hoods',
    'CFC Ch. 6.07: Hood and duct cleaning must meet bare metal standard per NFPA 96 schedule',
    'CFC Ch. 6.07: Hood cleaning documentation MUST be maintained on-site and available for fire inspector',
    'CFC Ch. 9: Fire alarm system maintenance per NFPA 72',
    'CFC Ch. 9: Fire extinguisher requirements per NFPA 10 — Class K mandatory in ALL commercial kitchens',
    'CFC Ch. 9: Annual extinguisher inspection + 6-year maintenance + 12-year hydrostatic test',
    'CFC Ch. 50: Cleaning chemical storage must meet hazardous materials requirements (if applicable)',
    'CFC Ch. 50: SDS (Safety Data Sheets) must be accessible to all employees at all times',
    'CFC: Fire prevention permit required from local fire authority — separate from health department permit',
    'CFC: Annual inspection by local Authority Having Jurisdiction (AHJ)',
    'CFC: Enforced by LOCAL fire authorities (58 counties + ~400+ AHJs in California) — State Fire Marshal (SFM) has oversight',
  ],
};

// ── Fresno County (Downtown Kitchen) ────────────────────────

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
  inspectionSystem: {
    type: 'standard',
    details: 'Standard CalCode enforcement with risk-based inspection frequency. Inspection results available upon request.',
  },
  populationTier: 'large',
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

// ── Merced County (Airport Cafe) ────────────────────────────

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
  inspectionSystem: {
    type: 'standard',
    details: 'Standard CalCode enforcement with annual permit renewal. Inspection results available upon request.',
  },
  populationTier: 'medium',
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

// ── Stanislaus County (University Dining) ───────────────────

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
  inspectionSystem: {
    type: 'standard',
    details: 'Standard CalCode enforcement with risk-based inspection frequency. Inspection results available upon request.',
  },
  populationTier: 'medium',
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

// ── City of Modesto (overlay for University Dining) ─────────

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

// ── All Profiles ────────────────────────────────────────────

export const ALL_JURISDICTIONS: JurisdictionProfile[] = [
  FEDERAL,
  CALIFORNIA,
  FRESNO_COUNTY,
  MERCED_COUNTY,
  STANISLAUS_COUNTY,
  MODESTO_CITY,
  ...ADDITIONAL_COUNTIES,
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

// ── Demo Location → Jurisdiction Mapping ────────────────────

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
