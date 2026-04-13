-- ================================================================
-- FIRE-FIX-02: CA Tribal Fire Configs + Fresno Scoring + Sacramento AHJ
--
-- FIX 1: Add fire_jurisdiction_config JSONB to 7 CA tribal jurisdictions
--   Currently have food safety (TEHO) only — zero fire configs.
--   Tribal casinos operate 24-hour kitchens → NFPA 96 Table 12.4
--   Type I heavy-volume = monthly hood cleaning.
--
--   Fire AHJ assignments (researched per tribe):
--     Table Mountain Rancheria → CAL FIRE / Fresno County Fire (cal_fire_contract)
--     Tachi-Yokut Tribe        → Kings County Fire Department (county_fire)
--     Santa Ynez Chumash       → Chumash Fire Department (tribal_fire)
--     Morongo Band             → Morongo Fire Department (tribal_fire)
--     Agua Caliente Band       → Palm Springs FD / Cathedral City FD (mixed)
--     Pechanga Band            → Pechanga Fire Department (tribal_fire)
--     San Manuel Band          → San Manuel Fire Department (tribal_fire)
--
-- FIX 2: Fresno County grading_config — correct from letter grade A/B/C
--   (WRONG) to violation_report_only (CORRECT per Grand Jury 2023-24)
--
-- FIX 3: Sacramento County fire_ahj_name — correct from
--   "Sacramento Fire Department" to "Sacramento Metropolitan Fire District /
--   Sacramento City Fire Department" with fire_ahj_type = 'mixed'
-- ================================================================

-- ── FIX 1: Tribal fire_jurisdiction_config ────────────────────────

-- 1a. Table Mountain Rancheria (Fresno County) → CAL FIRE / Fresno County Fire
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "CAL FIRE / Fresno County Fire Protection District",
  "fire_ahj_type": "cal_fire_contract",
  "fire_code_edition": "2025 CFC",
  "nfpa_96_edition": "2024",
  "title_19_ccr": true,
  "state_fire_marshal": "Office of the State Fire Marshal (OSFM), CAL FIRE",
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
  "ahj_split_notes": "Tribal land — CAL FIRE / Fresno County Fire Protection District serves as fire AHJ. Table Mountain Rancheria does not operate its own fire department.",
  "federal_overlay": null,
  "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
}'::jsonb
WHERE tribal_entity_name = 'Table Mountain Rancheria'
  AND governmental_level = 'tribal'
  AND state = 'CA';

-- 1b. Tachi-Yokut Tribe (Kings County) → Kings County Fire Department
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Kings County Fire Department",
  "fire_ahj_type": "county_fire",
  "fire_code_edition": "2025 CFC",
  "nfpa_96_edition": "2024",
  "title_19_ccr": true,
  "state_fire_marshal": "Office of the State Fire Marshal (OSFM), CAL FIRE",
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
  "ahj_split_notes": "Tribal land — Kings County Fire Department serves as fire AHJ for Tachi Palace Casino Resort area.",
  "federal_overlay": null,
  "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
}'::jsonb
WHERE tribal_entity_name = 'Tachi-Yokut Tribe'
  AND governmental_level = 'tribal'
  AND state = 'CA';

-- 1c. Santa Ynez Band of Chumash (Santa Barbara County) → Chumash Fire Department
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Chumash Fire Department",
  "fire_ahj_type": "tribal_fire",
  "fire_code_edition": "2025 CFC",
  "nfpa_96_edition": "2024",
  "title_19_ccr": true,
  "state_fire_marshal": "Office of the State Fire Marshal (OSFM), CAL FIRE",
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
  "ahj_split_notes": "Tribal-operated fire department. Chumash Fire Department provides fire protection and prevention services on Santa Ynez Reservation and Chumash Casino Resort.",
  "federal_overlay": null,
  "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
}'::jsonb
WHERE tribal_entity_name = 'Santa Ynez Band of Chumash'
  AND governmental_level = 'tribal'
  AND state = 'CA';

-- 1d. Morongo Band of Mission Indians (Riverside County) → Morongo Fire Department
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Morongo Fire Department",
  "fire_ahj_type": "tribal_fire",
  "fire_code_edition": "2025 CFC",
  "nfpa_96_edition": "2024",
  "title_19_ccr": true,
  "state_fire_marshal": "Office of the State Fire Marshal (OSFM), CAL FIRE",
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
  "ahj_split_notes": "Tribal-operated fire department. Morongo Fire Department provides fire protection for Morongo Reservation including Morongo Casino Resort & Spa.",
  "federal_overlay": null,
  "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
}'::jsonb
WHERE tribal_entity_name = 'Morongo Band of Mission Indians'
  AND governmental_level = 'tribal'
  AND state = 'CA';

