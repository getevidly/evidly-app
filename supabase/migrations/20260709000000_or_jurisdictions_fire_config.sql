-- ================================================================
-- FIRE-JIE-OR-01: Oregon Jurisdictions + Fire Safety Configuration
-- Creates all 36 OR jurisdiction rows (36 counties)
-- with food safety base configs and fire_jurisdiction_config JSONB.
--
-- Oregon fire authority: ORS 476/479, OAR 837-040
-- Oregon State Fire Marshal (OSFM) — statewide oversight
-- Fire code: 2025 Oregon Fire Code (based on 2024 IFC with OR amendments)
-- NFPA 96-2024 adopted by reference through OSFM
-- Food safety: OAR 333-150 (based on FDA Food Code)
-- Inspections by county environmental health departments
-- Scoring: 100-point deduction (70+ pass, 69- fail)
-- ================================================================

-- ── 1. Insert 36 OR jurisdictions (idempotent) ────────────────────
-- Oregon has 36 counties. No independent cities.
-- Food safety: County environmental health departments enforce OAR 333-150.
-- Fire: Mix of municipal FDs, rural fire protection districts (RFPDs),
--   and OSFM Deputy districts for unprotected areas.
-- Guard: skip entire INSERT if any OR rows already exist.

DO $or_guard$
BEGIN
IF NOT EXISTS (SELECT 1 FROM jurisdictions WHERE state = 'OR' LIMIT 1) THEN

INSERT INTO jurisdictions (
  state, county, city, agency_name, agency_type, jurisdiction_type,
  scoring_type, grading_type, grading_config,
  governmental_level, regulatory_code,
  fire_ahj_name, fire_ahj_type, fire_code_edition, nfpa96_edition,
  hood_cleaning_default, has_local_amendments,
  data_source_type, data_source_tier, transparency_level,
  inspection_frequency, notes
) VALUES

-- ── Baker County ─────────────────────────────────────────────────
(
  'OR', 'Baker', NULL,
  'Baker County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Baker City Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Semi-annual',
  'Rural county. Baker City FD covers city; OSFM District 23 covers unincorporated areas.'
),

-- ── Benton County ────────────────────────────────────────────────
(
  'OR', 'Benton', NULL,
  'Benton County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Corvallis Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 4, 'medium',
  'Semi-annual',
  'Oregon State University campus in Corvallis. Corvallis FD + Corvallis RFPD covers metro area. OSFM District 6.'
),

-- ── Clackamas County ─────────────────────────────────────────────
(
  'OR', 'Clackamas', NULL,
  'Clackamas County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Clackamas Fire District #1', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 3, 'medium',
  'Semi-annual',
  'Clackamas FD #1 serves 220K+ population including Gladstone, Happy Valley, Milwaukie, Oregon City. OSFM District 3.'
),

-- ── Clatsop County ───────────────────────────────────────────────
(
  'OR', 'Clatsop', NULL,
  'Clatsop County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Astoria Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 5, 'low',
  'Semi-annual',
  'Coastal county. Astoria FD covers city; Seaside FD covers Seaside. Multiple RFPDs. OSFM District 1.'
),

-- ── Columbia County ──────────────────────────────────────────────
(
  'OR', 'Columbia', NULL,
  'Columbia County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Columbia River Fire & Rescue', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 5, 'low',
  'Semi-annual',
  'Columbia River Fire & Rescue covers St. Helens area. Scappoose RFPD covers Scappoose. OSFM District 1.'
),

-- ── Coos County ──────────────────────────────────────────────────
(
  'OR', 'Coos', NULL,
  'Coos County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Coos Bay Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 5, 'low',
  'Semi-annual',
  'Coastal county. Coos Bay FD covers city; North Bend Fire covers North Bend. Coos Forest Protective Association covers wildland areas. OSFM District 9.'
),

-- ── Crook County ─────────────────────────────────────────────────
(
  'OR', 'Crook', NULL,
  'Crook County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Crook County Fire & Rescue', 'county_fire', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Semi-annual',
  'Rural county. Crook County Fire & Rescue covers Prineville and county. OSFM District 20.'
),

-- ── Curry County ─────────────────────────────────────────────────
(
  'OR', 'Curry', NULL,
  'Curry County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Brookings Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Semi-annual',
  'Southernmost coastal county. Brookings FD, Gold Beach Fire, Port Orford Fire. Coos Forest Protective Association covers wildland. OSFM District 12.'
),

