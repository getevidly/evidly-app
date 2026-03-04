-- ============================================================
-- SANTA CLARA COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Santa Clara County Department of Environmental Health (DEH)
-- Address: 1555 Berger Dr., Bldg. 2, San Jose, CA 95112
-- Phone: (408) 918-3400
-- Portal: deh.santaclaracounty.gov + SCCDineOut app (iOS/Android)
-- Inspection Portal: eservices.sccgov.org/facilityinspection
-- Regulatory basis: CalCode (Health & Safety Code Div. 104 Part 7)
-- Verified: March 2026
--
-- PLACARD SYSTEM — GREEN/YELLOW/RED:
--   Placards based on major violation COUNT (not numeric score):
--   GREEN  = PASS — ≤1 major violation observed AND corrected during inspection
--   YELLOW = CONDITIONAL PASS — 2+ major violations, all corrected. Reinspection within 3 business days.
--   RED    = CLOSURE — Imminent threat to health/safety, violation(s) not corrected
--
-- NUMERIC SCORE (separate from placard):
--   Start 100. Major=8pts deducted, Moderate=3pts, Minor=2pts.
--   Score = compliance indicator only; placard = official pass/status.
--
-- Transparency: HIGH — placard at facility + numeric score + full reports online
-- Program launched: October 1, 2014 (modeled on Sacramento County GYR system)
--
-- Comparison to neighbors:
--   Sacramento: GYR placard only (no numeric score published)
--   Alameda:    Letter grade (A/B/C)
--   San Mateo:  No public grading system
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Santa Clara County Department of Environmental Health',

  scoring_type = 'color_placard_with_numeric_score',
  grading_type = 'green_yellow_red_with_score',
  grading_config = '{
    "display_format": "color_placard_with_score",
    "placards": {
      "green": {
        "status": "pass",
        "label": "PASS",
        "criteria": "No more than 1 major violation observed, corrected during inspection"
      },
      "yellow": {
        "status": "conditional_pass",
        "label": "CONDITIONAL PASS",
        "criteria": "2+ major violations observed, all corrected during inspection. Reinspection within 3 business days."
      },
      "red": {
        "status": "closed",
        "label": "CLOSURE",
        "criteria": "Imminent threat to health/safety; violations not corrected during inspection."
      }
    },
    "numeric_score": true,
    "score_base": 100,
    "score_direction": "downward_deduction",
    "violation_points": {
      "major": 8,
      "moderate": 3,
      "minor": 2
    },
    "score_note": "Numeric score is compliance indicator only — separate from placard color. Placard = status; score = compliance depth.",
    "placard_posted": true,
    "scc_dine_out_app": true,
    "program_launched": "2014-10-01",
    "reinspection_trigger": "Yellow placard — reinspection within 3 business days",
    "closure_trigger": "Red placard — imminent health/safety threat, not corrected",
    "food_handler_card": {
      "issuer": "CA-approved provider",
      "window_days": 30,
      "validity_years": 3,
      "note": "Standard CalCode requirement"
    },
    "food_safety_manager": {
      "required": true,
      "min_per_facility": 1,
      "exam_type": "ANSI_accredited"
    }
  }'::jsonb,

  scoring_methodology = 'GYR placard based on major violation COUNT. Green=pass (≤1 major corrected). Yellow=conditional (2+ majors corrected, reinspection within 3 business days). Red=closure (imminent threat, not corrected). SEPARATE numeric score: Start 100, deduct Major=8pts, Moderate=3pts, Minor=2pts. Score = compliance indicator; placard = official pass/status. Risk-based inspections 1-3/yr. SCCDineOut app + online portal.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'Santa Clara County Fire Department / City fire departments (San Jose, Sunnyvale, etc.)',
  fire_ahj_type = 'mixed_county_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading. GYR placard program is a county-level overlay on standard CalCode enforcement.',

  data_source_type = 'portal',
  data_source_url = 'https://eservices.sccgov.org/facilityinspection',
  data_source_tier = 1,
  facility_count = 10000,
  population_rank = 6,

  notes = 'STANDARDIZED March 2026. GYR placard + numeric score. HIGH transparency. Silicon Valley (San Jose = 10th largest US city). Program launched Oct 2014, modeled on Sacramento GYR. SCCDineOut portal + mobile app. Placard based on major violation COUNT, not numeric score. Numeric score published separately as compliance depth indicator.'

WHERE county = 'Santa Clara' AND city IS NULL AND state = 'CA';
