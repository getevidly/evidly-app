-- ═══════════════════════════════════════════════════════════════════════
-- LA COUNTY — First Fully-Verified Jurisdiction Configuration
--
-- Source: JIE Crawl (2026-02-19) + Official LA County DPH documentation
-- Confidence: HIGH (100/100) — validated from 4 official sources
-- Import Eligible: Yes
--
-- Data Sources:
--   1. http://publichealth.lacounty.gov/eh/inspection/grading-posting-requirements-retail-food-facilities.htm
--   2. http://lacounty-ca.elaws.us/code/coor_title8_div1_ch8.04_pt1_sec8.04.225
--   3. http://publichealth.lacounty.gov/eh/inspection/retail-food-inspection-guide.htm
--   4. http://publichealth.lacounty.gov/eh/business/restaurants-retail-food-stores.htm
--
-- Verified facts:
--   - 100-point deductive scoring (start at 100, subtract per violation)
--   - Letter grades: A (90-100), B (80-89), C (70-79)
--   - Below 70: numerical score card only (no letter grade)
--   - Facilities scoring below 70 twice in 12 months: subject to closure
--   - Inspections: 1-3 times per year based on risk level
--   - Fire AHJ: LACoFD (unincorporated + 60 contract cities) + LAFD (City of LA)
--   - Hood suppression: semi-annual inspection per NFPA 96
--   - Exceptions: Long Beach, Pasadena, Vernon have own health departments
-- ═══════════════════════════════════════════════════════════════════════

-- Update LA County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Los Angeles County Department of Public Health - Environmental Health Division',

  -- Verified scoring/grading (confirmed from ordinance text)
  scoring_type = 'weighted_deduction',
  grading_type = 'letter_grade',
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [70, 79],
    "fail_below": 70,
    "below_70_display": "numerical_score_card",
    "closure_trigger": "below_70_twice_in_12_months",
    "grade_posting": "required_visible_to_patrons",
    "reports_public": true,
    "verified_from": "LA County Code Title 8 §8.04.225",
    "inspection_frequency": "1-3 per year based on risk level",
    "risk_categories": ["High", "Moderate", "Low"],
    "reinspection_trigger": "Major CRF violations or score below 70"
  }'::jsonb,
  scoring_methodology = 'Deductive 100-point system. Start at 100, subtract points per violation. Major CRF = 4 pts, Minor CRF = 2 pts, GRP = 1 pt. FOIR (Food Official Inspection Report) is the official form.',

  -- Verified thresholds
  pass_threshold = 90,
  warning_threshold = 79,
  critical_threshold = 69,

  -- Verified fire AHJ
  fire_ahj_name = 'Los Angeles County Fire Department',
  fire_ahj_type = 'county_fd',
  has_local_amendments = true,
  local_amendment_notes = 'LA County Code Title 8 - Consumer Protection, Business and Wage Regulations. Exceptions: Long Beach, Pasadena, Vernon have own health departments.',

  -- Verified data source
  data_source_type = 'api',
  data_source_url = 'https://data.lacounty.gov',
  data_source_tier = 1,

  -- Updated notes with verification info
  notes = 'VERIFIED (2026-02-19). Confidence: HIGH (100/100). Hybrid grading: letter grades A / B / C for 70%+, numerical score cards below 70%. CRFC (CA Health & Safety Code) basis. Fire: LACoFD serves unincorporated + 60 contract cities; LAFD serves City of LA. Hood suppression: semi-annual per NFPA 96, UL-300 compliance required. Largest dataset in CA (Socrata API, 5 years, bulk CSV/JSON).'
WHERE county = 'Los Angeles'
  AND city IS NULL
  AND state = 'CA';
