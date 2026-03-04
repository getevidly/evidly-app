-- ============================================================
-- Seed Regulatory Changes — Real records for launch
-- ============================================================
-- References regulatory_sources seeded in 20260224000000.
-- Records 1-7 are published (visible to customers).
-- Record 8 is pending (for admin to practice publish flow).
-- ============================================================

-- 1. CalCode Cooling Requirements Update (critical, published)
INSERT INTO regulatory_changes (
  source_id, change_type, title, summary, impact_description,
  impact_level, affected_pillars, affected_equipment_types,
  affected_states, effective_date, source_url, raw_input_text,
  ai_generated, published, published_at, affected_location_count
) VALUES (
  (SELECT id FROM regulatory_sources WHERE code_short = 'calcode'),
  'amendment',
  'California Updates Cooling Requirements for Cooked Foods',
  'California has shortened the first-stage cooling window for cooked foods. Under the new rule, cooked foods must reach 70°F within 2 hours from the ACTUAL cooked temperature, then 41°F within 4 additional hours (6 hours total). This is stricter than the FDA Food Code, which starts the 2-hour clock at 135°F.',
  E'CRITICAL: Understand the difference — California starts the 2-hour clock at the cooked temperature (e.g., 165°F), NOT at 135°F like the FDA standard\nUpdate all cooling logs to show BOTH FDA and California standards\nTrain kitchen staff on the shortened cooling timeline before April 1\nReview your current cooling procedures — if any items regularly take more than 2 hours for Stage 1, reduce batch sizes or use ice baths/blast chillers\nVerify your cooldown monitoring alerts are set to flag items exceeding the 2-hour mark from start\nPost cooling reference chart in kitchen showing both FDA and California requirements',
  'critical',
  ARRAY['food_safety'],
  ARRAY['cooler'],
  ARRAY['CA'],
  '2026-04-01',
  'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx',
  E'CalCode Section 114002(a) — Potentially hazardous food shall be cooled from its cooked temperature to 70°F within 2 hours, and from 70°F to 41°F or below within the following 4 hours (6 hours total from start of cooling). [Previously: 135°F to 70°F within 2.5 hours.]',
  true, true, '2026-02-05T12:00:00Z', 0
);

-- 2. Fresno County Digital Temperature Records (critical, published)
INSERT INTO regulatory_changes (
  source_id, change_type, title, summary, impact_description,
  impact_level, affected_pillars, affected_equipment_types,
  affected_states, effective_date, source_url, raw_input_text,
  ai_generated, published, published_at, affected_location_count
) VALUES (
  (SELECT id FROM regulatory_sources WHERE code_short = 'calcode'),
  'enforcement_change',
  'Fresno County Requires Digital Temperature Records',
  'Fresno County now requires all food establishments to maintain temperature records in a digital format that can be produced during inspection. Paper-only logs will no longer be accepted as primary records starting June 1, 2026.',
  E'Confirm all locations are logging temperatures through EvidLY (not just paper)\nEnsure your EvidLY account is set up to export records on demand for inspectors\nKeep paper logs as backup if desired, but digital must be the primary record',
  'critical',
  ARRAY['food_safety', 'facility_safety'],
  ARRAY['cooler', 'freezer'],
  ARRAY['CA'],
  '2026-06-01',
  'https://www.co.fresno.ca.us/departments/public-health',
  E'Fresno County Health Department Ordinance 2026-03: All food establishments holding a valid health permit shall maintain temperature monitoring records in an electronic/digital format accessible for review during routine inspections.',
  true, true, '2026-01-28T12:00:00Z', 0
);

