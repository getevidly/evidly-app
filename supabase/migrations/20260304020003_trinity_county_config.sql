-- ============================================================
-- TRINITY COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Trinity County Environmental Health
-- Address: 61 Airport Road, Weaverville, CA 96093
-- Phone: (530) 623-1354
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — most recent per facility published
--     online with Google Maps links
--   ~150–250 facilities
--   Transparency: MEDIUM-HIGH (high for size)
--   NO incorporated cities in entire county
--   EHD explicitly states "believes in transparency with the community"
--   Trinity Lake, Whiskeytown NRA, river recreation tourism
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Trinity County Environmental Health',

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
    "transparency_level": "medium_high",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Remote mountainous county (~150–250 facilities). NO incorporated cities in entire county — Weaverville is county seat (unincorporated). EHD explicitly states it believes in transparency; publishes most recent inspection per facility online with Google Maps links. Trinity Lake, Whiskeytown NRA, and river recreation generate seasonal tourism.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~150–250 facilities. Most recent inspection per facility published online with Google Maps links. No incorporated cities.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Shasta-Trinity Unit / Weaverville Fire / Trinity County Fire Safe Council',
  fire_ahj_type = 'cal_fire_primary',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'portal',
  data_source_url = 'https://www.trinitycounty.org/departments/environmental-health',
  data_source_tier = 3,
  facility_count = 200,
  population_rank = 57,

  notes = 'STANDARDIZED March 2026. Report-only. MEDIUM-HIGH transparency (high for size). EHD explicitly committed to transparency. Most recent inspections online with Google Maps links. No incorporated cities. Trinity Lake and river recreation seasonal volume.'

WHERE county = 'Trinity' AND city IS NULL AND state = 'CA';
