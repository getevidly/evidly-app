-- ============================================================
-- DEL NORTE COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Del Norte County Health & Human Services
--         — Environmental Health Branch
-- Address: 981 H Street, Suite 110, Crescent City, CA 95531
-- Phone: (707) 465-0426
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — no online portal
--   ~150–250 facilities
--   Transparency: LOW-MEDIUM
--   Crescent City is the ONLY incorporated city in the county
--   Oregon border. Redwood NP / Jedediah Smith SP tourism.
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Del Norte County Health & Human Services — Environmental Health Branch',

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
    "county_context": "Northernmost California coastal county (~150–250 facilities). Oregon border. Crescent City is the only incorporated city in the entire county. Redwood National & State Parks and Jedediah Smith SP generate seasonal tourism volume. No confirmed public online inspection portal.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~150–250 facilities. No online portal; reports at facility or EHD by request. Crescent City only incorporated city.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Humboldt-Del Norte Unit / Crescent City Fire / Crescent Fire Protection District',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'office_request',
  data_source_url = NULL,
  data_source_tier = 4,
  facility_count = 200,
  population_rank = 56,

  notes = 'STANDARDIZED March 2026. Report-only. LOW-MEDIUM transparency. No online portal. Crescent City only incorporated city. Oregon border. Redwood NP / Jedediah Smith SP tourism.'

WHERE county = 'Del Norte' AND city IS NULL AND state = 'CA';