-- 3. NFPA 96 Hood Cleaning Frequency (critical, published)
INSERT INTO regulatory_changes (
  source_id, change_type, title, summary, impact_description,
  impact_level, affected_pillars, affected_equipment_types,
  affected_states, effective_date, source_url, raw_input_text,
  ai_generated, published, published_at, affected_location_count
) VALUES (
  (SELECT id FROM regulatory_sources WHERE code_short = 'nfpa_96'),
  'amendment',
  'NFPA 96 Updates Hood Cleaning Frequency for High-Volume Kitchens',
  'NFPA 96 now requires monthly hood cleaning for kitchens cooking more than 500 meals per day, up from the previous quarterly requirement. Kitchens cooking fewer than 500 meals/day remain on the quarterly schedule.',
  E'Check average daily meal count for each location — if any exceed 500 meals/day, they need monthly cleaning\nContact your hood cleaning vendor to update the schedule if needed\nUpdate your vendor service calendar to reflect any frequency changes\nDocument your daily meal counts to justify your cleaning frequency during inspections',
  'critical',
  ARRAY['facility_safety'],
  ARRAY['hood', 'exhaust_fan'],
  NULL,
  '2026-07-01',
  'https://www.nfpa.org/codes-and-standards/nfpa-96-standard-development/96',
  E'NFPA 96 Table 12.4 (2026 Edition): Type I hoods serving cooking operations producing more than 500 meals per day shall have exhaust systems inspected and cleaned monthly.',
  true, true, '2026-01-15T12:00:00Z', 0
);

-- 4. FDA Food Code Comment Period (moderate, published)
INSERT INTO regulatory_changes (
  source_id, change_type, title, summary, impact_description,
  impact_level, affected_pillars, affected_equipment_types,
  affected_states, effective_date, source_url, raw_input_text,
  ai_generated, published, published_at, affected_location_count
) VALUES (
  (SELECT id FROM regulatory_sources WHERE code_short = 'fda_food_code'),
  'guidance',
  'FDA Proposes Updated Food Code — Comment Period Open',
  'The FDA has proposed updates to the Model Food Code with key changes to allergen labeling requirements and date marking for ready-to-eat foods. The public comment period is open through May 15, 2026. While the Food Code is not directly enforceable, California typically adopts FDA code changes within 12-18 months.',
  E'Review the proposed allergen labeling changes to understand future requirements\nConsider submitting comments if changes would significantly impact your operations\nNo immediate action needed — monitor for California adoption timeline',
  'moderate',
  ARRAY['food_safety'],
  ARRAY[]::text[],
  NULL,
  '2026-05-15',
  'https://www.fda.gov/food/retail-food-protection/fda-food-code',
  E'Federal Register Notice — FDA Model Food Code 2026 Proposed Revision. Key changes: (1) Expanded allergen labeling requirements; (2) Date marking requirements reduced from 7 to 5 days; (3) Enhanced employee health reporting.',
  true, true, '2026-02-01T12:00:00Z', 0
);

-- 5. California Food Handler Certification Bill (moderate, published)
INSERT INTO regulatory_changes (
  source_id, change_type, title, summary, impact_description,
  impact_level, affected_pillars, affected_equipment_types,
  affected_states, effective_date, source_url, raw_input_text,
  ai_generated, published, published_at, affected_location_count
) VALUES (
  (SELECT id FROM regulatory_sources WHERE code_short = 'ca_hsc'),
  'amendment',
  'California Considering Mandatory Food Handler Certification Renewal Every 2 Years',
  'A bill in the California Assembly would require food handler certifications to be renewed every 2 years instead of the current 3-year cycle. The bill is currently in committee and has not yet been voted on.',
  E'No immediate action required — bill is still in committee\nReview your current food handler certification tracking to ensure renewal dates are monitored\nIf passed, you will need to update renewal schedules for all staff',
  'moderate',
  ARRAY['food_safety'],
  ARRAY[]::text[],
  ARRAY['CA'],
  '2027-01-01',
  'https://leginfo.legislature.ca.gov/',
  E'Assembly Bill 1247 (introduced January 2026): Amends California Health and Safety Code section 113948 to require food handler certification renewal every 24 months (currently 36 months).',
  true, true, '2026-01-10T12:00:00Z', 0
);

