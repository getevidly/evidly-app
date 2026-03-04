-- ============================================================
-- EL DORADO COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: El Dorado County Environmental Management Department
--         — Environmental Health Division
-- Address: 2850 Fairlane Court, Placerville, CA 95667
-- Phone: (530) 621-5300
-- Portal: eldoradocounty.ca.gov/Public-Safety-Justice/Food-Safety/Inspection-Reports
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO color placards confirmed
--   Inspection report only — standard CalCode violation classification
--   Most recent inspection results available online (with currency disclaimer)
--   Full reports available at facility or via Records Request
--   Transparency: MEDIUM
--   County includes Placerville (county seat) and South Lake Tahoe area
--
-- IMPORTANT DISCLAIMER: "Information provided is the most recent inspection
-- information; however it may not be representative of current conditions."
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'El Dorado County Environmental Management Department — Environmental Health Division',

  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "grades": {},
    "numeric_score": false,
    "placard_required": false,
    "placard_posted": false,
    "report_online": true,
    "online_data_note": "Most recent inspection data available online. County disclaimer: may not reflect current conditions at the facility.",
    "full_report_at_facility": true,
    "records_request_available": true,
    "transparency_level": "medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Includes Placerville (county seat) and South Lake Tahoe area. Lake Tahoe involves jurisdictional complexity with Placer County and Tahoe Regional Planning Agency.",
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

  scoring_methodology = 'Inspection report only. NO confirmed letter grade, numeric score, or color placard. Most recent inspection results available online (with disclaimer that data may not reflect current conditions). Full reports available at facility or by Records Request to Environmental Management Division. Standard CalCode violation classification.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE / City of Placerville Fire / City of South Lake Tahoe Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'portal',
  data_source_url = 'https://www.eldoradocounty.ca.gov/Public-Safety-Justice/Food-Safety/Inspection-Reports',
  data_source_tier = 3,
  facility_count = NULL,
  population_rank = 37,

  notes = 'STANDARDIZED March 2026. Report-only system. MEDIUM transparency. Most recent inspection data online with currency disclaimer. Full reports at facility or via Records Request. County includes Placerville and South Lake Tahoe area (jurisdictional complexity with Placer County and TRPA).'

WHERE county = 'El Dorado' AND city IS NULL AND state = 'CA';
