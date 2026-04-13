-- ============================================================
-- SANTA CLARA COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Santa Clara County Public Health Department
--         — Environmental Health Division
-- Address: 976 Lenzen Avenue, San Jose, CA 95126
-- Phone: (408) 918-3400
-- Portal: sccphd.org + SCCDineOut app (iOS/Android)
-- Inspection Portal: eservices.sccgov.org/facilityinspection
-- Regulatory basis: CalCode (Health & Safety Code Div. 104 Part 7)
-- Verified: March 2026 (updated)
--
-- DUAL SYSTEM — GYR Placard + Numeric Score:
--   Both published. Placard color determined by numeric score thresholds.
--   GREEN  = PASS — score 90-100
--   YELLOW = CONDITIONAL PASS — score 70-89. Reinspection within 3 business days.
--   RED    = CLOSURE — score below 70 or imminent health/safety threat
--
-- NUMERIC SCORE:
--   Start 100. Major=8pts deducted, Moderate=3pts, Minor=2pts.
--   Score drives placard color AND is published online.
--
-- Transparency: HIGH — placard at facility + numeric score + full reports online
-- Program launched: October 1, 2014 (modeled on Sacramento County GYR system)
--
-- Comparison to neighbors:
--   San Francisco: GYR + numeric (same dual system, different risk tier model)
--   Sacramento:    GYR placard only (no numeric score published)
--   Alameda:       Letter grade (A/B/C)
--   San Mateo:     No public grading system
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Santa Clara County Public Health Department — Environmental Health Division',

  scoring_type = 'color_placard_and_numeric',
  grading_type = 'green_yellow_red_numeric',
  grading_config = '{
    "display_format": "green_yellow_red_numeric",
    "placards": {
      "green": {
        "status": "pass",
        "label": "PASS",
        "range": "90-100",
        "criteria": "Low violation burden — facility in compliance"
      },
      "yellow": {
        "status": "conditional_pass",
        "label": "CONDITIONAL PASS",
        "range": "70-89",
        "criteria": "Violations corrected during inspection. Reinspection within 3 business days."
      },
      "red": {
        "status": "closed",
        "label": "CLOSURE",
        "range": "Below 70",
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
    "score_note": "GYR placard color determined by numeric score thresholds. Score: 100-pt deductive (Major=8, Moderate=3, Minor=2).",
    "placard_posted": true,
    "scc_dine_out_app": true,
    "program_launched": "2014-10-01",
    "reinspection_trigger": "Yellow placard — reinspection within 3 business days",
    "closure_trigger": "Red placard — score below 70 or imminent health/safety threat",
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

  scoring_methodology = 'DUAL: GYR placard + numeric score (both published). Placard color determined by score thresholds: Green=90-100, Yellow=70-89, Red=<70. Score: Start 100, deduct Major=8pts, Moderate=3pts, Minor=2pts. Yellow triggers reinspection within 3 business days. Risk-based inspections 1-3/yr. SCCDineOut app + online portal.',

  pass_threshold = 90,
  warning_threshold = 70,
  critical_threshold = 70,

  fire_ahj_name = 'Santa Clara County Fire Department / City fire departments (San Jose, Sunnyvale, etc.)',
  fire_ahj_type = 'mixed_county_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading. GYR placard program is a county-level overlay on standard CalCode enforcement.',

  data_source_type = 'portal',
  data_source_url = 'https://eservices.sccgov.org/facilityinspection',
  data_source_tier = 1,
  facility_count = 10000,
  population_rank = 6,

  notes = 'STANDARDIZED March 2026 (updated). DUAL: GYR placard + numeric score — both published. HIGH transparency. Silicon Valley (San Jose = 10th largest US city). Program launched Oct 2014, modeled on Sacramento GYR. SCCDineOut portal + mobile app. Placard color determined by numeric score thresholds (Green=90+, Yellow=70-89, Red=<70).'

WHERE county = 'Santa Clara' AND city IS NULL AND state = 'CA';
