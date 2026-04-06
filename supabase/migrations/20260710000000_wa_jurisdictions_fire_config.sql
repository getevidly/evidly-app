-- ================================================================
-- FIRE-JIE-WA-01: Washington Jurisdictions + Fire Safety Configuration
-- Creates all 39 WA jurisdiction rows (39 counties)
-- with food safety base configs and fire_jurisdiction_config JSONB.
--
-- Washington fire authority: RCW 19.27, WAC 51-54A
-- Washington State Patrol, Fire Protection Bureau (State Fire Marshal)
-- Fire code: 2021 IFC with Washington amendments (WAC 51-54A)
-- NFPA 96-2024 adopted by reference through WA State Fire Code
-- Food safety: WAC 246-215 (based on FDA Food Code)
-- Inspections by local health jurisdictions (LHJs)
-- ================================================================

-- ── 1. Insert 39 WA jurisdictions (idempotent) ────────────────────
-- Washington has 39 counties. No independent cities.
-- Food safety: Local Health Jurisdictions (LHJs) enforce WAC 246-215.
-- Some LHJs serve multiple counties (Chelan-Douglas, Benton-Franklin,
--   NE Tri-County for Ferry/Stevens/Pend Oreille).
-- Fire: Mix of municipal FDs, fire protection districts,
--   and WA State Fire Marshal for unprotected areas.
-- Guard: skip entire INSERT if any WA rows already exist.

DO $wa_guard$
BEGIN
IF NOT EXISTS (SELECT 1 FROM jurisdictions WHERE state = 'WA' LIMIT 1) THEN

INSERT INTO jurisdictions (
  state, county, city, agency_name, agency_type, jurisdiction_type,
  scoring_type, grading_type, grading_config,
  governmental_level, regulatory_code,
  fire_ahj_name, fire_ahj_type, fire_code_edition, nfpa96_edition,
  hood_cleaning_default, has_local_amendments,
  data_source_type, data_source_tier, transparency_level,
  inspection_frequency, notes
) VALUES

-- ── Adams County ────────────────────────────────────────────────
(
  'WA', 'Adams', NULL,
  'Adams County Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Adams County Fire Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Rural agricultural county (~20K pop). Ritzville VFD, Othello Fire. Multiple small fire protection districts. WA State Fire Marshal has oversight for unprotected areas.'
),

-- ── Asotin County ───────────────────────────────────────────────
(
  'WA', 'Asotin', NULL,
  'Asotin County Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Asotin County Fire District #1', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'SE Washington border county (~22K pop). Clarkston is largest city. Asotin County FPD #1 covers majority of county.'
),

-- ── Benton County ───────────────────────────────────────────────
(
  'WA', 'Benton', NULL,
  'Benton-Franklin Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Benton County Fire District #1', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 3, 'medium',
  'Risk-based (1-3x per year)',
  'Tri-Cities area (~210K pop). Benton County FD #1 (Kennewick), Richland Fire & Emergency Services, West Richland Fire. Benton-Franklin Health District serves both Benton and Franklin counties.'
),

-- ── Chelan County ───────────────────────────────────────────────
(
  'WA', 'Chelan', NULL,
  'Chelan-Douglas Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Chelan County Fire District #1', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'Central WA (~80K pop). Chelan County FD #1 (merged with Wenatchee Fire 2017) covers Wenatchee metro. Chelan-Douglas Health District serves both Chelan and Douglas counties.'
),

-- ── Clallam County ──────────────────────────────────────────────
(
  'WA', 'Clallam', NULL,
  'Clallam County Health & Human Services',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Clallam County Fire District #2', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'Olympic Peninsula (~77K pop). Clallam County FD #2 covers Port Angeles area. Sequim Fire, Forks Fire. Makah and Quileute reservations in county.'
),

-- ── Clark County ────────────────────────────────────────────────
(
  'WA', 'Clark', NULL,
  'Clark County Public Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Vancouver Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'state_portal', 2, 'medium',
  'Risk-based (1-3x per year)',
  '5th most populous WA county (~510K pop). Vancouver FD covers city. Clark County Fire Districts #3, #6, #10, #13. Clark-Cowlitz Fire Rescue (FD #6). Cowlitz Indian Tribe ilani Casino in county.'
),

-- ── Columbia County ─────────────────────────────────────────────
(
  'WA', 'Columbia', NULL,
  'Columbia County Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Columbia County Fire Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Very rural county (~4K pop). Dayton VFD is primary. Very few commercial kitchens.'
),

