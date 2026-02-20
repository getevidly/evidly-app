export interface JurisdictionScore {
  id: string;
  agencyName: string;
  county: string;
  state: string;
  pillar: 'food_safety' | 'fire_safety';
  gradingScale: string;
  passingThreshold: string;
  inspectionFrequency: string;
  transparencyLevel: 'high' | 'medium' | 'low';
  agencyWebsite: string;
  agencyPhone: string;
  publicResultsUrl: string;
  nfpaAdoption?: string;
  lastVerified: string;
}

export interface UserJurisdiction {
  jurisdictionId: string;
  locationName: string;
  isPrimary: boolean;
  addedDate: string;
  notes: string;
}

export const JURISDICTION_DATABASE: JurisdictionScore[] = [
  // ── FRESNO COUNTY ─────────────────────────────
  {
    id: 'fresno_county_food',
    agencyName: 'Fresno County Dept. of Public Health — Environmental Health',
    county: 'Fresno', state: 'CA', pillar: 'food_safety',
    gradingScale: 'A / B / C / Closure',
    passingThreshold: 'A (90–100) or B (80–89)',
    inspectionFrequency: '1–3× per year based on risk category',
    transparencyLevel: 'high',
    agencyWebsite: 'https://www.co.fresno.ca.us/departments/public-health-and-planning/public-health/environmental-health',
    agencyPhone: '(559) 600-3357',
    publicResultsUrl: 'https://www.co.fresno.ca.us/departments/public-health-and-planning/public-health/environmental-health/food-facility-inspection-reports',
    lastVerified: '2026-02-01',
  },
  {
    id: 'fresno_city_fire',
    agencyName: 'City of Fresno Fire Department — Fire Prevention Bureau',
    county: 'Fresno', state: 'CA', pillar: 'fire_safety',
    gradingScale: 'Pass / Fail / Conditional',
    passingThreshold: 'Pass — all NFPA 96 (2024) requirements met',
    inspectionFrequency: 'Annual + complaint-triggered',
    transparencyLevel: 'medium',
    agencyWebsite: 'https://www.fresno.gov/fire/',
    agencyPhone: '(559) 621-4100',
    publicResultsUrl: 'https://www.fresno.gov/fire/fire-prevention/',
    nfpaAdoption: 'NFPA 96 (2024) — enforced per California Fire Code. Verify specific requirements with your AHJ.',
    lastVerified: '2026-02-01',
  },
  // ── MERCED COUNTY ─────────────────────────────
  {
    id: 'merced_county_food',
    agencyName: 'Merced County Dept. of Public Health — Environmental Health',
    county: 'Merced', state: 'CA', pillar: 'food_safety',
    gradingScale: 'Compliant / Non-Compliant / Closed',
    passingThreshold: 'Compliant',
    inspectionFrequency: '1–3× per year based on risk',
    transparencyLevel: 'high',
    agencyWebsite: 'https://www.co.merced.ca.us/156/Environmental-Health',
    agencyPhone: '(209) 381-1100',
    publicResultsUrl: 'https://www.co.merced.ca.us/156/Environmental-Health',
    lastVerified: '2026-02-01',
  },
  {
    id: 'merced_city_fire',
    agencyName: 'City of Merced Fire Department — Fire Prevention',
    county: 'Merced', state: 'CA', pillar: 'fire_safety',
    gradingScale: 'Pass / Fail',
    passingThreshold: 'Pass',
    inspectionFrequency: 'Annual',
    transparencyLevel: 'medium',
    agencyWebsite: 'https://www.cityofmerced.org/depts/fire/',
    agencyPhone: '(209) 388-7440',
    publicResultsUrl: 'https://www.cityofmerced.org/depts/fire/',
    nfpaAdoption: 'NFPA 96 (2024) — enforced per California Fire Code. Verify specific requirements with your AHJ.',
    lastVerified: '2026-02-01',
  },
  // ── STANISLAUS COUNTY ─────────────────────────
  {
    id: 'stanislaus_county_food',
    agencyName: 'Stanislaus County Environmental Resources — Environmental Health',
    county: 'Stanislaus', state: 'CA', pillar: 'food_safety',
    gradingScale: 'A / B / C / Closure',
    passingThreshold: 'A (90+) or B (80–89)',
    inspectionFrequency: '1–3× per year',
    transparencyLevel: 'high',
    agencyWebsite: 'https://www.stancounty.com/er/environmental-health/',
    agencyPhone: '(209) 525-6700',
    publicResultsUrl: 'https://www.stancounty.com/er/environmental-health/food-safety.shtm',
    lastVerified: '2026-02-01',
  },
  {
    id: 'modesto_fire',
    agencyName: 'City of Modesto Fire Department — Fire Prevention Division',
    county: 'Stanislaus', state: 'CA', pillar: 'fire_safety',
    gradingScale: 'Pass / Fail / Conditional',
    passingThreshold: 'Pass',
    inspectionFrequency: 'Annual',
    transparencyLevel: 'medium',
    agencyWebsite: 'https://www.modestogov.com/fire',
    agencyPhone: '(209) 342-9300',
    publicResultsUrl: 'https://www.modestogov.com/fire',
    nfpaAdoption: 'NFPA 96 (2024) — enforced per California Fire Code. Verify specific requirements with your AHJ.',
    lastVerified: '2026-02-01',
  },
  // ── MARIPOSA COUNTY ───────────────────────────
  {
    id: 'mariposa_county_food',
    agencyName: 'Mariposa County Environmental Health',
    county: 'Mariposa', state: 'CA', pillar: 'food_safety',
    gradingScale: 'Compliant / Non-Compliant / Closed',
    passingThreshold: 'Compliant',
    inspectionFrequency: '1–2× per year',
    transparencyLevel: 'medium',
    agencyWebsite: 'https://www.mariposacounty.org/181/Environmental-Health',
    agencyPhone: '(209) 966-2061',
    publicResultsUrl: 'https://www.mariposacounty.org/181/Environmental-Health',
    lastVerified: '2026-02-01',
  },
];

export const searchJurisdictions = (query: string): JurisdictionScore[] => {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return JURISDICTION_DATABASE.filter(j =>
    j.agencyName.toLowerCase().includes(q) ||
    j.county.toLowerCase().includes(q) ||
    j.state.toLowerCase().includes(q)
  );
};

export const getJurisdictionById = (id: string) =>
  JURISDICTION_DATABASE.find(j => j.id === id);
