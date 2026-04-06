-- ═══════════════════════════════════════════════════════════════════════
-- SUTTER COUNTY — Verified Jurisdiction Configuration
--
-- Source: Sutter County Development Services — Environmental Health Division
-- Confidence: MODERATE (70/100) — verified from official county sources
-- Import Eligible: Yes
-- Data Completeness: 70% (open: exact facility count)
--
-- Data Sources:
--   1. https://www.suttercounty.org/government/county-departments/development-services/environmental-health/food
--   2. appeal-democrat.com July 2024 (placarding program coverage)
--
-- Verified facts:
--   - GREEN / YELLOW / RED color-coded placard system
--   - GREEN = ≤1 major violation, mitigated or corrected during inspection
--   - YELLOW = 2+ major violations, corrected during inspection (reinspection typical)
--   - RED = imminent health hazard that cannot be mitigated/corrected during inspection
--   - ALL retail food establishments required to post placard
--   - Inspection reports also posted online
--   - Transparency: HIGH (placard + online reports)
--   - Yuba City is county seat (separate from neighboring Yuba County = report-only)
--   - Regulatory basis: CalCode
--   - Risk-based inspection frequency
-- ═══════════════════════════════════════════════════════════════════════

-- Update Sutter County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Sutter County Development Services — Environmental Health Division',

  -- Verified scoring/grading
  scoring_type = 'color_placard',
  grading_type = 'green_yellow_red',
  grading_config = '{
    "display_format": "green_yellow_red",
    "grades": [
      {"label": "GREEN", "meaning": "Pass — no more than 1 major violation, mitigated or corrected during inspection", "color": "#22c55e"},
      {"label": "YELLOW", "meaning": "Conditional Pass — 2+ major violations corrected during inspection; reinspection typical", "color": "#f59e0b"},
      {"label": "RED", "meaning": "Closed — imminent health hazard that cannot be mitigated or corrected during inspection", "color": "#ef4444"}
    ],
    "letter_grade": false,
    "numeric_score": false,
    "placard_posted": true,
    "placard_required": "all_retail_food",
    "report_online": true,
    "transparency_level": "high",
    "transparency_note": "Green / Yellow / Red placard posted at facility + inspection reports posted online. All retail food establishments required to post placard.",
    "grading_note": "GREEN/YELLOW/RED placard. Green=≤1 major corrected. Yellow=2+ majors corrected (reinspection typical). Red=imminent hazard uncorrectable. Note: adjacent Yuba County uses report-only system (no placard).",
    "violation_types": {
      "major": "Occurrences most likely to result in foodborne illness",
      "imminent_health_hazard": "Violations posing significant threat requiring immediate correction",
      "minor": "Non-sanitary conditions including some temp violations, plumbing issues, excessive grease, dilapidated surfaces"
    }
  }'::jsonb,
  scoring_methodology = 'GREEN/YELLOW/RED color-coded placard system. All retail food establishments required to post. GREEN = ≤1 major violation corrected during inspection. YELLOW = 2+ major violations corrected (reinspection typical). RED = imminent health hazard, cannot be corrected during inspection. Inspection reports also posted online. CalCode basis. Risk-based frequency.',

  -- No numeric thresholds (Green / Yellow / Red placard system)
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Fire AHJ
  fire_ahj_name = 'CAL FIRE / City of Yuba City Fire / City of Live Oak Fire',
  fire_ahj_type = 'mixed',
  has_local_amendments = false,
  local_amendment_notes = 'CAL FIRE serves unincorporated areas. Yuba City and Live Oak have city fire departments.',

  -- Data sources
  data_source_type = 'portal',
  data_source_url = 'https://www.suttercounty.org/government/county-departments/development-services/environmental-health/food',
  data_source_tier = 3,

  -- Notes
  notes = 'STANDARDIZED (2026-03-03). Confidence: MODERATE (70/100). GREEN/YELLOW/RED color-coded placard system. HIGH transparency — placard + online reports. All retail food required to post placard. Green=≤1 major corrected; Yellow=2+ majors corrected (reinspection typical); Red=imminent hazard uncorrectable. Yuba City = county seat. Adjacent to Yuba County (report-only). Contact: (530) 822-7200. 1130 Civic Center Blvd, Yuba City CA 95993.'
WHERE county = 'Sutter'
  AND city IS NULL
  AND state = 'CA';
