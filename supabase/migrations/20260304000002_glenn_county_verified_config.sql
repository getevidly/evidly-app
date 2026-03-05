-- ══════════════════════════════════════════════════════════════
-- GLENN COUNTY — Food Safety Jurisdiction Config
-- Standardized: March 2026
-- ══════════════════════════════════════════════════════════════
-- Agency: Glenn County Environmental Health — Planning and Community Development Services
-- Address: 225 N. Tehama Street, Willows, CA 95988
-- Phone: (530) 934-6102
-- Portal: countyofglenn.net/government/departments/planning-community-development-services/environmental-health/food-safety/food-facility-inspection-reports
-- Regulatory: CalCode
-- Scoring: inspection_report (no numeric score, no letter grade, no confirmed placard)
-- Grading: inspection_report
-- Transparency: MEDIUM — PDF reports posted online by facility name
-- Fire AHJ: CAL FIRE / City of Willows Fire / City of Orland Fire (mixed)
-- Key areas: Willows, Orland, Hamilton City, Elk Creek
-- Estimated facilities: ~200-300
-- Source: countyofglenn.net/.../food-facility-inspection-reports — verified March 2026
-- ══════════════════════════════════════════════════════════════

UPDATE jurisdictions SET
  agency_name   = 'Glenn County Environmental Health — Planning and Community Development Services',
  agency_phone  = '(530) 934-6102',
  agency_address = '225 N. Tehama Street, Willows, CA 95988',
  public_portal = 'https://www.countyofglenn.net/government/departments/planning-community-development-services/environmental-health/food-safety/food-facility-inspection-reports',
  regulatory_code = 'CalCode',
  scoring_type  = 'inspection_report',
  grading_type  = 'inspection_report',
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,
  transparency_level = 'medium',
  inspection_frequency = 'risk_based',
  fire_ahj_name = 'CAL FIRE / City of Willows Fire / City of Orland Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  scoring_methodology = 'Inspection report only. PDF inspection reports posted online by individual facility name. No confirmed placard system. Standard CalCode risk-based inspection program.',
  notes = 'STANDARDIZED March 2026. PDF reports posted by facility name on county website. MEDIUM transparency. Small agricultural county. Willows is county seat.'
WHERE county = 'Glenn' AND city IS NULL;
