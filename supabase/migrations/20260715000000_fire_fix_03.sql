-- ═══════════════════════════════════════════════════════════════════════════
-- FIRE-FIX-03: Standardize enabling_statute field across all states
-- Adds enabling_statute text to fire_jurisdiction_config JSONB
-- Keeps state-specific booleans (title_19_ccr, nrs_477, etc.) untouched
-- ═══════════════════════════════════════════════════════════════════════════

-- CA: California Fire Code (Title 24 Part 9), Title 19 CCR
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "California Fire Code (Title 24 Part 9), Title 19 CCR"}'::jsonb
WHERE state = 'CA' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- NV: NRS Chapter 477, NAC Chapter 477
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "NRS Chapter 477, NAC Chapter 477"}'::jsonb
WHERE state = 'NV' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- OR: ORS Chapter 479, OAR 837-040
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "ORS Chapter 479, OAR 837-040"}'::jsonb
WHERE state = 'OR' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- WA: RCW 19.27, WAC 51-54A
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "RCW 19.27, WAC 51-54A"}'::jsonb
WHERE state = 'WA' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- AZ: ARS Title 37 Chapter 9, Arizona Fire Code
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "ARS Title 37 Chapter 9, Arizona Fire Code"}'::jsonb
WHERE state = 'AZ' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- ── Verification ─────────────────────────────────────────────────────────
-- Expected: one statute per state, all populated, no NULLs
SELECT DISTINCT state, fire_jurisdiction_config->>'enabling_statute' AS statute
FROM jurisdictions
WHERE fire_jurisdiction_config IS NOT NULL
ORDER BY state;
