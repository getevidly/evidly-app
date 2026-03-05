-- ============================================================
-- TEHAMA COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Tehama County Environmental Health Department
-- Address: 444 Oak Street, Suite D, Red Bluff, CA 96080
-- Phone: (530) 527-8020
-- Portal: tehama.gov/government/departments/environmental-health/food-inspection-reports
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — standard CalCode violation classification
--   Monthly PDF inspection reports published on county website by period
--   ~400–600 facilities
--   Transparency: MEDIUM
--   Key areas: Red Bluff, Corning, Tehama, Los Molinos, Gerber, Cottonwood
--
-- Source: tehama.gov/government/departments/environmental-health/food-inspection-reports
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Tehama County Environmental Health Department',
  agency_phone = '(530) 527-8020',
  agency_address = '444 Oak Street, Suite D, Red Bluff, CA 96080',

  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "grades": {},
    "numeric_score": false,
    "placard_required": false,
    "placard_posted": false,
    "report_online": true,
    "report_format": "monthly_pdf",
    "transparency_level": "medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Monthly PDF inspection reports published on county website by period (e.g., January 2020 Reports, February 2020 Reports). Red Bluff is county seat. Corning is largest city in north county. Key areas: Red Bluff, Corning, Tehama, Los Molinos, Gerber, Cottonwood.",
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

  scoring_methodology = 'Inspection report only. Monthly PDF inspection reports published on county website by period (e.g., January 2020 Reports, February 2020 Reports). No confirmed placard system.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  public_portal = 'https://www.tehama.gov/government/departments/environmental-health/food-inspection-reports',
  regulatory_code = 'CalCode',
  transparency_level = 'medium',
  inspection_frequency = 'risk_based',

  fire_ahj_name = 'CAL FIRE / City of Red Bluff Fire / City of Corning Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'portal',
  data_source_url = 'https://www.tehama.gov/government/departments/environmental-health/food-inspection-reports',
  data_source_tier = 4,

  notes = 'STANDARDIZED March 2026. Inspection report only. MEDIUM transparency. Monthly PDF publication model. Red Bluff is county seat. Corning is largest city in north county. Key areas: Red Bluff, Corning, Tehama, Los Molinos, Gerber, Cottonwood.'

WHERE county = 'Tehama' AND city IS NULL AND state = 'CA';
