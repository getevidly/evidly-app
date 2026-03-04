-- ═══════════════════════════════════════════════════════════════════════
-- AMADOR COUNTY — Verified Jurisdiction Configuration
--
-- Source: Amador County Environmental Health Department
-- Confidence: MODERATE (65/100) — verified from official county sources
-- Import Eligible: Yes
-- Data Completeness: 65% (open: exact facility count, online portal status)
--
-- Data Sources:
--   1. https://www.amadorcounty.gov/departments/environmental-health/food-program
--
-- Verified facts:
--   - Inspection report only
--   - NO letter grade, NO numeric score, NO confirmed placard
--   - Results viewable at the facility or in person at EHD office
--   - No confirmed public online portal for inspection results
--   - EHD website notes inspectors carry photo ID and do not collect money on-site
--   - Transparency: LOW-MEDIUM
--   - ~300-500 estimated food facilities
--   - Jackson is county seat (Gold Country / Wine country foothill market)
--   - Regulatory basis: CalCode
--   - Risk-based inspection frequency
-- ═══════════════════════════════════════════════════════════════════════

-- Update Amador County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Amador County Environmental Health Department',

  -- Verified scoring/grading
  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "grades": null,
    "letter_grade": false,
    "numeric_score": false,
    "placard_posted": false,
    "grade_card_posted": false,
    "on_site_report_required": true,
    "report_online": false,
    "report_viewable_at_facility": true,
    "report_viewable_at_ehd_office": true,
    "transparency_level": "low_medium",
    "transparency_note": "Inspection report only. Results viewable at facility or in person at EHD office (810 Court St, Jackson). No confirmed public online portal. Inspectors carry photo ID and do not collect money on-site.",
    "grading_note": "NO letter grade, NO numeric score, NO confirmed placard. Inspection report only. LOW-MEDIUM transparency. Jackson is county seat. Gold Country / wine country foothill market."
  }'::jsonb,
  scoring_methodology = 'Inspection report only. NO letter grade, NO numeric score, NO confirmed placard. Results viewable at the facility or in person at the Amador County EHD office. No confirmed public online portal. CalCode basis. Risk-based inspection frequency.',

  -- No thresholds (report-only system)
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Fire AHJ
  fire_ahj_name = 'CAL FIRE / City of Jackson Fire / Amador Fire Protection District',
  fire_ahj_type = 'mixed',
  has_local_amendments = false,
  local_amendment_notes = 'CAL FIRE serves unincorporated areas. City of Jackson, Ione, Sutter Creek have local fire departments or districts.',

  -- Data sources
  data_source_type = 'portal',
  data_source_url = 'https://www.amadorcounty.gov/departments/environmental-health/food-program',
  data_source_tier = 4,

  -- Facility count
  facility_count = 400,

  -- Notes
  notes = 'STANDARDIZED (2026-03-04). Confidence: MODERATE (65/100). Inspection report only — NO letter grade, NO numeric score, NO confirmed placard. LOW-MEDIUM transparency — results at facility or EHD office in person only. No confirmed public online portal. ~300-500 estimated facilities. Jackson = county seat. Gold Country / wine country foothill market. Inspectors carry photo ID and do not collect money on-site. Contact: (209) 223-6439. 810 Court Street, Jackson CA 95642.'
WHERE county = 'Amador'
  AND city IS NULL
  AND state = 'CA';
