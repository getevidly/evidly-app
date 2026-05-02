-- 20260502175621_seed_calcode.sql
--
-- Seed California Retail Food Code (CalCode) framework.
-- Sprint commit 3c-2a. Tier 2 (regulatory copy, factual accuracy at stake).
--
-- CalCode is the operative law for retail food facilities in California.
-- Codified at California Health and Safety Code Division 104, Part 7,
-- Sections 113700-114437. California is the only US state that has not
-- adopted any FDA Food Code edition; CalCode is independently codified,
-- modeled on FDA Food Code but maintained as state law by CDPH.
--
-- parent_framework_id = NULL because CalCode does not formally adopt or
-- reference any specific FDA edition.
--
-- Active jurisdictions: 62 California counties and independent cities
-- (58 counties + Berkeley, Long Beach, Pasadena, Vernon).
--
-- Specialized processes per HSC §114419(a) and (b). Allergen list per
-- federal FALCPA + FASTER Act 2021 (sesame as 9th major allergen,
-- effective Jan 1, 2023). Critical limits aligned with current science.

BEGIN;

-- ============================================================================
-- 1. Regulatory framework
-- ============================================================================
INSERT INTO public.regulatory_frameworks
  (code, name, region_scope, version, effective_date, parent_framework_id, notes)
VALUES
  ('CALCODE',
   'California Retail Food Code (CalCode)',
   'sub_national',
   'HSC Division 104 Part 7',
   '2007-07-01',
   NULL,
   'Operative state law for retail food facilities in California. Codified at California Health and Safety Code §§113700–114437. Independently maintained by California Department of Public Health (CDPH); does not adopt any FDA Food Code edition by reference. Most recent comprehensive update: January 1, 2025. Specialized processing methods governed by HSC §114419. Allergen labeling references federal FALCPA (21 U.S.C. §321(qq)) including FASTER Act 2021 sesame addition effective January 1, 2023.');

-- ============================================================================
-- 2. Risk factors (5 CDC factors, FDA Annex 7 ordering)
-- ============================================================================
INSERT INTO public.risk_factors (framework_id, code, name, description, sort_order)
SELECT
  (SELECT id FROM public.regulatory_frameworks WHERE code = 'CALCODE'),
  v.code, v.name, v.description, v.sort_order
FROM (VALUES
  ('RF1', 'Food from Unsafe Sources',
   'Food received from approved sources that comply with applicable laws. Includes licensed wholesalers, shellstock tag retention, Grade A milk standards, and exclusion of food prepared in unapproved kitchens. Per HSC §114021 and §114039.',
   1),
  ('RF2', 'Inadequate Cooking',
   'Time/temperature control for safety food cooked to required internal temperatures and times sufficient to destroy pathogens. Includes proper cooking, cooling, and reheating. Per HSC §114004 and §114008.',
   2),
  ('RF3', 'Improper Holding Temperatures',
   'Time and temperature control of TCS food during cold holding (at or below 41°F) and hot holding (at or above 135°F). Per HSC §113996 and §114002.',
   3),
  ('RF4', 'Contaminated Equipment',
   'Prevention of cross-contamination through equipment cleaning, sanitization, raw and ready-to-eat food separation, and food contact surface protection. Per HSC §114095 and §114099.',
   4),
  ('RF5', 'Poor Personal Hygiene',
   'Employee health policy and exclusion of ill workers, handwashing, no bare-hand contact with ready-to-eat food, Person-in-Charge oversight, and Food Handler / Food Safety Manager certification. Per HSC §113949 and §113973.',
   5)
) AS v(code, name, description, sort_order);

-- ============================================================================
-- 3. Process categories (Process Approach)
-- ============================================================================
INSERT INTO public.process_categories (framework_id, code, name, description, sort_order)
SELECT
  (SELECT id FROM public.regulatory_frameworks WHERE code = 'CALCODE'),
  v.code, v.name, v.description, v.sort_order