-- ── Deschutes County ─────────────────────────────────────────────
(
  'OR', 'Deschutes', NULL,
  'Deschutes County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Bend Fire & Rescue', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 3, 'medium',
  'Semi-annual',
  'High-growth county. Bend Fire & Rescue + Deschutes County RFPD #2 (contractual). Redmond Fire & Rescue covers Redmond. OSFM District 16.'
),

-- ── Douglas County ───────────────────────────────────────────────
(
  'OR', 'Douglas', NULL,
  'Douglas County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Roseburg Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 4, 'low',
  'Semi-annual',
  'Roseburg FD covers city. Douglas County Fire Districts cover rural areas. Coos Forest Protective Association covers western Douglas. OSFM District 11.'
),

-- ── Gilliam County ───────────────────────────────────────────────
(
  'OR', 'Gilliam', NULL,
  'Gilliam County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Oregon State Fire Marshal', 'state_fire_marshal', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Least populated OR county (~1,800). Very few commercial kitchens. Condon VFD. OSFM District 19 primary fire AHJ.'
),

-- ── Grant County ─────────────────────────────────────────────────
(
  'OR', 'Grant', NULL,
  'Grant County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Oregon State Fire Marshal', 'state_fire_marshal', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Rural county (~7,200 pop). John Day VFD, Canyon City VFD. OSFM District 21 primary fire AHJ.'
),

-- ── Harney County ────────────────────────────────────────────────
(
  'OR', 'Harney', NULL,
  'Harney County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Oregon State Fire Marshal', 'state_fire_marshal', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Largest OR county by area (~10,200 sq mi). Burns VFD, Hines VFD. Burns Paiute Reservation in county. OSFM District 21.'
),

-- ── Hood River County ────────────────────────────────────────────
(
  'OR', 'Hood River', NULL,
  'Hood River County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Hood River Fire & EMS', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 5, 'low',
  'Semi-annual',
  'Columbia River Gorge. Hood River Fire & EMS covers 145 sq mi. Cascade Locks Fire, Parkdale RFPD. OSFM District 18.'
),

-- ── Jackson County ───────────────────────────────────────────────
(
  'OR', 'Jackson', NULL,
  'Jackson County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Medford Fire Department', 'mixed', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 3, 'medium',
  'Semi-annual',
  'Southern OR hub. Medford FD, Ashland Fire & Rescue, Jackson County Fire Districts #3/#4/#5, Rogue River FD (JCFD #1). OSFM District 14.'
),

-- ── Jefferson County ─────────────────────────────────────────────
(
  'OR', 'Jefferson', NULL,
  'Jefferson County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Jefferson County Fire District #1', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Semi-annual',
  'Warm Springs Reservation occupies ~50% of county. Madras FD in city. Jefferson County FD #1 covers rural. OSFM District 17.'
),

-- ── Josephine County ─────────────────────────────────────────────
(
  'OR', 'Josephine', NULL,
  'Josephine County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Grants Pass Fire Rescue', 'mixed', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 4, 'low',
  'Semi-annual',
  'Grants Pass Fire Rescue covers city. Illinois Valley Fire District, Rural Metro (contracted). OSFM District 13.'
),

-- ── Klamath County ───────────────────────────────────────────────
(
  'OR', 'Klamath', NULL,
  'Klamath County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Klamath County Fire District #1', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 4, 'low',
  'Semi-annual',
  'Klamath Falls urban area. Klamath County FD #1 is primary. Klamath Tribes reservation in county. OSFM District 15.'
),

-- ── Lake County ──────────────────────────────────────────────────
(
  'OR', 'Lake', NULL,
  'Lake County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Oregon State Fire Marshal', 'state_fire_marshal', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Very rural (~8,100 pop, 8,359 sq mi). Lakeview FD, Christmas Valley RFPD. OSFM District 15 primary fire AHJ.'
),

-- ── Lane County ──────────────────────────────────────────────────
(
  'OR', 'Lane', NULL,
  'Lane County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Eugene Springfield Fire & EMS', 'mixed', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 2, 'high',
  'Semi-annual',
  '4th most populous county. Eugene Springfield Fire, Lane Fire Authority, South Lane County Fire & Rescue, McKenzie Fire. OSFM District 8.'
),

-- ── Lincoln County ───────────────────────────────────────────────
(
  'OR', 'Lincoln', NULL,
  'Lincoln County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Newport Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 5, 'low',
  'Semi-annual',
  'Central coast. Newport FD, Lincoln City Fire, Depoe Bay Fire, Toledo Fire. Siletz Reservation in county. OSFM District 4.'
),

