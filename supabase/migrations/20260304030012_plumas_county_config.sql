-- ============================================================
-- PLUMAS COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Plumas County Environmental Health Division
-- Address: 270 County Hospital Road, Suite 127, Quincy, CA 95971
-- Phone: (530) 283-6355 | Fax: (530) 283-6241
-- Portal: plumascounty.us/608/Food-Facility-Inspections
--          ALL fixed facility reports online — confirmed in EHD annual report
-- Satellite: Chester Civic Center (Mon/Wed/Fri mornings)
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — ALL fixed facility reports online
--   ~200–400 facilities
--   Transparency: HIGH (for rural/remote county)
--   Feather River Canyon, Lake Almanor, Lassen Volcanic NP gateway
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Plumas County Environmental Health Division',

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
    "transparency_level": "high",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Northern Sierra Nevada mountain county (~200–400 facilities). All fixed food facility inspection reports published online — confirmed in EHD annual report. Quincy main office; Chester satellite office (Mon/Wed/Fri mornings). Feather River Canyon, Lake Almanor, and Lassen Volcanic NP gateway tourism. Plumas-Sierra County Fair (annual).",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~200–400 facilities. ALL fixed facility reports online (confirmed per EHD annual report). HIGH transparency for rural mountain county.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Lassen-Modoc Unit / Quincy Fire / Chester Fire / Plumas County Fire Safe Council',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'portal',
  data_source_url = 'https://www.plumascounty.us/608/Food-Facility-Inspections',
  data_source_tier = 2,
  facility_count = 300,
  population_rank = 50,

  notes = 'STANDARDIZED March 2026. Report-only. HIGH transparency — all fixed facility reports online (confirmed per EHD annual report). Quincy main + Chester satellite (Mon/Wed/Fri). Feather River Canyon, Lake Almanor, Lassen NP gateway.'

WHERE county = 'Plumas' AND city IS NULL AND state = 'CA';