FROM (VALUES
  ('PROC_1', 'Process 1: No Cook',
   'Receive, store, prepare, hold, serve. No cook step. Examples: salads, sandwiches with deli meat, sushi using previously cooked or never-heated ingredients.',
   1),
  ('PROC_2', 'Process 2: Same Day Service',
   'Receive, store, prepare, cook, hold, serve — within the same day. Cook step is the primary kill step. Examples: hamburgers, grilled chicken, eggs to order.',
   2),
  ('PROC_3', 'Process 3: Complex Food Preparation',
   'Receive, store, prepare, cook, cool, reheat, hot hold, serve — across multiple temperature zones over multiple days. Examples: soups, stews, sauces, large roasts prepared ahead.',
   3)
) AS v(code, name, description, sort_order);

-- ============================================================================
-- 4. Process CCPs (CalCode aligned with current FDA critical limits)
-- ============================================================================
INSERT INTO public.process_ccps
  (process_category_id, ccp_code, ccp_name, critical_limit_definition, monitoring_procedure, corrective_action, sort_order)
SELECT
  (SELECT id FROM public.process_categories WHERE code = v.process_code AND framework_id =
    (SELECT id FROM public.regulatory_frameworks WHERE code = 'CALCODE')),
  v.ccp_code, v.ccp_name, v.critical_limit_definition, v.monitoring_procedure, v.corrective_action, v.sort_order
FROM (VALUES
  ('PROC_1', 'COLD_HOLD', 'Cold Holding',
   'TCS food maintained at 41°F (5°C) or below. Per HSC §113996.',
   'Probe-thermometer temperature checks at start of service and every 4 hours during operation; ambient air temperature checks of refrigeration units.',
   'Move food to working refrigeration; discard if held above 41°F for more than 4 hours cumulative.',
   1),
  ('PROC_2', 'COOKING', 'Cooking',
   'Poultry: 165°F (74°C) instantaneous. Ground meat, ground seafood, shell eggs for hot holding, stuffed meat/seafood/poultry/pasta: 155°F (68°C) for 17 seconds. Whole cuts of beef, pork, lamb, veal, fish, shellfish, eggs for immediate service: 145°F (63°C) for 15 seconds. Plant foods for hot holding: 135°F (57°C). Per HSC §114004.',
   'Internal temperature measured with calibrated probe thermometer at thickest part, away from bone.',
   'Continue cooking until critical limit met; discard if held in temperature danger zone above the time threshold.',
   1),
  ('PROC_2', 'HOT_HOLD', 'Hot Holding',
   'TCS food maintained at 135°F (57°C) or above. Whole roasts: 130°F (54°C) or above. Per HSC §114002.',
   'Probe-thermometer temperature checks every 4 hours during service; verification of hot holding equipment operating temperature.',
   'Reheat to 165°F (74°C) for 15 seconds within 2 hours, or discard.',
   2),
  ('PROC_3', 'COOKING', 'Cooking',
   'Same as Process 2 cooking critical limits. Poultry 165°F instantaneous; ground meat/eggs hot held/stuffed 155°F for 17 sec; whole cuts/seafood/eggs immediate service 145°F for 15 sec; plant foods hot held 135°F. Per HSC §114004.',
   'Internal temperature measured with calibrated probe thermometer at thickest part, away from bone.',
   'Continue cooking until critical limit met; discard if held in temperature danger zone above the time threshold.',
   1),
  ('PROC_3', 'COOLING', 'Cooling',
   'TCS food cooled from 135°F (57°C) to 70°F (21°C) within 2 hours, then from 70°F to 41°F (5°C) or below within an additional 4 hours. Total time from 135°F to 41°F shall not exceed 6 hours. Per HSC §114002.1.',
   'Probe-thermometer temperature checks at 30-minute intervals during cooling; recorded on cooling log with start and end times.',
   'If 70°F not reached within 2 hours, immediately reheat to 165°F for 15 seconds and restart cooling, or discard. If 41°F not reached within 6 hours total, discard.',
   2),
  ('PROC_3', 'REHEAT', 'Reheating for Hot Holding',
   'TCS food reheated to 165°F (74°C) for 15 seconds within 2 hours, measured at the thickest part. Per HSC §114014.',
   'Internal temperature measured with calibrated probe thermometer at thickest part.',
   'Continue reheating until 165°F is reached; if not achieved within 2 hours, discard.',
   3),
  ('PROC_3', 'HOT_HOLD', 'Hot Holding',
   'TCS food maintained at 135°F (57°C) or above. Whole roasts: 130°F (54°C) or above. Per HSC §114002.',
   'Probe-thermometer temperature checks every 4 hours during service; verification of hot holding equipment operating temperature.',
   'Reheat to 165°F (74°C) for 15 seconds within 2 hours, or discard.',
   4)
) AS v(process_code, ccp_code, ccp_name, critical_limit_definition, monitoring_procedure, corrective_action, sort_order);

