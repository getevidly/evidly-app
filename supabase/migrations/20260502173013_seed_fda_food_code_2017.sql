-- 20260502173013_seed_fda_food_code_2017.sql
--
-- Seed FDA Food Code 2017 (9th edition) framework reference data.
-- Sprint commit 3c-1a. Tier 2 (regulatory copy, factual accuracy at stake).
--
-- Scope:
--   1 framework (FDA 2017)
--   5 risk factors (CDC 5, FDA Annex 7 ordering)
--   3 process categories (Process 1/2/3)
--   7 process CCPs (Process Approach Annex 4)
--   9 specialized process types (§3-502.11 + HSP marker)
--   1 allergen list (FALCPA Big 8) + 8 allergens
--   15 risk factor evidence definitions (drives vw_inspector_evidence in 3f)
--
-- All values cite FDA Food Code 2017 directly. Sesame deliberately
-- excluded from Big 8 (sesame added by FASTER Act 2021, integrated into
-- FDA 2022; state wrappers in 3c-2 add sesame where state law incorporates it).

BEGIN;

-- ============================================================================
-- 1. Regulatory framework
-- ============================================================================
INSERT INTO public.regulatory_frameworks
  (code, name, region_scope, version, effective_date, parent_framework_id, notes)
VALUES
  ('FDA_FOOD_CODE_2017',
   'FDA Food Code 2017',
   'national',
   '9th edition',
   '2017-02-13',
   NULL,
   'Federal model code published by U.S. FDA. Adopted with modification by state and local regulatory agencies. Independent codes such as California Retail Food Code do not adopt this framework.');

-- ============================================================================
-- 2. Risk factors (FDA Annex 7 — 5 CDC-identified contributing factors)
-- ============================================================================
INSERT INTO public.risk_factors (framework_id, code, name, description, sort_order)
SELECT
  (SELECT id FROM public.regulatory_frameworks WHERE code = 'FDA_FOOD_CODE_2017'),
  v.code, v.name, v.description, v.sort_order
FROM (VALUES
  ('RF1', 'Food from Unsafe Sources',
   'Food received from approved sources that comply with applicable laws. Includes licensed wholesalers, shellstock tag retention, Grade A milk standards, and exclusion of food prepared in unapproved kitchens.',
   1),
  ('RF2', 'Inadequate Cooking',
   'TCS food cooked to required internal temperatures and times sufficient to destroy pathogens. Includes proper cooking, cooling, and reheating.',
   2),
  ('RF3', 'Improper Holding Temperatures',
   'Time and temperature control of TCS food during cold holding (at or below 41°F) and hot holding (at or above 135°F). Includes use of time as a public health control where authorized.',
   3),
  ('RF4', 'Contaminated Equipment',
   'Prevention of cross-contamination through equipment cleaning, sanitization, raw and ready-to-eat food separation, and food contact surface protection.',
   4),
  ('RF5', 'Poor Personal Hygiene',
   'Employee health policy and exclusion of ill workers, handwashing, no bare-hand contact with ready-to-eat food, Person-in-Charge oversight, and Certified Food Protection Manager presence.',
   5)
) AS v(code, name, description, sort_order);

-- ============================================================================
-- 3. Process categories (FDA Annex 4 — Process Approach)
-- ============================================================================
INSERT INTO public.process_categories (framework_id, code, name, description, sort_order)
SELECT
  (SELECT id FROM public.regulatory_frameworks WHERE code = 'FDA_FOOD_CODE_2017'),
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
-- 4. Process CCPs (per FDA Annex 4 Process Approach critical control points)
-- ============================================================================
INSERT INTO public.process_ccps
  (process_category_id, ccp_code, ccp_name, critical_limit_definition, monitoring_procedure, corrective_action, sort_order)
SELECT
  (SELECT id FROM public.process_categories WHERE code = v.process_code AND framework_id =
    (SELECT id FROM public.regulatory_frameworks WHERE code = 'FDA_FOOD_CODE_2017')),
  v.ccp_code, v.ccp_name, v.critical_limit_definition, v.monitoring_procedure, v.corrective_action, v.sort_order