-- ── Linn County ──────────────────────────────────────────────────
(
  'OR', 'Linn', NULL,
  'Linn County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Albany Fire Department', 'mixed', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 4, 'medium',
  'Semi-annual',
  'Albany FD covers city. Lebanon Fire District, Sweet Home Fire & Ambulance. Linn County Fire Defense Board coordinates. OSFM District 6.'
),

-- ── Malheur County ───────────────────────────────────────────────
(
  'OR', 'Malheur', NULL,
  'Malheur County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Ontario Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Semi-annual',
  'Eastern OR border county. Ontario FD covers city (largest in county). Vale VFD, Nyssa VFD. OSFM District 21.'
),

-- ── Marion County ────────────────────────────────────────────────
(
  'OR', 'Marion', NULL,
  'Marion County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Salem Fire Department', 'mixed', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 2, 'high',
  'Semi-annual',
  'State capital. Salem FD covers city. Marion County FD #1 covers 60K+ residents. Woodburn Fire, Silverton Fire, Stayton Fire. OSFM District 6.'
),

-- ── Morrow County ────────────────────────────────────────────────
(
  'OR', 'Morrow', NULL,
  'Morrow County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Oregon State Fire Marshal', 'state_fire_marshal', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Rural county (~12,000 pop). Boardman RFPD, Heppner VFD, Irrigon RFPD. OSFM District 19.'
),

-- ── Multnomah County ─────────────────────────────────────────────
(
  'OR', 'Multnomah', NULL,
  'Multnomah County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Portland Fire & Rescue', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', true,
  'state_portal', 1, 'high',
  'Semi-annual',
  'Most populous OR county. PF&R is primary fire AHJ. Title 31 Fire Regulations require Certificate of Fitness for hood cleaning contractors. Gresham Fire covers East County. OSFM District 3.'
),

-- ── Polk County ──────────────────────────────────────────────────
(
  'OR', 'Polk', NULL,
  'Polk County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Polk County Fire District #1', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 5, 'low',
  'Semi-annual',
  'Dallas Fire covers City of Dallas. Polk County FD #1 covers rural areas. Grand Ronde Reservation straddles Polk/Yamhill. OSFM District 5.'
),

-- ── Sherman County ───────────────────────────────────────────────
(
  'OR', 'Sherman', NULL,
  'Sherman County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Oregon State Fire Marshal', 'state_fire_marshal', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Least populated county after Wheeler (~1,800). Moro VFD, Grass Valley VFD. OSFM District 18 primary fire AHJ.'
),

-- ── Tillamook County ─────────────────────────────────────────────
(
  'OR', 'Tillamook', NULL,
  'Tillamook County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Tillamook Fire District', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 5, 'low',
  'Semi-annual',
  'North coast. Tillamook Fire District covers city area. Pacific City RFPD, Nestucca RFPD, Rockaway Beach Fire. OSFM District 4.'
),

-- ── Umatilla County ──────────────────────────────────────────────
(
  'OR', 'Umatilla', NULL,
  'Umatilla County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Pendleton Fire Department', 'mixed', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 4, 'low',
  'Semi-annual',
  'Pendleton FD covers city. Hermiston Fire & Emergency Services covers Hermiston. Umatilla Indian Reservation in county. OSFM District 19.'
),

-- ── Union County ─────────────────────────────────────────────────
(
  'OR', 'Union', NULL,
  'Union County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'La Grande Fire Department', 'municipal_fire', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Semi-annual',
  'La Grande FD covers city. Union RFPD, Elgin VFD. Eastern Oregon University campus. OSFM District 23.'
),

-- ── Wallowa County ───────────────────────────────────────────────
(
  'OR', 'Wallowa', NULL,
  'Wallowa County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Oregon State Fire Marshal', 'state_fire_marshal', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Remote NE Oregon (~7,300 pop). Enterprise VFD, Joseph VFD, Wallowa VFD. OSFM District 23 primary fire AHJ.'
),

-- ── Wasco County ─────────────────────────────────────────────────
(
  'OR', 'Wasco', NULL,
  'Wasco County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Mid-Columbia Fire & Rescue', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 5, 'low',
  'Semi-annual',
  'The Dalles area. Mid-Columbia Fire & Rescue covers The Dalles metro. Warm Springs Reservation straddles Wasco/Jefferson. OSFM District 18.'
),

