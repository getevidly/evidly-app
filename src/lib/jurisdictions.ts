// ============================================================
// EvidLY Jurisdiction Profiles
// ============================================================
// Hierarchical compliance profiles: Federal → State → County → City
// More specific jurisdictions override less specific ones.
//
// DONE: Arizona, Oregon, Texas, Florida, New York, Washington jurisdiction profiles
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

// ── Federal (FDA Food Code 2022 + NFPA 2025 + OSHA) ─────────────

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
    { service: 'Hood Cleaning (Solid Fuel)', frequencyDays: 30, frequencyLabel: 'Monthly', condition: 'Solid fuel cooking (wood, charcoal, pellets)', source: 'NFPA 96-2025 Table 11.4' },
    { service: 'Hood Cleaning (High Volume)', frequencyDays: 90, frequencyLabel: 'Quarterly', condition: '24-hour operations, wok cooking, charbroiling', source: 'NFPA 96-2025 Table 11.4' },
    { service: 'Hood Cleaning (Moderate Volume)', frequencyDays: 180, frequencyLabel: 'Semi-annually', condition: 'Standard cooking operations', source: 'NFPA 96-2025 Table 11.4' },
    { service: 'Hood Cleaning (Low Volume)', frequencyDays: 365, frequencyLabel: 'Annually', condition: 'Churches, day camps, seasonal, low-volume', source: 'NFPA 96-2025 Table 11.4' },
    { service: 'Fire Suppression System', frequencyDays: 180, frequencyLabel: 'Semi-annually', source: 'NFPA 96-2025 §11.2.2 / NFPA 17A-2025' },
    { service: 'Fire Extinguisher Visual Inspection', frequencyDays: 30, frequencyLabel: 'Monthly', condition: 'Staff visual check', source: 'NFPA 10-2025 §7.2.1' },
    { service: 'Fire Extinguisher Professional Service', frequencyDays: 365, frequencyLabel: 'Annually', source: 'NFPA 10-2025 §7.3.1' },
    { service: 'Fire Extinguisher 6-Year Maintenance', frequencyDays: 2190, frequencyLabel: 'Every 6 years', source: 'NFPA 10-2025 §7.3.3' },
    { service: 'Fire Extinguisher Hydrostatic Test', frequencyDays: 4380, frequencyLabel: 'Every 12 years', source: 'NFPA 10-2025 §8.3.1' },
  ],
  specialRequirements: [
    'Date marking: 7 days max for ready-to-eat TCS food held at 41°F or below (day 1 = day of preparation)',
    'Consumer advisory required for raw/undercooked items on menu',
    'Bare hand contact with ready-to-eat foods prohibited',
    'Person in charge must be present during all hours of operation',
    'Thermometer calibration: accurate to ±2°F, calibrated regularly',
    'Cross-contamination: separate cutting boards/equipment for raw and ready-to-eat',
    'NFPA 96 (2025 Edition): Automatic fire suppression (UL 300 wet chemical) required for all hoods/ducts',
    'NFPA 96 (2025 Edition): Manual pull station required, automatic gas/electric shut-offs on suppression activation',
    'NFPA 10 (2025 Edition): Class K extinguisher required in ALL commercial kitchens',
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
  // California cooling is stricter: timer starts from actual cooked temp (not 135°F)
  coolingRequirements: [
    { stage: 'Stage 1 (California)', fromTempF: 135, toTempF: 70, maxHours: 2, source: 'CalCode §114002(a) — effective April 1, 2026. Timer starts from cooked temperature (not 135°F). Stricter than FDA.' },
    { stage: 'Stage 2 (California)', fromTempF: 70, toTempF: 41, maxHours: 4, source: 'CalCode §114002(a) — effective April 1, 2026. 6 hours total from start of cooling.' },
  ],
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
    { name: 'Hood Cleaning Certificate', description: 'Professional hood/exhaust system cleaning certificate — must clean to bare metal', renewalFrequency: 'Per NFPA 96 (2025 Edition) schedule', source: 'NFPA 96-2025 / CalCode' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96-2025 §11.2.2' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10-2025 §7.3.1' },
    { name: 'Grease Trap Maintenance Record', description: 'Grease interceptor pumping and cleaning records', renewalFrequency: 'Per local requirement', source: 'Local pretreatment ordinance' },
    { name: 'Pest Control Service Agreement', description: 'Active pest control service contract', renewalFrequency: 'Ongoing (monthly service)', source: 'CalCode §114259' },
    { name: 'Indoor Heat Illness Prevention Plan (IHIPP)', description: 'Written plan required for all indoor workplaces including commercial kitchens', renewalFrequency: 'Ongoing — maintain for 12 months min', source: 'Cal/OSHA §3396' },
    { name: 'Pest Prevention Training Records', description: 'Training records for all employees on pest prevention procedures', renewalFrequency: 'Ongoing', source: 'AB 1147 / H&S Code §114266' },
    // California Fire Code (CFC) — Title 24, Part 9 documents
    { name: 'Fire Prevention Permit', description: 'Fire prevention permit from local fire authority (AHJ) — separate from health department permit. Permit fees vary by jurisdiction.', renewalFrequency: 'Annual', source: 'CFC §105.6' },
    { name: 'UL 300 Suppression System Compliance Certificate', description: 'Certificate verifying UL 300 compliant wet chemical fire suppression system installed on all Type I commercial cooking hoods', renewalFrequency: 'Upon installation / modification', source: 'CFC Ch. 6.07 / NFPA 96-2025' },
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
    { service: 'Hood Filter Cleaning', frequencyDays: 7, frequencyLabel: 'Weekly (min)', condition: 'Staff cleaning of removable hood filters — more frequent for high-volume', source: 'CFC Ch. 6.07 / NFPA 96-2025 §11.6' },
    { service: 'Fire Suppression Tamper Check', frequencyDays: 30, frequencyLabel: 'Monthly', condition: 'Staff visual: verify seals intact, nozzles unobstructed, gauge in range', source: 'CFC Ch. 6 / NFPA 96-2025 §11.2.1' },
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
    // California Cooling Requirement — CalCode §114002(a), effective April 1, 2026
    'CalCode §114002(a): Cooked foods must reach 70°F within 2 hours from ACTUAL cooked temperature (stricter than FDA which starts at 135°F)',
    'CalCode §114002(a): Then 70°F to 41°F within 4 additional hours (6 hours total). Enforcement begins May 1, 2026.',
    'Staff training required: 2-hour first-stage cooling window — adjust batch sizes or use ice baths if items regularly exceed 2 hours',
    // California Fire Code (CFC) — Title 24, Part 9 (2022 edition, effective Jan 1, 2023)
    'CFC Ch. 6: Fire suppression system required for ALL Type I commercial cooking hoods',
    'CFC Ch. 6: Automatic shutdown of fuel/electrical supply upon suppression system activation',
    'CFC Ch. 6: Manual pull station required within 10-20 ft travel distance of egress path',
    'CFC Ch. 6.07: Adopts NFPA 96 (2025 Edition) by reference with California amendments',
    'CFC Ch. 6.07: UL 300 compliant wet chemical suppression systems mandatory for all Type I hoods',
    'CFC Ch. 6.07: Hood and duct cleaning must meet bare metal standard per NFPA 96 (2025 Edition) schedule',
    'CFC Ch. 6.07: Hood cleaning documentation MUST be maintained on-site and available for fire inspector',
    'CFC Ch. 9: Fire alarm system maintenance per NFPA 72-2025',
    'CFC Ch. 9: Fire extinguisher requirements per NFPA 10 (2025 Edition) — Class K mandatory in ALL commercial kitchens',
    'CFC Ch. 9: Annual extinguisher inspection + 6-year maintenance + 12-year hydrostatic test',
    'CFC Ch. 50: Cleaning chemical storage must meet hazardous materials requirements (if applicable)',
    'CFC Ch. 50: SDS (Safety Data Sheets) must be accessible to all employees at all times',
    'CFC: Fire prevention permit required from local fire authority — separate from health department permit',
    'CFC: Annual inspection by local Authority Having Jurisdiction (AHJ)',
    'CFC: Enforced by LOCAL fire authorities (58 counties + ~400+ AHJs in California) — State Fire Marshal (SFM) has oversight',
  ],
};

