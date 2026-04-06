-- ================================================================
-- AZ-FIRE-01: Arizona Fire Jurisdiction Configs + Tribal Casino Jurisdictions
--
-- PART 1: Populate fire_jurisdiction_config JSONB for all 15 AZ counties
--   Arizona fire AHJ is a patchwork — no single county fire department.
--   State Fire Marshal: AZ Dept of Forestry and Fire Management (DFFM)
--   Statewide fire code: IFC 2018 (ARS 37-1307)
--   Major cities (Phoenix, Tucson, Mesa, Yuma, Lake Havasu, Prescott)
--   have locally adopted IFC 2021 or IFC 2024.
--
-- PART 2: Insert 9 AZ tribal casino jurisdictions
--   Food safety: advisory mode (TEHO, tribal sovereignty)
--   Fire safety: tribal fire departments (7 of 9 have own FD)
--   NIGC overlay: true (all casino properties)
--   Hood cleaning: monthly (24-hour high-volume operations)
--
-- NFPA 96-2024 is the current national standard for all jurisdictions.
-- PSE safeguards: hood_cleaning, fire_suppression_system, sprinklers,
--   fire_alarm_monitoring (per FIRE-FIX-01 correction).
-- ================================================================

-- ════════════════════════════════════════════════════════════════
-- PART 1: Fire jurisdiction configs for 15 AZ county rows
-- ════════════════════════════════════════════════════════════════

-- ── 1. Maricopa County — Most complex AHJ patchwork in AZ ──────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Phoenix FD, Mesa FD, Scottsdale FD, Glendale FD, Chandler FD, AFMA (unincorporated)",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": true,
  "local_fire_code_notes": "Phoenix, Mesa, Glendale locally adopted IFC 2024. Scottsdale, Chandler on IFC 2021. AFMA (unincorporated) on IFC 2018. Fire code edition depends on which city/district the kitchen is physically located in.",
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "No single county fire department. Fire protection provided by 20+ municipal fire departments and fire districts. Phoenix FD is the largest AHJ. Arizona Fire & Medical Authority (AFMA) covers unincorporated areas including Sun City, Sun City West, Sun Lakes. Each incorporated city adopts its own fire code independently. Commercial kitchen inspections conducted by the city FD where the kitchen is located.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Maricopa' AND governmental_level IN ('county', 'city');

-- ── 2. Pima County — Tucson FD dominant, mostly converged on IFC 2024 ──
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Tucson FD, Northwest Fire District, Golder Ranch FD",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": true,
  "local_fire_code_notes": "Tucson FD, Northwest Fire District, Golder Ranch FD, Corona de Tucson FD have locally adopted IFC 2024. Rural Metro (private, subscription) areas default to IFC 2018.",
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "No single county fire department. Tucson FD is the largest AHJ covering City of Tucson. Northwest Fire District covers Marana, Oro Valley, and unincorporated northwest Pima County. Golder Ranch FD and Corona de Tucson FD cover other unincorporated areas. Rural Metro Fire (private) provides subscription fire service in some unincorporated pockets.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Pima' AND governmental_level IN ('county', 'city');

-- ── 3. Pinal County — Highly fragmented, many gaps ─────────────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Casa Grande FD, Superstition Fire & Medical District, AZ State Fire Marshal (unincorporated)",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Highly fragmented with 44+ fire departments/districts. Casa Grande FD is the largest municipal AHJ (IFC 2018 with local amendments). Superstition Fire & Medical District covers Apache Junction area. Many unincorporated areas have no locally adopted fire code — AZ State Fire Marshal (DFFM) has jurisdiction for commercial construction.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Pinal' AND governmental_level IN ('county', 'city');

-- ── 4. Yavapai County — Prescott (IFC 2024) + CAFMA (IFC 2018) ─
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Prescott FD, Central Arizona Fire & Medical Authority (CAFMA)",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": true,
  "local_fire_code_notes": "Prescott has locally adopted IFC 2024. CAFMA (Prescott Valley, Chino Valley, Dewey-Humboldt, unincorporated — 369 sq mi, ~100,000 residents) on IFC 2018 with local amendments.",
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Prescott FD covers City of Prescott (IFC 2024). Central Arizona Fire & Medical Authority (CAFMA) covers Prescott Valley, Chino Valley, Dewey-Humboldt, and surrounding unincorporated areas (IFC 2018). Multiple smaller fire districts for rural areas. State Fire Marshal has jurisdiction where no local fire code adopted.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Yavapai' AND governmental_level IN ('county', 'city');

