-- ═══════════════════════════════════════════════════════════════════════
-- CASINO-JIE-01: Tribal Casino Jurisdiction Support
-- Adds governmental_level to jurisdictions, tribal-specific columns,
-- org-level tribal fields, and seeds 7 CA tribal jurisdictions.
-- ADDITIVE ONLY — no changes to existing county/city jurisdiction behavior.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 1A: Add governmental_level to jurisdictions
-- NOTE: NOT using jurisdiction_type — that column already exists
--       and means pillar type (food_safety/facility_safety).
--       governmental_level = county/city/tribal/federal
-- ═══════════════════════════════════════════════════════════

ALTER TABLE jurisdictions
  ADD COLUMN IF NOT EXISTS governmental_level TEXT NOT NULL DEFAULT 'county'
    CHECK (governmental_level IN ('county', 'city', 'tribal', 'federal'));

-- Back-fill existing rows: city jurisdictions get 'city'
UPDATE jurisdictions
  SET governmental_level = 'city'
  WHERE city IS NOT NULL AND governmental_level = 'county';

-- ═══════════════════════════════════════════════════════════
-- 1B: Add tribal-specific columns to jurisdictions
-- ═══════════════════════════════════════════════════════════

ALTER TABLE jurisdictions
  ADD COLUMN IF NOT EXISTS tribal_entity_name TEXT,
  ADD COLUMN IF NOT EXISTS tribal_food_authority TEXT,
  ADD COLUMN IF NOT EXISTS tribal_fire_authority TEXT,
  ADD COLUMN IF NOT EXISTS food_code_basis TEXT,
  ADD COLUMN IF NOT EXISTS sovereignty_type TEXT,
  ADD COLUMN IF NOT EXISTS nigc_overlay BOOLEAN DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════
-- 1C: Add tribal org fields to organizations
-- ═══════════════════════════════════════════════════════════

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_tribal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tribal_jurisdiction_id UUID REFERENCES jurisdictions(id),
  ADD COLUMN IF NOT EXISTS county_jurisdiction_id UUID REFERENCES jurisdictions(id);

-- ═══════════════════════════════════════════════════════════
-- 1D: Seed 7 CA tribal jurisdictions (CPP service territory)
-- Each tribe gets a food_safety pillar jurisdiction with TEHO.
-- Fire safety remains under the county AHJ (existing rows).
-- ═══════════════════════════════════════════════════════════

INSERT INTO jurisdictions (
  state, county, agency_name, agency_type, jurisdiction_type,
  governmental_level, scoring_type, grading_type, grading_config,
  tribal_entity_name, tribal_food_authority, food_code_basis,
  sovereignty_type, nigc_overlay,
  fire_ahj_name, hood_cleaning_default,
  is_active, notes
) VALUES
-- 1. Table Mountain Rancheria — Fresno County
(
  'CA', 'Fresno',
  'Table Mountain Rancheria TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Table Mountain Rancheria', 'TEHO', 'FDA Food Code 2022 (advisory)',
  'federally_recognized', true,
  NULL, 'monthly',
  true, 'Tribal casino food safety — advisory mode. Fire safety under Fresno County Fire.'
),
-- 2. Tachi-Yokut Tribe — Kings County
(
  'CA', 'Kings',
  'Tachi-Yokut Tribe TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Tachi-Yokut Tribe', 'TEHO', 'FDA Food Code 2022 (advisory)',
  'federally_recognized', true,
  NULL, 'monthly',
  true, 'Tribal casino food safety — advisory mode. Fire safety under Kings County Fire.'
),
-- 3. Santa Ynez Band of Chumash — Santa Barbara County
(
  'CA', 'Santa Barbara',
  'Santa Ynez Band of Chumash TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Santa Ynez Band of Chumash', 'TEHO', 'FDA Food Code 2022 (advisory)',
  'federally_recognized', true,
  NULL, 'monthly',
  true, 'Tribal casino food safety — advisory mode. Fire safety under Santa Barbara County Fire.'
),
-- 4. Morongo Band of Mission Indians — Riverside County
(
  'CA', 'Riverside',
  'Morongo Band of Mission Indians TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Morongo Band of Mission Indians', 'TEHO', 'FDA Food Code 2022 (advisory)',
  'federally_recognized', true,
  NULL, 'monthly',
  true, 'Tribal casino food safety — advisory mode. Fire safety under Riverside County Fire / CAL FIRE.'
),
-- 5. Agua Caliente Band of Cahuilla Indians — Riverside County
(
  'CA', 'Riverside',
  'Agua Caliente Band of Cahuilla Indians TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Agua Caliente Band of Cahuilla Indians', 'TEHO', 'FDA Food Code 2022 (advisory)',
  'federally_recognized', true,
  NULL, 'monthly',
  true, 'Tribal casino food safety — advisory mode. Fire safety under Riverside County Fire / CAL FIRE.'
),
-- 6. Pechanga Band of Luiseno Indians — Riverside County
(
  'CA', 'Riverside',
  'Pechanga Band of Luiseno Indians TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Pechanga Band of Luiseno Indians', 'TEHO', 'FDA Food Code 2022 (advisory)',
  'federally_recognized', true,
  NULL, 'monthly',
  true, 'Tribal casino food safety — advisory mode. Fire safety under Riverside County Fire / CAL FIRE.'
),
-- 7. San Manuel Band of Mission Indians — San Bernardino County
(
  'CA', 'San Bernardino',
  'San Manuel Band of Mission Indians TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'San Manuel Band of Mission Indians', 'TEHO', 'FDA Food Code 2022 (advisory)',
  'federally_recognized', true,
  NULL, 'monthly',
  true, 'Tribal casino food safety — advisory mode. Fire safety under San Bernardino County Fire.'
);

-- ═══════════════════════════════════════════════════════════
-- 1E: Indexes
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_jurisdictions_governmental_level
  ON jurisdictions(governmental_level);

CREATE INDEX IF NOT EXISTS idx_organizations_is_tribal
  ON organizations(is_tribal) WHERE is_tribal = true;
