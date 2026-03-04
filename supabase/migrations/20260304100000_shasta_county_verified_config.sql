-- ════════════════════════════════════════════════════════════════════════
-- SHASTA COUNTY — VERIFIED FOOD SAFETY JURISDICTION CONFIG
-- JIE Standardization Series | March 2026
-- ════════════════════════════════════════════════════════════════════════
--
-- Agency:        Shasta County Department of Resource Management — Environmental Health Division
-- Address:       1855 Placer Street, Suite 200, Redding, CA 96001
-- Phone:         (530) 225-5787
-- Portal:        co.shasta.ca.us/departments/resource-management/environmental-health/food-safety
-- Regulatory:    CalCode
-- Scoring:       Inspection report only
-- Grading:       inspection_report (no letter grade, no numeric score, no color placard)
-- Transparency:  MEDIUM — inspection data available online, full reports by records request
-- Facilities:    Not confirmed (NULL)
-- Fire AHJ:      CAL FIRE / City of Redding Fire / City of Anderson Fire / Shasta Lake City Fire
--
-- INSPECTION SYSTEM:
--   Standard CalCode inspection reports. No confirmed letter grade, numeric score,
--   or color-coded placard system. Online inspection data available. Full reports
--   available upon records request.
--
-- CITY OF REDDING NOTE:
--   Redding (~95,000 pop) is the county's largest city. Environmental health
--   inspections are handled by the COUNTY, not the City of Redding. City of
--   Redding Fire Department is fire AHJ for incorporated areas; CAL FIRE for
--   unincorporated.
--
-- COUNTY CONTEXT:
--   Far Northern California. Shasta Dam, Shasta Lake, Mount Shasta region.
--   Regional population ~180,000. Primarily restaurants, fast food, markets.
--
-- DATA SOURCES (verified March 2026):
--   1. https://www.co.shasta.ca.us/departments/resource-management/environmental-health/food-safety
--   2. co.shasta.ca.us environmental health search portal
--
-- CONFIDENCE: 80/100 — agency and program confirmed, but exact facility count
--   and full program details not independently verified from multiple sources.
-- ════════════════════════════════════════════════════════════════════════

UPDATE jurisdictions SET
  agency_name            = 'Shasta County Department of Resource Management — Environmental Health Division',
  agency_phone           = '(530) 225-5787',
  agency_address         = '1855 Placer Street, Suite 200, Redding, CA 96001',
  public_portal          = 'https://www.co.shasta.ca.us/departments/resource-management/environmental-health/food-safety',
  regulatory_code        = 'CalCode',
  scoring_type           = 'inspection_report',
  grading_type           = 'inspection_report',
  pass_threshold         = NULL,
  warning_threshold      = NULL,
  critical_threshold     = NULL,
  transparency_level     = 'medium',
  inspection_frequency   = 'risk_based',
  facility_count         = NULL,
  fire_ahj_name          = 'CAL FIRE / City of Redding Fire / City of Anderson Fire / Shasta Lake City Fire',
  fire_ahj_type          = 'mixed_cal_fire_city',
  has_local_amendments   = false,
  scoring_methodology    = 'Inspection report only. NO confirmed letter grade, numeric score, or color placard. Online inspection data available. Full reports by records request. County handles food inspection for city of Redding and unincorporated areas. Standard CalCode violation classification.',
  notes                  = 'STANDARDIZED March 2026. Report-only system. MEDIUM transparency. Covers Redding metro (no separate city food inspection). CAL FIRE for unincorporated; Redding FD for city limits.',
  data_source_url        = 'https://www.co.shasta.ca.us/departments/resource-management/environmental-health/food-safety',
  data_source_type       = 'html_searchable',
  data_source_tier       = 3,
  confidence_score       = 80,
  last_verified          = '2026-03-04',
  updated_at             = now()
WHERE county = 'Shasta' AND city IS NULL;