-- ── 5. Coconino County — Flagstaff FD dominant, IFC 2018 ────────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Flagstaff FD, Summit Fire & Medical District",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Flagstaff FD is the primary AHJ for the county main commercial area (IFC 2018). Summit Fire & Medical District covers Doney Park, Fort Valley. Highlands Fire District covers Kachina Village, Mountainaire. Wildland-Urban Interface (WUI) code requirements in many areas may affect commercial kitchen exhaust routing. State Fire Marshal for unincorporated areas without local code. Significant tribal land (Navajo Nation, Hopi) is sovereign jurisdiction.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Coconino' AND governmental_level IN ('county', 'city');

-- ── 6. Mohave County — 3 city FDs, Lake Havasu on IFC 2024 ──────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Kingman FD, Lake Havasu City FD, Bullhead City FD",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": true,
  "local_fire_code_notes": "Lake Havasu City adopted IFC 2024 (Oct 2025, Ordinance 25-1371). Kingman FD and Bullhead City FD on IFC 2018 with local amendments.",
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Three main city fire departments: Kingman FD, Lake Havasu City FD, Bullhead City FD. Northern Arizona Consolidated Fire District #1 and other fire districts serve unincorporated areas. State Fire Marshal for areas without local code. Fort Mojave Indian Tribe reservation covers part of the county — sovereign jurisdiction.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Mohave' AND governmental_level IN ('county', 'city');

-- ── 7. Yuma County — City of Yuma on IFC 2024 ──────────────────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "City of Yuma Fire Department",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": true,
  "local_fire_code_notes": "City of Yuma has locally adopted IFC 2024 (Chapter 131). Unincorporated areas default to state IFC 2018.",
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "City of Yuma FD (IFC 2024) is the primary AHJ for the county main commercial area. Rural Metro Fire provides suppression/EMS for some unincorporated areas but State Fire Marshal handles commercial code enforcement outside city limits.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Yuma' AND governmental_level IN ('county', 'city');

-- ── 8. Cochise County — Sierra Vista dominant ───────────────────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Sierra Vista Fire & Medical Services, Fry Fire District",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Sierra Vista Fire & Medical Services is the primary AHJ for the county largest city (IFC 2018 with local amendments). Fry Fire District covers unincorporated areas around Sierra Vista/Huachuca City and actively conducts commercial plan review. State Fire Marshal for remote/rural areas.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Cochise' AND governmental_level IN ('county', 'city');

-- ── 9. Navajo County — Timber Mesa + large tribal areas ─────────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Timber Mesa Fire & Medical District, AZ State Fire Marshal",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Timber Mesa Fire & Medical District (Show Low, Pinetop-Lakeside, IFC 2018) is the primary AHJ for non-tribal commercial areas. Much of the county is tribal land (Navajo Nation, Hopi Reservation) — sovereign jurisdiction, not subject to state fire code. State Fire Marshal for non-tribal unincorporated areas.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Navajo' AND governmental_level IN ('county', 'city');

-- ── 10. Apache County — Majority tribal land, State FM for rest ─
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Arizona State Fire Marshal (DFFM)",
  "fire_ahj_type": "state_fire_marshal",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Majority tribal land (Navajo Nation, White Mountain Apache). Non-tribal commercial areas extremely limited (Springerville, Eagar, St. Johns). State Fire Marshal is effectively the AHJ for non-tribal commercial construction. Tribal lands under sovereign tribal fire authority.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Apache' AND governmental_level IN ('county', 'city');

-- ── 11. Graham County — Safford FD + State FM ───────────────────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Safford FD, AZ State Fire Marshal (unincorporated)",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "City of Safford FD covers the county seat and primary commercial area. State Fire Marshal handles unincorporated areas without local fire code. Small rural county with limited fire code enforcement infrastructure.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Graham' AND governmental_level IN ('county', 'city');

-- ── 12. Gila County — Globe (IFC 2021) + Payson (IFC 2018) ─────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Globe FD, Payson FD",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": true,
  "local_fire_code_notes": "Globe adopted IFC 2021 (effective Jan 1, 2025). Payson on IFC 2018 with local amendments (deleted IFC Section 108, modified open burning regulations).",
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Split geography — Globe FD (IFC 2021) in the south, Payson FD (IFC 2018) in the north. Two distinct commercial centers separated by significant distance. Houston Mesa Fire Department covers unincorporated Payson area. State Fire Marshal for other unincorporated areas.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Gila' AND governmental_level IN ('county', 'city');

