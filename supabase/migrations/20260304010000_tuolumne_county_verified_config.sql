-- ══════════════════════════════════════════════════════════════
-- TUOLUMNE COUNTY — Food Safety Jurisdiction Config
-- Standardized: March 2026
-- ══════════════════════════════════════════════════════════════
-- Agency: Tuolumne County Community Development Department — Environmental Health Division
-- Address: A.N. Francisco Building, 48 W. Yaney Ave., Floors 3 & 4, Sonora, CA 95370
-- Phone: (209) 533-5633
-- Portal: tuolumnecounty.ca.gov/247/Safe-Food
-- Regulatory: CalCode
-- Scoring: inspection_report (no numeric score, no letter grade, no confirmed placard)
-- Grading: inspection_report
-- Transparency: MEDIUM — has own Field Inspection Guide (Oct 2021)
-- Fire AHJ: CAL FIRE / City of Sonora Fire / Tuolumne City Fire District / Groveland CSD (mixed)
-- Key areas: Sonora, Tuolumne, Jamestown, Groveland, Columbia, Big Oak Flat, Mi-Wuk Village
-- Estimated facilities: ~400-600
-- Source: tuolumnecounty.ca.gov/247/Safe-Food — verified March 2026
-- ══════════════════════════════════════════════════════════════

UPDATE jurisdictions SET
  agency_name   = 'Tuolumne County Community Development Department — Environmental Health Division',
  agency_phone  = '(209) 533-5633',
  agency_address = 'A.N. Francisco Building, 48 W. Yaney Ave., Floors 3 & 4, Sonora, CA 95370',
  public_portal = 'https://www.tuolumnecounty.ca.gov/247/Safe-Food',
  regulatory_code = 'CalCode',
  scoring_type  = 'inspection_report',
  grading_type  = 'inspection_report',
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,
  transparency_level = 'medium',
  inspection_frequency = 'risk_based',
  fire_ahj_name = 'CAL FIRE / City of Sonora Fire / Tuolumne City Fire District / Groveland Community Services District',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  scoring_methodology = 'Inspection report only. County has its own Field Inspection Guide (updated October 2021) modeled after Sacramento''s approach. No confirmed placard system. Risk-based CalCode inspections.',
  notes = 'STANDARDIZED March 2026. MEDIUM transparency. Has its own Field Inspection Guide (Oct 2021). Includes Columbia State Historic Park food vendors. Sonora is county seat. No confirmed online portal or placard.'
WHERE county = 'Tuolumne' AND city IS NULL;