-- ── Washington County ────────────────────────────────────────────
(
  'OR', 'Washington', NULL,
  'Washington County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Tualatin Valley Fire & Rescue', 'fire_district', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 2, 'high',
  'Semi-annual',
  '2nd most populous county. TVF&R is major consolidated district covering Beaverton, Tigard, Sherwood, etc. Hillsboro Fire, Forest Grove Fire. OSFM District 3.'
),

-- ── Wheeler County ───────────────────────────────────────────────
(
  'OR', 'Wheeler', NULL,
  'Wheeler County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'Oregon State Fire Marshal', 'state_fire_marshal', '2025 OFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Least populated OR county (~1,400). Fossil VFD, Mitchell VFD, Spray VFD. OSFM District 20 primary fire AHJ.'
),

-- ── Yamhill County ───────────────────────────────────────────────
(
  'OR', 'Yamhill', NULL,
  'Yamhill County Environmental Health',
  'county_health', 'food_safety',
  'point_deduction', 'pass_fail',
  '{"method": "100_point_deduction", "pass_threshold": 70}'::jsonb,
  'county', 'OAR 333-150',
  'McMinnville Fire Department', 'mixed', '2025 OFC', '2024',
  'quarterly', false,
  'state_portal', 4, 'medium',
  'Semi-annual',
  'Wine country. McMinnville FD covers city. Newberg Fire, Sheridan Fire. Grand Ronde Reservation straddles Yamhill/Polk. OSFM District 5.'
);

END IF;
END $or_guard$;

-- ── 2. Populate fire_jurisdiction_config JSONB for all 36 OR ──────
-- NFPA 96-2024 Table 12.4 frequencies are universal (national standard).
-- Oregon uses 2025 OFC (based on 2024 IFC with OR amendments).
-- ORS 476/479 and OAR 837-040 govern state fire code.
-- No Title 19 CCR (CA-specific). No NRS 477 (NV-specific).
-- Oregon equivalent: ors_479 = true, oar_837_040 = true.

UPDATE jurisdictions
SET fire_jurisdiction_config = jsonb_build_object(
  'fire_ahj_name', fire_ahj_name,
  'fire_ahj_type', fire_ahj_type,
  'fire_code_edition', '2025 OFC',
  'nfpa_96_edition', '2024',
  'ors_479', true,
  'oar_837_040', true,
  'state_fire_marshal', 'Oregon State Fire Marshal (OSFM)',
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
WHERE state = 'OR';

-- ── 3. Set ahj_split_notes for multi-AHJ OR jurisdictions ────────

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Portland Fire & Rescue covers Portland city proper. Gresham Fire & Emergency Services covers Gresham/East Multnomah. Clackamas Fire District #1 extends into southern Multnomah."}'::jsonb
WHERE state = 'OR' AND county = 'Multnomah';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Tualatin Valley Fire & Rescue is primary AHJ covering Beaverton, Tigard, Sherwood, Tualatin. Hillsboro Fire Department covers City of Hillsboro. Forest Grove Fire & Rescue covers Forest Grove."}'::jsonb
WHERE state = 'OR' AND county = 'Washington';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Clackamas Fire District #1 covers major population centers (Oregon City, Milwaukie, Happy Valley, Gladstone). Multiple smaller RFPDs cover rural areas. Lake Oswego Fire covers Lake Oswego."}'::jsonb
WHERE state = 'OR' AND county = 'Clackamas';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Salem Fire Department covers City of Salem. Marion County Fire District #1 covers 60K+ residents in unincorporated areas. Woodburn Fire District, Silverton Fire District, Stayton Fire District cover their cities."}'::jsonb
WHERE state = 'OR' AND county = 'Marion';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Eugene Springfield Fire & EMS covers Eugene and Springfield. Lane Fire Authority covers surrounding rural areas. South Lane County Fire & Rescue covers Cottage Grove and Creswell."}'::jsonb
WHERE state = 'OR' AND county = 'Lane';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Medford Fire Department covers Medford city. Ashland Fire & Rescue covers Ashland. Jackson County Fire Districts #3, #4, #5 cover rural areas. Rogue River Fire District covers Rogue River city."}'::jsonb
WHERE state = 'OR' AND county = 'Jackson';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Bend Fire & Rescue covers Bend city (contracts with Deschutes County RFPD #2). Redmond Fire & Rescue covers Redmond. Sisters-Camp Sherman RFPD, La Pine RFPD, Sunriver Fire."}'::jsonb
WHERE state = 'OR' AND county = 'Deschutes';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Albany Fire Department covers Albany city. Lebanon Fire District covers Lebanon. Sweet Home Fire & Ambulance District covers Sweet Home area."}'::jsonb
WHERE state = 'OR' AND county = 'Linn';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Grants Pass Fire Rescue covers city. Illinois Valley Fire District covers Cave Junction area. Applegate Valley Fire District covers southern Josephine County."}'::jsonb
WHERE state = 'OR' AND county = 'Josephine';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Pendleton Fire Department covers Pendleton city. Hermiston Fire & Emergency Services covers Hermiston. Umatilla Indian Reservation is separate tribal fire jurisdiction."}'::jsonb
WHERE state = 'OR' AND county = 'Umatilla';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "McMinnville Fire Department covers McMinnville city. Newberg Fire Department covers Newberg. Sheridan Fire District covers Sheridan area. Grand Ronde Reservation straddles Yamhill/Polk counties."}'::jsonb
WHERE state = 'OR' AND county = 'Yamhill';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Corvallis Fire Department covers Corvallis city + Corvallis RFPD (765 sq mi). Philomath Fire & Rescue, Monroe RFPD, Adair RFPD cover rural areas."}'::jsonb
WHERE state = 'OR' AND county = 'Benton';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Jefferson County Fire District #1 covers Madras and rural areas. Warm Springs Reservation (~50% of county area) is separate tribal fire jurisdiction."}'::jsonb
WHERE state = 'OR' AND county = 'Jefferson';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Mid-Columbia Fire & Rescue covers The Dalles metro area. Warm Springs Reservation straddles Wasco/Jefferson counties with separate tribal fire jurisdiction."}'::jsonb
WHERE state = 'OR' AND county = 'Wasco';

-- ── 4. Portland local amendments ──────────────────────────────────
-- Portland Title 31 Fire Regulations require Certificate of Fitness
-- for commercial cooking hood/ventilation cleaning contractors.

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"local_amendments": "Portland Title 31 Fire Regulations (31.20.110) require Certificate of Fitness for commercial cooking hood/ventilation system cleaning contractors. Portland Fire Marshal Office conducts commercial kitchen fire inspections."}'::jsonb,
  has_local_amendments = true,
  local_amendment_notes = 'Portland Title 31 Fire Regulations — Certificate of Fitness required for hood cleaning contractors per 31.20.110'
