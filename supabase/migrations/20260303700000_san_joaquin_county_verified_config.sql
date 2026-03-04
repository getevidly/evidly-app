-- ═══════════════════════════════════════════════════════════════════════
-- SAN JOAQUIN COUNTY — Verified Jurisdiction Configuration
--
-- Agency: San Joaquin County Environmental Health Department (EHD)
-- Address: 1868 E. Hazelton Ave., Stockton, CA 95205
-- Phone: (209) 468-3420 | Food coordinator: (209) 468-3438
-- Portal: app.sjgov.org/restaurant-inspection/
-- Program page: sjcehd.com/programs/
-- Regulatory basis: CalCode + Stockton Municipal Code Section 7-111.1(h)
-- Transparency: MEDIUM
-- Verified: March 2026
--
-- Verified facts:
--   - NO letter grades
--   - NO numeric scores
--   - NO placards
--   - Violation report only — standard CalCode ORFIR
--   - Major and Minor violations documented
--   - Facilities must keep most recent inspection report on-site
--   - Public allowed to view report on request
--   - Voluntary posting allowed (not required)
--   - Searchable online portal at app.sjgov.org/restaurant-inspection/
--   - Annual inspections (1/year) — less frequent than most CA counties
--   - ~2,882 permanent facilities + 404 temp events + 157 vendors
--   - Stockton is the county seat
--   - Fire AHJ: San Joaquin County OES / local city fire departments
--   - Data sources: sjcehd.com/programs/, sjcehd.com/frequently-asked-questions/,
--     app.sjgov.org/restaurant-inspection/
-- ═══════════════════════════════════════════════════════════════════════

-- Update San Joaquin County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'San Joaquin County Environmental Health Department',

  -- Verified scoring/grading (violation report only — NO grade, NO score, NO placard)
  scoring_type = 'violation_report',
  grading_type = 'violation_report_only',
  grading_config = '{
    "display_format": "violation_report",
    "grades": null,
    "letter_grade": false,
    "numeric_score": false,
    "placard_posted": false,
    "grade_card_posted": false,
    "violation_categories": ["major", "minor"],
    "major_violation_action": "must_correct_reinspection_may_be_required",
    "minor_violation_action": "correction_required",
    "on_site_report_required": true,
    "public_posting_required": false,
    "voluntary_posting_allowed": true,
    "inspection_frequency_note": "Annual (1/year) — less frequent than most CA counties",
    "transparency_level": "medium",
    "transparency_note": "Searchable online portal at app.sjgov.org/restaurant-inspection/ — no grade, no score, no placard. Restaurants must allow public to view on-site report on request. Some voluntarily post reports.",
    "public_portal": "https://app.sjgov.org/restaurant-inspection/",
    "grading_note": "NO letter grade. NO score. NO placard. Violation report only. Annual inspections (1/year).",
    "local_authority": "Stockton Municipal Code Section 7-111.1(h) supplements CalCode"
  }'::jsonb,
  scoring_methodology = 'NO letter grade. NO score. NO placard. Standard CalCode ORFIR. Major and Minor violations documented. Annual inspections (1/year). Searchable online portal. No grade posted at facility. Restaurants must keep most recent report on-site and allow public viewing on request.',

  -- NO numeric thresholds — violation report only
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'San Joaquin County Office of Emergency Services / local city FDs',
  fire_ahj_type = 'county_multi',
  has_local_amendments = true,
  local_amendment_notes = 'Stockton Municipal Code Section 7-111.1(h) supplements CalCode. No local grading ordinance — violation report only.',

  -- Verified data source
  data_source_type = 'portal',
  data_source_url = 'https://app.sjgov.org/restaurant-inspection/',
  data_source_tier = 3,

  -- Verified facility count
  facility_count = 2882,
  population_rank = 13,

  -- Updated notes with verification info
  notes = 'STANDARDIZED (2026-03). Violation report only. NO letter grade, NO score, NO placard. MEDIUM transparency — searchable online portal at app.sjgov.org/restaurant-inspection/ but no grade/placard system. Annual inspections (1/year) — less frequent than most CA counties. 2,882 permanent facilities + 404 temp events + 157 vendors. Stockton county seat. Local authority: Stockton Municipal Code 7-111.1(h). Contact: (209) 468-3420. Food coordinator: Jeff Carruesco (209) 468-3438.'
WHERE county = 'San Joaquin'
  AND city IS NULL
  AND state = 'CA';