-- ── Cowlitz County ──────────────────────────────────────────────
(
  'WA', 'Cowlitz', NULL,
  'Cowlitz County Health & Human Services',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Cowlitz 2 Fire & Rescue', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'SW Washington (~110K pop). Cowlitz 2 Fire & Rescue (largest district). Longview Fire Department covers City of Longview. Kelso Fire covers City of Kelso.'
),

-- ── Douglas County ──────────────────────────────────────────────
(
  'WA', 'Douglas', NULL,
  'Chelan-Douglas Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Douglas County Fire District #2', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual',
  'Central WA (~44K pop). Douglas County FD #2 covers East Wenatchee area. Chelan-Douglas Health District serves both Douglas and Chelan counties.'
),

-- ── Ferry County ────────────────────────────────────────────────
(
  'WA', 'Ferry', NULL,
  'NE Tri-County Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Ferry County Fire Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Very rural NE county (~7,800 pop). Republic VFD is primary. NE Tri-County Health District serves Ferry, Stevens, and Pend Oreille counties. Colville Reservation extends into Ferry County.'
),

-- ── Franklin County ─────────────────────────────────────────────
(
  'WA', 'Franklin', NULL,
  'Benton-Franklin Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Pasco Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 3, 'medium',
  'Risk-based (1-3x per year)',
  'Tri-Cities area (~97K pop). Pasco FD covers City of Pasco. Franklin County Fire District #3 covers rural areas. Benton-Franklin Health District serves both counties.'
),

-- ── Garfield County ─────────────────────────────────────────────
(
  'WA', 'Garfield', NULL,
  'Garfield County Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Garfield County Fire Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Least populated WA county (~2,200 pop). Pomeroy VFD is primary. Very few commercial kitchens.'
),

-- ── Grant County ────────────────────────────────────────────────
(
  'WA', 'Grant', NULL,
  'Grant County Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Grant County Fire Districts', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'Central WA (~100K pop). Moses Lake Fire Department covers largest city. Grant County Fire Districts cover rural areas. Agricultural region.'
),

-- ── Grays Harbor County ─────────────────────────────────────────
(
  'WA', 'Grays Harbor', NULL,
  'Grays Harbor County Public Health & Social Services',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Aberdeen Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'Coastal county (~75K pop). Aberdeen FD covers city. Grays Harbor County Fire Districts cover rural areas. Quinault Indian Reservation in county. Chehalis Reservation straddles Grays Harbor/Thurston.'
),

-- ── Island County ───────────────────────────────────────────────
(
  'WA', 'Island', NULL,
  'Island County Public Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Central Whidbey Island Fire & Rescue', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'Whidbey Island and Camano Island (~87K pop). Central Whidbey, South Whidbey Fire/EMS, North Whidbey Fire & Rescue. Naval Air Station Whidbey Island (federal fire).'
),

-- ── Jefferson County ────────────────────────────────────────────
(
  'WA', 'Jefferson', NULL,
  'Jefferson County Public Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'East Jefferson Fire Rescue', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 5, 'low',
  'Annual',
  'Olympic Peninsula (~32K pop). East Jefferson Fire Rescue (FPD #1) covers Port Townsend and east county. Quilcene Fire, Brinnon Fire cover rural areas.'
),

-- ── King County ─────────────────────────────────────────────────
(
  'WA', 'King', NULL,
  'Public Health - Seattle & King County',
  'county_health', 'food_safety',
  'point_deduction', 'tiered',
  '{"method": "point_deduction", "tiers": {"blue_excellent": "0-15_deductions", "green_good": "16-35_deductions", "yellow_okay": "36-75_deductions", "red_needs_improvement": "76+_deductions"}}'::jsonb,
  'county', 'WAC 246-215',
  'Seattle Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', true,
  'portal', 1, 'high',
  'Risk-based (1-4x per year)',
  'Most populous WA county (~2.3M pop). Seattle FD is primary AHJ for Seattle. Multiple suburban fire departments and fire districts cover remainder. Public Health - Seattle & King County publishes inspection data online.'
),

