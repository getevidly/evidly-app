-- ============================================================
-- MONTEREY COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Monterey County Health Department — Environmental Health Bureau,
--         Consumer Health Protection Services (CHPS)
-- HQ: 1270 Natividad Road (Rm 42), Salinas, CA 93906 | (831) 755-4508
-- Branch — King City: 200 Broadway, Suite 70, King City, CA 93930 | (831) 386-6899
-- Branch — Monterey: 1200 Aguajito Road, Monterey, CA 93940 | (831) 647-7654
-- App: MC Food Inspection Findings (iOS/Android)
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO color placards
--   Inspection report only — violations listed as major or minor
--   Gold Seal Program for top-performing facilities (recognition, not scoring)
--   Transparency: MEDIUM — reports via MC Food Inspection Findings app
--   3 offices: Salinas (HQ), King City, Monterey
--   ~2,000 facilities; inspected 2–4x/year by risk type
--
-- Comparison to neighbors:
--   Santa Cruz: Standard CalCode, no public grading
--   San Benito: Standard CalCode, report-only
--   San Luis Obispo: Numeric score (negative scale)
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Monterey County Health Department — Environmental Health Bureau, Consumer Health Protection Services',

  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "grades": {},
    "numeric_score": false,
    "placard_required": false,
    "placard_posted": false,
    "report_via_app": true,
    "app_name": "MC Food Inspection Findings",
    "app_platforms": ["iOS", "Android"],
    "report_pdf_online": false,
    "transparency_level": "medium",
    "gold_seal_program": true,
    "gold_seal_description": "Awarded to facilities with multiple consecutive inspections showing minimal or no violations. Gold Seal placard posted at facility entrance.",
    "violation_categories": ["major", "minor"],
    "major_violation_description": "Critical risk factors identified by CDC; most likely to cause foodborne illness",
    "minor_violation_description": "Less critical violations; still require correction",
    "inspection_frequency": "2-4 times per year depending on facility type and risk profile",
    "offices": [
      {"name": "Salinas HQ", "address": "1270 Natividad Road, Rm 42, Salinas, CA 93906", "phone": "(831) 755-4508"},
      {"name": "King City Branch", "address": "200 Broadway, Suite 70, King City, CA 93930", "phone": "(831) 386-6899"},
      {"name": "Monterey Branch", "address": "1200 Aguajito Road, Monterey, CA 93940", "phone": "(831) 647-7654"}
    ],
    "mobile_food_inspection": "Twice per year. Inspections at Salinas central office every Tuesday 8:30-10:00 AM.",
    "food_handler_card": {
      "issuer": "CA-approved provider",
      "window_days": 30,
      "validity_years": 3,
      "note": "Standard CalCode requirement"
    },
    "food_safety_manager": {
      "required": true,
      "min_per_facility": 1,
      "exam_type": "ANSI_accredited"
    }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. NO letter grade, NO numeric score, NO color placard. Violations listed as major (CDC risk factors) or minor. Gold Seal Program for top-performing facilities (multiple consecutive clean inspections — recognition, not scoring grade). Inspection reports available via MC Food Inspection Findings app. 3 offices: Salinas HQ, King City, Monterey. 2-4 inspections/year by risk type.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE / Monterey County Regional Fire District / City Fire Departments',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading. Gold Seal Program is a county-level recognition overlay.',

  data_source_type = 'app',
  data_source_url = 'https://www.countyofmonterey.gov/government/departments-a-h/health/environmental-health/consumer-health-protection/food-operations',
  data_source_tier = 2,
  facility_count = 2000,
  population_rank = 28,

  notes = 'STANDARDIZED March 2026. Report-only system. MEDIUM transparency. ~2,000 facilities. Gold Seal = recognition program for top-performing facilities, not a scoring grade. App: MC Food Inspection Findings. 3 offices: Salinas HQ, King City, Monterey. Mobile food inspections at Salinas office Tuesdays 8:30-10 AM.'

WHERE county = 'Monterey' AND city IS NULL AND state = 'CA';