WHERE state = 'OR' AND county = 'Multnomah';

-- ── 5. Set OSFM district numbers in fire_jurisdiction_config ──────
-- OSFM has 23 Deputy State Fire Marshal districts covering all counties.

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 23}'::jsonb WHERE state = 'OR' AND county IN ('Baker', 'Union', 'Wallowa');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 6}'::jsonb WHERE state = 'OR' AND county IN ('Benton', 'Linn', 'Marion');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 3}'::jsonb WHERE state = 'OR' AND county IN ('Clackamas', 'Multnomah', 'Washington');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 1}'::jsonb WHERE state = 'OR' AND county IN ('Clatsop', 'Columbia');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 9}'::jsonb WHERE state = 'OR' AND county = 'Coos';
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 20}'::jsonb WHERE state = 'OR' AND county IN ('Crook', 'Wheeler');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 12}'::jsonb WHERE state = 'OR' AND county = 'Curry';
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 16}'::jsonb WHERE state = 'OR' AND county = 'Deschutes';
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 11}'::jsonb WHERE state = 'OR' AND county = 'Douglas';
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 19}'::jsonb WHERE state = 'OR' AND county IN ('Gilliam', 'Morrow', 'Umatilla');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 21}'::jsonb WHERE state = 'OR' AND county IN ('Grant', 'Harney', 'Malheur');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 18}'::jsonb WHERE state = 'OR' AND county IN ('Hood River', 'Wasco', 'Sherman');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 14}'::jsonb WHERE state = 'OR' AND county = 'Jackson';
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 17}'::jsonb WHERE state = 'OR' AND county = 'Jefferson';
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 13}'::jsonb WHERE state = 'OR' AND county = 'Josephine';
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 15}'::jsonb WHERE state = 'OR' AND county IN ('Klamath', 'Lake');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 8}'::jsonb WHERE state = 'OR' AND county = 'Lane';
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 4}'::jsonb WHERE state = 'OR' AND county IN ('Lincoln', 'Tillamook');
UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config || '{"osfm_district": 5}'::jsonb WHERE state = 'OR' AND county IN ('Polk', 'Yamhill');
