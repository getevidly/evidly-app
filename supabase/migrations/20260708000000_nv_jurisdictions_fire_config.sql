-- ================================================================
-- FIRE-JIE-NV-01: Nevada Jurisdictions + Fire Safety Configuration
-- Creates all 17 NV jurisdiction rows (16 counties + Carson City)
-- with food safety base configs and fire_jurisdiction_config JSONB.
--
-- Nevada fire authority: NRS Chapter 477, NAC 477
-- State Fire Marshal Division — statewide oversight
-- Fire code: 2021 IFC with Nevada amendments (effective Jan 2024)
-- NFPA 96-2024 adopted by reference through State Fire Marshal
-- ================================================================

-- ── 1. Insert 17 NV jurisdictions ─────────────────────────────────
-- Nevada has 16 counties + Carson City (independent consolidated municipality).
-- Food safety: SNHD (Clark), WCHD (Washoe), Carson City Health,
--   Douglas County EH, and NV DPBH for rural counties.

INSERT INTO jurisdictions (
  state, county, city, agency_name, agency_type, jurisdiction_type,
  scoring_type, grading_type, grading_config,
  governmental_level, regulatory_code,
  fire_ahj_name, fire_ahj_type, fire_code_edition, nfpa96_edition,
  hood_cleaning_default, has_local_amendments,
  data_source_type, data_source_tier, transparency_level,
  inspection_frequency, notes
) VALUES

-- ── Clark County (Las Vegas metro) ────────────────────────────────
(
  'NV', 'Clark', NULL,
  'Southern Nevada Health District',
  'county_health', 'food_safety',
  'weighted_deduction', 'deduction_based',
  '{"deduction_method": "point_deduction", "passing_score": 0, "critical_deduction": 5, "major_deduction": 3, "minor_deduction": 1}'::jsonb,
  'county', 'NAC 446',
  'Clark County Fire Department', 'county_fire', '2021 IFC', '2024',
  'quarterly', true,
  'portal', 2, 'medium',
  '1-2x per year (risk-based)',
  'Largest NV jurisdiction. SNHD inspects ~14,000 food establishments. Clark County Fire covers unincorporated areas + contracted cities. Las Vegas FD, Henderson FD, North Las Vegas FD are separate municipal AHJs within Clark County.'
),

-- ── Washoe County (Reno/Sparks) ───────────────────────────────────
(
  'NV', 'Washoe', NULL,
  'Washoe County Health District',
  'county_health', 'food_safety',
  'weighted_deduction', 'deduction_based',
  '{"deduction_method": "point_deduction", "passing_score": 0}'::jsonb,
  'county', 'NAC 446',
  'Truckee Meadows Fire & Rescue / Reno Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'portal', 3, 'medium',
  '1-2x per year (risk-based)',
  'Truckee Meadows Fire covers unincorporated Washoe County. Reno FD covers City of Reno. Sparks FD covers City of Sparks.'
),

-- ── Carson City (independent city) ────────────────────────────────
(
  'NV', 'Carson City', NULL,
  'Carson City Health & Human Services',
  'city_health', 'food_safety',
  'weighted_deduction', 'deduction_based',
  '{"deduction_method": "point_deduction", "passing_score": 0}'::jsonb,
  'city', 'NAC 446',
  'Carson City Fire Department', 'municipal_fire', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual',
  'Independent consolidated municipality (not part of any county). Carson City FD is sole fire AHJ.'
),

-- ── Douglas County ────────────────────────────────────────────────
(
  'NV', 'Douglas', NULL,
  'Douglas County Environmental Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'East Fork Fire Protection District', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual',
  'East Fork FPD is primary fire AHJ. Tahoe Douglas FPD covers Lake Tahoe area within Douglas County.'
),

-- ── Churchill County ──────────────────────────────────────────────
(
  'NV', 'Churchill', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Fallon/Churchill Fire Department', 'municipal_fire', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Rural county. Fallon/Churchill FD covers City of Fallon and surrounding areas. NSFM has oversight.'
),

-- ── Elko County ───────────────────────────────────────────────────
(
  'NV', 'Elko', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Elko Fire Department / Nevada State Fire Marshal', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Elko FD covers City of Elko. Spring Creek VFD covers Spring Creek. NSFM covers unincorporated areas and smaller communities.'
),

-- ── Esmeralda County ──────────────────────────────────────────────
(
  'NV', 'Esmeralda', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Nevada State Fire Marshal', 'state_fire_marshal', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Smallest NV county by population (~800). No local fire department. NSFM is sole fire AHJ. Goldfield VFD provides volunteer response.'
),

-- ── Eureka County ─────────────────────────────────────────────────
(
  'NV', 'Eureka', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Nevada State Fire Marshal', 'state_fire_marshal', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Very rural county (~1,900 pop). No local fire department. NSFM is sole fire AHJ. Eureka VFD provides volunteer response.'
),

-- ── Humboldt County ───────────────────────────────────────────────
(
  'NV', 'Humboldt', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Winnemucca Volunteer Fire Department / Nevada State Fire Marshal', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Winnemucca VFD covers City of Winnemucca. NSFM covers unincorporated Humboldt County.'
),