-- ── 13. Santa Cruz County — Nogales dominant, border county ─────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Multiple — Nogales FD, AZ State Fire Marshal (unincorporated)",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Nogales FD covers the county seat and primary commercial area. State Fire Marshal handles unincorporated areas. Small border county with limited commercial kitchen activity outside Nogales.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Santa Cruz' AND governmental_level IN ('county', 'city');

-- ── 14. Greenlee County — Smallest AZ county, State FM ──────────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Arizona State Fire Marshal (DFFM)",
  "fire_ahj_type": "state_fire_marshal",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Arizona smallest county by population (~9,500). No evidence of locally adopted fire code. Clifton and Morenci have volunteer fire departments for suppression but no formal fire prevention/inspection divisions. State Fire Marshal is effectively the AHJ for all commercial construction. Mining-dominated economy.",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'Greenlee' AND governmental_level IN ('county', 'city');

-- ── 15. La Paz County — Very rural, State FM ────────────────────
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Arizona State Fire Marshal (DFFM)",
  "fire_ahj_type": "state_fire_marshal",
  "fire_code_edition": "2018 IFC",
  "nfpa_96_edition": "2024",
  "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
  "has_local_fire_code_adoption": false,
  "nfpa_96_table_12_4": {
    "type_i_heavy_volume": "monthly",
    "type_i_moderate_volume": "quarterly",
    "type_i_low_volume": "semi_annual",
    "type_ii": "annual",
    "solid_fuel_cooking": "monthly",
    "source": "NFPA 96-2024 Table 12.4"
  },
  "hood_suppression": {
    "system_type": "UL-300 wet chemical",
    "inspection_interval": "semi_annual",
    "standard": "NFPA 96 / UL-300"
  },
  "ansul_system": {
    "required": true,
    "inspection_interval": "semi_annual",
    "standard": "NFPA 17A"
  },
  "fire_extinguisher": {
    "types": ["K-class", "ABC"],
    "inspection_interval": "annual",
    "hydrostatic_test": "6-year K-class / 12-year ABC"
  },
  "fire_alarm": {
    "required": true,
    "monitoring_type": "central_station",
    "inspection_interval": "annual"
  },
  "sprinkler_system": {
    "required": true,
    "inspection_interval": "annual",
    "type": "wet"
  },
  "grease_trap": {
    "required": true,
    "cleaning_interval": "90_days",
    "interceptor_type": "gravity"
  },
  "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
  "ahj_split_notes": "Very rural county. Parker and Quartzsite have volunteer/small fire districts for suppression but no locally adopted fire code. State Fire Marshal is the effective AHJ for commercial plan review and inspections. Colorado River Indian Tribes (CRIT) reservation covers part of the county — sovereign jurisdiction. Seasonal population surges (winter visitors/snowbirds in Quartzsite).",
  "federal_overlay": null
}'::jsonb
WHERE state = 'AZ' AND county = 'La Paz' AND governmental_level IN ('county', 'city');


-- ════════════════════════════════════════════════════════════════
-- PART 2: Insert 9 AZ tribal casino jurisdictions
-- ════════════════════════════════════════════════════════════════

INSERT INTO jurisdictions (
  state, county, agency_name, agency_type, jurisdiction_type,
  governmental_level, scoring_type, grading_type, grading_config,
  tribal_entity_name, tribal_food_authority, tribal_fire_authority,
  food_code_basis, sovereignty_type, nigc_overlay,
  fire_ahj_name, hood_cleaning_default,
  fire_jurisdiction_config,
  is_active, notes
) VALUES

-- 1. Gila River Indian Community — Wild Horse Pass, Lone Butte, Vee Quiva
(
  'AZ', 'Maricopa',
  'Gila River Indian Community TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Gila River Indian Community', 'TEHO', 'Gila River Fire Department',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Gila River Fire Department', 'monthly',
  '{
    "fire_ahj_name": "Gila River Fire Department",
    "fire_ahj_type": "tribal_fire",
    "fire_code_edition": "IFC with GRIC amendments (Title 21)",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "Tribal-operated fire department. Gila River Fire Department (4 stations) provides fire protection for the entire reservation including Wild Horse Pass, Lone Butte, and Vee Quiva casinos. GRIC adopted the IFC with community amendments as tribal law (Title 21).",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Gila River FD is tribal fire AHJ. 3 casinos: Wild Horse Pass, Lone Butte, Vee Quiva.'
),