-- ── Kitsap County ───────────────────────────────────────────────
(
  'WA', 'Kitsap', NULL,
  'Kitsap Public Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Central Kitsap Fire & Rescue', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'state_portal', 3, 'medium',
  'Risk-based (1-2x per year)',
  'Puget Sound (~275K pop). Central Kitsap Fire & Rescue, Bremerton Fire, South Kitsap Fire & Rescue, North Kitsap Fire & Rescue, Poulsbo Fire. Suquamish Reservation (Port Madison) in county.'
),

-- ── Kittitas County ─────────────────────────────────────────────
(
  'WA', 'Kittitas', NULL,
  'Kittitas County Public Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Kittitas Valley Fire & Rescue', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'Central WA (~48K pop). Kittitas Valley Fire & Rescue covers Ellensburg metro. Central Washington University campus in Ellensburg.'
),

-- ── Klickitat County ────────────────────────────────────────────
(
  'WA', 'Klickitat', NULL,
  'Klickitat County Public Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Klickitat County Fire Protection Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Columbia River Gorge county (~23K pop). Goldendale Fire, White Salmon Fire, Klickitat County FPDs. Yakama Reservation extends into western Klickitat.'
),

-- ── Lewis County ────────────────────────────────────────────────
(
  'WA', 'Lewis', NULL,
  'Lewis County Public Health & Social Services',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Riverside Fire Authority', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'SW Washington (~82K pop). Riverside Fire Authority (Centralia/Chehalis consolidated). Lewis County Fire Districts cover rural areas. Chehalis Reservation straddles Lewis/Grays Harbor/Thurston.'
),

-- ── Lincoln County ──────────────────────────────────────────────
(
  'WA', 'Lincoln', NULL,
  'Lincoln County Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Lincoln County Fire Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Very rural county (~11K pop). Davenport VFD is primary. Multiple small fire protection districts. WA State Fire Marshal oversight for unprotected areas.'
),

-- ── Mason County ────────────────────────────────────────────────
(
  'WA', 'Mason', NULL,
  'Mason County Public Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Mason County Fire Districts', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'South Puget Sound (~67K pop). Mason County Fire Districts, Shelton Fire. Squaxin Island Reservation and Skokomish Reservation in county.'
),

-- ── Okanogan County ─────────────────────────────────────────────
(
  'WA', 'Okanogan', NULL,
  'Okanogan County Public Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Okanogan County Fire Protection Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Largest WA county by area (~5,300 sq mi, ~42K pop). Okanogan County FPDs, Omak Fire, Okanogan Fire. Colville Reservation extends into Okanogan County.'
),

-- ── Pacific County ──────────────────────────────────────────────
(
  'WA', 'Pacific', NULL,
  'Pacific County Health & Human Services',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Pacific County Fire Protection Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'Coastal county (~22K pop). Long Beach Fire, South Bend Fire, Raymond Fire. Shoalwater Bay Reservation in county.'
),

-- ── Pend Oreille County ─────────────────────────────────────────
(
  'WA', 'Pend Oreille', NULL,
  'NE Tri-County Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Pend Oreille County Fire Protection Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Very rural NE county (~14K pop). Newport Fire, Pend Oreille County FPDs. NE Tri-County Health District serves Pend Oreille, Stevens, and Ferry counties. Kalispel Reservation in county.'
),

-- ── Pierce County ───────────────────────────────────────────────
(
  'WA', 'Pierce', NULL,
  'Tacoma-Pierce County Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Tacoma Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'portal', 2, 'high',
  'Risk-based (1-3x per year)',
  '2nd most populous WA county (~920K pop). Tacoma FD covers City of Tacoma. West Pierce Fire & Rescue, East Pierce Fire & Rescue, Central Pierce Fire & Rescue. Puyallup Reservation in county.'
),

-- ── San Juan County ─────────────────────────────────────────────
(
  'WA', 'San Juan', NULL,
  'San Juan County Health & Community Services',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'San Juan Island Fire & Rescue', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 5, 'low',
  'Annual',
  'Island county (~18K pop). San Juan Island Fire & Rescue, Orcas Island Fire & Rescue, Lopez Island Fire & Rescue. Accessible only by ferry or air.'
),

-- ── Skagit County ───────────────────────────────────────────────
(
  'WA', 'Skagit', NULL,
  'Skagit County Public Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Skagit County Fire Districts', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'state_portal', 3, 'medium',
  'Annual to Semi-annual',
  'NW Washington (~130K pop). Mount Vernon Fire, Burlington Fire, Skagit County Fire Districts. Swinomish Reservation and Samish Reservation in county.'
),

