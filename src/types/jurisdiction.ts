// ═══════════════════════════════════════════════════════════════════
// src/types/jurisdiction.ts
// Dual-authority model: every location has a food safety authority
// (county health dept / CalCode) AND a facility safety authority (AHJ / CFC).
// These are completely different agencies with different grading systems.
// They CANNOT be combined into a single score.
// ═══════════════════════════════════════════════════════════════════

// DONE: Fresno County food safety — Major/Minor violations (CalCode). Source: Grand Jury 2023-24.
// DONE: Merced County food safety — Good/Satisfactory/Unsatisfactory (0-6/7-13/14+). Verified.
// DONE (partial): Stanislaus County food safety — Major/Minor violations (verified). Full methodology pending JIE crawl.
// TODO: Verify if Fresno County/City has formally adopted NFPA 96 or still on prior edition
// TODO: Verify if Merced County/City has formally adopted NFPA 96 or still on prior edition
// TODO: Verify if Stanislaus County / City of Modesto has formally adopted NFPA 96
// TODO: Research individual fire AHJ grading methodology beyond NFPA 96 pass/fail for each demo jurisdiction
// TODO: Research Fresno County local requirements added on top of CalCode
// TODO: Research Merced County local requirements added on top of CalCode
// TODO: Research Stanislaus County local requirements added on top of CalCode
// TODO: Research whether any demo fire AHJs have local amendments stricter than state CFC
// TODO: Map fire AHJ by address (city vs unincorporated) for live mode auto-detection
// TODO: Build normalization benchmarks from 500+ users for future org-level scoring
// TODO: Track CalCode 2026 legislative changes: SB 68 (allergen disclosure), AB 660 (date labels)
// TODO: Verify FDA Food Code 2026 full revision when published (currently 2022 + 2024 Supplement)

// Fire AHJ jurisdiction configuration (from fire_jurisdiction_config JSONB column)
export interface FireJurisdictionConfig {
  fire_ahj_name: string;
  fire_ahj_type: 'city_fire' | 'county_fire' | 'state_fire' | 'federal' | 'contract';
  fire_code_edition: string; // e.g. "2022 CFC"
  nfpa_96_cleaning_frequencies: {
    type_i_hood: string;   // e.g. "monthly" | "quarterly"
    type_ii_hood: string;  // e.g. "semi-annual" | "annual"
  };
  hood_suppression: {
    system_type: string;         // e.g. "UL-300 wet chemical"
    inspection_interval: string; // e.g. "semi-annual"
    standard: string;            // e.g. "NFPA 96 / UL-300"
  };
  ansul_system: {
    required: boolean;
    inspection_interval: string; // e.g. "semi-annual"
    standard: string;            // e.g. "NFPA 17A"
  };
  fire_extinguisher: {
    types: string[];               // e.g. ["K-class", "ABC"]
    inspection_interval: string;   // e.g. "annual"
    hydrostatic_interval: string;  // e.g. "5-year" | "12-year"
  };
  fire_alarm: {
    required: boolean;
    monitoring_type: string;     // e.g. "central station" | "local"
    inspection_interval: string; // e.g. "annual"
  };
  sprinkler_system: {
    required: boolean;
    inspection_interval: string; // e.g. "annual"
    type: string;                // e.g. "wet" | "dry" | "pre-action"
  };
  grease_trap: {
    required: boolean;
    cleaning_interval: string;   // e.g. "90 days"
    interceptor_type: string;    // e.g. "gravity" | "hydromechanical"
  };
  ahj_split_notes: string | null;   // Multi-AHJ areas (e.g. LA County city vs unincorporated)
  federal_overlay: {
    agency: string;      // e.g. "NPS" | "DOD"
    authority: string;   // e.g. "36 CFR §2.10"
    notes: string;
  } | null;
}

// A single authority (either food safety or facility safety)
export interface AuthorityRecord {
  id: string;
  pillar: 'food_safety' | 'facility_safety';
  agency_name: string;
  agency_phone: string | null;
  agency_website: string | null;
  code_basis: string;
  code_references: string[];
  scoring_method: string | null;
  grading_type: string | null;
  grading_config: Record<string, any> | null;
  inspection_frequency: number | null;
  is_verified: boolean;
  local_amendments: string | null;
  fire_jurisdiction_config?: FireJurisdictionConfig | null;
}

// A location's complete jurisdiction profile
export interface LocationJurisdiction {
  location_id: string;
  county: string;

  // TWO independent authorities — always present
  foodSafety: AuthorityRecord;
  facilitySafety: AuthorityRecord;

  // Optional federal overlay (Yosemite/NPS only)
  federalFoodOverlay: AuthorityRecord | null;
  federalFireOverlay: AuthorityRecord | null;

  // EvidLY internal weights — ONLY populated if the jurisdiction data has them
  // These are NOT authority grades — they are EvidLY's internal tracking weights
  food_safety_weight: number | null;
  facility_safety_weight: number | null;
  ops_weight: number | null;
  docs_weight: number | null;
}

// Score for a single authority
export interface AuthorityScore {
  pillar: 'food_safety' | 'facility_safety';
  authority: AuthorityRecord;
  grade: string | null;
  gradeDisplay: string | null;
  numericScore: number | null;
  status: 'passing' | 'failing' | 'at_risk' | 'unknown';
  details: Record<string, any> | null;
}

// A location's complete score profile — TWO independent scores
export interface LocationScore {
  location_id: string;
  foodSafety: AuthorityScore;
  facilitySafety: AuthorityScore;
  federalFoodOverlay: AuthorityScore | null;
  federalFireOverlay: AuthorityScore | null;
  // NO combined/blended/overall score — these are independent authorities
}