// ── Texas (TFER — 25 TAC Chapter 228) ───────────────────────

const TEXAS: JurisdictionProfile = {
  id: 'state-tx',
  name: 'Texas (TFER — 25 TAC Chapter 228)',
  level: 'state',
  parentId: 'federal-fda',
  temperatureThresholds: [], // Inherits federal thresholds
  cookingTemps: [], // Inherits federal cooking temps
  coolingRequirements: [], // Inherits federal cooling requirements
  certifications: [
    {
      type: 'Certified Food Manager (CFM)',
      description: 'At least one Certified Food Manager required per establishment. Must pass an ANSI-accredited exam.',
      renewalYears: 5,
      approvedProviders: ['ServSafe', 'Prometric', 'National Registry'],
      source: '25 TAC §228.221',
    },
    {
      type: 'Food Handler Card',
      description: 'All food employees must obtain a food handler card within 60 days of employment. Employer must provide training opportunity.',
      renewalYears: 2,
      approvedProviders: ['ServSafe', 'eFoodHandlers', 'StateFoodSafety', 'Learn2Serve', 'TABC-approved providers'],
      source: '25 TAC §228.223 / Texas Health & Safety Code §438.046',
    },
  ],
  requiredDocuments: [
    { name: 'Certified Food Manager Certificate', description: 'Valid CFM certificate from ANSI-accredited program', renewalFrequency: 'Every 5 years', source: '25 TAC §228.221' },
    { name: 'Food Handler Training Records', description: 'Records of food handler card completion for all food employees', renewalFrequency: 'Every 2 years', source: '25 TAC §228.223' },
    { name: 'Health Permit', description: 'Valid food establishment permit from local health authority', renewalFrequency: 'Annual', source: 'Texas Health & Safety Code §437.0055' },
    { name: 'Mobile Unit Commissary Letter', description: 'Letter from commissary agreeing to service mobile food unit (mobile vendors only)', renewalFrequency: 'Annual', source: '25 TAC §228.222' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96 / Texas Fire Code' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10 / Texas Fire Code' },
  ],
  requiredPostings: [
    { name: 'Choking First Aid Poster', languages: ['English'], source: 'Texas Health & Safety Code §437.018' },
    { name: 'Food Handler Certification Notice', languages: ['English', 'Spanish'], source: '25 TAC §228.223' },
    { name: 'Handwashing Signs', languages: ['English', 'Spanish'], source: '25 TAC §228.64' },
    { name: 'Health Permit', languages: ['English'], source: 'Texas Health & Safety Code §437.0055' },
    { name: 'Employee Illness Reporting Policy', languages: ['English', 'Spanish'], source: '25 TAC §228.37' },
  ],
  inspectionSystem: {
    type: 'score_only',
    details: 'Numerical scoring system (0-100). Deductions based on violation severity. Score of 70 or above required to pass.',
    grades: [
      { label: 'Excellent', range: '90-100' },
      { label: 'Good', range: '80-89' },
      { label: 'Acceptable', range: '70-79' },
      { label: 'Failing', range: 'Below 70' },
    ],
  },
  serviceFrequencies: [
    { service: 'Pest Control Service', frequencyDays: 30, frequencyLabel: 'Monthly', source: '25 TAC §228.186' },
  ],
  specialRequirements: [
    'Certified Food Manager (CFM) required — at least one per establishment during all hours of operation',
    'Food handlers must obtain a food handler card within 60 days of employment',
    'Bare hand contact with ready-to-eat foods is prohibited',
    'Mobile food units must have a signed commissary agreement letter on file',
    'Numerical inspection scoring: 0-100 scale, 70 minimum to pass',
    'Texas does not adopt FDA Food Code directly — uses TFER (25 TAC Chapter 228) based on 2017 FDA Food Code',
    'Local health authorities (city/county) may impose additional requirements beyond state minimum',
    'Food establishments must cease operations if score falls below 70 until re-inspection',
  ],
};

