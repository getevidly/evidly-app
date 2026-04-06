-- ================================================================
-- FIRE-JIE-CA-01: California Fire Safety Configuration
-- Adds fire_jurisdiction_config JSONB column, normalizes fire_ahj_type,
-- and populates structured fire configs for all 62 CA non-tribal jurisdictions.
--
-- NFPA 96-2024 Table 12.4 cleaning frequencies are universal (national standard).
-- 2025 CFC (California Fire Code, based on IFC 2024) effective July 1, 2025.
-- Title 19 CCR applies to all CA jurisdictions uniformly.
-- ================================================================

-- ── 1. Add fire_jurisdiction_config JSONB column ──────────────────

ALTER TABLE jurisdictions
  ADD COLUMN IF NOT EXISTS fire_jurisdiction_config JSONB DEFAULT NULL;

-- ── 2. Normalize fire_ahj_type to 5 standard values ──────────────
-- municipal_fire, county_fire, fire_district, cal_fire_contract, mixed

UPDATE jurisdictions SET fire_ahj_type = 'municipal_fire'
WHERE state = 'CA' AND fire_ahj_type IN ('city_fire', 'city_fd', 'city');

UPDATE jurisdictions SET fire_ahj_type = 'county_fire'
WHERE state = 'CA' AND fire_ahj_type IN ('county_fd', 'county_fire_authority', 'county_multi');
-- Note: 'county_fire' already correct, no-op for those rows

UPDATE jurisdictions SET fire_ahj_type = 'cal_fire_contract'
WHERE state = 'CA' AND fire_ahj_type IN ('cal_fire', 'cal_fire_primary');

UPDATE jurisdictions SET fire_ahj_type = 'mixed'
WHERE state = 'CA' AND fire_ahj_type IN (
  'mixed_cal_fire_city', 'mixed_county_city', 'mixed_county_cal_fire',
  'mixed_cal_fire_city_district', 'city_fire_and_cal_fire', 'county_cal_fire'
);
-- Note: 'mixed' already correct for some rows, no-op

-- ── 3. Populate fire_jurisdiction_config for all CA non-tribal ────
-- NFPA 96-2024 Table 12.4 frequencies are the same for all CA jurisdictions.
-- Per-jurisdiction differences: fire_ahj_name, fire_ahj_type, ahj_split_notes.

UPDATE jurisdictions
SET fire_jurisdiction_config = jsonb_build_object(
  'fire_ahj_name', fire_ahj_name,
  'fire_ahj_type', fire_ahj_type,
  'fire_code_edition', '2025 CFC',
  'nfpa_96_edition', '2024',
  'title_19_ccr', true,
  'nfpa_96_table_12_4', jsonb_build_object(
    'type_i_heavy_volume', 'monthly',
    'type_i_moderate_volume', 'quarterly',
    'type_i_low_volume', 'semi_annual',
    'type_ii', 'annual',
    'solid_fuel_cooking', 'monthly',
    'source', 'NFPA 96-2024 Table 12.4'
  ),
  'hood_suppression', jsonb_build_object(
    'system_type', 'UL-300 wet chemical',
    'inspection_interval', 'semi_annual',
    'standard', 'NFPA 96 / UL-300'
  ),
  'ansul_system', jsonb_build_object(
    'required', true,
    'inspection_interval', 'semi_annual',
    'standard', 'NFPA 17A'
  ),
  'fire_extinguisher', jsonb_build_object(
    'types', '["K-class", "ABC"]'::jsonb,
    'inspection_interval', 'annual',
    'hydrostatic_test', '6-year K-class / 12-year ABC'
  ),
  'fire_alarm', jsonb_build_object(
    'required', true,
    'monitoring_type', 'central_station',
    'inspection_interval', 'annual'
  ),
  'sprinkler_system', jsonb_build_object(
    'required', true,
    'inspection_interval', 'annual',
    'type', 'wet'
  ),
  'grease_trap', jsonb_build_object(
    'required', true,
    'cleaning_interval', '90_days',
    'interceptor_type', 'gravity'
  ),
  'pse_safeguards', '["hood_cleaning", "fire_suppression_system", "fire_extinguisher", "fire_alarm_monitoring"]'::jsonb,
  'ahj_split_notes', NULL,
  'federal_overlay', NULL
)
WHERE state = 'CA'
  AND governmental_level IN ('county', 'city')
  AND fire_ahj_name IS NOT NULL;