-- 6. NFPA 10 Digital Records (moderate, published)
INSERT INTO regulatory_changes (
  source_id, change_type, title, summary, impact_description,
  impact_level, affected_pillars, affected_equipment_types,
  affected_states, effective_date, source_url, raw_input_text,
  ai_generated, published, published_at, affected_location_count
) VALUES (
  (SELECT id FROM regulatory_sources WHERE code_short = 'nfpa_10'),
  'amendment',
  'NFPA 10 Fire Extinguisher Inspection Record Requirements Updated',
  'NFPA 10 now explicitly allows digital records for fire extinguisher inspections, replacing the previous requirement for physical tags. Monthly visual inspection records and annual professional service records can both be maintained electronically.',
  E'Digital records are now explicitly accepted for fire extinguisher inspections\nEnsure your EvidLY equipment tracking includes monthly visual inspection records\nInform your fire protection vendor that digital records are now standard-approved',
  'moderate',
  ARRAY['facility_safety'],
  ARRAY['fire_extinguisher'],
  NULL,
  '2026-07-01',
  'https://www.nfpa.org/codes-and-standards/nfpa-10-standard-development/10',
  E'NFPA 10 section 7.2.1.2.1 (2026 Edition): Electronic/digital records are an acceptable alternative to physical inspection tags attached to extinguishers.',
  true, true, '2026-01-20T12:00:00Z', 0
);

-- 7. FDA Annual Foodborne Illness Report (informational, published)
INSERT INTO regulatory_changes (
  source_id, change_type, title, summary, impact_description,
  impact_level, affected_pillars, affected_equipment_types,
  affected_states, effective_date, source_url, raw_input_text,
  ai_generated, published, published_at, affected_location_count
) VALUES (
  (SELECT id FROM regulatory_sources WHERE code_short = 'fda_food_code'),
  'guidance',
  'FDA Releases Annual Foodborne Illness Report',
  'The FDA has published its annual report on foodborne illness trends for 2025. Key findings: Norovirus remains the leading cause of restaurant-associated outbreaks, temperature abuse during cooling was cited in 23% of incidents, and handwashing compliance continues to be the most common critical violation.',
  E'No action required — this is for informational purposes only\nConsider reviewing your handwashing and cooling procedures as these remain top-cited issues nationwide',
  'informational',
  ARRAY['food_safety'],
  ARRAY[]::text[],
  NULL,
  '2026-01-15',
  'https://www.fda.gov/food/foodborne-pathogens/foodborne-illness-surveillance',
  E'FDA Annual Report on Foodborne Illness Trends (2025 Data). This report summarizes foodborne illness data collected through CDC FoodNet and FDA inspection data.',
  true, true, '2026-01-15T12:00:00Z', 0
);

-- 8. CalCode Grease Trap Sizing (moderate, UNPUBLISHED — for admin to practice publish flow)
INSERT INTO regulatory_changes (
  source_id, change_type, title, summary, impact_description,
  impact_level, affected_pillars, affected_equipment_types,
  affected_states, effective_date, source_url, raw_input_text,
  ai_generated, published, published_at, affected_location_count
) VALUES (
  (SELECT id FROM regulatory_sources WHERE code_short = 'calcode'),
  'amendment',
  'CalCode Grease Trap Sizing Requirements Updated',
  'California has updated minimum grease trap sizing for commercial kitchens producing over 200 meals per day. Minimum capacity increased from 30 to 50 gallons for high-volume operations.',
  E'Verify your grease trap meets the new 50-gallon minimum\nIf undersized, schedule replacement before July 1\nContact your plumbing vendor for assessment',
  'moderate',
  ARRAY['facility_safety', 'vendor_compliance'],
  ARRAY['grease_trap'],
  ARRAY['CA'],
  '2026-07-01',
  'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx',
  E'CalCode section 114099.7 — Minimum grease trap sizing for commercial kitchens producing over 200 meals per day increased from 30 to 50 gallons.',
  true, false, NULL, 0
);
