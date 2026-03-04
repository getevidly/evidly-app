-- ============================================================
-- LAKE COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Lake County Health Services
--         — Environmental Health Division
-- Address: 922 Bevins Court, Lakeport, CA 95453
-- Phone: (707) 263-1164
-- Portal: lakecountyca.gov/360/Food-Facility-Inspections
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — PDF reports posted online by
--     community and alphabetically
--   ~400–600 facilities
--   Transparency: MEDIUM
--   Key areas: Lakeport, Clearlake, Clearlake Oaks, Middletown,
--              Kelseyville, Lower Lake
--   Clear Lake tourism and wine (Lake County AVA)
--   Significant wildfire history (Valley Fire 2015, River Fire, etc.)
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Lake County Health Services — Environmental Health Division',

  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "grades": {},
    "numeric_score": false,
    "placard_required": false,
    "placard_posted": false,
    "report_online": true,
    "report_at_facility": true,
    "report_at_office": true,
    "transparency_level": "medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Clear Lake region (~400–600 facilities). PDF reports posted online by community and alphabetically. Clear Lake tourism and wine (Lake County AVA). Significant wildfire history (Valley Fire 2015, River Fire, etc.) — seasonal food service volume varies. Key areas: Lakeport, Clearlake, Clearlake Oaks, Middletown, Kelseyville, Lower Lake.",
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

  scoring_methodology = 'Inspection report only. ~400–600 facilities. PDF reports posted online organized by community and alphabetically. No confirmed placard system. Clear Lake tourism and wine region.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE / City of Lakeport Fire / Clearlake Fire / Kelseyville Fire / Middletown Area Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'portal',
  data_source_url = 'https://www.lakecountyca.gov/360/Food-Facility-Inspections',
  data_source_tier = 3,
  facility_count = 500,
  population_rank = 42,

  notes = 'STANDARDIZED March 2026. Report-only system. MEDIUM transparency. PDF reports by community/alphabetical list. Clear Lake tourism and wine (Lake County AVA). Significant wildfire history (Valley Fire 2015, River Fire, etc.) — seasonal food service volume varies. Key areas: Lakeport, Clearlake, Clearlake Oaks, Middletown, Kelseyville, Lower Lake.'

WHERE county = 'Lake' AND city IS NULL AND state = 'CA';