-- ── Skamania County ─────────────────────────────────────────────
(
  'WA', 'Skamania', NULL,
  'Skamania County Community Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Skamania County Fire District #1', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Columbia River Gorge county (~12K pop). Skamania County FD #1 covers Stevenson area. Very rural, includes portion of Columbia River Gorge National Scenic Area.'
),

-- ── Snohomish County ────────────────────────────────────────────
(
  'WA', 'Snohomish', NULL,
  'Snohomish Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Everett Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'portal', 2, 'high',
  'Risk-based (1-3x per year)',
  '3rd most populous WA county (~830K pop). Everett FD covers county seat. South County Fire (Lynnwood/Mountlake Terrace), Snohomish County Fire Districts. Tulalip and Stillaguamish reservations in county.'
),

-- ── Spokane County ──────────────────────────────────────────────
(
  'WA', 'Spokane', NULL,
  'Spokane Regional Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Spokane Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'portal', 2, 'high',
  'Risk-based (1-3x per year)',
  '4th most populous WA county (~540K pop). Spokane FD covers City of Spokane. Spokane County Fire Districts #1-#13 cover suburban/rural areas. Spokane Valley Fire covers City of Spokane Valley.'
),

-- ── Stevens County ──────────────────────────────────────────────
(
  'WA', 'Stevens', NULL,
  'NE Tri-County Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Stevens County Fire Protection Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual',
  'NE rural county (~46K pop). Colville Fire, Stevens County FPDs. NE Tri-County Health District serves Stevens, Ferry, and Pend Oreille counties. Spokane Reservation in county.'
),

-- ── Thurston County ─────────────────────────────────────────────
(
  'WA', 'Thurston', NULL,
  'Thurston County Public Health & Social Services',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Olympia Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'state_portal', 2, 'medium',
  'Risk-based (1-2x per year)',
  'State capital county (~295K pop). Olympia FD covers state capital. Lacey Fire District #3, Tumwater Fire, SE Thurston Fire Authority. Nisqually and Chehalis reservations in county.'
),

-- ── Wahkiakum County ────────────────────────────────────────────
(
  'WA', 'Wahkiakum', NULL,
  'Wahkiakum County Health & Human Services',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Wahkiakum County Fire Protection Districts', 'fire_district', '2021 IFC', '2024',
  'quarterly', false,
  'none', 5, 'low',
  'Annual or less',
  'Very small county (~4,500 pop). Cathlamet VFD, Wahkiakum County FPDs. Very few commercial kitchens.'
),

-- ── Walla Walla County ──────────────────────────────────────────
(
  'WA', 'Walla Walla', NULL,
  'Walla Walla County Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Walla Walla Fire Department', 'municipal_fire', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'SE Washington (~62K pop). Walla Walla FD covers city. College Place Fire, Walla Walla County Fire Districts cover rural areas. Wine country with growing food service industry.'
),

-- ── Whatcom County ──────────────────────────────────────────────
(
  'WA', 'Whatcom', NULL,
  'Whatcom County Health Department',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Bellingham Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'state_portal', 3, 'medium',
  'Risk-based (1-2x per year)',
  'NW Washington (~230K pop). Bellingham FD covers city. Whatcom County Fire Districts cover rural areas. Lummi and Nooksack reservations in county. Western Washington University campus.'
),

-- ── Whitman County ──────────────────────────────────────────────
(
  'WA', 'Whitman', NULL,
  'Whitman County Public Health',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Pullman Fire Department', 'municipal_fire', '2021 IFC', '2024',
  'quarterly', false,
  'manual', 4, 'low',
  'Annual to Semi-annual',
  'SE Washington (~50K pop). Pullman FD covers Pullman and Washington State University campus. Colfax Fire covers county seat. Whitman County Fire Districts cover rural areas.'
),

-- ── Yakima County ───────────────────────────────────────────────
(
  'WA', 'Yakima', NULL,
  'Yakima Health District',
  'county_health', 'food_safety',
  'pass_fail', 'pass_fail',
  '{"method": "critical_violation_check"}'::jsonb,
  'county', 'WAC 246-215',
  'Yakima Fire Department', 'mixed', '2021 IFC', '2024',
  'quarterly', false,
  'state_portal', 3, 'medium',
  'Risk-based (1-2x per year)',
  '8th most populous WA county (~255K pop). Yakima FD covers city. West Valley Fire, Selah Fire, Yakima County Fire Districts cover surrounding areas. Yakama Reservation occupies significant portion of county.'
);

