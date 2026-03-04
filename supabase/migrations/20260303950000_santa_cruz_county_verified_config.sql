-- ═══════════════════════════════════════════════════════════════════════
-- SANTA CRUZ COUNTY — Verified Jurisdiction Configuration
--
-- Source: Santa Cruz County Environmental Health (scceh.com) + official docs
-- Confidence: MODERATE (75/100) — verified from official county sources
-- Import Eligible: Yes
-- Data Completeness: 75% (open: exact violation point values if any)
--
-- Data Sources:
--   1. https://scceh.com/NewHome/Programs/ConsumerProtection/Food/AboutRestaurantInspections.aspx
--   2. https://scceh.com/NewHome/Programs/ConsumerProtection/Food.aspx
--   3. My Santa Cruz County app (Apple/Android)
--
-- Verified facts:
--   - NO letter grade, NO numeric score, NO color placard
--   - Inspection report only
--   - Violations classified as: Critical (Major/Minor) and General
--   - Critical Major = imminent risk, highest severity
--   - Critical Minor = lower degree of critical risk
--   - General = non-critical sanitation/facility conditions
--   - Reports available online (scceh.com) and via My Santa Cruz County app
--   - 2-4 inspections per year depending on facility type
--   - ~2,000 permitted food facilities
--   - Complaint process: email or phone, anonymous accepted
--   - Regulatory basis: CalCode
--   - No codified pass/fail threshold — report-only system
-- ═══════════════════════════════════════════════════════════════════════

-- Update Santa Cruz County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Santa Cruz County Environmental Health',

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
    "report_online": true,
    "report_via_app": true,
    "app_name": "My Santa Cruz County",
    "public_portal": "https://scceh.com/NewHome/Programs/ConsumerProtection/Food.aspx",
    "transparency_level": "medium",
    "violation_types": [
      {"type": "critical_major", "description": "Critical risk factor with highest public health risk"},
      {"type": "critical_minor", "description": "Critical risk factor with lower but still significant risk"},
      {"type": "general", "description": "Non-critical sanitation and facility condition violations"}
    ],
    "grading_note": "Inspection report only. NO letter grade, NO numeric score, NO color placard. Critical violations sub-classified as major or minor. Reports via scceh.com and My Santa Cruz County app."
  }'::jsonb,
  scoring_methodology = 'Inspection report only. NO letter grade, NO numeric score, NO color placard. Violations classified as critical (major/minor) and general. Reports available at scceh.com and via My Santa Cruz County app. 2-4 inspections/year. CalCode basis.',

  -- No thresholds (report-only system)
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Fire AHJ
  fire_ahj_name = 'Santa Cruz County Fire Department / City Fire Departments / CAL FIRE CZU',
  fire_ahj_type = 'mixed',
  has_local_amendments = false,
  local_amendment_notes = 'CAL FIRE CZU serves unincorporated Santa Cruz County. City of Santa Cruz, Scotts Valley, Watsonville have own fire departments.',

  -- Data sources
  data_source_type = 'portal',
  data_source_url = 'https://scceh.com/NewHome/Programs/ConsumerProtection/Food.aspx',
  data_source_tier = 3,

  -- Facility count
  facility_count = 2000,

  -- Notes
  notes = 'STANDARDIZED (2026-03-03). Confidence: MODERATE (75/100). Report-only system — NO letter grade, NO numeric score, NO color placard. MEDIUM transparency — reports at scceh.com + My Santa Cruz County app. Violations: critical (major/minor) + general. ~2,000 facilities. 2-4 inspections/year. Contact: (831) 454-2022, Env.Hlth@co.santa-cruz.ca.us. 701 Ocean St Rm 312, Santa Cruz CA 95060.'
WHERE county = 'Santa Cruz'
  AND city IS NULL
  AND state = 'CA';
