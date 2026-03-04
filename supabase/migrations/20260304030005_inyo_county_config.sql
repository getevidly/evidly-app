-- ============================================================
-- INYO COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Inyo County Environmental Health Department
-- Address: 1360 N. Main Street, Bishop, CA 93514
-- Phone: (760) 878-0238
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — no online portal
--   ~200–400 facilities
--   Transparency: LOW-MEDIUM
--   Second largest CA county by area; sparse population
--   Death Valley NP corridor — major NPS concessionaire food ops
--   Inyo + Mono share Ag Commissioner (EHDs are separate)
--   US-395 Eastern Sierra corridor
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Inyo County Environmental Health Department',

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
    "transparency_level": "low_medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Second largest California county by area; sparse population (~200–400 facilities). Bishop is county seat and primary EHD office. Death Valley National Park: major NPS concessionaire food operations. US-395 Eastern Sierra corridor. Lone Pine (Mt. Whitney gateway), Independence (county admin center), Tecopa hot springs tourism. No confirmed public online inspection portal. Note: Inyo and Mono Counties share an Agricultural Commissioner office — EHDs are separate.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~200–400 facilities. No online portal; reports public records by request. Death Valley NP concessionaire corridor. Bishop primary EHD office.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Mono Unit / Bishop Fire / Lone Pine FPD / Death Valley NPS Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'office_request',
  data_source_url = NULL,
  data_source_tier = 4,
  facility_count = 300,
  population_rank = 52,

  notes = 'STANDARDIZED March 2026. Report-only. LOW-MEDIUM transparency. Second largest CA county by area. Death Valley NP concessionaire food facilities. Bishop county seat. Lone Pine (Mt. Whitney), Tecopa (hot springs). Inyo + Mono share Ag Commissioner (EHDs separate).'

WHERE county = 'Inyo' AND city IS NULL AND state = 'CA';