END IF;
END $wa_guard$;

-- ── 2. Populate fire_jurisdiction_config JSONB for all 39 WA ──────
-- NFPA 96-2024 Table 12.4 frequencies are universal (national standard).
-- WA uses 2021 IFC with WA amendments (WAC 51-54A).
-- RCW 19.27 governs state building/fire code adoption.
-- WAC 51-54A contains the WA fire code (IFC with amendments).
-- WA equivalent boolean flags: rcw_19_27 = true, wac_51_54a = true.

UPDATE jurisdictions
SET fire_jurisdiction_config = jsonb_build_object(
  'fire_ahj_name', fire_ahj_name,
  'fire_ahj_type', fire_ahj_type,
  'fire_code_edition', '2021 IFC',
  'nfpa_96_edition', '2024',
  'rcw_19_27', true,
  'wac_51_54a', true,
  'state_fire_marshal', 'Washington State Patrol, Fire Protection Bureau',
  'state_code_reference', 'RCW 19.27, WAC 51-54A',
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
WHERE state = 'WA';

-- ── 3. Set ahj_split_notes for multi-AHJ WA jurisdictions ────────

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Seattle Fire Department covers City of Seattle. Bellevue Fire Department covers Bellevue. Kent Fire Department RFA covers Kent/SeaTac/Covington. King County Fire Districts #2 (Burien), #20 (Skyway), #44 (Mountain View). Eastside Fire & Rescue, Shoreline Fire, Woodinville Fire, Redmond Fire, and 20+ additional fire districts cover suburban King County."}'::jsonb
WHERE state = 'WA' AND county = 'King';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Tacoma Fire Department covers City of Tacoma. West Pierce Fire & Rescue covers University Place/Lakewood. East Pierce Fire & Rescue covers Bonney Lake/Buckley/Sumner. Central Pierce Fire & Rescue covers Parkland/Spanaway. Graham Fire & Rescue, Gig Harbor Fire & Medic One."}'::jsonb
WHERE state = 'WA' AND county = 'Pierce';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Everett Fire Department covers county seat. South County Fire covers Lynnwood/Mountlake Terrace/Brier. Snohomish County Fire Districts #1 (Marysville), #4 (Lake Stevens), #7 (Mill Creek). Snohomish Regional Fire & Rescue, Lake Stevens Fire, Arlington Fire."}'::jsonb
WHERE state = 'WA' AND county = 'Snohomish';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Spokane Fire Department covers City of Spokane. Spokane Valley Fire Department covers City of Spokane Valley. Spokane County Fire Districts #1-#13 cover suburban and rural areas."}'::jsonb
WHERE state = 'WA' AND county = 'Spokane';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Vancouver Fire Department covers City of Vancouver. Clark County Fire District #6 (Clark-Cowlitz Fire Rescue) covers Hazel Dell/Salmon Creek. Fire District #3 covers Battle Ground area. Fire District #10 covers eastern Clark County. Fire District #13 covers Yacolt area."}'::jsonb
WHERE state = 'WA' AND county = 'Clark';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Olympia Fire Department covers state capital. Lacey Fire District #3 covers City of Lacey. Tumwater Fire Department covers City of Tumwater. SE Thurston Fire Authority covers Rochester/Tenino area."}'::jsonb
WHERE state = 'WA' AND county = 'Thurston';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Central Kitsap Fire & Rescue covers Silverdale/Central Kitsap. Bremerton Fire Department covers City of Bremerton. South Kitsap Fire & Rescue covers Port Orchard area. North Kitsap Fire & Rescue covers Poulsbo area. Poulsbo Fire Department covers City of Poulsbo."}'::jsonb
WHERE state = 'WA' AND county = 'Kitsap';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Benton County Fire District #1 covers Kennewick metro area. Richland Fire & Emergency Services covers City of Richland. West Richland Fire covers City of West Richland. Benton County Fire Districts cover rural areas."}'::jsonb
WHERE state = 'WA' AND county = 'Benton';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Pasco Fire Department covers City of Pasco. Franklin County Fire District #3 covers Connell and rural Franklin County."}'::jsonb
WHERE state = 'WA' AND county = 'Franklin';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Mount Vernon Fire Department covers county seat. Burlington Fire Department covers City of Burlington. Skagit County Fire Districts cover rural areas. La Conner Fire, Sedro-Woolley Fire."}'::jsonb
WHERE state = 'WA' AND county = 'Skagit';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Bellingham Fire Department covers City of Bellingham. Whatcom County Fire Districts cover rural areas. Lynden Fire, Ferndale Fire, Blaine Fire."}'::jsonb
WHERE state = 'WA' AND county = 'Whatcom';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Yakima Fire Department covers City of Yakima. West Valley Fire District covers West Valley. Selah Fire covers City of Selah. Sunnyside Fire, Grandview Fire, Yakima County Fire Districts cover rural areas."}'::jsonb
WHERE state = 'WA' AND county = 'Yakima';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Cowlitz 2 Fire & Rescue is the largest district. Longview Fire Department covers City of Longview. Kelso Fire Department covers City of Kelso. Castle Rock Fire, Kalama Fire."}'::jsonb
WHERE state = 'WA' AND county = 'Cowlitz';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Moses Lake Fire Department covers City of Moses Lake. Grant County Fire Districts cover rural areas. Ephrata Fire, Quincy Fire, Mattawa Fire."}'::jsonb
WHERE state = 'WA' AND county = 'Grant';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Aberdeen Fire Department covers City of Aberdeen. Hoquiam Fire covers City of Hoquiam. Grays Harbor County Fire Districts cover rural areas. Ocean Shores Fire, Westport Fire."}'::jsonb
WHERE state = 'WA' AND county = 'Grays Harbor';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Riverside Fire Authority (consolidated Centralia/Chehalis FDs) is primary AHJ. Lewis County Fire Districts cover rural areas. Morton Fire, Winlock Fire."}'::jsonb
WHERE state = 'WA' AND county = 'Lewis';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Mason County Fire Districts provide coverage. Shelton Fire (within Mason County FD #4) covers Shelton area. Grapeview Fire, Belfair Fire."}'::jsonb
WHERE state = 'WA' AND county = 'Mason';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Clallam County FD #2 covers Port Angeles area. Sequim Fire covers City of Sequim. Forks Fire covers City of Forks. Clallam County FD #3 covers Sekiu/Clallam Bay."}'::jsonb
WHERE state = 'WA' AND county = 'Clallam';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Central Whidbey Island Fire & Rescue covers Coupeville area. South Whidbey Fire/EMS covers Langley/Freeland. North Whidbey Fire & Rescue covers Oak Harbor area."}'::jsonb
WHERE state = 'WA' AND county = 'Island';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Walla Walla Fire Department covers city. College Place Fire Department covers College Place. Walla Walla County Fire Districts cover rural areas."}'::jsonb
WHERE state = 'WA' AND county = 'Walla Walla';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "San Juan Island Fire & Rescue covers San Juan Island (Friday Harbor). Orcas Island Fire & Rescue covers Orcas Island. Lopez Island Fire & Rescue covers Lopez Island."}'::jsonb
WHERE state = 'WA' AND county = 'San Juan';

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"ahj_split_notes": "Pullman Fire Department covers Pullman and WSU campus. Colfax Fire covers county seat. Whitman County Fire Districts cover rural areas."}'::jsonb
WHERE state = 'WA' AND county = 'Whitman';

-- ── 4. King County (Seattle) local amendments ───────────────────────
-- Seattle has adopted local fire code amendments through Seattle Municipal Code
-- Title 22 (Building Code) and Title 22 Subtitle IV (Fire Code).
-- Seattle Fire Code is the IFC with City of Seattle amendments, which include
-- stricter commercial kitchen hood/ventilation requirements.

UPDATE jurisdictions SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"local_amendments": "Seattle Fire Code (Seattle Municipal Code Title 22 Subtitle IV) adopts IFC with City of Seattle amendments. Seattle Fire Prevention Division conducts commercial kitchen fire inspections with stricter hood system documentation requirements."}'::jsonb,
  has_local_amendments = true,
  local_amendment_notes = 'Seattle Fire Code — IFC with City of Seattle amendments per SMC Title 22 Subtitle IV. Stricter commercial kitchen inspection requirements.'
WHERE state = 'WA' AND county = 'King';

-- ── 5. Verify count ─────────────────────────────────────────────────
-- Expected: 39 WA jurisdictions, all with fire_jurisdiction_config populated.