// ── Florida (Chapter 64E-11 FAC) ────────────────────────────

const FLORIDA: JurisdictionProfile = {
  id: 'state-fl',
  name: 'Florida (Chapter 64E-11 FAC)',
  level: 'state',
  parentId: 'federal-fda',
  temperatureThresholds: [], // Inherits federal thresholds
  cookingTemps: [], // Inherits federal cooking temps
  coolingRequirements: [], // Inherits federal cooling requirements
  certifications: [
    {
      type: 'Food Manager Certification',
      description: 'At least one certified food manager must be employed (not contracted) at each establishment. Must pass ANSI-accredited exam.',
      renewalYears: 5,
      approvedProviders: ['ServSafe', 'Prometric', 'National Registry', 'Learn2Serve'],
      source: 'Chapter 509.039 F.S. / 64E-11.012 FAC',
    },
  ],
  requiredDocuments: [
    { name: 'Food Manager Certification', description: 'Valid food manager certification — manager must be an employee, not a contractor', renewalFrequency: 'Every 5 years', source: 'Chapter 509.039 F.S.' },
    { name: 'Employee Health Policy', description: 'Written employee health policy addressing illness reporting and exclusion/restriction', renewalFrequency: 'Ongoing', source: '64E-11.003 FAC' },
    { name: 'Health Permit (DBPR License)', description: 'Public food service license from Florida DBPR', renewalFrequency: 'Annual', source: 'Chapter 509.241 F.S.' },
    { name: 'Shellfish HACCP Plan', description: 'HACCP plan required for establishments handling raw shellfish', renewalFrequency: 'Ongoing — update when menu/procedures change', source: '64E-11.005 FAC' },
    { name: 'Backflow Prevention Records', description: 'Backflow prevention device testing and maintenance records', renewalFrequency: 'Annual testing', source: '64E-11.004 FAC / Florida Building Code' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96 / Florida Fire Prevention Code' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10 / Florida Fire Prevention Code' },
  ],
  requiredPostings: [
    { name: 'Food Manager Certification Display', languages: ['English'], source: 'Chapter 509.039 F.S.' },
    { name: 'Employee Health Policy', languages: ['English', 'Spanish'], source: '64E-11.003 FAC' },
    { name: 'Handwashing Signs', languages: ['English', 'Spanish'], source: '64E-11.004 FAC' },
    { name: 'Public Food Service License', languages: ['English'], source: 'Chapter 509.241 F.S.' },
    { name: 'Consumer Advisory (raw items)', languages: ['English'], source: '64E-11.005 FAC' },
  ],
  inspectionSystem: {
    type: 'pass_fail',
    details: 'Pass/fail system based on priority items. Establishments categorized by risk: high risk (3x/year), moderate risk (2x/year), low risk (1x/year). Priority violations require immediate correction or follow-up.',
  },
  serviceFrequencies: [
    { service: 'Pest Control Service', frequencyDays: 30, frequencyLabel: 'Monthly', source: '64E-11.004 FAC' },
  ],
  specialRequirements: [
    'Risk-based inspection frequency: high-risk 3x/year, moderate 2x/year, low-risk 1x/year',
    'Food Manager must be an employee of the establishment — contracted food managers not accepted',
    'Shellfish HACCP plan required for any establishment handling raw shellfish',
    'Backflow prevention devices must be tested annually by a certified tester',
    'Employee health policy must be written and available for inspector review',
    'Florida DBPR (Department of Business and Professional Regulation) issues public food service licenses',
    'Priority violations require immediate corrective action or establishment faces follow-up within 24 hours',
    'Chapter 64E-11 FAC based on 2017 FDA Food Code with Florida-specific amendments',
  ],
};