FROM (VALUES
  ('PROC_1', 'COLD_HOLD', 'Cold Holding',
   'TCS food maintained at 41°F (5°C) or below.',
   'Probe-thermometer temperature checks at start of service and every 4 hours during operation; ambient air temperature checks of refrigeration units.',
   'Move food to working refrigeration; discard if held above 41°F for more than 4 hours cumulative.',
   1),
  ('PROC_2', 'COOKING', 'Cooking',
   'Poultry: 165°F (74°C) instantaneous. Ground meat, ground seafood, shell eggs for hot holding, stuffed meat/seafood/poultry/pasta: 155°F (68°C) for 17 seconds. Whole cuts of beef, pork, lamb, veal, fish, shellfish, eggs for immediate service: 145°F (63°C) for 15 seconds. Plant foods for hot holding: 135°F (57°C).',
   'Internal temperature measured with calibrated probe thermometer at thickest part, away from bone.',
   'Continue cooking until critical limit met; discard if held in temperature danger zone above the time threshold.',
   1),
  ('PROC_2', 'HOT_HOLD', 'Hot Holding',
   'TCS food maintained at 135°F (57°C) or above. Whole roasts: 130°F (54°C) or above.',
   'Probe-thermometer temperature checks every 4 hours during service; verification of hot holding equipment operating temperature.',
   'Reheat to 165°F (74°C) for 15 seconds within 2 hours, or discard.',
   2),
  ('PROC_3', 'COOKING', 'Cooking',
   'Same as Process 2 cooking critical limits. Poultry 165°F instantaneous; ground meat/eggs hot held/stuffed 155°F for 17 sec; whole cuts/seafood/eggs immediate service 145°F for 15 sec; plant foods hot held 135°F.',
   'Internal temperature measured with calibrated probe thermometer at thickest part, away from bone.',
   'Continue cooking until critical limit met; discard if held in temperature danger zone above the time threshold.',
   1),
  ('PROC_3', 'COOLING', 'Cooling',
   'TCS food cooled from 135°F (57°C) to 70°F (21°C) within 2 hours, then from 70°F to 41°F (5°C) or below within an additional 4 hours. Total time from 135°F to 41°F shall not exceed 6 hours.',
   'Probe-thermometer temperature checks at 30-minute intervals during cooling; recorded on cooling log with start and end times.',
   'If 70°F not reached within 2 hours, immediately reheat to 165°F for 15 seconds and restart cooling, or discard. If 41°F not reached within 6 hours total, discard.',
   2),
  ('PROC_3', 'REHEAT', 'Reheating for Hot Holding',
   'TCS food reheated to 165°F (74°C) for 15 seconds within 2 hours, measured at the thickest part.',
   'Internal temperature measured with calibrated probe thermometer at thickest part.',
   'Continue reheating until 165°F is reached; if not achieved within 2 hours, discard.',
   3),
  ('PROC_3', 'HOT_HOLD', 'Hot Holding',
   'TCS food maintained at 135°F (57°C) or above. Whole roasts: 130°F (54°C) or above.',
   'Probe-thermometer temperature checks every 4 hours during service; verification of hot holding equipment operating temperature.',
   'Reheat to 165°F (74°C) for 15 seconds within 2 hours, or discard.',
   4)
) AS v(process_code, ccp_code, ccp_name, critical_limit_definition, monitoring_procedure, corrective_action, sort_order);

-- ============================================================================
-- 5. Specialized process types (FDA §3-502.11 + HSP marker)
-- ============================================================================
INSERT INTO public.specialized_process_types
  (framework_id, code, name, description, requires_written_plan, sort_order)
SELECT
  (SELECT id FROM public.regulatory_frameworks WHERE code = 'FDA_FOOD_CODE_2017'),
  v.code, v.name, v.description, v.requires_written_plan, v.sort_order
