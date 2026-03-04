-- ============================================================
-- NEVADA COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Nevada County Community Development Agency
--         — Environmental Health Division
-- Address: 950 Maidu Avenue, Nevada City, CA 95959
-- Phone: (530) 265-1222
-- Portal: nevadacountyca.gov/2136/Food-Safety
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — standard CalCode violation classification
--   ~600–900 facilities
--   No confirmed public online portal for inspection results
--   Report available at facility or at EHD office by request
--   Transparency: MEDIUM
--   Key areas: Nevada City, Grass Valley, Truckee, Penn Valley,
--              North San Juan
--   Truckee is Lake Tahoe–adjacent (elevation ~5,800 ft)
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Nevada County Community Development Agency — Environmental Health Division',

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
    "transparency_level": "medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Sierra foothills and mountain communities (~600–900 facilities). Key areas: Nevada City (county seat), Grass Valley, Truckee (Lake Tahoe–adjacent), Penn Valley, North San Juan. Truckee presents unique jurisdictional complexity with Placer County and TRPA.",
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

  scoring_methodology = 'Inspection report only. ~600–900 facilities. Sierra foothills + mountain communities. No confirmed online portal for inspection results. Standard CalCode violation classification. Report available at facility or at EHD office by request.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE / City of Grass Valley Fire / City of Nevada City Fire / Truckee Fire Protection District',
  fire_ahj_type = 'mixed_cal_fire_city_district',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'none',
  data_source_url = 'https://www.nevadacountyca.gov/2136/Food-Safety',
  data_source_tier = 4,
  facility_count = 750,
  population_rank = 34,

  notes = 'STANDARDIZED March 2026. Report-only system. MEDIUM transparency. Sierra foothills + mountain communities (~600–900 facilities). No confirmed public online portal. Key areas: Nevada City, Grass Valley, Truckee (Lake Tahoe–adjacent), Penn Valley, North San Juan.'

WHERE county = 'Nevada' AND city IS NULL AND state = 'CA';
