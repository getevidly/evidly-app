-- ════════════════════════════════════════════════════════════════════════
-- YUBA COUNTY — VERIFIED FOOD SAFETY JURISDICTION CONFIG
-- JIE Standardization Series | March 2026
-- ════════════════════════════════════════════════════════════════════════
--
-- Agency:        Yuba County Community Development Department — Environmental Health Division
-- Address:       915 8th Street, Suite 123, Marysville, CA 95901
-- Phone:         (530) 749-5450
-- Portal:        yuba.org/departments/community_development/environmental_health/
-- Regulatory:    CalCode
-- Scoring:       No numeric score — inspection report only
-- Grading:       inspection_report (no letter grade, no placard)
-- Transparency:  MEDIUM — reports available but no public search portal
-- Facilities:    ~500–700 fixed food facilities
-- Fire AHJ:      CAL FIRE / City of Marysville Fire / Yuba County Fire
--
-- INSPECTION SYSTEM:
--   NO letter grade. NO numeric score. NO confirmed placard.
--   Inspection results documented in report format.
--   Reports available at EHD office and on request.
--   No confirmed public online searchable database.
--
-- IMPORTANT NOTE:
--   Yuba County ≠ Sutter County. Yuba City is the county seat of SUTTER County.
--   Marysville is the county seat of YUBA County.
--   Sutter County uses a Green / Yellow / Red placard system — Yuba County does NOT.
--
-- COUNTY CONTEXT: Marysville (county seat), Olivehurst, Linda, Wheatland.
--   Small rural county. Single EHD office in Marysville.
--
-- DATA SOURCES (verified March 2026):
--   1. https://www.yuba.org/departments/community_development/environmental_health/
--   2. Yuba County Community Development Department website
--
-- CONFIDENCE: 85/100 — agency details confirmed, inspection report system confirmed,
--   no public portal found. Adjacent Sutter County (GYR) cross-referenced to confirm
--   Yuba County uses a separate, simpler system.
-- ════════════════════════════════════════════════════════════════════════

UPDATE jurisdictions SET
  agency_name            = 'Yuba County Community Development Department — Environmental Health Division',
  agency_phone           = '(530) 749-5450',
  agency_address         = '915 8th Street, Suite 123, Marysville, CA 95901',
  public_portal          = 'https://www.yuba.org/departments/community_development/environmental_health/',
  regulatory_code        = 'CalCode',
  scoring_type           = 'inspection_report',
  grading_type           = 'inspection_report',
  pass_threshold         = NULL,
  warning_threshold      = NULL,
  critical_threshold     = NULL,
  transparency_level     = 'medium',
  inspection_frequency   = 'risk_based',
  facility_count         = 600,
  fire_ahj_name          = 'CAL FIRE / City of Marysville Fire / Yuba County Fire',
  fire_ahj_type          = 'mixed_cal_fire_city',
  has_local_amendments   = false,
  scoring_methodology    = 'Inspection report only. NO letter grade. NO numeric score. NO confirmed placard. Reports documented per CalCode inspection. Available at EHD office. No confirmed public online searchable database. ~500-700 fixed food facilities. Different from neighboring Sutter County (Green / Yellow / Red placard).',
  notes                  = 'STANDARDIZED March 2026. Inspection report only. Marysville = Yuba County seat (NOT Yuba City which is in Sutter County). Small rural county. Single EHD office. Adjacent Sutter County uses Green / Yellow / Red placard — Yuba does NOT.',
  data_source_url        = 'https://www.yuba.org/departments/community_development/environmental_health/',
  data_source_type       = 'static_page',
  data_source_tier       = 3,
  confidence_score       = 85,
  last_verified          = '2026-03-04',
  updated_at             = now()
WHERE county = 'Yuba' AND city IS NULL;