FROM (VALUES
  ('SMOKE_PRESERVATION', 'Smoking Food as Method of Preservation',
   'Smoking food as preservation, distinct from smoking for flavor enhancement. Requires variance and HACCP plan per §3-502.11(A).',
   true, 1),
  ('CURING', 'Curing Food',
   'Curing food using salt, nitrates, nitrites, and curing accelerants. Examples: ham, sausages, jerky. Requires variance and HACCP plan per §3-502.11(B).',
   true, 2),
  ('ACIDIFICATION', 'Acidification',
   'Using food additives or vinegar as a preservative method to render food non-TCS. Examples: acidified sushi rice, pickling. Requires variance and HACCP plan per §3-502.11(C).',
   true, 3),
  ('ROP', 'Reduced Oxygen Packaging',
   'Reducing oxygen in packaging. Includes sous vide, cook-chill, vacuum packaging, and modified/controlled atmosphere. May proceed under HACCP plan without variance under §3-502.12 conditions; otherwise requires variance per §3-502.11(D).',
   true, 4),
  ('MOLLUSCAN_DISPLAY', 'Molluscan Shellfish Life-Support Display Tank',
   'Operating a molluscan shellfish life-support system display tank used to store or display shellfish. Requires variance and HACCP plan per §3-502.11(E).',
   true, 5),
  ('CUSTOM_PROCESSING', 'Custom Processing of Animals for Personal Use',
   'Custom processing animals for personal use as food, not for sale or service. Requires variance and HACCP plan per §3-502.11(F).',
   true, 6),
  ('SPROUTING', 'Sprouting Seeds or Beans',
   'Sprouting seeds or beans for food. Requires variance and HACCP plan per §3-502.11(H).',
   true, 7),
  ('HSP_JUICE', 'Unpackaged Juice for Highly Susceptible Population',
   'Preparing unpackaged juice on premises for service to a highly susceptible population. Requires HACCP plan per §3-202.11(B) and §8-201.13.',
   true, 8),
  ('HSP_FACILITY', 'Highly Susceptible Population Facility',
   'Facility serving a highly susceptible population: hospitals, nursing homes, assisted living facilities, K-12 schools, child care, and similar. Triggers additional safeguards under §3-801.11 (no raw eggs except in cooked dishes, no raw or undercooked animal foods, etc.).',
   false, 9)
) AS v(code, name, description, requires_written_plan, sort_order);

-- ============================================================================
-- 6. Allergen list — FALCPA Big 8 (FDA 2017 strict; sesame added in FDA 2022)
-- ============================================================================
INSERT INTO public.allergen_lists
  (framework_id, code, name, description, effective_date)
VALUES (
  (SELECT id FROM public.regulatory_frameworks WHERE code = 'FDA_FOOD_CODE_2017'),
  'FALCPA_BIG_8',
  'FDA Major Food Allergens (FALCPA Big 8)',
  'The 8 major food allergens identified under the Food Allergen Labeling and Consumer Protection Act of 2004 (FALCPA). Sesame was added as the 9th major allergen by the FASTER Act of 2021, effective January 1, 2023, and is integrated into FDA Food Code 2022; state wrappers may add sesame where state law has incorporated FASTER Act provisions.',
  '2006-01-01'
);

-- ============================================================================
-- 7. Allergens (Big 8)
-- ============================================================================
INSERT INTO public.allergens (allergen_list_id, code, name, description, sort_order)
SELECT
  (SELECT id FROM public.allergen_lists WHERE code = 'FALCPA_BIG_8' AND framework_id =
    (SELECT id FROM public.regulatory_frameworks WHERE code = 'FDA_FOOD_CODE_2017')),
  v.code, v.name, v.description, v.sort_order
FROM (VALUES
  ('MILK',      'Milk',      'Cow''s milk and dairy products derived from it.',                       1),
  ('EGGS',      'Eggs',      'Eggs from chickens and other birds.',                                   2),
  ('FISH',      'Fish',      'Finfish (e.g., bass, flounder, cod). Specific species must be declared.', 3),
  ('SHELLFISH', 'Crustacean Shellfish', 'Crustaceans (e.g., crab, lobster, shrimp). Mollusks not covered under FALCPA.', 4),
  ('TREE_NUTS', 'Tree Nuts', 'Almonds, cashews, walnuts, pecans, pistachios, hazelnuts, Brazil nuts, macadamia nuts, and other tree nuts.', 5),
  ('PEANUTS',   'Peanuts',   'Peanuts (legumes, technically not tree nuts).',                         6),
  ('WHEAT',     'Wheat',     'Wheat-derived ingredients including flour, gluten, and starch.',        7),
  ('SOYBEANS',  'Soybeans',  'Soy and soy-derived ingredients including soy sauce, tofu, and edamame.', 8)
) AS v(code, name, description, sort_order);

-- ============================================================================
-- 8. Risk factor evidence definitions (drives vw_inspector_evidence in 3f)
-- ============================================================================
INSERT INTO public.risk_factor_evidence_definitions
  (risk_factor_id, evidence_type, evidence_descriptor, sort_order)
SELECT
  (SELECT id FROM public.risk_factors WHERE code = v.rf_code AND framework_id =
    (SELECT id FROM public.regulatory_frameworks WHERE code = 'FDA_FOOD_CODE_2017')),
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
  ('RF5', 'training_record',  'Food handler and Certified Food Protection Manager certifications', 1),
  ('RF5', 'document',         'Employee health policy and illness reporting log',         2),
  ('RF5', 'checklist_item',   'Handwashing facility checks and observations',             3)
) AS v(rf_code, evidence_type, evidence_descriptor, sort_order);

COMMIT;