-- ── Lander County ─────────────────────────────────────────────────
(
  'NV', 'Lander', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Nevada State Fire Marshal', 'state_fire_marshal', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Rural county. Battle Mountain VFD provides volunteer response. NSFM is fire AHJ for code enforcement.'
),

-- ── Lincoln County ────────────────────────────────────────────────
(
  'NV', 'Lincoln', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Nevada State Fire Marshal', 'state_fire_marshal', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Rural county. Caliente VFD, Pioche VFD provide volunteer response. NSFM is fire AHJ for code enforcement.'
),

-- ── Lyon County ───────────────────────────────────────────────────
(
  'NV', 'Lyon', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Central Lyon County Fire Protection District', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Central Lyon County FPD and Mason Valley FPD are primary fire districts. North Lyon County FPD covers Fernley area.'
),

-- ── Mineral County ────────────────────────────────────────────────
(
  'NV', 'Mineral', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Nevada State Fire Marshal', 'state_fire_marshal', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Rural county. Hawthorne VFD provides volunteer response. NSFM is fire AHJ for code enforcement.'
),

-- ── Nye County ────────────────────────────────────────────────────
(
  'NV', 'Nye', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Pahrump Valley Fire & Rescue Services / Nevada State Fire Marshal', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Pahrump Valley Fire covers Pahrump (largest community). Tonopah VFD covers county seat. NSFM covers remainder of county.'
),

-- ── Pershing County ───────────────────────────────────────────────
(
  'NV', 'Pershing', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Nevada State Fire Marshal', 'state_fire_marshal', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Rural county. Lovelock VFD provides volunteer response. NSFM is fire AHJ for code enforcement.'
),

-- ── Storey County ─────────────────────────────────────────────────
(
  'NV', 'Storey', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Storey County Fire Protection District', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Storey County FPD covers Virginia City and surrounding areas. Home to Tahoe-Reno Industrial Center (TRI Center).'
),

-- ── White Pine County ─────────────────────────────────────────────
(
  'NV', 'White Pine', NULL,
  'Nevada Division of Public and Behavioral Health',
  'state_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'NAC 446',
  'Nevada State Fire Marshal', 'state_fire_marshal', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Rural county. Ely VFD provides volunteer response. NSFM is fire AHJ for code enforcement.'
);

-- ── 2. Populate fire_jurisdiction_config JSONB for all 17 NV ──────
-- NFPA 96-2024 Table 12.4 frequencies are universal (national standard).
-- NV uses 2021 IFC (not CFC). NRS 477 / NAC 477 governs state fire marshal.
-- No Title 19 CCR (that's CA-specific). Instead: NRS 477 authority.

UPDATE jurisdictions
SET fire_jurisdiction_config = jsonb_build_object(
  'fire_ahj_name', fire_ahj_name,
  'fire_ahj_type', fire_ahj_type,
  'fire_code_edition', '2021 IFC',
  'nfpa_96_edition', '2024',
  'nrs_477', true,
  'state_fire_marshal', 'Nevada State Fire Marshal Division',
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
WHERE state = 'NV';

-- ── 3. Set ahj_split_notes for multi-AHJ NV jurisdictions ────────

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Clark County Fire Department covers unincorporated Clark County + contracted cities. Las Vegas Fire & Rescue, Henderson Fire Department, and North Las Vegas Fire Department are separate municipal AHJs."}'::jsonb
WHERE state = 'NV' AND county = 'Clark';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Truckee Meadows Fire & Rescue covers unincorporated Washoe County. Reno Fire Department covers City of Reno. Sparks Fire Department covers City of Sparks."}'::jsonb
WHERE state = 'NV' AND county = 'Washoe';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Elko Fire Department covers City of Elko. Spring Creek VFD covers Spring Creek community. Nevada State Fire Marshal covers unincorporated areas."}'::jsonb
WHERE state = 'NV' AND county = 'Elko';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Pahrump Valley Fire & Rescue covers Pahrump (pop. ~40,000). Tonopah VFD covers county seat. Nevada State Fire Marshal covers remainder of Nye County."}'::jsonb
WHERE state = 'NV' AND county = 'Nye';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "East Fork Fire Protection District is primary AHJ. Tahoe Douglas Fire Protection District covers the Lake Tahoe area within Douglas County."}'::jsonb
WHERE state = 'NV' AND county = 'Douglas';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Central Lyon County FPD covers Dayton/Silver Springs. Mason Valley FPD covers Yerington area. North Lyon County FPD covers Fernley."}'::jsonb
WHERE state = 'NV' AND county = 'Lyon';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Winnemucca VFD covers City of Winnemucca. Nevada State Fire Marshal covers unincorporated Humboldt County."}'::jsonb
WHERE state = 'NV' AND county = 'Humboldt';

-- Clark County has local amendments to IFC
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"local_amendments": "Clark County Fire has adopted local amendments stricter than state baseline, including enhanced commercial kitchen ventilation requirements."}'::jsonb,
  has_local_amendments = true,
  local_amendment_notes = 'Clark County Fire local amendments to IFC — enhanced commercial kitchen ventilation and hood cleaning documentation requirements'
WHERE state = 'NV' AND county = 'Clark';