// ── New York (10 NYCRR Subpart 14-1) ────────────────────────

const NEW_YORK: JurisdictionProfile = {
  id: 'state-ny',
  name: 'New York (10 NYCRR Subpart 14-1)',
  level: 'state',
  parentId: 'federal-fda',
  temperatureThresholds: [], // Inherits federal thresholds
  cookingTemps: [], // Inherits federal cooking temps
  coolingRequirements: [], // Inherits federal cooling requirements
  certifications: [
    {
      type: 'Food Protection Certificate',
      description: 'At least one supervisory staff member with a Food Protection Certificate required per establishment during all hours of operation.',
      renewalYears: 5,
      approvedProviders: ['ServSafe', 'Prometric', 'National Registry', 'NYC DOHMH-approved courses'],
      source: '10 NYCRR Subpart 14-1.81',
    },
    {
      type: 'Allergen Awareness Training',
      description: 'All food service workers must complete allergen awareness training. Required by New York State law.',
      renewalYears: 3,
      approvedProviders: ['ServSafe Allergens', 'State-approved providers'],
      source: 'New York Public Health Law §1399-bb',
    },
  ],
  requiredDocuments: [
    { name: 'Food Protection Certificate', description: 'Valid Food Protection Certificate for supervisory personnel', renewalFrequency: 'Every 5 years', source: '10 NYCRR Subpart 14-1.81' },
    { name: 'Allergen Training Records', description: 'Records of allergen awareness training for all food service employees', renewalFrequency: 'Every 3 years', source: 'Public Health Law §1399-bb' },
    { name: 'Trans Fat Compliance Records', description: 'Documentation showing compliance with trans fat restrictions (NYC)', renewalFrequency: 'Ongoing', source: 'NYC Health Code §81.08' },
    { name: 'Health Permit', description: 'Valid food service establishment permit from local health department', renewalFrequency: 'Annual', source: '10 NYCRR Subpart 14-1' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96 / NY Fire Code' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10 / NY Fire Code' },
  ],
  requiredPostings: [
    { name: 'Letter Grade (NYC only)', languages: ['English'], source: 'NYC Health Code §81.51 — required display in front window' },
    { name: 'Choking First Aid Poster', languages: ['English'], source: 'New York General Business Law §399-dd' },
    { name: 'Allergen Awareness Notice', languages: ['English'], source: 'Public Health Law §1399-bb' },
    { name: 'Calorie Postings (chains 15+ locations)', languages: ['English'], source: 'NYC Health Code §81.50 / Federal menu labeling' },
    { name: 'Handwashing Signs', languages: ['English'], source: '10 NYCRR Subpart 14-1.43' },
    { name: 'Health Permit', languages: ['English'], source: '10 NYCRR Subpart 14-1' },
  ],
  inspectionSystem: {
    type: 'letter_grade',
    details: 'NYC: Letter grade system (A, B, C) based on violation points — displayed in front window. Rest of state: pass/fail inspection system by local health departments.',
    grades: [
      { label: 'A', range: '0-13 violation points' },
      { label: 'B', range: '14-27 violation points' },
      { label: 'C', range: '28+ violation points' },
    ],
  },
  serviceFrequencies: [
    { service: 'Pest Control Service', frequencyDays: 30, frequencyLabel: 'Monthly', source: '10 NYCRR Subpart 14-1' },
  ],
  specialRequirements: [
    'Food Protection Certificate required — at least one certified supervisor during all operating hours',
    'Allergen awareness training required for all food service workers',
    'NYC: Letter grade (A, B, C) must be posted in front window — grade based on violation points',
    'NYC: Trans fat ban — no artificial trans fats in food preparation',
    'NYC: Calorie posting required for chain restaurants with 15+ locations nationwide',
    'NYC: Initial inspection + re-inspection cycle; grade pending allowed during adjudication',
    'Rest of state: Local health departments conduct pass/fail inspections',
    '10 NYCRR Subpart 14-1 based on 2017 FDA Food Code with New York-specific amendments',
  ],
};