-- ============================================================================
-- 5. Specialized process types (HSC §114419 + Article 8 HSP facility)
-- ============================================================================
INSERT INTO public.specialized_process_types
  (framework_id, code, name, description, requires_written_plan, sort_order)
SELECT
  (SELECT id FROM public.regulatory_frameworks WHERE code = 'CALCODE'),
  v.code, v.name, v.description, v.requires_written_plan, v.sort_order
FROM (VALUES
  ('SMOKE_PRESERVATION', 'Smoking Food as Method of Preservation',
   'Smoking food as preservation, distinct from smoking for flavor enhancement. Requires HACCP plan per HSC §114419(a)(1).',
   true, 1),
  ('CURING', 'Curing Food',
   'Curing food using salt, nitrates, nitrites, and curing accelerants. Examples: ham, sausages, jerky. Requires HACCP plan per HSC §114419(a)(2).',
   true, 2),
  ('ACIDIFICATION', 'Acidification',
   'Using food additives or vinegar as a preservative method to render food non-TCS, or acidification/water activity to prevent C. botulinum growth. Examples: acidified sushi rice, pickling, canning. HACCP plan required per HSC §114419(a)(3); CDPH approval required for C. botulinum control per HSC §114419(b)(1).',
   true, 3),
  ('ROP', 'Reduced Oxygen Packaging',
   'Reducing oxygen in packaging. Includes sous vide, cook-chill, vacuum packaging, and modified/controlled atmosphere. Requires HACCP plan and CDPH approval per HSC §114419(b)(2). CalCode does not include the FDA §3-502.12 variance-free exception.',
   true, 4),
  ('MOLLUSCAN_DISPLAY', 'Molluscan Shellfish Life-Support Display Tank',
   'Operating a molluscan shellfish life-support system display tank used to store or display shellfish. Requires HACCP plan per HSC §114419(a)(4).',
   true, 5),
  ('CUSTOM_PROCESSING', 'Custom Processing of Animals for Personal Use',
   'Custom processing animals for personal use as food, not for sale or service. Requires HACCP plan per HSC §114419(a)(5).',
   true, 6),
  ('HSP_FACILITY', 'Highly Susceptible Population Facility',
   'Child day care facilities, community care facilities, residential care facilities for the elderly, and similar facilities serving highly susceptible populations. Triggers additional safeguards per CalCode Article 8 (HSC §114435–§114437) and federal FDA Food Code §3-801.11 references.',
   false, 7)
) AS v(code, name, description, requires_written_plan, sort_order);

-- ============================================================================
-- 6. Allergen list — Big 9 per FALCPA + FASTER Act
-- ============================================================================
INSERT INTO public.allergen_lists
  (framework_id, code, name, description, effective_date)
VALUES (
  (SELECT id FROM public.regulatory_frameworks WHERE code = 'CALCODE'),
  'FALCPA_FASTER_BIG_9',
  'Major Food Allergens (FALCPA + FASTER Act, Big 9)',
  'The 9 major food allergens recognized under federal FALCPA (8 allergens, 2004) plus sesame added by FASTER Act of 2021, effective January 1, 2023. CalCode incorporates federal allergen labeling requirements via Health and Safety Code references to 21 U.S.C. §321(qq).',
  '2023-01-01'
);

