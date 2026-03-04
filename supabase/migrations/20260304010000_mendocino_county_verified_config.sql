-- ═══════════════════════════════════════════════════════════════════════
-- MENDOCINO COUNTY — Verified Jurisdiction Configuration
--
-- Source: Mendocino County Public Health — Environmental Health Division
-- Confidence: MODERATE (70/100) — verified from official county sources
-- Import Eligible: Yes
-- Data Completeness: 70% (open: exact facility count)
--
-- Data Sources:
--   1. https://www.mendocinocounty.gov/departments/public-health/environmental-health/consumer-protection
--   2. Online inspection search: co.mendocino.ca.us/hhsa/cgi-bin/inspection.pl
--
-- Verified facts:
--   - Inspection report only
--   - NO letter grade, NO numeric score, NO confirmed placard
--   - Online inspection search available
--   - Fort Bragg satellite office relocated June 2025
--   - Standard CalCode risk-based program
--   - Transparency: MEDIUM (online inspection search available)
--   - ~500-700 estimated food facilities
--   - Ukiah is county seat
--   - Wine country (Anderson Valley) and coastal market
--   - Regulatory basis: CalCode
-- ═══════════════════════════════════════════════════════════════════════

-- Update Mendocino County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Mendocino County Public Health — Environmental Health Division',

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
    "report_online": true,
    "online_inspection_search": "https://co.mendocino.ca.us/hhsa/cgi-bin/inspection.pl",
    "transparency_level": "medium",
    "transparency_note": "Inspection report only. Online inspection search available at co.mendocino.ca.us/hhsa/cgi-bin/inspection.pl. No confirmed placard system.",
    "grading_note": "NO letter grade, NO numeric score, NO confirmed placard. Inspection report only. MEDIUM transparency — online inspection search available. Fort Bragg satellite office relocated June 2025. Ukiah is county seat. Wine country (Anderson Valley) and coastal market.",
    "satellite_offices": [
      {"location": "Fort Bragg", "note": "Relocated June 2025"}
    ]
  }'::jsonb,
  scoring_methodology = 'Inspection report only. NO letter grade, NO numeric score, NO confirmed placard. Online inspection search available. Standard CalCode risk-based program. Fort Bragg satellite office relocated June 2025.',

  -- No thresholds (report-only system)
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Fire AHJ
  fire_ahj_name = 'CAL FIRE / City of Ukiah Fire / City of Fort Bragg Fire / City of Willits Fire',
  fire_ahj_type = 'mixed',
  has_local_amendments = false,
  local_amendment_notes = 'CAL FIRE serves unincorporated areas. Cities of Ukiah, Fort Bragg, and Willits have own fire departments.',

  -- Data sources
  data_source_type = 'portal',
  data_source_url = 'https://www.mendocinocounty.gov/departments/public-health/environmental-health/consumer-protection',
  data_source_tier = 3,

  -- Facility count
  facility_count = 600,

  -- Notes
  notes = 'STANDARDIZED (2026-03-04). Confidence: MODERATE (70/100). Inspection report only — NO letter grade, NO numeric score, NO confirmed placard. MEDIUM transparency — online inspection search at co.mendocino.ca.us/hhsa/cgi-bin/inspection.pl. Fort Bragg satellite office relocated June 2025. ~500-700 estimated facilities. Ukiah = county seat. Wine country (Anderson Valley) and coastal market. Contact: (707) 234-6625. 501 Low Gap Road, Ukiah CA 95482.'
WHERE county = 'Mendocino'
  AND city IS NULL
  AND state = 'CA';