// ── Washington (WAC 246-215) ────────────────────────────────

const WASHINGTON: JurisdictionProfile = {
  id: 'state-wa',
  name: 'Washington (WAC 246-215)',
  level: 'state',
  parentId: 'federal-fda',
  temperatureThresholds: [], // Inherits federal thresholds
  cookingTemps: [], // Inherits federal cooking temps
  coolingRequirements: [], // Inherits federal cooling requirements
  certifications: [
    {
      type: 'Food Worker Card',
      description: 'All food workers must obtain a Washington State Food Worker Card within 14 days of hire. Valid for 2 years. Training and test administered by WA DOH or approved providers.',
      renewalYears: 2,
      approvedProviders: ['Washington State DOH', 'Local health jurisdictions', 'Approved online providers'],
      source: 'RCW 69.06.010 / WAC 246-215',
    },
  ],
  requiredDocuments: [
    { name: 'Food Worker Cards', description: 'Valid Washington State Food Worker Cards for all food employees — must be obtained within 14 days of hire', renewalFrequency: 'Every 2 years', source: 'RCW 69.06.010' },
    { name: 'Food Allergy Procedure', description: 'Written food allergy awareness and response procedure', renewalFrequency: 'Ongoing — update when menu/procedures change', source: 'WAC 246-215-02315' },
    { name: 'Health Permit', description: 'Valid food establishment permit from local health jurisdiction', renewalFrequency: 'Annual', source: 'WAC 246-215' },
    { name: 'Commissary Agreement (mobile)', description: 'Signed commissary agreement for mobile food units', renewalFrequency: 'Annual', source: 'WAC 246-215-09300' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96 / WA Fire Code' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10 / WA Fire Code' },
  ],
  requiredPostings: [
    { name: 'Food Worker Card Display', languages: ['English'], source: 'RCW 69.06.010 — cards available for inspector review' },
    { name: 'Food Permit', languages: ['English'], source: 'WAC 246-215' },
    { name: 'Allergy Awareness Procedure', languages: ['English'], source: 'WAC 246-215-02315' },
    { name: 'Handwashing Signs', languages: ['English', 'Spanish'], source: 'WAC 246-215-03250' },
  ],
  inspectionSystem: {
    type: 'color_placard',
    details: 'Color-coded placard system: Green = Good (in compliance), Yellow = Satisfactory (minor issues), Red = Needs Improvement (critical violations). Placard must be posted at entrance.',
    grades: [
      { label: 'Green', range: 'Good — in compliance' },
      { label: 'Yellow', range: 'Satisfactory — minor violations' },
      { label: 'Red', range: 'Needs Improvement — critical violations' },
    ],
  },
  serviceFrequencies: [
    { service: 'Pest Control Service', frequencyDays: 30, frequencyLabel: 'Monthly', source: 'WAC 246-215' },
  ],
  specialRequirements: [
    'Food Worker Card required within 14 days of hire — valid for 2 years',
    'Written food allergy awareness and response procedure required for all food establishments',
    'Color placard inspection system: Green (good), Yellow (satisfactory), Red (needs improvement)',
    'Placard must be posted in a conspicuous location visible to the public at the entrance',
    'Mobile food units must have signed commissary agreement on file',
    'Local health jurisdictions (35 in WA) enforce WAC 246-215 — requirements may vary by jurisdiction',
    'WAC 246-215 based on 2017 FDA Food Code with Washington-specific amendments',
    'Permit holders must allow inspector access during all hours of operation',
  ],
};

