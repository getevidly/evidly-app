-- ═══════════════════════════════════════════════════════════════════════
-- TULARE COUNTY — Verified Jurisdiction Configuration
--
-- Source: Tulare County DEH portal + Visalia Times-Delta inspection reports
-- Confidence: MODERATE (70/100) — no codified pass threshold found
-- Import Eligible: Yes (after threshold verification with county)
-- Data Completeness: 70% (open: pass/fail threshold, exact deduction rules)
--
-- Data Sources:
--   1. https://tularecountyeh.org/food-facilities-inspection-results
--   2. https://tularecountyeh.org/eh/our-services/food
--   3. Visalia Times-Delta monthly inspection reports (2023-2025)
--
-- Verified facts:
--   - 100-point deductive scoring system
--   - Numeric score published online — NO letter grade
--   - NO placard posted at facility
--   - NO grade card posted at facility
--   - Scores searchable at tularecountyeh.org/food-facilities-inspection-results
--   - Common score range observed: 86-100
--   - 100 = no violations ("perfect" score)
--   - Major violations: imminent health hazard, immediate correction/closure
--   - Minor violations: correction required, reinspection not always triggered
--   - Regulatory basis: California Retail Food Code (CalCode)
--   - ~3,500 permitted food facilities
--   - THRESHOLD NOTE: No codified pass/fail threshold identified.
--     Using 90/80/70 as estimated thresholds — verify with county
--     before setting production values.
-- ═══════════════════════════════════════════════════════════════════════

-- Update Tulare County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Tulare County Division of Environmental Health',

  -- Verified scoring/grading
  scoring_type = 'numeric_score',
  grading_type = 'numeric_score_no_letter',
  grading_config = '{
    "display_format": "numeric_score",
    "grades": null,
    "letter_grade": false,
    "numeric_score": true,
    "score_base": 100,
    "score_direction": "downward_deduction",
    "placard_posted": false,
    "grade_card_posted": false,
    "on_site_report_required": true,
    "public_portal": "https://tularecountyeh.org/food-facilities-inspection-results",
    "transparency_level": "medium",
    "grading_note": "Numeric score (100-point base, deductions for violations). No letter grade. No placard. Scores searchable online.",
    "threshold_note": "No codified pass threshold found — verify with county. Using 70 as default per CalCode precedent."
  }'::jsonb,
  scoring_methodology = 'Numeric score 0-100 (deduction). NO letter grade. NO placard. Scores searchable online. Common range: 86-100. 100 = no violations. Thresholds estimated — verify with county.',

  -- Estimated thresholds (VERIFY WITH COUNTY)
  pass_threshold = 90,
  warning_threshold = 80,
  critical_threshold = 70,

  -- Fire AHJ
  fire_ahj_name = 'Tulare County OES / CAL FIRE (unincorporated) / local city FDs',
  fire_ahj_type = 'county_multi',
  has_local_amendments = false,
  local_amendment_notes = 'CAL FIRE TUU serves unincorporated Tulare County. Incorporated cities (Visalia, Tulare, Porterville, Dinuba, Exeter, etc.) have own fire departments.',

  -- Data sources
  data_source_type = 'portal',
  data_source_url = 'https://tularecountyeh.org/food-facilities-inspection-results',
  data_source_tier = 3,

  -- Facility count
  facility_count = 3500,
  population_rank = 26,

  -- Notes
  notes = 'STANDARDIZED (2026-03-03). Confidence: MODERATE (70/100). Numeric score only — NO letter grade, NO placard. MEDIUM transparency — scores searchable online. Common range 86-100. Visalia/Porterville/Tulare/Dinuba area. Visalia Times-Delta publishes monthly inspection coverage. THRESHOLD NOTE: no codified pass line found — using 90/80/70 estimates. Verify with county (559) 624-7400 before setting production thresholds. Fire: CAL FIRE TUU (unincorporated) + city FDs (Visalia FD, Tulare FD, Porterville FD).'
WHERE county = 'Tulare'
  AND city IS NULL
  AND state = 'CA';
