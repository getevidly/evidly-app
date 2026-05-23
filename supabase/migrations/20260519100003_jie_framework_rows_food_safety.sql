-- =====================================================================
-- JIE Build — Migration 03: Framework rows (food safety only)
-- =====================================================================
-- Inserts CALCODE_2024, CALCODE_2026, LA_COUNTY_TITLE_11_2024.
-- Uses derived_from_framework_id column added in Migration 01.
-- Fire safety frameworks (NFPA, CFC, IFC, IMC) DEFERRED.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Sanity checks
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM regulatory_frameworks
                 WHERE id = 'aa823e9e-b1b7-467c-876c-33261da600ce') THEN
    RAISE EXCEPTION 'CALCODE umbrella framework (aa823e9e...) not found — abort';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM regulatory_frameworks
                 WHERE id = '72a17b56-6dc6-4042-b3a0-595a9a02a981') THEN
    RAISE EXCEPTION 'FDA_FOOD_CODE_2017 framework (72a17b56...) not found — abort';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'regulatory_frameworks'
                 AND column_name = 'derived_from_framework_id') THEN
    RAISE EXCEPTION 'derived_from_framework_id column missing — run Migration 01 first';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- INSERT: CALCODE_2024 (historical edition; superseded by 2026)
-- Included so historical references resolve correctly.
-- ---------------------------------------------------------------------
INSERT INTO regulatory_frameworks (
  id, code, name, region_scope, version, effective_date,
  is_active, parent_framework_id, derived_from_framework_id
) VALUES (
  gen_random_uuid(),
  'CALCODE_2024',
  'California Retail Food Code 2024',
  'sub_national',
  'HSC Division 104 Part 7 (2024 edition)',
  '2024-01-01',
  false,  -- superseded by 2026
  'aa823e9e-b1b7-467c-876c-33261da600ce',
  '72a17b56-6dc6-4042-b3a0-595a9a02a981'  -- derived from FDA 2017
)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- INSERT: CALCODE_2026 (current edition)
-- ---------------------------------------------------------------------
INSERT INTO regulatory_frameworks (
  id, code, name, region_scope, version, effective_date,
  is_active, parent_framework_id, derived_from_framework_id
) VALUES (
  gen_random_uuid(),
  'CALCODE_2026',
  'California Retail Food Code 2026',
  'sub_national',
  'HSC Division 104 Part 7 (2026 edition)',
  '2026-01-01',
  true,
  'aa823e9e-b1b7-467c-876c-33261da600ce',
  '72a17b56-6dc6-4042-b3a0-595a9a02a981'
)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- INSERT: LA_COUNTY_TITLE_11_2024
-- Parent = CALCODE_2026 (Title 11 supplements current CalCode)
-- ---------------------------------------------------------------------
INSERT INTO regulatory_frameworks (
  id, code, name, region_scope, version, effective_date,
  is_active, parent_framework_id, derived_from_framework_id
) VALUES (
  gen_random_uuid(),
  'LA_COUNTY_TITLE_11_2024',
  'LA County Code Title 11 — Health and Safety',
  'sub_national',
  'LA County Code Title 11 (effective 2024 amendments)',
  '2024-01-01',
  true,
  (SELECT id FROM regulatory_frameworks WHERE code = 'CALCODE_2026'),
  NULL
)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- VERIFICATION
-- ---------------------------------------------------------------------
DO $$
DECLARE
  expected_rows int := 9;  -- 6 existing + 3 new
  actual_rows int;
BEGIN
  SELECT COUNT(*) INTO actual_rows FROM regulatory_frameworks;
  IF actual_rows < expected_rows THEN
    RAISE EXCEPTION 'Expected at least % rows in regulatory_frameworks; found %',
      expected_rows, actual_rows;
  END IF;
  RAISE NOTICE 'regulatory_frameworks now has % rows', actual_rows;
END $$;

SELECT
  rf.code, rf.name, rf.effective_date, rf.is_active,
  p.code AS parent_code,
  d.code AS derived_from_code
FROM regulatory_frameworks rf
LEFT JOIN regulatory_frameworks p ON p.id = rf.parent_framework_id
LEFT JOIN regulatory_frameworks d ON d.id = rf.derived_from_framework_id
WHERE rf.code IN ('CALCODE_2024', 'CALCODE_2026', 'LA_COUNTY_TITLE_11_2024')
ORDER BY rf.code;

COMMIT;