// ── Oregon (OAR 333-150) ────────────────────────────────────

const OREGON: JurisdictionProfile = {
  id: 'state-or',
  name: 'Oregon (OAR 333-150)',
  level: 'state',
  parentId: 'federal-fda',
  temperatureThresholds: [], // Inherits federal thresholds
  cookingTemps: [], // Inherits federal cooking temps
  coolingRequirements: [], // Inherits federal cooling requirements
  certifications: [
    {
      type: 'Oregon Food Handler Card',
      description: 'All food handlers must obtain an Oregon-specific Food Handler Card. Oregon does not accept out-of-state food handler cards. Must complete Oregon-approved training and pass exam.',
      renewalYears: 3,
      approvedProviders: ['Oregon Health Authority-approved providers', 'Local county health departments'],
      source: 'ORS 624.570 / OAR 333-175',
    },
  ],
  requiredDocuments: [
    { name: 'Oregon Food Handler Cards', description: 'Oregon-specific food handler cards for all food employees — out-of-state cards not accepted', renewalFrequency: 'Every 3 years', source: 'ORS 624.570' },
    { name: 'Allergen Training Documentation', description: 'Records of allergen awareness training for food service staff', renewalFrequency: 'Ongoing', source: 'OAR 333-150-0000' },
    { name: 'Health License', description: 'Valid food service license from Oregon Health Authority or local health department', renewalFrequency: 'Annual', source: 'ORS 624.020 / OAR 333-150' },
    { name: 'Seasonal Operation Permit', description: 'Seasonal operation permits for establishments operating fewer than 12 months per year', renewalFrequency: 'Per season', source: 'OAR 333-150' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96 / Oregon Fire Code' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10 / Oregon Fire Code' },
  ],
  requiredPostings: [
    { name: 'Food Handler Certificate Display', languages: ['English'], source: 'ORS 624.570 — cards available for inspector review' },
    { name: 'Allergen Awareness Notice', languages: ['English'], source: 'OAR 333-150-0000' },
    { name: 'Food Service License (Permit)', languages: ['English'], source: 'ORS 624.020' },
    { name: 'Handwashing Signs', languages: ['English', 'Spanish'], source: 'OAR 333-150-0000' },
  ],
  inspectionSystem: {
    type: 'score_only',
    details: 'Numerical scoring system (0-100). Priority violations carry higher point deductions. Risk-based inspection frequency determined by establishment type and history.',
    grades: [
      { label: 'Excellent', range: '90-100' },
      { label: 'Good', range: '80-89' },
      { label: 'Needs Improvement', range: '70-79' },
      { label: 'Unsatisfactory', range: 'Below 70' },
    ],
  },
  serviceFrequencies: [
    { service: 'Pest Control Service', frequencyDays: 30, frequencyLabel: 'Monthly', source: 'OAR 333-150' },
  ],
  specialRequirements: [
    'Oregon-specific Food Handler Card required — out-of-state cards are NOT accepted',
    'Food handler card must be obtained before beginning work with food',
    'Risk-based inspection frequency: high-risk facilities inspected more frequently',
    'Priority violations (foodborne illness risk factors) weighted more heavily in scoring',
    'Numerical inspection scoring: 0-100 scale with priority violation emphasis',
    'Seasonal operation permits available for establishments operating fewer than 12 months',
    'Allergen awareness training documentation must be maintained on-site',
    'OAR 333-150 based on 2017 FDA Food Code with Oregon-specific amendments',
  ],
};

