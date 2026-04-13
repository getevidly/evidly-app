-- JIE-WEIGHTS-TOP10-CORRECTED: Top 10 CA counties — grading config + fire AHJ
-- REPLACES JIE-WEIGHTS-TOP10-01
--
-- NO weights. NO blending. Each jurisdiction's methodology stands alone.
-- Results displayed exactly as the jurisdiction produces them.
--
-- Columns updated (all pre-existing):
--   grading_config, fire_ahj_name, fire_ahj_type, fire_code_edition,
--   nfpa96_edition, has_local_amendments, local_amendment_notes,
--   hood_cleaning_default, confidence_score, last_verified

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. LOS ANGELES COUNTY
-- Letter grade A/B/C, 100-pt deductive, fail below 70
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "letter_grade",
    "grades": ["A", "B", "C"],
    "A": [90, 100],
    "B": [80, 89],
    "C": [70, 79],
    "fail_below": 70,
    "display": "letter_grade",
    "grade_posting": "required_visible_to_patrons",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk level",
    "source": "LA County Code Title 8 §8.04.225"
  }'::jsonb,
  fire_ahj_name = 'Los Angeles County Fire Department',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  has_local_amendments = true,
  local_amendment_notes = 'LACoFD serves unincorporated + 60 contract cities. LAFD serves City of LA.',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 100,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'Los Angeles' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SAN DIEGO COUNTY
-- Letter grade A/B/C
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "letter_grade",
    "grades": ["A", "B", "C"],
    "A": [90, 100],
    "B": [80, 89],
    "C": [0, 79],
    "display": "letter_grade",
    "grade_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk level",
    "source": "sdcounty.ca.gov"
  }'::jsonb,
  fire_ahj_name = 'San Diego County Fire Authority',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 90,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'San Diego' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FRESNO COUNTY
-- Numeric 0-100
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "numeric",
    "display": "numeric",
    "max_score": 100,
    "passing_threshold": 70,
    "major_violation_deduction": 4,
    "minor_violation_deduction": 2,
    "inspection_frequency": "1-2 per year based on risk",
    "source": "Fresno County DPH Environmental Health"
  }'::jsonb,
  fire_ahj_name = 'Fresno County Fire Protection District',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 75,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'Fresno' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. STANISLAUS COUNTY
-- Violation report only — no grade, no score
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "violation_report",
    "display": "violation_report",
    "note": "No letter grade or numeric score. Violation report only.",
    "inspection_frequency": "annual based on risk level",
    "source": "Stanislaus County HSA"
  }'::jsonb,
  fire_ahj_name = 'Stanislaus County Fire Prevention Bureau',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 70,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'Stanislaus' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. MERCED COUNTY
-- Three-tier rating: Good / Satisfactory / Unsatisfactory (lower is better)
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "three_tier_rating",
    "display": "three_tier_rating",
    "tiers": ["Good", "Satisfactory", "Unsatisfactory"],
    "Good": {"min_points": 0, "max_points": 6},
    "Satisfactory": {"min_points": 7, "max_points": 13},
    "Unsatisfactory": {"min_points": 14},
    "lower_is_better": true,
    "major_violation_points": 4,
    "minor_violation_points": 2,
    "inspection_frequency": "annual",
    "source": "Merced County DPH Environmental Health"
  }'::jsonb,
  fire_ahj_name = 'Merced County Fire Department',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 70,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'Merced' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. SACRAMENTO COUNTY
-- Color placard: Green / Yellow / Red
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "color_placard",
    "display": "color_placard",
    "placards": ["Green", "Yellow", "Red"],
    "Green": {"label": "Pass", "max_majors": 1},
    "Yellow": {"label": "Conditional Pass", "min_majors": 2, "max_majors": 3},
    "Red": {"label": "Closed", "min_majors": 4},
    "placard_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk",
    "source": "Sacramento County EMD"
  }'::jsonb,
  fire_ahj_name = 'Sacramento Fire Department',
  fire_ahj_type = 'municipal_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'Sacramento' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ALAMEDA COUNTY
-- Numeric 0-100
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "numeric",
    "display": "numeric",
    "max_score": 100,
    "passing_threshold": 70,
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk",
    "source": "Alameda County DEH"
  }'::jsonb,
  fire_ahj_name = 'Alameda County Fire Department',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'Alameda' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. SANTA CLARA COUNTY
-- Color placard with heavy violation weighting (8pt major, 2pt minor)
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "color_placard",
    "display": "color_placard",
    "placards": ["Green", "Yellow", "Red"],
    "Green": {"label": "Pass", "max_majors": 1},
    "Yellow": {"label": "Conditional", "min_majors": 2},
    "Red": {"label": "Closure", "description": "Imminent health hazard"},
    "major_violation_weight": 8,
    "minor_violation_weight": 2,
    "placard_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk",
    "source": "Santa Clara County DEH"
  }'::jsonb,
  fire_ahj_name = 'Santa Clara County Fire Marshal',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'Santa Clara' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. RIVERSIDE COUNTY
-- Letter grade STRICT — only A passes (threshold 90, not 70)
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "letter_grade",
    "display": "letter_grade",
    "grades": ["A", "B", "C"],
    "A": [90, 100],
    "B": [80, 89],
    "C": [0, 79],
    "passing_grade": "A",
    "passing_threshold": 90,
    "strict_mode": true,
    "note": "Only A grade passes. B or C requires re-inspection.",
    "grade_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-2 per year based on risk",
    "source": "Riverside County DEH"
  }'::jsonb,
  fire_ahj_name = 'Riverside County Fire Department',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'Riverside' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. SAN BERNARDINO COUNTY
-- Letter grade A/B/C, fail below 70
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "scoring_type": "letter_grade",
    "display": "letter_grade",
    "grades": ["A", "B", "C"],
    "A": [90, 100],
    "B": [80, 89],
    "C": [70, 79],
    "fail_below": 70,
    "grade_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk",
    "source": "San Bernardino County DPH"
  }'::jsonb,
  fire_ahj_name = 'San Bernardino County Fire Department',
  fire_ahj_type = 'county_fire',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz
WHERE county = 'San Bernardino' AND city IS NULL AND state = 'CA';
