-- ============================================================
-- ALPINE COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Alpine County Environmental Health
-- Address: 75 A Diamond Valley Rd, Markleeville, CA 96120
-- Phone: (530) 694-2235
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — no online portal
--   ~75 facilities (California's smallest EHD by population)
--   Transparency: LOW
--   No incorporated cities. Markleeville is county seat (unincorporated).
--   Seasonal: Lake Tahoe + Bear Valley ski resort.
--   California's smallest county by population (~1,200 residents).
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Alpine County Environmental Health',

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
    "county_context": "California''s smallest county by population (~1,200 residents). ~75 food facilities — one of California''s smallest EHDs. No confirmed public online inspection portal. Markleeville is county seat (unincorporated). Seasonal tourism from Lake Tahoe South Shore and Sierra ski corridor (Bear Valley resort). No incorporated cities.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~75 facilities — California''s smallest EHD by population. No online portal.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Amador-El Dorado Unit / Alpine County Fire Safe Council',
  fire_ahj_type = 'cal_fire_primary',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'office_request',
  data_source_url = NULL,
  data_source_tier = 5,
  facility_count = 75,
  population_rank = 62,

  notes = 'STANDARDIZED March 2026. Report-only. LOW transparency. ~75 facilities — California''s smallest EHD. No online portal. Bear Valley ski resort and Lake Tahoe corridor seasonal surge.'

WHERE county = 'Alpine' AND city IS NULL AND state = 'CA';