-- 2. Salt River Pima-Maricopa Indian Community — Talking Stick, Casino Arizona
(
  'AZ', 'Maricopa',
  'Salt River Pima-Maricopa Indian Community TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Salt River Pima-Maricopa Indian Community', 'TEHO', 'Salt River Fire Department',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Salt River Fire Department', 'monthly',
  '{
    "fire_ahj_name": "Salt River Fire Department",
    "fire_ahj_type": "tribal_fire",
    "fire_code_edition": "IFC with SRPMIC amendments (2024)",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "Tribal-operated fire department. Salt River Fire Department (4 stations, 92 sq mi) provides all-hazards fire protection including prevention, inspections, and code enforcement. SRPMIC formally adopted the IFC with 2024 community amendments as tribal ordinance.",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Salt River FD is tribal fire AHJ. 2 casinos: Talking Stick Resort, Casino Arizona.'
),

-- 3. Fort McDowell Yavapai Nation — We-Ko-Pa Casino
(
  'AZ', 'Maricopa',
  'Fort McDowell Yavapai Nation TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Fort McDowell Yavapai Nation', 'TEHO', 'Fort McDowell Yavapai Nation Fire Department',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Fort McDowell Yavapai Nation Fire Department', 'monthly',
  '{
    "fire_ahj_name": "Fort McDowell Yavapai Nation Fire Department",
    "fire_ahj_type": "tribal_fire",
    "fire_code_edition": "IFC (tribal adoption)",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "Tribal-operated fire department. Fort McDowell Yavapai Nation FD (1 station, 40 sq mi, est. 2000) provides fire protection for the reservation including We-Ko-Pa Casino Resort.",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Fort McDowell FD is tribal fire AHJ. Casino: We-Ko-Pa Casino Resort.'
),

-- 4. Tohono O''odham Nation — Desert Diamond casinos
(
  'AZ', 'Pima',
  'Tohono O''odham Nation TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Tohono O''odham Nation', 'TEHO', 'Tohono O''odham Nation Fire Department',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Tohono O''odham Nation Fire Department', 'monthly',
  '{
    "fire_ahj_name": "Tohono O''odham Nation Fire Department",
    "fire_ahj_type": "tribal_fire",
    "fire_code_edition": "IFC (tribal adoption)",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "Tribal-operated fire department. Tohono O''odham Nation FD provides fire protection for the reservation (~2.8 million acres) including Desert Diamond Casino locations. San Xavier substation built to improve response to casino properties near Tucson.",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Tohono O''odham Nation FD is tribal fire AHJ. Casinos: Desert Diamond (multiple locations), Golden Ha:san.'
),

-- 5. Ak-Chin Indian Community — Harrah''s Ak-Chin
(
  'AZ', 'Pinal',
  'Ak-Chin Indian Community TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Ak-Chin Indian Community', 'TEHO', 'Ak-Chin Indian Community Fire Department',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Ak-Chin Indian Community Fire Department', 'monthly',
  '{
    "fire_ahj_name": "Ak-Chin Indian Community Fire Department",
    "fire_ahj_type": "tribal_fire",
    "fire_code_edition": "IFC (tribal adoption)",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "Tribal-operated fire department. Ak-Chin FD (30 full-time firefighters, new 18,340 sq ft station purpose-built for casino/resort fire protection) covers the 34 sq mi reservation including Harrah''s Ak-Chin Casino Resort.",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Ak-Chin FD is tribal fire AHJ. Casino: Harrah''s Ak-Chin Casino Resort.'
),

-- 6. Pascua Yaqui Tribe — Casino del Sol, Casino of the Sun
(
  'AZ', 'Pima',
  'Pascua Yaqui Tribe TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Pascua Yaqui Tribe', 'TEHO', 'Pascua Pueblo Fire Department',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Pascua Pueblo Fire Department', 'monthly',
  '{
    "fire_ahj_name": "Pascua Pueblo Fire Department",
    "fire_ahj_type": "tribal_fire",
    "fire_code_edition": "UFC (tribal adoption)",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "Tribal-operated fire department. Pascua Pueblo Fire Department provides fire protection, EMS, and Uniform Fire Code enforcement for the reservation including Casino del Sol and Casino of the Sun. Funded through casino gaming revenue.",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning. Note: Tribe enforces UFC (Uniform Fire Code), not IFC."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Pascua Pueblo FD is tribal fire AHJ (enforces UFC). Casinos: Casino del Sol, Casino of the Sun.'
),

