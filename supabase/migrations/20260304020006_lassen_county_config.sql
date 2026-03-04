-- ============================================================
-- LASSEN COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Lassen County Environmental Health
-- Address: 707 Nevada Street, Susanville, CA 96130
-- Phone: (530) 251-8183
-- Portal: Scanned PDFs online (most recent routine + reinspections),
--          updated every few weeks. Disclaimer: "informational only"
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — scanned PDFs online
--   ~300–400 facilities
--   Transparency: MEDIUM
--   Susanville county seat. Lassen Volcanic NP corridor.
--   US-395 travel corridor.
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Lassen County Environmental Health',

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
    "transparency_level": "medium",
    "portal_disclaimer": "informational only — official record at EHD office",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Northeast California (~300–400 facilities). Scanned PDFs of most recent routine inspections and reinspections posted online, updated every few weeks. Portal disclaimer: informational only — official record at EHD. Susanville county seat. Lassen Volcanic NP corridor generates seasonal tourism. US-395 travel corridor.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~300–400 facilities. Scanned PDFs online (most recent routine + reinspections), updated every few weeks. Portal disclaimer: informational only.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Lassen-Modoc Unit / Susanville Fire / Lassen County Fire Safe Council',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'portal',
  data_source_url = 'https://www.lassencounty.org/dept/environmental-health/environmental-health',
  data_source_tier = 3,
  facility_count = 350,
  population_rank = 45,

  notes = 'STANDARDIZED March 2026. Report-only. MEDIUM transparency. Scanned PDFs online (most recent + reinspections), updated every few weeks. Portal disclaimer: informational only. Lassen Volcanic NP corridor. Susanville county seat.'

WHERE county = 'Lassen' AND city IS NULL AND state = 'CA';
