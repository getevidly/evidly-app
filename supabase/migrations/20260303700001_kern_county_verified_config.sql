-- ═══════════════════════════════════════════════════════════════════════
-- KERN COUNTY — Verified Jurisdiction Configuration
--
-- Agency: Kern County Public Health Services — Environmental Health Division
-- Address: 2700 M Street, Suite 300, Bakersfield, CA 93301
-- Phone: (661) 862-8700 / 1-800-522-5376
-- Email: eh@co.kern.ca.us
-- Portal: kernpublichealth.com (+ Safe Diner App)
-- Regulatory basis: CalCode + Kern County Code Chapter 8.58
-- Transparency: HIGH — grade card at facility + Safe Diner App + online portal
-- Verified: March 2026
--
-- Verified facts:
--   - Letter grade system: A/B/C + numeric score
--   - Start 100 pts, deduct per violation
--   - Major violation = 5 pts, Minor/Risk Factor = 3 pts, Non-critical = 1 pt
--   - A = 90-100 (PASS), B = 80-89 (WARNING), C = 75-79 (FAIL)
--   - CRITICAL: Closure threshold = 75 (not 70) — Kern County Code Ch 8.58
--   - Below 75 = permit suspended, facility closed immediately
--   - Grade card conspicuously posted at facility
--   - Safe Diner App: QR code on grade card links to full inspection report
--   - Risk-based inspections: 1-3/year based on risk level
--   - Rescore/contest available for B and C grades
--   - ~3,500 permitted facilities
--   - Fire AHJ: Kern County Fire Dept / CAL FIRE (unincorporated)
--   - Sources: NACCHO case study, Bakersfield Municipal Code 8.04.030
-- ═══════════════════════════════════════════════════════════════════════

-- Update Kern County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Kern County Public Health Services — Environmental Health Division',

  -- Verified scoring/grading (letter grade A/B/C with numeric score)
  scoring_type = 'letter_grade',
  grading_type = 'letter_grade_abc',
  grading_config = '{
    "display_format": "letter_grade_with_score",
    "grades": [
      {"grade": "A", "min": 90, "max": 100, "status": "pass", "label": "Compliant with state law"},
      {"grade": "B", "min": 80, "max": 89, "status": "warning", "label": "Below minimum health standards — corrective action required"},
      {"grade": "C", "min": 75, "max": 79, "status": "fail", "label": "Poor compliance — can be contested"},
      {"grade": "CLOSURE", "min": 0, "max": 74, "status": "closed", "label": "Permit suspended — facility closed"}
    ],
    "letter_grade": true,
    "numeric_score": true,
    "score_base": 100,
    "score_direction": "downward_deduction",
    "violation_points": {
      "major": 5,
      "minor_risk_factor": 3,
      "non_critical": 1
    },
    "placard_posted": true,
    "grade_card_posted": true,
    "grade_card_conspicuous": true,
    "inspection_frequency": "risk_based_1_to_3_per_year",
    "rescore_available": true,
    "contest_available": true,
    "transparency_level": "high",
    "transparency_note": "Grade card posted at facility + Safe Diner App + online portal.",
    "safe_diner_app": true,
    "local_authority": "Kern County Code Chapter 8.58; Bakersfield Municipal Code 8.04.030",
    "grading_note": "Kern raised closure threshold to 75 (not 70). Borrowed/customized from LA + SBC grading systems. Industry advisory group involved in 2006 redesign.",
    "public_portal": "https://www.kernpublichealth.com/permitting-compliance/food"
  }'::jsonb,
  scoring_methodology = 'Letter grade A / B / C. Start 100, deduct: Major=5pts, Minor/Risk=3pts, Non-critical=1pt. A=90-100 (pass), B=80-89 (warning), C=75-79 (fail), <75=closure/red. KERN SPECIFIC: Closure threshold 75 not 70. Risk-based inspections 1-3/yr. Grade posted at facility.',

  -- Verified thresholds (KERN SPECIFIC: closure at 75, not 70)
  pass_threshold = 90,
  warning_threshold = 80,
  critical_threshold = 75,

  -- Verified fire AHJ
  fire_ahj_name = 'Kern County Fire Department / CAL FIRE (unincorporated)',
  fire_ahj_type = 'county_cal_fire',
  has_local_amendments = true,
  local_amendment_notes = 'Kern County Code Chapter 8.58 establishes letter grade system. Closure threshold raised to 75 (not 70). Bakersfield Municipal Code 8.04.030 requires conspicuous grade card posting. Industry advisory group involved in 2006 redesign.',

  -- Verified data source
  data_source_type = 'portal',
  data_source_url = 'https://www.kernpublichealth.com/permitting-compliance/food',
  data_source_tier = 1,

  -- Verified facility count
  facility_count = 3500,
  population_rank = 14,

  -- Updated notes with verification info
  notes = 'STANDARDIZED March 2026. Letter grade A / B / C + numeric score. HIGH transparency. ~3,500 facilities. Bakersfield area. Closure threshold 75 (not 70 — Kern County Code Ch 8.58). Safe Diner App. Risk-based inspections 1-3/yr. Rescore/contest available for B and C grades. Local authority: Kern County Code Ch 8.58, Bakersfield Municipal Code 8.04.030. Contact: (661) 862-8700, eh@co.kern.ca.us.'
WHERE county = 'Kern'
  AND city IS NULL
  AND state = 'CA';
