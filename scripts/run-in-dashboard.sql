-- ═══════════════════════════════════════════════════════════════════════════
-- RUN THIS IN SUPABASE DASHBOARD SQL EDITOR
-- Combines: missing DDL columns + JIE-WEIGHTS-TOP10-01 data updates
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 1: Add missing columns (IF NOT EXISTS = safe to re-run) ─────────

-- Weight columns (from 20260303000000 + rename from 20260401000010)
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS food_safety_weight NUMERIC;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS facility_safety_weight NUMERIC;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS ops_weight NUMERIC;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS docs_weight NUMERIC;

-- Config columns (from 20260303999999)
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS confidence_score INTEGER;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS last_verified TIMESTAMPTZ;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS agency_phone TEXT;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS agency_address TEXT;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS public_portal TEXT;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS regulatory_code TEXT;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS transparency_level TEXT DEFAULT 'medium';
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS inspection_frequency TEXT;

-- Intelligence feed read_at (from 20260312100000)
ALTER TABLE client_intelligence_feed ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ── Step 2: Set weights + configs for 10 launch counties ─────────────────

-- 1. LOS ANGELES COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [70, 79],
    "fail_below": 70,
    "below_70_display": "numerical_score_card",
    "closure_trigger": "below_70_twice_in_12_months",
    "grade_posting": "required_visible_to_patrons",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk level",
    "risk_categories": ["High", "Moderate", "Low"],
    "reinspection_trigger": "Major CRF violations or score below 70",
    "verified_from": "LA County Code Title 8 §8.04.225"
  }'::jsonb,
  fire_ahj_name = 'Los Angeles County Fire Department',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  has_local_amendments = true,
  local_amendment_notes = 'LACoFD serves unincorporated + 60 contract cities. LAFD serves City of LA. Long Beach, Pasadena, Vernon have own health departments.',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 100,
  last_verified = '2026-03-12'::timestamptz,
  notes = 'VERIFIED (2026-03-12). Confidence: 100/100. Letter grade A / B / C for 70%+, numerical cards below 70%. CRFC basis. Hood suppression: semi-annual per NFPA 96, UL-300 required.'
WHERE county = 'Los Angeles' AND city IS NULL AND state = 'CA';

-- 2. SAN DIEGO COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [0, 79],
    "grade_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk level",
    "risk_categories": ["High", "Medium", "Low"],
    "reinspection_trigger": "Major violations or score below 80"
  }'::jsonb,
  fire_ahj_name = 'San Diego County Fire Authority',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 90,
  last_verified = '2026-03-12'::timestamptz,
  notes = 'VERIFIED (2026-03-12). Confidence: 90/100. Letter grade A / B / C. 100-pt deductive. SDFD serves City of SD; county fire authority serves unincorporated areas.'
WHERE county = 'San Diego' AND city IS NULL AND state = 'CA';

-- 3. FRESNO COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "letter_grade": false,
    "numeric_score": false,
    "method": "violation_report_only",
    "violation_categories": ["major", "minor"],
    "outcome": "pass_fail_reinspect",
    "report_public": true,
    "source": "Fresno County DEH — Grand Jury 2023-24 verified"
  }'::jsonb,
  scoring_type = 'violation_report',
  grading_type = 'violation_report_only',
  fire_ahj_name = 'Fresno County Fire Protection District',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-07-13'::timestamptz,
  notes = 'VERIFIED (Grand Jury 2023-24). Pass/fail with major/minor violations. NO letter grade system. NO numeric score. Fresno FD serves City of Fresno.'
WHERE county = 'Fresno' AND city IS NULL AND state = 'CA';

-- 4. STANISLAUS COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "display": "violation_report",
    "scoring_basis": "CalCode ORFIR",
    "major_violation_deduction": 4,
    "minor_violation_deduction": 2,
    "inspection_frequency": "annual based on risk level"
  }'::jsonb,
  fire_ahj_name = 'Stanislaus County Fire Prevention Bureau',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 70,
  last_verified = '2026-03-12'::timestamptz,
  notes = 'VERIFIED (2026-03-12). Confidence: 70/100. Violation report system, no letter grades. CalCode ORFIR format. Modesto FD serves City of Modesto.'
WHERE county = 'Stanislaus' AND city IS NULL AND state = 'CA';

-- 5. MERCED COUNTY (CORRECTED scoring_type and grading_type)
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  scoring_type = 'violation_point_accumulation',
  grading_type = 'three_tier_rating',
  grading_config = '{
    "Good": {"min": 0, "max": 6},
    "Satisfactory": {"min": 7, "max": 13},
    "Unsatisfactory": {"min": 14, "max": null},
    "rating_basis": "accumulated_violation_points",
    "lower_is_better": true,
    "inspection_frequency": "annual",
    "major_violation_points": 4,
    "minor_violation_points": 2
  }'::jsonb,
  fire_ahj_name = 'Merced County Fire Department',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 70,
  last_verified = '2026-03-12'::timestamptz,
  notes = 'VERIFIED (2026-03-12). Confidence: 70/100. Point-accumulation system: Good (0-6), Satisfactory (7-13), Unsatisfactory (14+). Lower points = better. CORRECTED from report_only to three_tier_rating.'
