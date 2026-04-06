-- ================================================================
-- FIRE-FIX-01: PSE Safeguard Correction + CA State Fire Marshal + NV Fire Code
--
-- FIX 1: PSE safeguards — fire_extinguisher → sprinklers (ALL rows with fire config)
--   Fire extinguisher (NFPA 10) is a portable device, NOT a PSE category.
--   Sprinklers (NFPA 13 wet system) is the correct 4th PSE pillar.
--   Standing rule: PSE = hood_cleaning, fire_suppression_system, sprinklers, fire_alarm_monitoring
--
-- FIX 2: CA state_fire_marshal field — add to 62 CA fire configs
--   NV, OR, WA already include state_fire_marshal. CA was missing it.
--
-- FIX 3: NV fire_code_edition — correct from "2021 IFC" to "2018 IFC"
--   Nevada statewide adoption is IFC 2018 (NRS 477 / NAC 477.281).
--   Clark County has locally adopted IFC 2024.
-- ================================================================

-- ── FIX 1: PSE safeguards — fire_extinguisher → sprinklers ──────

UPDATE jurisdictions
SET fire_jurisdiction_config = jsonb_set(
  fire_jurisdiction_config,
  '{pse_safeguards}',
  '["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"]'::jsonb
)
WHERE fire_jurisdiction_config IS NOT NULL
  AND fire_jurisdiction_config->>'pse_safeguards' IS NOT NULL;

-- ── FIX 2: CA state_fire_marshal field ──────────────────────────

UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"state_fire_marshal": "Office of the State Fire Marshal (OSFM), CAL FIRE"}'::jsonb
WHERE state = 'CA'
  AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'state_fire_marshal') IS NULL;

-- ── FIX 3: NV fire_code_edition correction ──────────────────────

-- 3a. All NV jurisdictions: correct statewide fire code to 2018 IFC
UPDATE jurisdictions
SET fire_jurisdiction_config = jsonb_set(
  fire_jurisdiction_config,
  '{fire_code_edition}',
  '"2018 IFC"'::jsonb
)
WHERE state = 'NV'
  AND fire_jurisdiction_config IS NOT NULL;

-- 3b. Clark County override: locally adopted 2024 IFC
UPDATE jurisdictions
SET fire_jurisdiction_config = jsonb_set(
  fire_jurisdiction_config,
  '{fire_code_edition}',
  '"2024 IFC (locally adopted by Clark County)"'::jsonb
)
WHERE state = 'NV'
  AND county = 'Clark'
  AND fire_jurisdiction_config IS NOT NULL;

-- 3c. Clark County local amendment documentation
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"has_local_fire_code_adoption": true, "local_fire_code_notes": "Clark County and City of Las Vegas have locally adopted IFC 2024, superseding statewide IFC 2018 (NAC 477.281)"}'::jsonb
WHERE state = 'NV'
  AND county = 'Clark'
  AND fire_jurisdiction_config IS NOT NULL;
