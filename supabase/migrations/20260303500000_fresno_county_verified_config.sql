-- ═══════════════════════════════════════════════════════════════════════
-- FRESNO COUNTY — Verified Jurisdiction Configuration
--
-- Agency: Fresno County Dept of Public Health — Environmental Health Division
-- Address: 1221 Fulton St, 3rd Floor, PO Box 11867, Fresno, CA 93775-1867
-- Phone: (559) 600-3357 | Fax: (559) 455-4646
-- Email: EnvironmentalHealth@fresnocountyca.gov
-- Portal: fresnohealthinspections.com
-- Regulatory basis: CalCode only. NO local grading ordinance.
-- Transparency: LOW (Grand Jury 2023-24 finding)
-- Verified: March 2026
--
-- Verified facts:
--   - NO letter grade. NO numeric score. Violation report only.
--   - Standard CalCode ORFIR — Major and Minor violations documented
--   - Major violations: reinspection usually required unless corrected on-site
--   - Minor violations: correction required, reinspection not always required
--   - No grade card posted at facilities
--   - Transparency LOW per Grand Jury 2023-24 Report No. 4
--   - 22 inspectors for ~11,000 facilities (mathematically impossible workload)
--   - Some facilities uninspected for 1+ year despite 4x/year requirement
--   - Software system (2020) caused billing failures, missing reports
--   - County response: 23% salary increase by July 2025
--   - Food Safety Manager cert required per CalCode §113716 within 60 days
--   - ~11,000 permitted facilities
--   - Data source: fresnohealthinspections.com (Tier 3)
--   - Fire AHJ: Fresno County Fire Protection District (unincorporated)
-- ═══════════════════════════════════════════════════════════════════════

-- Update Fresno County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Fresno County Department of Public Health — Environmental Health Division',

  -- Verified scoring/grading (NO letter grade, NO numeric score)
  scoring_type = 'violation_report',
  grading_type = 'violation_report_only',
  grading_config = '{
    "display_format": "violation_report",
    "grades": null,
    "letter_grade": false,
    "numeric_score": false,
    "grade_card_posted": false,
    "violation_categories": ["major", "minor"],
    "major_violation_action": "reinspection_usually_required_unless_corrected_onsite",
    "minor_violation_action": "correction_required_reinspection_not_always_required",
    "transparency_level": "low",
    "transparency_note": "Grand Jury 2023-24 found inspections extremely difficult to locate online, inconsistent enforcement, some facilities uninspected 1+ year, software failures causing missing/incomplete reports.",
    "public_portal": "https://www.fresnohealthinspections.com",
    "grading_note": "NO letter grade. NO numeric score. Fresno documents violations only. EvidLY provides the consistent analysis layer this jurisdiction lacks.",
    "evidly_value": "High-value jurisdiction for EvidLY — operators can see exactly what consistent compliance analysis provides where government transparency is low.",
    "grand_jury_report": {
      "title": "Eat At Your Own Risk: The Quiet Reality of Health Inspections in Fresno County",
      "year": "2023-2024",
      "key_findings": [
        "22 inspectors for ~11,000 facilities — mathematically impossible workload",
        "Some facilities uninspected for 1+ year despite 4x/year requirement",
        "Website hard to navigate, inspections hard to find",
        "Inconsistent enforcement across inspectors",
        "Software failures causing billing errors and missing reports"
      ],
      "county_response": "23% salary increase by July 2025, website navigation improvements committed"
    }
  }'::jsonb,
  scoring_methodology = 'NO letter grade. NO numeric score. Standard CalCode ORFIR only — Major and Minor violations documented. Major violations may warrant immediate closure or correction; reinspection usually required. Minor violations warrant correction; reinspection not always required. Transparency level LOW per Grand Jury 2023-24.',

  -- NO thresholds — no grading system
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'Fresno County Fire Protection District (unincorporated areas)',
  fire_ahj_type = 'county_fire',
  has_local_amendments = false,
  local_amendment_notes = 'No local grading ordinance. CalCode only. Food Safety Manager cert required per CalCode §113716 within 60 days of commencing operation or ownership change.',

  -- Verified data source
  data_source_type = 'portal',
  data_source_url = 'https://www.fresnohealthinspections.com',
  data_source_tier = 3,

  -- Verified facility count
  facility_count = 11000,
  population_rank = 6,

  -- Updated notes with verification info
  notes = 'STANDARDIZED March 2026. No letter grade, no score — violation report only. Transparency LOW: Grand Jury 2023-24 found inspection data hard to access, inconsistent enforcement, understaffed (22 inspectors/11,000 facilities), software issues. High EvidLY value county — platform provides consistency where jurisdiction does not. CalCode §113716 food safety manager required within 60 days. Contact: (559) 600-3357, EnvironmentalHealth@fresnocountyca.gov.'
WHERE county = 'Fresno'
  AND city IS NULL
  AND state = 'CA';