WHERE county = 'Merced' AND city IS NULL AND state = 'CA';

-- 6. SACRAMENTO COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "green": {"label": "Pass", "max_majors": 1, "description": "Routine compliance"},
    "yellow": {"label": "Conditional Pass", "min_majors": 2, "max_majors": 3, "description": "Re-inspection within 24-72 hours"},
    "red": {"label": "Closed", "min_majors": 4, "description": "Immediate closure"},
    "placard_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk"
  }'::jsonb,
  fire_ahj_name = 'Sacramento Metropolitan Fire District / Sacramento City Fire Department',
  fire_ahj_type = 'mixed',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-07-13'::timestamptz,
  notes = 'VERIFIED (2026-07-13). Confidence: 85/100. Color placard system (Green/Yellow/Red). MHD portal. Sacramento Metro Fire District covers unincorporated areas. Sacramento City Fire Department covers city limits. Mixed AHJ.'
WHERE county = 'Sacramento' AND city IS NULL AND state = 'CA';

-- 7. ALAMEDA COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "pass_threshold": 70,
    "score_display": "numeric_0_100",
    "green_threshold": 70,
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk",
    "risk_categories": ["High", "Medium", "Low"]
  }'::jsonb,
  fire_ahj_name = 'Alameda County Fire Department',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz,
  notes = 'VERIFIED (2026-03-12). Confidence: 85/100. Numeric 0-100 scoring. DEH handles food safety. Berkeley has own health department (separate jurisdiction row).'
WHERE county = 'Alameda' AND city IS NULL AND state = 'CA';

-- 8. SANTA CLARA COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "green": {"label": "Pass", "max_majors": 1, "description": "Routine compliance"},
    "yellow": {"label": "Conditional", "min_majors": 2, "description": "Re-inspection required"},
    "red": {"label": "Closure", "description": "Imminent health hazard"},
    "major_violation_weight": 8,
    "minor_violation_weight": 2,
    "placard_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk"
  }'::jsonb,
  fire_ahj_name = 'Santa Clara County Fire Marshal',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz,
  notes = 'VERIFIED (2026-03-12). Confidence: 85/100. Heavy-weighted color placard (8 pts major, 2 pts minor). San Jose FD serves City of San Jose.'
WHERE county = 'Santa Clara' AND city IS NULL AND state = 'CA';

-- 9. RIVERSIDE COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [0, 79],
    "passing_grade": "A",
    "passing_threshold": 90,
    "strict_mode": true,
    "grade_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-2 per year based on risk"
  }'::jsonb,
  fire_ahj_name = 'Riverside County Fire Department',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz,
  notes = 'VERIFIED (2026-03-12). Confidence: 85/100. Letter grade STRICT — only A grade passes. B or C requires re-inspection. City FDs serve incorporated areas.'
WHERE county = 'Riverside' AND city IS NULL AND state = 'CA';

-- 10. SAN BERNARDINO COUNTY
UPDATE jurisdictions SET
  food_safety_weight = 60,
  facility_safety_weight = 40,
  ops_weight = 60,
  docs_weight = 40,
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [70, 79],
    "fail_below": 70,
    "grade_posting": "required_at_entrance",
    "reports_public": true,
    "inspection_frequency": "1-3 per year based on risk",
    "closure_trigger": "below_70_or_imminent_hazard"
  }'::jsonb,
  fire_ahj_name = 'San Bernardino County Fire Department',
  fire_ahj_type = 'county_fd',
  fire_code_edition = '2025 CFC',
  nfpa96_edition = '2024',
  hood_cleaning_default = 'semi_annual',
  confidence_score = 85,
  last_verified = '2026-03-12'::timestamptz,
  notes = 'VERIFIED (2026-03-12). Confidence: 85/100. Letter grade A / B / C, fail below 70. 100-pt deductive system. City FDs serve incorporated areas.'
WHERE county = 'San Bernardino' AND city IS NULL AND state = 'CA';

-- ── Step 3: Mark migrations as applied in schema_migrations ──────────────
-- (So supabase CLI knows they've been run)
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260312100000', 'intelligence_feed_read_at', '{}')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260312200000', 'top10_verified_weights', '{}')
ON CONFLICT (version) DO NOTHING;

-- ── Step 4: Verification ─────────────────────────────────────────────────
SELECT county, food_safety_weight, facility_safety_weight, ops_weight, docs_weight,
       scoring_type, grading_type, confidence_score, last_verified
FROM jurisdictions
WHERE county IN ('Los Angeles','San Diego','Fresno','Stanislaus','Merced',
                 'Sacramento','Alameda','Santa Clara','Riverside','San Bernardino')
  AND city IS NULL AND state = 'CA'
ORDER BY confidence_score DESC NULLS LAST;
-- Expected: 10 rows, all with food_safety_weight=60, no NULLs
