-- ============================================================
-- SIERRA COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Sierra County Department of Environmental Health
-- Primary: 202 Front Street, P.O. Box 7, Loyalton, CA 96118
-- Downieville office: 100 Courthouse Square #200, Downieville, CA 95936
-- Phone: (530) 289-3698
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — no online portal
--   ~80–120 facilities
--   Transparency: LOW
--   Loyalton is the ONLY incorporated city.
--   Downieville is county seat (historic Gold Rush town, unincorporated).
--   Sierra Buttes and Lakes Basin seasonal tourism.
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Sierra County Department of Environmental Health',

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
    "county_context": "Small Sierra Nevada county (~80–120 facilities). Two EHD offices: Loyalton (main) and Downieville (courthouse). Loyalton is the only incorporated city. Downieville is county seat (historic Gold Rush town, unincorporated). No confirmed public online inspection portal. Sierra Buttes and Lakes Basin generate seasonal tourism.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~80–120 facilities. Two EHD offices: Loyalton (main) + Downieville courthouse. No online portal.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Nevada-Yuba-Placer Unit / Sierra County Fire Safe Council',
  fire_ahj_type = 'cal_fire_primary',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'office_request',
  data_source_url = NULL,
  data_source_tier = 5,
  facility_count = 100,
  population_rank = 60,

  notes = 'STANDARDIZED March 2026. Report-only. LOW transparency. ~80–120 facilities. Two offices: Loyalton (main) + Downieville (courthouse). Loyalton only incorporated city. Sierra Buttes and Lakes Basin seasonal tourism.'

WHERE county = 'Sierra' AND city IS NULL AND state = 'CA';
