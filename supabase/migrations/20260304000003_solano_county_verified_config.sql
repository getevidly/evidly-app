-- ═══════════════════════════════════════════════════════════════════════
-- SOLANO COUNTY — Verified Jurisdiction Configuration
--
-- Agency: Solano County Department of Resource Management
--         Environmental Health Division
-- Address: 601 Texas Street, Fairfield, CA 94533
-- Phone: (707) 784-6765
-- Portal: solanocounty.com/depts/rm/food_facility/
-- Regulatory basis: CalCode
-- Transparency: MEDIUM — last 2 inspections per facility online
-- Verified: March 2026
--
-- Verified facts:
--   - NO letter grade. NO numeric score. NO color placard.
--   - Violation report only — standard CalCode inspection reports
--   - Last 2 inspections per facility available online
--   - Risk-based inspection frequency
--   - Covers Fairfield, Vacaville, Vallejo, Benicia, Dixon,
--     Suisun City, and Rio Vista
--   - Travis AFB: federal jurisdiction for on-base food;
--     county handles off-base facilities
--   - Fire AHJ: mixed CAL FIRE + city fire departments
-- ═══════════════════════════════════════════════════════════════════════

-- Update Solano County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Solano County Department of Resource Management — Environmental Health Division',

  -- Verified scoring/grading (violation report only)
  scoring_type = 'inspection_report',
  grading_type = 'violation_report_only',
  grading_config = '{
    "display_format": "inspection_report",
    "letter_grade": false,
    "numeric_score": false,
    "placard_posted": false,
    "report_online": true,
    "online_history_depth": "last_2_inspections",
    "inspection_frequency": "risk_based",
    "transparency_level": "medium",
    "transparency_note": "Last 2 inspections per facility available online. No letter grade, numeric score, or placard.",
    "grading_note": "NO letter grade. NO numeric score. NO placard. Violation report only. Last 2 inspections per facility available online through public food facility inspection database.",
    "public_portal": "https://www.solanocounty.com/depts/rm/food_facility/",
    "travis_afb_note": "Travis AFB food facilities under federal jurisdiction for on-base operations; county handles off-base facilities."
  }'::jsonb,
  scoring_methodology = 'Violation report only. NO letter grade, NO numeric score, NO placard. Last 2 inspections per facility available online. Risk-based inspection frequency. Standard CalCode violation classification.',

  -- NO thresholds — report-only system
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'CAL FIRE / City Fire Departments / Fairfield Fire / Vacaville Fire / Vallejo Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments identified. CalCode only.',

  -- Verified data source
  data_source_type = 'portal',
  data_source_url = 'https://www.solanocounty.com/depts/rm/food_facility/',
  data_source_tier = 3,

  -- Facility count from original estimate
  facility_count = 2200,
  population_rank = 24,

  -- Updated notes with verification info
  notes = 'STANDARDIZED March 2026. Report-only. MEDIUM transparency. Last 2 inspections per facility online. No placard. Fairfield HQ. Covers Fairfield, Vacaville, Vallejo, Benicia, Dixon, Suisun City, Rio Vista. Travis AFB under federal jurisdiction for on-base food. Contact: (707) 784-6765.'
WHERE county = 'Solano'
  AND city IS NULL
  AND state = 'CA';
