-- ═══════════════════════════════════════════════════════════════════════
-- ORANGE COUNTY — Third Fully-Verified Jurisdiction Configuration
--
-- Agency: Orange County Health Care Agency (OCHCA)
--         Environmental Health Division
-- Phone: (714) 433-6000 | ehealth@ochca.com
-- Public records: ocfoodinfo.com
-- Verified: March 2026
-- Confidence: HIGH (90/100) — validated from official OCHCA documentation
-- Import Eligible: Yes
--
-- Verified facts:
--   - Placard-only system — NO letter grade, NO numeric score
--   - Outcomes: Pass, Reinspection Due-Pass, Closed
--   - Violation classification: Major CRF, Minor CRF, GRP (CalCode ORFIR standard)
--   - COS (Corrected On-Site) violations marked on report
--   - Risk-based inspection model adopted July 2015 per FDA recommendations
--   - OC Grand Jury repeatedly recommended ABC grades; OC has resisted
--   - Transparency level: MODERATE — reports public at ocfoodinfo.com
--   - Award of Excellence program issued annually in February
--   - ~17,000 permitted facilities
--   - Data source: MyHealthDepartment portal (Tier 2)
--   - Fire AHJ: OCFA (unincorporated areas), city fire depts within city limits
--   - 34 incorporated cities in OC
-- ═══════════════════════════════════════════════════════════════════════

-- Update Orange County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Orange County Health Care Agency — Environmental Health Division',

  -- Verified scoring/grading (placard only — NO letter grade, NO numeric score)
  scoring_type = 'major_minor_reinspect',
  grading_type = 'pass_reinspect',
  grading_config = '{
    "display_format": "pass_reinspect",
    "outcomes": ["Pass", "Reinspection Due-Pass", "Closed"],
    "pass_condition": "no_uncorrected_major_crf",
    "reinspect_condition": "major_crf_corrected_on_site",
    "closure_condition": "imminent_health_hazard_uncorrectable",
    "violation_categories": ["major_crf", "minor_crf", "grp"],
    "cos_flag": true,
    "transparency_level": "moderate",
    "public_portal": "https://www.ocfoodinfo.com",
    "grading_note": "OC uses placard only. NO letter grade. NO numeric score. Grand Jury recommended ABC grades; OC has not adopted. Inspection reports are public but no grade posted at facility.",
    "award_of_excellence": {
      "issued": "annually_february",
      "criteria": {
        "zero_major_crf_any_routine": true,
        "max_minor_crf_per_inspection": 2,
        "max_grp_per_inspection": 5,
        "food_safety_manager_cert_required": true,
        "food_handler_cards_required": true,
        "min_routine_inspections_per_year": 2
      }
    }
  }'::jsonb,
  scoring_methodology = 'CalCode ORFIR standard. Violations classified as Major CRF, Minor CRF, or GRP. No numeric score assigned. No letter grade. Outcome = Pass, Reinspection Due-Pass, or Closed. Risk-based inspection model adopted July 2015 per FDA recommendations. COS (Corrected On-Site) violations marked on report.',

  -- NO thresholds — placard system has no numeric thresholds
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'Orange County Fire Authority (OCFA) — unincorporated areas only',
  fire_ahj_type = 'county_fire_authority',
  has_local_amendments = true,
  local_amendment_notes = '34 incorporated cities in OC — OCFA serves unincorporated areas only. City fire departments are AHJ within city limits. Food Safety Manager cert required for facilities handling non-prepackaged PHF. Food Handler Card required within 30 days of hire (3-year validity).',

  -- Verified data source
  data_source_type = 'mhd',
  data_source_url = 'https://inspections.myhealthdepartment.com/orange-county',
  data_source_tier = 2,

  -- Verified facility count
  facility_count = 17000,
  population_rank = 3,

  -- Updated notes with verification info
  notes = 'VERIFIED (2026-03). Confidence: HIGH (90/100). Placard-only system — Pass / Reinspection Due-Pass / Closed. NO letter grade. NO numeric score. OC Grand Jury repeatedly recommended ABC grades (most recently 2008 report); OC has resisted. Risk-based inspections adopted July 2015 per FDA recommendations. Award of Excellence program issued each February for qualifying facilities. 34 incorporated cities — OCFA serves unincorporated areas only; city fire depts are AHJ within city limits. Food Safety Manager cert required for facilities handling non-prepackaged PHF. Food Handler Card required within 30 days of hire (3-year validity). ~17,000 permitted facilities. Contact: (714) 433-6000, ehealth@ochca.com.'
WHERE county = 'Orange'
  AND city IS NULL
  AND state = 'CA';
