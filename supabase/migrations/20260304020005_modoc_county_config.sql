-- ============================================================
-- MODOC COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Modoc County Environmental Health
-- Address: 202 West 4th Street, Alturas, CA 96101
-- Phone: (530) 233-6307
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — no online portal, request only
--   ~90 facilities (one of California's smallest EHDs)
--   Transparency: LOW
--   Alturas is the ONLY incorporated city in the county
--   Oregon/Nevada border. Lava Beds NM, Tule Lake NWR.
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Modoc County Environmental Health',

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
    "county_context": "Most remote California county (~90 facilities — one of state''s smallest EHDs). Oregon and Nevada border. Alturas is the only incorporated city. Reports available at facility or EHD office by request only; no confirmed online portal. Lava Beds National Monument and Tule Lake NWR generate limited seasonal tourism.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~90 facilities — one of California''s smallest EHDs. No online portal; reports by request only. Alturas only incorporated city. Oregon/Nevada border.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Modoc Unit / City of Alturas Fire',
  fire_ahj_type = 'cal_fire_primary',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'office_request',
  data_source_url = NULL,
  data_source_tier = 5,
  facility_count = 90,
  population_rank = 61,

  notes = 'STANDARDIZED March 2026. Report-only. LOW transparency. ~90 facilities — one of California''s smallest EHDs. No online portal; request only. Alturas only incorporated city. Oregon/Nevada border. Lava Beds NM + Tule Lake NWR.'

WHERE county = 'Modoc' AND city IS NULL AND state = 'CA';
