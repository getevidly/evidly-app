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