-- ============================================================================
-- 7. Allergens (Big 9)
-- ============================================================================
INSERT INTO public.allergens (allergen_list_id, code, name, description, sort_order)
SELECT
  (SELECT id FROM public.allergen_lists WHERE code = 'FALCPA_FASTER_BIG_9' AND framework_id =
    (SELECT id FROM public.regulatory_frameworks WHERE code = 'CALCODE')),
  v.code, v.name, v.description, v.sort_order
FROM (VALUES
  ('MILK',      'Milk',      'Cow''s milk and dairy products derived from it.',                       1),
  ('EGGS',      'Eggs',      'Eggs from chickens and other birds.',                                   2),
  ('FISH',      'Fish',      'Finfish (e.g., bass, flounder, cod). Specific species must be declared.', 3),
  ('SHELLFISH', 'Crustacean Shellfish', 'Crustaceans (e.g., crab, lobster, shrimp). Mollusks not covered under FALCPA.', 4),
  ('TREE_NUTS', 'Tree Nuts', 'Almonds, cashews, walnuts, pecans, pistachios, hazelnuts, Brazil nuts, macadamia nuts, and other tree nuts.', 5),
  ('PEANUTS',   'Peanuts',   'Peanuts (legumes, technically not tree nuts).',                         6),
  ('WHEAT',     'Wheat',     'Wheat-derived ingredients including flour, gluten, and starch.',        7),
  ('SOYBEANS',  'Soybeans',  'Soy and soy-derived ingredients including soy sauce, tofu, and edamame.', 8),
  ('SESAME',    'Sesame',    'Sesame seeds and sesame-derived ingredients including tahini and sesame oil. Added as 9th major allergen by FASTER Act 2021, effective January 1, 2023.', 9)
) AS v(code, name, description, sort_order);

-- ============================================================================
-- 8. Risk factor evidence definitions (drives vw_inspector_evidence in 3f)
-- ============================================================================
INSERT INTO public.risk_factor_evidence_definitions
  (risk_factor_id, evidence_type, evidence_descriptor, sort_order)
SELECT
  (SELECT id FROM public.risk_factors WHERE code = v.rf_code AND framework_id =
    (SELECT id FROM public.regulatory_frameworks WHERE code = 'CALCODE')),
  v.evidence_type, v.evidence_descriptor, v.sort_order
FROM (VALUES
  -- RF1: Food from Unsafe Sources
  ('RF1', 'document',         'Approved supplier list and supplier verification records', 1),
  ('RF1', 'temperature_log',  'Receiving temperature logs for TCS food',                  2),
  ('RF1', 'document',         'Shellstock tags and shellfish certification records',      3),
  -- RF2: Inadequate Cooking
  ('RF2', 'temperature_log',  'Cooking, cooling, and reheating temperature logs',         1),
  ('RF2', 'equipment',        'Calibrated probe thermometers at cook stations',           2),
  ('RF2', 'checklist_item',   'Cook temperature verification at point of service',        3),
  -- RF3: Improper Holding Temperatures
  ('RF3', 'temperature_log',  'Cold holding temperature logs (refrigeration units)',      1),
  ('RF3', 'temperature_log',  'Hot holding temperature logs (steam tables, warmers)',     2),
  ('RF3', 'equipment',        'Calibrated cold and hot holding equipment',                3),
  -- RF4: Contaminated Equipment
  ('RF4', 'checklist_item',   'Sanitizer concentration checks (chemical and heat)',       1),
  ('RF4', 'checklist_item',   'Cleaning schedule completion records',                     2),
  ('RF4', 'checklist_item',   'Raw and ready-to-eat food separation verification',        3),
  -- RF5: Poor Personal Hygiene
  ('RF5', 'training_record',  'Food Handler Card and Food Safety Manager Certification',  1),
  ('RF5', 'document',         'Employee health policy and illness reporting log',         2),
  ('RF5', 'checklist_item',   'Handwashing facility checks and observations',             3)
) AS v(rf_code, evidence_type, evidence_descriptor, sort_order);

COMMIT;
