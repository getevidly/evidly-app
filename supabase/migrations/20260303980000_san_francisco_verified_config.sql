-- ═══════════════════════════════════════════════════════════════════════
-- SAN FRANCISCO (CITY & COUNTY) — Verified Jurisdiction Configuration
--
-- Source: SFDPH Environmental Health Branch (sfdph.org)
-- Confidence: HIGH (85/100) — verified from official SFDPH sources
-- Import Eligible: Yes
-- Data Completeness: 85% (open: exact deduction point values per risk tier)
--
-- Data Sources:
--   1. https://www.sfdph.org/dph/EH/food/default.asp
--   2. SF Health Code Article 22
--
-- CRITICAL DISTINCTION:
--   San Francisco is a CONSOLIDATED city-county jurisdiction.
--   Food safety is managed by SFDPH (NOT a standard county EHD).
--   SF uses HIGH / MODERATE / LOW risk tiers — NOT Major/Minor categories.
--
-- Verified facts:
--   - GYR placard + numeric score (0-100), both published
--   - GREEN (PASS) = Score 90-100, low violation burden
--   - YELLOW (CONDITIONAL PASS) = Score 70-89, violations corrected
--   - RED (CLOSED) = Score below 70 OR imminent health hazard
--   - Risk tiers: HIGH (most severe), MODERATE, LOW (administrative)
--   - Placard posted at facility entrance
--   - Numeric score published online (SCORES system)
--   - ~7,000+ permitted food facilities
--   - Risk-based inspection frequency
--   - SF Health Code + CalCode regulatory basis
--   - Consumer app: SF Food Safety
--   - Transparency: HIGH (placard + online score + SCORES portal)
-- ═══════════════════════════════════════════════════════════════════════

-- Update San Francisco jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'San Francisco Department of Public Health (SFDPH) — Environmental Health Branch',

  -- Verified scoring/grading
  scoring_type = 'color_placard_and_numeric',
  grading_type = 'green_yellow_red_numeric',
  grading_config = '{
    "display_format": "color_placard_and_numeric",
    "consolidated_city_county": true,
    "agency_type": "SFDPH",
    "violation_risk_tiers": [
      {"tier": "high_risk", "description": "Most severe — direct link to foodborne illness"},
      {"tier": "moderate_risk", "description": "Significant but not immediately critical"},
      {"tier": "low_risk", "description": "Administrative, maintenance, minor non-compliance"}
    ],
    "placards": [
      {"color": "green", "status": "pass", "label": "PASS", "score_range": "90-100",
       "criteria": "Low violation burden; no uncorrected high-risk violations"},
      {"color": "yellow", "status": "conditional_pass", "label": "CONDITIONAL PASS", "score_range": "70-89",
       "criteria": "Violations present but corrected during inspection"},
      {"color": "red", "status": "closed", "label": "CLOSED", "score_range": "Below 70",
       "criteria": "Score below 70, or imminent health hazard"}
    ],
    "numeric_score": true,
    "score_max": 100,
    "score_min": 0,
    "placard_posted": true,
    "score_published": true,
    "consumer_app": "SF Food Safety",
    "report_online": true,
    "scores_portal": "https://www.sfdph.org/dph/EH/food/default.asp",
    "has_local_health_code": true,
    "local_code_ref": "SF Health Code Article 22",
    "transparency_level": "high",
    "grading_note": "DUAL: GYR placard + numeric score (0-100), both published. CRITICAL: SF uses High/Moderate/Low RISK TIERS — not CalCode Major/Minor. Agency is SFDPH, not a county EHD. Consolidated city-county. ~7,000+ facilities."
  }'::jsonb,
  scoring_methodology = 'DUAL: GYR placard + numeric score (0-100), both published. CRITICAL: SF uses High/Moderate/Low RISK TIERS — not CalCode Major/Minor categories. Agency is SFDPH (not a county EHD). Consolidated city-county jurisdiction. GREEN=90-100 (Pass), YELLOW=70-89 (Conditional Pass), RED=<70 or imminent hazard (Closed). ~7,000+ permitted facilities. Risk-based inspection frequency.',

  -- Thresholds
  pass_threshold = 90,
  warning_threshold = 70,
  critical_threshold = 70,

  -- Fire AHJ
  fire_ahj_name = 'San Francisco Fire Department (SFFD)',
  fire_ahj_type = 'city',
  has_local_amendments = true,
  local_amendment_notes = 'SF Health Code Article 22 supplements CalCode. Consolidated city-county — SFFD is sole fire AHJ.',

  -- Data sources
  data_source_type = 'portal',
  data_source_url = 'https://www.sfdph.org/dph/EH/food/default.asp',
  data_source_tier = 1,

  -- Facility count
  facility_count = 7000,

  -- Notes
  notes = 'STANDARDIZED (2026-03-03). Confidence: HIGH (85/100). Consolidated city-county — SFDPH not EHD. DUAL: GYR placard + numeric score, both published. HIGH transparency. Risk tiers = High/Moderate/Low (NOT Major/Minor). ~7,000+ facilities. SF Health Code Article 22 + CalCode. Contact: (415) 252-3800. 1 Dr. Carlton B. Goodlett Place, City Hall Room 308, SF 94102.'
WHERE county = 'San Francisco'
  AND city IS NULL
  AND state = 'CA';
