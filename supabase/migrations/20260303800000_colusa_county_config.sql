-- ============================================================
-- COLUSA COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Colusa County Environmental Health
--         — Development Services Department
-- Address: 1213 Market Street, Colusa, CA 95932
-- Phone: (530) 458-0380
-- Portal: countyofcolusaca.gov/425/Retail-Food-Safety
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — standard CalCode violation classification
--   ~140 facilities — one of the smallest EHDs in California
--   No confirmed public online portal
--   Report available at facility or at EHD office by request
--   Fees paid at office; cash or check only
--   Transparency: LOW
--   Key areas: Colusa, Williams, Maxwell, Stonyford
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Colusa County Environmental Health — Development Services Department',

  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "grades": {},
    "numeric_score": false,
    "placard_required": false,
    "placard_posted": false,
    "report_online": false,
    "report_at_facility": true,
    "report_at_office": true,
    "transparency_level": "low",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "One of the smallest EHDs in California (~140 facilities). Key areas: Colusa, Williams, Maxwell, Stonyford. Fees paid at office; cash or check only.",
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

  scoring_methodology = 'Inspection report only. ~140 facilities. One of the smallest EHDs in California. No confirmed online portal or placard. Report available at facility or at EHD office by request. Standard CalCode violation classification.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE / City of Colusa Fire / City of Williams Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'none',
  data_source_url = 'https://www.countyofcolusaca.gov/425/Retail-Food-Safety',
  data_source_tier = 4,
  facility_count = 140,
  population_rank = 56,

  notes = 'STANDARDIZED March 2026. Report-only system. LOW transparency. One of the smallest EHDs in California (~140 facilities). No confirmed public online portal. Fees paid at office; cash or check only. Key areas: Colusa, Williams, Maxwell, Stonyford.'

WHERE county = 'Colusa' AND city IS NULL AND state = 'CA';
