-- ============================================================
-- SISKIYOU COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Siskiyou County Environmental Health
-- Address: 806 South Main Street, Yreka, CA 96097
-- Phone: (530) 841-2100
-- Portal: Searchable DB — last 2 routine inspections + all reinspections
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — searchable DB (last 2 routine + reinspections)
--   ~375 facilities
--   Transparency: MEDIUM-HIGH
--   NOTE: Local regulatory cite is CURFFL = California Uniform Retail
--         Food Facilities Law (equivalent to CalCode). Use CalCode in EvidLY.
--   Mount Shasta ski corridor. Oregon border.
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Siskiyou County Environmental Health',

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
    "regulatory_citation_note": "CURFFL = California Uniform Retail Food Facilities Law (equivalent to CalCode). Use CalCode citations in EvidLY.",
    "county_context": "Northern California mountain county (~375 facilities). Searchable database provides last 2 routine inspections plus all reinspections per facility. Mount Shasta ski corridor and Oregon border generate tourism volume. Yreka is county seat. Note: local regulatory citation uses CURFFL (= CalCode).",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~375 facilities. Searchable database: last 2 routine + all reinspections. CURFFL = CalCode (older local terminology). Mount Shasta and Oregon border tourism.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Siskiyou Unit / City of Yreka Fire / Mount Shasta Fire / Weed Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed. Local cite is CURFFL (= CalCode).',

  data_source_type = 'portal',
  data_source_url = 'https://www.co.siskiyou.ca.us/eh',
  data_source_tier = 2,
  facility_count = 375,
  population_rank = 40,

  notes = 'STANDARDIZED March 2026. Report-only. MEDIUM-HIGH transparency. Searchable DB (last 2 routine + all reinspections). CURFFL = CalCode. Mount Shasta ski corridor + Oregon border tourism.'

WHERE county = 'Siskiyou' AND city IS NULL AND state = 'CA';
