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
