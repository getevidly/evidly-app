-- ═══════════════════════════════════════════════════════════════════════
-- BUTTE COUNTY — Verified Jurisdiction Configuration
--
-- Source: Butte County Public Health Department — Environmental Health Division
-- Confidence: MODERATE (70/100) — verified from official county sources
-- Import Eligible: Yes
-- Data Completeness: 70% (open: exact deduction point values)
--
-- Data Sources:
--   1. https://www.buttecounty.net/publichealth/environmentalhealth
--   2. https://www.buttecounty.net/publichealth/environmentalhealth/FoodInspection
--
-- Verified facts:
--   - GREEN / YELLOW / RED color-coded placard system
--   - GREEN = in compliance, open
--   - YELLOW = conditional pass, corrections required within timeframe
--   - RED = closed due to imminent health hazard, re-inspection required
--   - Placard posted at entrance shows current + previous inspection result
--   - Inspection reports available online (HIGH transparency)
--   - ~1,200 permitted food facilities
--   - Risk-based inspection frequency
--   - Regulatory basis: CalCode
--   - Permit renewal: Annual
-- ═══════════════════════════════════════════════════════════════════════

-- Update Butte County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Butte County Public Health Department — Environmental Health Division',

  -- Verified scoring/grading
  scoring_type = 'color_placard',
  grading_type = 'green_yellow_red',
  grading_config = '{
    "display_format": "green_yellow_red",
    "grades": [
      {"label": "GREEN", "meaning": "In compliance — open", "color": "#22c55e"},
      {"label": "YELLOW", "meaning": "Conditional pass — corrections required", "color": "#f59e0b"},
      {"label": "RED", "meaning": "Closed — imminent health hazard", "color": "#ef4444"}
    ],
    "letter_grade": false,
    "numeric_score": false,
    "placard_posted": true,
    "placard_location": "entrance",
    "placard_shows_previous": true,
    "grade_card_posted": false,
    "report_online": true,
    "transparency_level": "high",
    "transparency_note": "Inspection reports available online. Color-coded placard displayed at entrance showing current and previous inspection result.",
    "grading_note": "GREEN/YELLOW/RED color-coded placard system. Placard posted at entrance shows current + previous inspection result. GREEN = compliant, YELLOW = conditional (corrections required), RED = closed (imminent hazard). ~1,200 permitted food facilities."
  }'::jsonb,
  scoring_methodology = 'GREEN/YELLOW/RED color-coded placard system. GREEN = in compliance. YELLOW = conditional pass, corrections required within specified timeframe. RED = closed due to imminent health hazard, re-inspection required before reopening. Placard posted at entrance shows current + previous inspection. CalCode basis. Risk-based inspection frequency.',

  -- No numeric thresholds (GYR placard system)
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Fire AHJ
  fire_ahj_name = 'CAL FIRE / Butte County Fire / City Fire Departments',
  fire_ahj_type = 'mixed',
  has_local_amendments = false,
  local_amendment_notes = 'CAL FIRE Butte Unit serves unincorporated areas. City of Chico, Oroville, Paradise have own fire departments or districts.',

  -- Data sources
  data_source_type = 'portal',
  data_source_url = 'https://www.buttecounty.net/publichealth/environmentalhealth/FoodInspection',
  data_source_tier = 2,

  -- Facility count
  facility_count = 1200,

  -- Notes
  notes = 'STANDARDIZED (2026-03-03). Confidence: MODERATE (70/100). GREEN/YELLOW/RED color-coded placard system. HIGH transparency — inspection reports available online. Placard posted at entrance shows current + previous inspection. ~1,200 facilities. Risk-based inspection frequency. Annual permit renewal. Contact: (530) 552-3880.'
WHERE county = 'Butte'
  AND city IS NULL
  AND state = 'CA';