-- 1e. Agua Caliente Band of Cahuilla Indians (Riverside County) → Palm Springs FD / Cathedral City FD
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Palm Springs Fire Department / Cathedral City Fire Department",
  "fire_ahj_type": "mixed",
  "fire_code_edition": "2025 CFC",
  "nfpa_96_edition": "2024",
  "title_19_ccr": true,
  "state_fire_marshal": "Office of the State Fire Marshal (OSFM), CAL FIRE",
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
  "ahj_split_notes": "Agua Caliente reservation spans Palm Springs and Cathedral City. Agua Caliente Casino (Rancho Mirage) under Palm Springs FD. Spa Resort Casino (downtown Palm Springs) under Palm Springs FD. Verify property address for correct AHJ.",
  "federal_overlay": null,
  "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
}'::jsonb
WHERE tribal_entity_name = 'Agua Caliente Band of Cahuilla Indians'
  AND governmental_level = 'tribal'
  AND state = 'CA';

-- 1f. Pechanga Band of Luiseno Indians (Riverside County) → Pechanga Fire Department
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "Pechanga Fire Department",
  "fire_ahj_type": "tribal_fire",
  "fire_code_edition": "2025 CFC",
  "nfpa_96_edition": "2024",
  "title_19_ccr": true,
  "state_fire_marshal": "Office of the State Fire Marshal (OSFM), CAL FIRE",
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
  "ahj_split_notes": "Tribal-operated fire department. Pechanga Fire Department provides fire protection for Pechanga Reservation including Pechanga Resort Casino.",
  "federal_overlay": null,
  "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
}'::jsonb
WHERE tribal_entity_name = 'Pechanga Band of Luiseno Indians'
  AND governmental_level = 'tribal'
  AND state = 'CA';

-- 1g. San Manuel Band of Mission Indians (San Bernardino County) → San Manuel Fire Department
UPDATE jurisdictions
SET fire_jurisdiction_config = '{
  "fire_ahj_name": "San Manuel Fire Department",
  "fire_ahj_type": "tribal_fire",
  "fire_code_edition": "2025 CFC",
  "nfpa_96_edition": "2024",
  "title_19_ccr": true,
  "state_fire_marshal": "Office of the State Fire Marshal (OSFM), CAL FIRE",
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
  "ahj_split_notes": "Tribal-operated fire department. San Manuel Fire Department provides fire protection for San Manuel Reservation including Yaamava Resort & Casino.",
  "federal_overlay": null,
  "tribal_fire_notes": "Casino 24-hour kitchen operations — Type I heavy-volume per NFPA 96 Table 12.4 = monthly hood cleaning."
}'::jsonb
WHERE tribal_entity_name = 'San Manuel Band of Mission Indians'
  AND governmental_level = 'tribal'
  AND state = 'CA';

-- Also update the fire_ahj_name column on the jurisdictions table for tribal rows
UPDATE jurisdictions
SET fire_ahj_name = fire_jurisdiction_config->>'fire_ahj_name'
WHERE governmental_level = 'tribal'
  AND state = 'CA'
  AND fire_jurisdiction_config IS NOT NULL
  AND fire_jurisdiction_config->>'fire_ahj_name' IS NOT NULL;

-- ── FIX 2: Fresno County grading_config ───────────────────────────
-- CORRECT: Fresno uses violation report (pass/fail + major/minor).
-- NO letter grades. Verified per Grand Jury 2023-24 report and
-- Fresno County DEH inspection portal.

UPDATE jurisdictions
SET
  grading_config = '{
    "letter_grade": false,
    "numeric_score": false,
    "method": "violation_report_only",
    "violation_categories": ["major", "minor"],
    "outcome": "pass_fail_reinspect",
    "report_public": true,
    "source": "Fresno County DEH — Grand Jury 2023-24 verified"
  }'::jsonb,
  scoring_type = 'violation_report',
  grading_type = 'violation_report_only',
  notes = 'VERIFIED (Grand Jury 2023-24). Fresno County DEH uses pass/fail with major/minor violations. NO letter grade system. NO numeric score.'
WHERE county = 'Fresno'
  AND city IS NULL
  AND state = 'CA'
  AND governmental_level = 'county';

-- ── FIX 3: Sacramento County fire AHJ ─────────────────────────────
-- CORRECT: Sacramento has TWO fire AHJs — Metro Fire (unincorporated)
-- and City Fire (city limits). Type = 'mixed'.

UPDATE jurisdictions
SET fire_jurisdiction_config = jsonb_set(
  jsonb_set(
    fire_jurisdiction_config,
    '{fire_ahj_name}',
    '"Sacramento Metropolitan Fire District / Sacramento City Fire Department"'::jsonb
  ),
  '{fire_ahj_type}',
  '"mixed"'::jsonb
)
WHERE county = 'Sacramento'
  AND city IS NULL
  AND state = 'CA'
  AND fire_jurisdiction_config IS NOT NULL;

-- Also update the top-level fire_ahj_name and fire_ahj_type columns
UPDATE jurisdictions
SET
  fire_ahj_name = 'Sacramento Metropolitan Fire District / Sacramento City Fire Department',
  fire_ahj_type = 'mixed'
WHERE county = 'Sacramento'
  AND city IS NULL
  AND state = 'CA';