-- 7. Yavapai-Prescott Indian Tribe — Bucky''s Casino, Yavapai Casino
(
  'AZ', 'Yavapai',
  'Yavapai-Prescott Indian Tribe TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Yavapai-Prescott Indian Tribe', 'TEHO', 'Central Arizona Fire & Medical Authority (CAFMA)',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Central Arizona Fire & Medical Authority (CAFMA)', 'monthly',
  '{
    "fire_ahj_name": "Central Arizona Fire & Medical Authority (CAFMA)",
    "fire_ahj_type": "mixed",
    "fire_code_edition": "2018 IFC",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "No tribal fire department. Yavapai-Prescott Indian Tribe contracts with Central Arizona Fire & Medical Authority (CAFMA) for fire protection. Fire code follows CAFMA adopted IFC 2018 with local amendments. Tribe retains sovereign authority to set additional standards.",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Fire via CAFMA contract (no tribal FD). Casinos: Bucky''s Casino, Yavapai Casino.'
),

-- 8. Fort Mojave Indian Tribe — Spirit Mountain Casino
(
  'AZ', 'Mohave',
  'Fort Mojave Indian Tribe TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Fort Mojave Indian Tribe', 'TEHO', 'Fort Mojave Mesa Fire District',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Fort Mojave Mesa Fire District', 'monthly',
  '{
    "fire_ahj_name": "Fort Mojave Mesa Fire District",
    "fire_ahj_type": "mixed",
    "fire_code_edition": "2018 IFC",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "No dedicated tribal fire department. Fort Mojave Mesa Fire District (ISO Class 3, 2-station career department) provides fire protection for the reservation area including Spirit Mountain Casino. Reservation spans AZ/CA/NV. Tribe retains sovereign authority.",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Fire via Fort Mojave Mesa Fire District (no tribal FD). Casino: Spirit Mountain Casino. Reservation spans AZ/CA/NV.'
),

-- 9. Navajo Nation — Twin Arrows Navajo Casino Resort (AZ)
(
  'AZ', 'Coconino',
  'Navajo Nation TEHO',
  'tribal_teho', 'food_safety',
  'tribal', 'advisory', 'advisory',
  '{"nigc": {"gaming_floor_food": true, "banquet_operations": true, "employee_dining": true}, "advisory_note": "Food safety under tribal sovereignty — TEHO authority"}'::jsonb,
  'Navajo Nation', 'TEHO', 'Navajo Nation Department of Fire & Rescue Services',
  'FDA Food Code 2022 (advisory)', 'federally_recognized', true,
  'Navajo Nation Department of Fire & Rescue Services', 'monthly',
  '{
    "fire_ahj_name": "Navajo Nation Department of Fire & Rescue Services",
    "fire_ahj_type": "tribal_fire",
    "fire_code_edition": "AZ Gaming Compact fire safety standards",
    "nfpa_96_edition": "2024",
    "state_fire_marshal": "Arizona Department of Forestry and Fire Management (DFFM)",
    "nfpa_96_table_12_4": {
      "type_i_heavy_volume": "monthly",
      "type_i_moderate_volume": "quarterly",
      "type_i_low_volume": "semi_annual",
      "type_ii": "annual",
      "solid_fuel_cooking": "monthly",
      "source": "NFPA 96-2024 Table 12.4"
    },
    "hood_suppression": {
      "system_type": "UL-300 wet chemical",
      "inspection_interval": "semi_annual",
      "standard": "NFPA 96 / UL-300"
    },
    "ansul_system": {
      "required": true,
      "inspection_interval": "semi_annual",
      "standard": "NFPA 17A"
    },
    "fire_extinguisher": {
      "types": ["K-class", "ABC"],
      "inspection_interval": "annual",
      "hydrostatic_test": "6-year K-class / 12-year ABC"
    },
    "fire_alarm": {
      "required": true,
      "monitoring_type": "central_station",
      "inspection_interval": "annual"
    },
    "sprinkler_system": {
      "required": true,
      "inspection_interval": "annual",
      "type": "wet"
    },
    "grease_trap": {
      "required": true,
      "cleaning_interval": "90_days",
      "interceptor_type": "gravity"
    },
    "pse_safeguards": ["hood_cleaning", "fire_suppression_system", "sprinklers", "fire_alarm_monitoring"],
    "ahj_split_notes": "Tribal-operated fire department. Navajo Nation Fire & Rescue Services covers 27,000+ sq mi across AZ/NM/UT. Dedicated Station 81 at Twin Arrows Casino Resort (purpose-built $4.5M substation per AZ Gaming Compact requirement). Largest reservation in the US.",
    "federal_overlay": null,
    "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning. AZ Gaming Compact requires fire protection/EMS at gaming facilities."
  }'::jsonb,
  true, 'Tribal casino food safety — advisory mode. Navajo Nation Fire & Rescue is tribal fire AHJ. AZ casino: Twin Arrows Navajo Casino Resort (Coconino County). Other casinos in NM.'
);
