-- ═══════════════════════════════════════════════════════════════════════
-- KINGS COUNTY — Verified Jurisdiction Configuration
--
-- Agency: Kings County Department of Public Health
--         Division of Environmental Health Services
-- Address: 330 Campus Drive, Hanford, CA 93230
-- Phone: (559) 852-2669
-- Portal: kcdph.com/ehsfoodinspectionreports
-- Alt portal: countyofkingsca.gov/.../online-inspection-reports
-- Regulatory basis: CalCode
-- Transparency: MEDIUM — PDF inspection reports posted online
-- Verified: March 2026
--
-- Verified facts:
--   - NO letter grades
--   - NO numeric scores
--   - NO placards
--   - Violation report only — standard CalCode ORFIR
--   - Major and Minor violations documented
--   - PDF inspection reports posted online by city/facility name
--   - On-site report required — must make available on request
--   - ~600 permitted facilities
--   - Hanford is the county seat (~150,000 population)
--   - Surrounded by Fresno, Tulare, Kern counties
--   - Fire AHJ: Kings County OES / CAL FIRE (unincorporated)
--   - No local amendments identified — CalCode only
--   - Data source: kcdph.com (Tier 3 — PDF portal)
-- ═══════════════════════════════════════════════════════════════════════

-- Update Kings County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Kings County Department of Public Health — Division of Environmental Health Services',

  -- Verified scoring/grading (violation report only — NO grade, NO score, NO placard)
  scoring_type = 'violation_report',
  grading_type = 'violation_report_only',
  grading_config = '{
    "display_format": "violation_report",
    "grades": null,
    "letter_grade": false,
    "numeric_score": false,
    "placard_posted": false,
    "grade_card_posted": false,
    "on_site_report_required": true,
    "public_posting_required": false,
    "transparency_level": "medium",
    "transparency_note": "PDF inspection reports posted online at kcdph.com/ehsfoodinspectionreports organized by city and facility name. Reports are public records.",
    "public_portal": "https://www.kcdph.com/ehsfoodinspectionreports",
    "grading_note": "NO letter grade. NO score. NO placard. PDF violation reports posted online by city/facility name."
  }'::jsonb,
  scoring_methodology = 'NO letter grade. NO score. NO placard. Standard CalCode ORFIR. Major and Minor violations documented. PDF inspection reports posted online by city and facility name. On-site report required — must make available on request.',

  -- NO numeric thresholds — violation report only
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'Kings County OES / CAL FIRE (unincorporated)',
  fire_ahj_type = 'cal_fire',
  has_local_amendments = false,
  local_amendment_notes = NULL,

  -- Verified data source
  data_source_type = 'pdf_portal',
  data_source_url = 'https://www.kcdph.com/ehsfoodinspectionreports',
  data_source_tier = 3,

  -- Verified facility count
  facility_count = 600,
  population_rank = 48,

  -- Updated notes with verification info
  notes = 'STANDARDIZED (2026-03). Violation report only. NO letter grade, NO score, NO placard. MEDIUM transparency — PDF inspection reports posted online at kcdph.com/ehsfoodinspectionreports by city/facility. ~600 permitted facilities. Hanford county seat (~150k pop). Surrounded by Fresno, Tulare, Kern counties. CalCode only — no local amendments identified. Contact: (559) 852-2669.'
WHERE county = 'Kings'
  AND city IS NULL
  AND state = 'CA';