// ── Arizona (AAC R9-8) ──────────────────────────────────────

const ARIZONA: JurisdictionProfile = {
  id: 'state-az',
  name: 'Arizona (AAC R9-8)',
  level: 'state',
  parentId: 'federal-fda',
  temperatureThresholds: [], // Inherits federal thresholds
  cookingTemps: [], // Inherits federal cooking temps
  coolingRequirements: [], // Inherits federal cooling requirements
  certifications: [
    {
      type: 'Food Handler Certificate (County-Issued)',
      description: 'Food handler certificates are issued by individual counties in Arizona. Requirements vary by county. Must be obtained from the county where the establishment operates.',
      renewalYears: 3,
      approvedProviders: ['County health department-approved providers (varies by county)'],
      source: 'AAC R9-8-118 / County health department regulations',
    },
    {
      type: 'Food Protection Manager Certification',
      description: 'Certified Food Protection Manager required for establishments designated as high-risk by the county health department.',
      renewalYears: 5,
      approvedProviders: ['ServSafe', 'Prometric', 'National Registry'],
      source: 'AAC R9-8-118',
    },
  ],
  requiredDocuments: [
    { name: 'Food Handler Certificates (County-Issued)', description: 'County-issued food handler certificates for all food employees — requirements vary by county', renewalFrequency: 'Every 3 years (varies by county)', source: 'AAC R9-8-118' },
    { name: 'Food Protection Manager Certificate', description: 'Certified Food Protection Manager certificate (required for high-risk establishments)', renewalFrequency: 'Every 5 years', source: 'AAC R9-8-118' },
    { name: 'Food Safety Plan', description: 'Written food safety plan required for high-risk food establishments', renewalFrequency: 'Ongoing — update when procedures change', source: 'AAC R9-8-107' },
    { name: 'Health Permit', description: 'Valid food establishment permit from county health department', renewalFrequency: 'Annual', source: 'ARS §36-136 / AAC R9-8' },
    { name: 'Temporary Event Permits', description: 'Temporary food establishment permits for special events — maximum 14 consecutive days', renewalFrequency: 'Per event', source: 'AAC R9-8-120' },
    { name: 'Fire Suppression Inspection', description: 'Semi-annual fire suppression system inspection', renewalFrequency: 'Semi-annual', source: 'NFPA 96 / Arizona Fire Code' },
    { name: 'Fire Extinguisher Certification', description: 'Annual professional fire extinguisher service', renewalFrequency: 'Annual', source: 'NFPA 10 / Arizona Fire Code' },
  ],
  requiredPostings: [
    { name: 'Food Handler Notice', languages: ['English', 'Spanish'], source: 'AAC R9-8-118' },
    { name: 'Food Permit', languages: ['English'], source: 'ARS §36-136' },
    { name: 'Handwashing Signs', languages: ['English', 'Spanish'], source: 'AAC R9-8-305' },
    { name: 'Employee Illness Reporting Policy', languages: ['English', 'Spanish'], source: 'AAC R9-8-201' },
  ],
  inspectionSystem: {
    type: 'pass_fail',
    details: 'Pass/fail inspection system with violations categorized as priority, priority foundation, and core. Priority violations require immediate correction. County health departments conduct inspections.',
  },
  serviceFrequencies: [
    { service: 'Pest Control Service', frequencyDays: 30, frequencyLabel: 'Monthly', source: 'AAC R9-8' },
  ],
  specialRequirements: [
    'Food handler certificates are county-issued — certificates from one county may not be accepted in another',
    'Written food safety plan required for high-risk food establishments',
    'Temporary food events limited to 14 consecutive days maximum',
    'County health departments are the primary enforcement authority — requirements vary by county',
    'Priority violations require immediate corrective action during inspection',
    'Violations categorized as priority, priority foundation, and core',
    'Maricopa County and Pima County have the most detailed local requirements',
    'AAC R9-8 based on 2017 FDA Food Code with Arizona-specific amendments',
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
  TEXAS,
  FLORIDA,
  NEW_YORK,
  WASHINGTON,
  OREGON,
  ARIZONA,
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

/**
 * Map of 2-letter state codes to jurisdiction profile IDs.
 */
const STATE_CODE_MAP: Record<string, string> = {
  CA: 'state-ca',
  TX: 'state-tx',
  FL: 'state-fl',
  NY: 'state-ny',
  WA: 'state-wa',
  OR: 'state-or',
  AZ: 'state-az',
};

/**
 * Get a state jurisdiction profile by its 2-letter state code (e.g., 'CA', 'TX').
 * Returns null if the state code is not found.
 */
export function getStateProfile(stateCode: string): JurisdictionProfile | null {
  const id = STATE_CODE_MAP[stateCode.toUpperCase()];
  if (!id) return null;
  return getJurisdiction(id) ?? null;
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
