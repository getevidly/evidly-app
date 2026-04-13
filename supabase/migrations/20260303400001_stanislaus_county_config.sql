-- ============================================================
-- STANISLAUS COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Stanislaus County Environmental Resources Department
-- Address: 3800 Cornucopia Way, Suite C, Modesto, CA 95358
-- Portal: https://www.stancounty.com/er/environmental-health.shtm
-- Regulatory basis: CalCode — NO local amendments to grading
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO placards
--   Violation report only — CalCode ORFIR (Official Report of Food Inspection)
--   Transparency: LOW (Modesto Bee 2024 investigation highlighted lack of public access)
--   Results available ONLY via CPRA request or on-site during inspection
--   No online data portal for inspection results
--
-- Comparison to neighbors:
--   Merced:  Point accumulation system (Good/Satisfactory/Unsatisfactory)
--   Fresno:  Violation report only (same as Stanislaus)
--   San Joaquin: Violation report only
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Stanislaus County Environmental Resources Department',

  scoring_type = 'violation_report',
  grading_type = 'violation_report_only',
  grading_config = '{
    "display_format": "violation_report_only",
    "grades": {},
    "public_display": "none",
    "placard_required": false,
    "numeric_score_displayed": false,
    "transparency_level": "low",
    "data_access_method": "CPRA_request_only",
    "online_portal": false,
    "yelp_integration": false,
    "grading_note": "Stanislaus County does NOT issue letter grades, numeric scores, or color placards. Inspection results are documented via CalCode ORFIR (Official Report of Food Inspection) and are available only on-site during inspection or via CPRA request. The Modesto Bee (2024) investigated this lack of transparency.",
    "violation_categories": ["major", "minor"],
    "major_violation_action": "Correction required on-site or reinspection scheduled",
    "reinspection_trigger": "Uncorrected major violations",
    "closure_trigger": "Imminent health hazard per CalCode §114409",
    "food_handler_card": {
      "issuer": "CA-approved provider",
      "window_days": 30,
      "validity_years": 3,
      "note": "Standard CalCode requirement — no county-specific card"
    },
    "food_safety_manager": {
      "required": true,
      "min_per_facility": 1,
      "exam_type": "ANSI_accredited",
      "window_days": null
    }
  }'::jsonb,

  scoring_methodology = 'Violation report only. No numeric score, no letter grade, no placard. Inspectors document violations on CalCode ORFIR. Major violations require on-site correction or reinspection. Imminent health hazard (CalCode §114409) triggers immediate closure. Results not publicly posted — available via CPRA request only. Transparency level: LOW.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'Modesto Fire Department (City of Modesto); CAL FIRE / Tuolumne-Calaveras Unit (unincorporated)',
  fire_ahj_type = 'city_fd',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading. Standard CalCode enforcement only.',

  data_source_type = 'cpra_only',
  data_source_url = 'https://www.stancounty.com/er/environmental-health.shtm',
  data_source_tier = 3,
  facility_count = 2500,
  population_rank = 17,

  notes = 'STANDARDIZED March 2026. NO letter grades, NO numeric scores, NO placards. Violation report only (CalCode ORFIR). Transparency: LOW — Modesto Bee 2024 investigation highlighted lack of public access to inspection data. Results available only via CPRA request or on-site during inspection. No online data portal. Standard CalCode enforcement with risk-based inspection frequency.'

WHERE county = 'Stanislaus' AND city IS NULL AND state = 'CA';
