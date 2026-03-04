-- ============================================================
-- SAN BERNARDINO COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: San Bernardino County Dept of Public Health — DEHS
-- Address: 385 N Arrowhead Ave, 2nd Floor, San Bernardino, CA 92415
-- Portal: ehs.sbcounty.gov
-- Regulatory basis: CalCode + SBCC Chapter 14 (§33.1403)
-- Verified: March 2026
--
-- Key difference from adjacent counties:
--   LA County:  B = pass, no mandatory re-score
--   Riverside:  A-only passes, B = fail
--   SBC:        B = minimum passing, C = mandatory re-score within 30 days
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'San Bernardino County Department of Public Health — Environmental Health Services',

  scoring_type = 'weighted_deduction',
  grading_type = 'letter_grade',
  grading_config = '{
    "display_format": "letter_grade",
    "grades": {
      "A": { "min": 90, "max": 100, "status": "pass",  "label": "Excellent compliance" },
      "B": { "min": 80, "max": 89,  "status": "pass",  "label": "Minimum passing grade" },
      "C": { "min": 70, "max": 79,  "status": "fail",  "label": "Mandatory re-score required within 30 days" },
      "D": { "min": 0,  "max": 69,  "status": "fail",  "label": "Immediate closure / permit suspension" }
    },
    "minimum_passing_grade": "B",
    "pass_threshold": 80,
    "rescore_trigger_grade": "C",
    "rescore_request_window_days": 30,
    "rescore_completion_days": 10,
    "rescore_fee": true,
    "rescore_target_grade": "B",
    "closure_on_rescore_failure": true,
    "violation_categories": ["major", "minor"],
    "major_violations_highlighted": "yellow_on_oir",
    "transparency_level": "high",
    "data_portal": "https://ehs.sbcounty.gov",
    "yelp_integration": true,
    "grading_note": "B is minimum passing. C triggers mandatory re-score (written request within 30 days, completed within 10 county business days, fee charged). Failure to achieve B on re-score = immediate closure.",
    "food_handler_card": {
      "issuer": "San Bernardino County EHS",
      "window_days": 60,
      "validity_years": 5,
      "note": "SBC issues its own county card — not interchangeable with all CA-approved cards"
    },
    "food_safety_manager": {
      "required": true,
      "min_per_facility": 1,
      "exam_type": "ANSI_accredited",
      "window_days": 60
    }
  }'::jsonb,

  scoring_methodology = 'Weighted deduction from 100 points per SBCC §33.1403. Major and Minor violations per CalCode. Major violations highlighted yellow on OIR. Grade A=90-100 (pass), B=80-89 (pass, minimum), C=70-79 (fail, mandatory re-score), below 70 (fail, closure). Re-score: written request within 30 days, completed within 10 county business days, fee charged, must achieve B to avoid closure.',

  pass_threshold = 80,
  warning_threshold = 79,
  critical_threshold = 69,

  fire_ahj_name = 'San Bernardino County Fire Department (unincorporated areas)',
  fire_ahj_type = 'county_fire',
  has_local_amendments = true,
  local_amendment_notes = 'SBCC Chapter 14 §33.1403 governs grading. SBC issues own Food Handler Card (60-day window, 5-year validity). Food Safety Manager certification required within 60 days.',

  data_source_type = 'portal',
  data_source_url = 'https://ehs.sbcounty.gov/programs/food-facilities/',
  data_source_tier = 3,
  facility_count = 15000,
  population_rank = 5,

  notes = 'STANDARDIZED March 2026. B is minimum passing grade — different from LA (B passes, no mandatory re-score) and Riverside (A-only). Grade C = mandatory re-score within 30 days or closure. SBC issues its own Food Handler Card (60-day window, 5-year validity). Yelp integration for public data access. SBCC Chapter 14 §33.1403 governs grading.'

WHERE county = 'San Bernardino' AND city IS NULL AND state = 'CA';
