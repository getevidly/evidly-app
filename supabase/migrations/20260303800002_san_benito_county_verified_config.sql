-- ═══════════════════════════════════════════════════════════════════════
-- SAN BENITO COUNTY — Verified Jurisdiction Configuration
--
-- Agency: San Benito County Health & Human Services Agency
--         Environmental Health
-- Address: 351 Tres Pinos Road, Suite C-1, Hollister, CA 95023
-- Phone: (831) 636-4035 | Fax: (831) 636-4037
-- Email: Environmentalhealth@sanbenitocountyca.gov
-- Manager: Darryl Wong, REHS
-- Portal: hhsa.sanbenitocountyca.gov/environmental-health-2-2/
-- Regulatory basis: CalCode only
-- Transparency: LOW — no public online inspection database found
-- Verified: March 2026
--
-- Verified facts:
--   - NO letter grade. NO numeric score. NO color placard.
--   - Inspection report only — left at facility
--   - No online inspection results portal found
--   - Reports available at facility or via public records request
--   - ~300-500 permitted facilities (second-smallest county by population)
--   - Mobile food inspections: Mon-Fri 8:00-9:00 AM at Hollister office
--   - Office hours: Mon-Fri 8 AM-5 PM
--   - Single Environmental Health office in Hollister
--   - Fire AHJ: San Benito County Fire Department / CAL FIRE
-- ═══════════════════════════════════════════════════════════════════════

-- Update San Benito County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'San Benito County Health & Human Services Agency — Environmental Health',

  -- Verified scoring/grading (inspection report only)
  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "letter_grade": false,
    "numeric_score": false,
    "placard_posted": false,
    "grade_card_posted": false,
    "report_online": false,
    "report_at_facility": true,
    "inspection_frequency": "risk_based",
    "transparency_level": "low",
    "transparency_note": "No public online inspection database found. Reports available at facility or via public records request only.",
    "mobile_food_inspections": "Monday-Friday 8:00-9:00 AM at Hollister office",
    "office_hours": "Monday-Friday 8 AM-5 PM",
    "grading_note": "NO letter grade. NO numeric score. NO color placard. Standard CalCode inspection reports only. No online portal. Second-smallest county in CA by population."
  }'::jsonb,
  scoring_methodology = 'Inspection report only. NO letter grade, NO numeric score, NO color placard. No public online inspection database found. Reports available at facility or via records request. Very small county (~300-500 facilities). Single Environmental Health office in Hollister.',

  -- NO thresholds — report-only system
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'San Benito County Fire Department / CAL FIRE',
  fire_ahj_type = 'mixed_county_cal_fire',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments identified. CalCode only.',

  -- Verified data source
  data_source_type = 'none',
  data_source_url = 'https://hhsa.sanbenitocountyca.gov/environmental-health-2-2/',
  data_source_tier = 4,

  -- Verified facility count
  facility_count = 400,
  population_rank = 57,

  -- Updated notes with verification info
  notes = 'STANDARDIZED March 2026. Report-only system. LOW transparency. ~400 facilities. California''s second-smallest county by population. No online results portal found. Single EH office in Hollister. Mobile food inspections Mon-Fri 8-9 AM. Contact: (831) 636-4035, Environmentalhealth@sanbenitocountyca.gov.'
WHERE county = 'San Benito'
  AND city IS NULL
  AND state = 'CA';
