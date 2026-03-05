-- ═══════════════════════════════════════════════════════════════════════
-- MADERA COUNTY — Verified Jurisdiction Configuration
--
-- Agency: Madera County Environmental Health Division
-- Address: 200 W. 4th Street, Madera, CA 93637
-- Phone: (559) 675-7823
-- Program: maderacounty.com/.../environmental-health-division/food-program
-- Regulatory basis: CalCode + Madera County Ordinance
-- Transparency: LOW — no public online inspection database identified
-- Verified: March 2026
--
-- Verified facts:
--   - NO letter grades
--   - NO numeric scores
--   - NO placards
--   - Violation report only — standard CalCode ORFIR
--   - Major and Minor violations documented
--   - Annual inspections (1/year)
--   - Annual permits valid Jan 1–Dec 31
--   - ~800 permitted facilities
--   - Transparency: LOW — no online inspection portal
--   - Gateway to Yosemite south entrances (distinct from NPS jurisdiction)
--   - Fire AHJ: Madera County OES / CAL FIRE (unincorporated)
--   - Data source: maderacounty.com (Tier 4)
-- ═══════════════════════════════════════════════════════════════════════

-- Update Madera County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Madera County Environmental Health Division',

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
    "on_site_report_required": true,
    "public_posting_required": false,
    "inspection_frequency": "annual",
    "inspection_frequency_note": "Annual (1/year)",
    "transparency_level": "low",
    "transparency_note": "No public online inspection database identified. LOW transparency.",
    "grading_note": "NO letter grade. NO score. NO placard. Violation report only. Annual inspections. CalCode + Madera County Ordinance.",
    "permit_cycle": "Annual, valid Jan 1 through Dec 31"
  }'::jsonb,
  scoring_methodology = 'NO letter grade. NO score. NO placard. Standard CalCode ORFIR + Madera County Ordinance. Major and Minor violations documented. Annual inspections (1/year). No online inspection portal. Annual permits valid Jan 1–Dec 31.',

  -- NO numeric thresholds — violation report only
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'Madera County OES / CAL FIRE (unincorporated)',
  fire_ahj_type = 'cal_fire',
  has_local_amendments = true,
  local_amendment_notes = 'Madera County Ordinance supplements CalCode. No local grading ordinance — violation report only.',

  -- Verified data source
  data_source_type = 'offline',
  data_source_url = 'https://www.maderacounty.com/government/community-economic-development-department/divisions/environmental-health-division/food-safety-consumer-protection-program',
  data_source_tier = 4,

  -- Verified facility count
  facility_count = 800,
  population_rank = 34,

  -- Updated notes with verification info
  notes = 'STANDARDIZED (2026-03). Violation report only. NO letter grade, NO score, NO placard. LOW transparency — no public online inspection database. Annual inspections (1/year). Annual permits valid Jan 1–Dec 31. ~800 permitted facilities. Gateway to Yosemite south entrances (distinct from NPS/Mariposa County jurisdiction). Fire AHJ: Madera County OES / CAL FIRE (unincorporated). Contact: (559) 675-7823.'
WHERE county = 'Madera'
  AND city IS NULL
  AND state = 'CA';
