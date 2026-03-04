-- ═══════════════════════════════════════════════════════════════════════
-- SANTA BARBARA COUNTY — Verified Jurisdiction Configuration
--
-- Source: Santa Barbara County PHD EHS (countyofsb.org) + operator guide
-- Confidence: MODERATE (70/100) — verified from official county sources
-- Import Eligible: Yes
-- Data Completeness: 70% (open: exact violation classification details)
--
-- Data Sources:
--   1. https://www.countyofsb.org/2118/Retail-Food
--   2. Santa Barbara County food facility operator guide (civicplus.com)
--
-- Verified facts:
--   - NO letter grade, NO numeric score, NO color placard
--   - Inspection report only
--   - Reports emailed to facility within ~2 business days
--   - No public online inspection results database found
--   - Minimum 1 inspection per year (routine)
--   - Complaint/foodborne illness inspections conducted as needed
--   - Health permit required, displayed prominently
--   - Permit billing: anniversary-date billing cycle
--   - Plan check required before new construction/remodeling
--   - Two offices: Santa Barbara (805-681-4900) and Santa Maria
--   - ~2,000+ permitted food facilities
--   - Regulatory basis: CalCode
--   - Transparency: MEDIUM-LOW (no online portal for results)
-- ═══════════════════════════════════════════════════════════════════════

-- Update Santa Barbara County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Santa Barbara County Public Health Department — Environmental Health Services',

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
    "report_emailed_to_operator": true,
    "report_email_timeframe": "within_2_business_days",
    "transparency_level": "medium_low",
    "transparency_note": "No public online inspection results database found. Reports emailed to facility operator after inspection.",
    "grading_note": "Inspection report only. NO letter grade, NO numeric score, NO color placard. Reports emailed to operator within ~2 business days. Two offices: Santa Barbara and Santa Maria.",
    "permit_billing": "anniversary_date_billing_cycle",
    "plan_check_required": true
  }'::jsonb,
  scoring_methodology = 'Inspection report only. NO letter grade, NO numeric score, NO color placard. Reports emailed to facility operator within ~2 business days. No public online results portal found. Minimum 1 routine inspection/year. CalCode basis. Two offices: Santa Barbara and Santa Maria.',

  -- No thresholds (report-only system)
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Fire AHJ
  fire_ahj_name = 'Santa Barbara County Fire Department / City Fire Departments / CAL FIRE',
  fire_ahj_type = 'mixed',
  has_local_amendments = false,
  local_amendment_notes = 'Santa Barbara County Fire Department serves unincorporated areas. City of Santa Barbara, Santa Maria, Lompoc, Goleta, Carpinteria have own fire departments. CAL FIRE contract county.',

  -- Data sources
  data_source_type = 'portal',
  data_source_url = 'https://www.countyofsb.org/2118/Retail-Food',
  data_source_tier = 3,

  -- Facility count
  facility_count = 2000,

  -- Notes
  notes = 'STANDARDIZED (2026-03-03). Confidence: MODERATE (70/100). Report-only system — NO letter grade, NO numeric score, NO color placard. MEDIUM-LOW transparency — no online results portal; reports emailed to operator within ~2 business days. ~2,000+ facilities. Annual minimum inspections. Two offices: Santa Barbara (805-681-4900) and Santa Maria. Permit billing: anniversary-date cycle. CAL FIRE contract county.'
WHERE county = 'Santa Barbara'
  AND city IS NULL
  AND state = 'CA';
