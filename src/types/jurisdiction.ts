// ═══════════════════════════════════════════════════════════════════
// src/types/jurisdiction.ts
// Dual-authority model: every location has a food safety authority
// (county health dept / CalCode) AND a fire safety authority (AHJ / CFC).
// These are completely different agencies with different grading systems.
// They CANNOT be combined into a single score.
// ═══════════════════════════════════════════════════════════════════

// TODO: Verify Fresno County food safety grading_type from actual health department data
// TODO: Verify Merced County food safety grading_type from actual health department data
// TODO: Verify Stanislaus County food safety grading_type from actual health department data
// TODO: Verify if Fresno County/City has formally adopted NFPA 96 (2024) or still on prior edition
// TODO: Verify if Merced County/City has formally adopted NFPA 96 (2024) or still on prior edition
// TODO: Verify if Stanislaus County / City of Modesto has formally adopted NFPA 96 (2024)
// TODO: Research individual fire AHJ grading methodology beyond NFPA 96 pass/fail for each demo jurisdiction
// TODO: Research Fresno County local requirements added on top of CalCode
// TODO: Research Merced County local requirements added on top of CalCode
// TODO: Research Stanislaus County local requirements added on top of CalCode
// TODO: Research whether any demo fire AHJs have local amendments stricter than state CFC
// TODO: Map fire AHJ by address (city vs unincorporated) for live mode auto-detection
// TODO: Build normalization benchmarks from 500+ users for future org-level scoring
// TODO: Track CalCode 2026 legislative changes: SB 68 (allergen disclosure), AB 660 (date labels)
// TODO: Verify FDA Food Code 2026 full revision when published (currently 2022 + 2024 Supplement)

// A single authority (either food safety or fire safety)
export interface AuthorityRecord {
  id: string;
  pillar: 'food_safety' | 'fire_safety';
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
}

// A location's complete jurisdiction profile
export interface LocationJurisdiction {
  location_id: string;
  county: string;

  // TWO independent authorities — always present
  foodSafety: AuthorityRecord;
  fireSafety: AuthorityRecord;

  // Optional federal overlay (Yosemite/NPS only)
  federalFoodOverlay: AuthorityRecord | null;
  federalFireOverlay: AuthorityRecord | null;

  // EvidLY internal weights — ONLY populated if the jurisdiction data has them
  // These are NOT authority grades — they are EvidLY's internal tracking weights
  food_safety_weight: number | null;
  fire_safety_weight: number | null;
  ops_weight: number | null;
  docs_weight: number | null;
}

// Score for a single authority
export interface AuthorityScore {
  pillar: 'food_safety' | 'fire_safety';
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
  fireSafety: AuthorityScore;
  federalFoodOverlay: AuthorityScore | null;
  federalFireOverlay: AuthorityScore | null;
  // NO combined/blended/overall score — these are independent authorities
}