-- ── 4. Set ahj_split_notes for multi-AHJ jurisdictions ───────────
-- These jurisdictions have complex fire authority splits that need documentation.

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Alameda County Fire (unincorporated) + Oakland FD, Berkeley FD, Fremont Fire, Hayward Fire for incorporated cities"}'::jsonb
WHERE state = 'CA' AND county = 'Alameda' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "LA County Fire Department covers unincorporated areas + contracted cities. LAFD, Long Beach FD, Pasadena FD, Vernon FD, and 30+ city FDs are separate AHJs."}'::jsonb
WHERE state = 'CA' AND county = 'Los Angeles' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "OCFA covers unincorporated Orange County + 23 contracted cities. Anaheim, Fullerton, Garden Grove, Huntington Beach, Newport Beach, and Orange have their own FDs."}'::jsonb
WHERE state = 'CA' AND county = 'Orange' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "San Diego County Fire Authority covers unincorporated areas. City of San Diego Fire-Rescue is separate. Carlsbad, Chula Vista, Escondido, Oceanside, Vista also have city FDs."}'::jsonb
WHERE state = 'CA' AND county = 'San Diego' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "San Francisco is a consolidated city-county. SFFD is the sole fire AHJ for the entire jurisdiction."}'::jsonb
WHERE state = 'CA' AND county = 'San Francisco' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Santa Clara County Fire covers unincorporated areas. San Jose FD, Sunnyvale DPS, Mountain View FD, Palo Alto FD, Santa Clara FD, Milpitas FD are separate city AHJs."}'::jsonb
WHERE state = 'CA' AND county = 'Santa Clara' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Merced Fire Department covers city limits. CAL FIRE Madera-Mariposa-Merced Unit covers unincorporated areas. Los Banos, Livingston, Atwater have city FDs."}'::jsonb
WHERE state = 'CA' AND county = 'Merced' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Fresno County Fire Protection District covers unincorporated areas. City of Fresno Fire Department, Clovis Fire, Kerman Fire, Selma Fire are separate city AHJs."}'::jsonb
WHERE state = 'CA' AND county = 'Fresno' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "CAL FIRE RRU operates as Riverside County Fire Department via contract. City of Riverside FD, Corona FD, Palm Springs FD are separate AHJs."}'::jsonb
WHERE state = 'CA' AND county = 'Riverside' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "San Bernardino County Fire covers unincorporated areas + contracted cities. City of San Bernardino FD, Fontana FD, Ontario FD, Rancho Cucamonga FPD, Redlands FD are separate."}'::jsonb
WHERE state = 'CA' AND county = 'San Bernardino' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Sacramento Metro Fire District covers unincorporated Sacramento County. City of Sacramento Fire Department is a separate AHJ."}'::jsonb
WHERE state = 'CA' AND county = 'Sacramento' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Kern County Fire Department covers unincorporated areas. CAL FIRE covers SRA. City of Bakersfield FD is a separate AHJ."}'::jsonb
WHERE state = 'CA' AND county = 'Kern' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Ventura County Fire Department covers unincorporated areas + contracted cities. Oxnard FD, Ventura City FD, Fillmore FD are separate AHJs."}'::jsonb
WHERE state = 'CA' AND county = 'Ventura' AND governmental_level = 'county';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Modesto Fire Department covers City of Modesto. CAL FIRE TCU covers unincorporated Stanislaus County. Turlock, Ceres, Oakdale, Patterson have city FDs."}'::jsonb
WHERE state = 'CA' AND county = 'Stanislaus' AND governmental_level = 'county';

-- Mariposa has NPS/Yosemite federal overlay
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"federal_overlay": {"agency": "NPS", "authority": "36 CFR §2.10", "notes": "Yosemite National Park — NPS fire authority for all concession food operations within park boundaries. CAL FIRE MMU covers areas outside NPS jurisdiction."}}'::jsonb
WHERE state = 'CA' AND county = 'Mariposa' AND governmental_level = 'county';

-- Inyo has NPS/Death Valley overlay
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"federal_overlay": {"agency": "NPS", "authority": "36 CFR §2.10", "notes": "Death Valley National Park — NPS fire authority for concession food operations within park boundaries. CAL FIRE covers areas outside NPS jurisdiction."}}'::jsonb
WHERE state = 'CA' AND county = 'Inyo' AND governmental_level = 'county';

-- ── 5. Index for JSONB queries ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_jurisdictions_fire_config
  ON jurisdictions USING gin (fire_jurisdiction_config)
  WHERE fire_jurisdiction_config IS NOT NULL;
