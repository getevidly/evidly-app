-- ============================================================
-- HUMBOLDT COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Humboldt County Department of Health & Human Services
--         — Environmental Health Division
-- Address: 100 H Street, Suite 100, Eureka, CA 95501
-- Phone: (707) 445-6215
-- Portal: humboldtonline.envisionconnect.com (1-year history)
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — searchable online portal (1-year history)
--   ~800–1,000 facilities
--   Transparency: MEDIUM-HIGH
--   ~1,400–1,500 routine inspections per year
--   Cal Poly Humboldt (Arcata) student market
--   Eureka waterfront tourism
--   Strongest online presence in Far North region
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Humboldt County Department of Health & Human Services — Environmental Health Division',

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
    "county_context": "North Coast region (~800–1,000 facilities). Searchable online portal at humboldtonline.envisionconnect.com with up to 1 year of inspection history. ~1,400–1,500 routine inspections per year. Cal Poly Humboldt (Arcata) student market. Eureka waterfront tourism. Strongest online presence in Far North region.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~800–1,000 facilities. Searchable online portal (1-year history). No placard system.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Humboldt-Del Norte Unit / City of Eureka Fire / Arcata Fire / Fortuna Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'portal',
  data_source_url = 'https://humboldtonline.envisionconnect.com',
  data_source_tier = 2,
  facility_count = 900,
  population_rank = 24,

  notes = 'STANDARDIZED March 2026. Report-only. MEDIUM-HIGH transparency. Searchable portal (1-year history). ~1,400–1,500 inspections/year. Cal Poly Humboldt (Arcata). Key areas: Eureka, Arcata, Fortuna, McKinleyville.'

WHERE county = 'Humboldt' AND city IS NULL AND state = 'CA';
