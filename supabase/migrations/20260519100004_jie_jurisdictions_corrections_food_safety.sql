-- =====================================================================
-- JIE Build — Migration 04: Jurisdictions corrections (food safety)
-- =====================================================================
-- Re-points 4 LA-area jurisdiction rows from CALCODE umbrella to CALCODE_2026.
-- Marks LA County DPH (097cd9cc...) as JIE audit verified.
-- Cities (Pasadena, Long Beach, Vernon) stay needs_review.
-- Fire safety jurisdiction fields untouched.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Sanity checks
-- ---------------------------------------------------------------------
DO $$
DECLARE
  calcode_2026_id uuid;
BEGIN
  SELECT id INTO calcode_2026_id FROM regulatory_frameworks WHERE code = 'CALCODE_2026';
  IF calcode_2026_id IS NULL THEN
    RAISE EXCEPTION 'CALCODE_2026 framework not found — run Migration 03 first';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- UPDATE 1: LA County DPH — Environmental Health Division
-- Re-point framework + mark JIE audit VERIFIED
-- ---------------------------------------------------------------------
UPDATE jurisdictions
SET
  regulatory_framework_id = (SELECT id FROM regulatory_frameworks WHERE code = 'CALCODE_2026'),
  jie_audit_status = 'verified',
  jie_verified_source = 'LA County Code Title 11 (Health and Safety) reviewed against 2026 CalCode. ' ||
                        'LA County applies CalCode without retail food-safety override for §113996 ' ||
                        '(hot/cold holding). Local supplement clause at Title 11.02 confirmed. ' ||
                        'Audited from primary sources: 2026 CalCode PDF (CDPH), LA County Title 11 ' ||
                        '(Municode), LA County 2025 Retail Food Inspection Guide.',
  jie_verified_date = '2026-05-19',
  updated_at = now()
WHERE id = '097cd9cc-48cb-4e73-a8cd-a7b8480e0e97';

-- ---------------------------------------------------------------------
-- UPDATE 2-4: City health departments — re-point framework only
-- JIE audit status remains 'needs_review' (city-specific amendments not audited)
-- ---------------------------------------------------------------------
UPDATE jurisdictions
SET
  regulatory_framework_id = (SELECT id FROM regulatory_frameworks WHERE code = 'CALCODE_2026'),
  updated_at = now()
WHERE id IN (
  '0e0e3fc8-5fdd-41aa-a14b-4a887d819e2f',  -- Pasadena Public Health Dept
  'b437576c-5121-44fd-9e9c-414d8fc1a3f4',  -- Long Beach Dept of Health & Human Services
  '7edbb389-6fa8-4421-bed3-f6d64312fb08'   -- City of Vernon Health Dept
);

-- ---------------------------------------------------------------------
-- VERIFICATION
-- ---------------------------------------------------------------------
DO $$
DECLARE
  umbrella_refs int;
  verified_la_county int;
BEGIN
  SELECT COUNT(*) INTO umbrella_refs
  FROM jurisdictions
  WHERE regulatory_framework_id = 'aa823e9e-b1b7-467c-876c-33261da600ce'
  AND id IN (
    '097cd9cc-48cb-4e73-a8cd-a7b8480e0e97',
    '0e0e3fc8-5fdd-41aa-a14b-4a887d819e2f',
    'b437576c-5121-44fd-9e9c-414d8fc1a3f4',
    '7edbb389-6fa8-4421-bed3-f6d64312fb08'
  );

  IF umbrella_refs <> 0 THEN
    RAISE EXCEPTION '4 LA jurisdictions should no longer reference CALCODE umbrella; found % still referencing it', umbrella_refs;
  END IF;

  SELECT COUNT(*) INTO verified_la_county
  FROM jurisdictions
  WHERE id = '097cd9cc-48cb-4e73-a8cd-a7b8480e0e97' AND jie_audit_status = 'verified';

  IF verified_la_county <> 1 THEN
    RAISE EXCEPTION 'LA County DPH should be marked verified';
  END IF;

  RAISE NOTICE 'Jurisdictions migration verified. LA County DPH = verified, 3 cities = needs_review.';
END $$;

SELECT
  j.id, j.county, j.agency_name, j.agency_type,
  rf.code AS framework_code,
  j.jie_audit_status, j.jie_verified_date,
  CASE WHEN j.jie_verified_source IS NULL THEN 'null'
       ELSE LEFT(j.jie_verified_source, 60) || '...' END AS verified_source_preview
FROM jurisdictions j
LEFT JOIN regulatory_frameworks rf ON rf.id = j.regulatory_framework_id
WHERE j.id IN (
  '097cd9cc-48cb-4e73-a8cd-a7b8480e0e97',
  '0e0e3fc8-5fdd-41aa-a14b-4a887d819e2f',
  'b437576c-5121-44fd-9e9c-414d8fc1a3f4',
  '7edbb389-6fa8-4421-bed3-f6d64312fb08'
)
ORDER BY j.agency_type, j.agency_name;

COMMIT;
