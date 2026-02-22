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
  gradingThresholds?: {
    good?: string;
    satisfactory?: string;
    unsatisfactory?: string;
  };
  closureTrigger?: string;
  reinspectionPolicy?: string;
  transparencyNotes?: string;
  verificationStatus?: 'verified' | 'partial' | 'unverified';
  trafficLightMapping?: {
    green: { label: string; condition: string };
    yellow: { label: string; condition: string };
    red: { label: string; condition: string };
  };
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
    gradingScale: 'Major violations / Minor violations',
    passingThreshold: 'No uncorrected major violations at time of inspection',
    inspectionFrequency: '1–3× per year based on risk category',
    transparencyLevel: 'low',
    transparencyNotes: 'Fresno County Civil Grand Jury 2023-24 ("Eat At Your Own Risk") found: website difficult to navigate, inspection reports hard to find, some reports show No Data Returned. Reports exist but public access is poor in practice.',
    agencyWebsite: 'https://www.co.fresno.ca.us/departments/public-health-and-planning/public-health/environmental-health',
    agencyPhone: '(559) 600-3357',
    publicResultsUrl: 'https://www.co.fresno.ca.us/departments/public-health-and-planning/public-health/environmental-health/food-facility-inspection-reports',
    lastVerified: '2026-02-22',
    trafficLightMapping: {
      green: { label: 'Compliant', condition: 'No open major violations — all minors corrected or noted' },
      yellow: { label: 'Warning', condition: 'Open minor violations only — no major violations at last inspection' },
      red: { label: 'Action Required', condition: 'One or more uncorrected major violations — reinspection likely required' },
    },
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
    gradingScale: 'Good / Satisfactory / Unsatisfactory',
    gradingThresholds: {
      good: '0–6 violations',
      satisfactory: '7–13 violations',
      unsatisfactory: '14+ violations',
    },
    passingThreshold: 'Good (0–6 violations) or Satisfactory (7–13 violations)',
    closureTrigger: 'Unsatisfactory (14+ violations) or imminent health hazard',
    inspectionFrequency: '1–3× per year based on risk',
    transparencyLevel: 'high',
    transparencyNotes: 'Merced County Environmental Health publishes findings with explanations. High accessibility for operators and public.',
    agencyWebsite: 'https://www.co.merced.ca.us/156/Environmental-Health',
    agencyPhone: '(209) 381-1100',
    publicResultsUrl: 'https://www.co.merced.ca.us/156/Environmental-Health',
    lastVerified: '2026-02-22',
    trafficLightMapping: {
      green: { label: 'Good', condition: '0–6 violations at time of inspection' },
      yellow: { label: 'Satisfactory', condition: '7–13 violations at time of inspection' },
      red: { label: 'Unsatisfactory', condition: '14 or more violations — reinspection required' },
    },
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
    gradingScale: 'Major violations / Minor violations',
    passingThreshold: 'No uncorrected major violations at time of inspection',
    closureTrigger: 'Imminent health hazard or multiple uncorrected major violations',
    reinspectionPolicy: 'Required after major violation citation. Correction window: 30 days.',
    inspectionFrequency: '1–3× per year',
    transparencyLevel: 'medium',
    transparencyNotes: 'Stanislaus County Environmental Resources publishes inspection results. Verification of full public access methodology is pending JIE crawl.',
    verificationStatus: 'partial',
    agencyWebsite: 'https://www.stancounty.com/er/environmental-health/',
    agencyPhone: '(209) 525-6700',
    publicResultsUrl: 'https://www.stancounty.com/er/environmental-health/food-safety.shtm',
    lastVerified: '2026-02-22',
    trafficLightMapping: {
      green: { label: 'Compliant', condition: 'No open major violations — all minors corrected or noted' },
      yellow: { label: 'Warning', condition: 'Open minor violations only — no major violations at last inspection' },
      red: { label: 'Action Required', condition: 'One or more uncorrected major violations — reinspection required within 30 days' },
    },
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
