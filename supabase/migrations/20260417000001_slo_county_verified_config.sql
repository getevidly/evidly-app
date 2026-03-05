-- ============================================================
-- San Luis Obispo County — Verified Jurisdiction Config (March 2026)
-- ============================================================
-- System: Unique NEGATIVE SCORING (effective May 5, 2025)
-- Perfect score = 0. Violations yield negative deductions.
-- More negative = more/more serious violations.
-- NO letter grade. NO placard. Numeric score only.
-- Prior system (pre-May 2025): traditional 0-100 positive scoring
-- Map: EatSafeSLO (interactive, fixed permitted facilities)
-- Portal: MyHealthDepartment (inspections on/after May 5, 2025)
-- Award of Excellence for top-performing facilities
-- Transparency: HIGH
-- Facilities: ~2,000+
-- Source: slocounty.ca.gov/environmental-health-services — verified March 2026
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'San Luis Obispo County Health Agency — Environmental Health Services Division',
  agency_phone = NULL,
  agency_address = '2156 Sierra Way, Suite D, San Luis Obispo, CA 93401',
  public_portal = 'https://www.slocounty.ca.gov/departments/health-agency/public-health/environmental-health-services/all-environmental-health-services/food-facilities-and-operations/food-facility-inspection-results',
  regulatory_code = 'CalCode',
  scoring_type = 'numeric_score',
  grading_type = 'numeric_score',
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,
  transparency_level = 'high',
  inspection_frequency = 'risk_based',
  facility_count = 2000,
  fire_ahj_name = 'CAL FIRE / City Fire Departments',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  scoring_methodology = 'NEGATIVE SCORING effective May 5, 2025. Perfect score = 0. Violations result in negative deductions — more negative = worse. No letter grade. No placard. Higher-risk violations receive larger deductions; repeat violations receive additional deductions. Prior to May 2025: traditional 0–100 positive scoring. Interactive map: EatSafeSLO. Award of Excellence recognition for top facilities.',
  notes = 'STANDARDIZED March 2026. Unique NEGATIVE SCORING system (0 = perfect) since May 2025. HIGH transparency. ~2,000 facilities. EatSafeSLO map. Award of Excellence program.'
WHERE county = 'San Luis Obispo' AND city IS NULL;

-- Verify
SELECT county, scoring_type, grading_type, pass_threshold, transparency_level
FROM jurisdictions WHERE county = 'San Luis Obispo';
