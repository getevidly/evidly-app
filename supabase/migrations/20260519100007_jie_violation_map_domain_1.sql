-- =====================================================================
-- JIE Build — Migration 07: calcode_violation_map Domain 1 inserts
-- =====================================================================
-- Inserts CalCode sections covering Domain 1 (Management & Personnel +
-- Handwashing) that are not yet in the map.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM master_checklist_definitions WHERE code = 'shift_open_health_screen') THEN
    RAISE EXCEPTION 'Master checklist definitions missing — run Migration 06 first';
  END IF;
END $$;

INSERT INTO calcode_violation_map (
  calcode_section, calcode_title, description,
  severity_default, point_deduction_default,
  evidly_module, evidly_pillar,
  cdc_risk_factor, cdc_risk_category, category,
  evidly_checklist_item
) VALUES

('113947', 'Food safety knowledge (PIC and employees)',
 'All food employees must have adequate knowledge of and training in food safety appropriate to their duties. PIC ensures food employees and conditional employees are trained, including major food allergens.',
 'minor', 2, 'checklists', 'food_safety', true, 'RF5', 'Management & Personnel',
 NULL),

('113947.1', 'Certified Food Protection Manager (CFPM) required',
 'Each food facility must have an owner or employee who has passed an approved CFPM exam. Certificate valid 5 years. New facilities or CFPM departures have 60 days to comply. ANSI-accredited only.',
 'minor', 2, 'documents', 'food_safety', false, NULL, 'Management & Personnel',
 NULL),

('113948', 'Certified Food Handler (CFH) card required (CA-only)',
 'Food employees handling non-prepackaged food must obtain a CFH card from an ANSI-accredited provider within 30 days of hire. Card valid 3 years. Multiple facility-type exemptions apply. No FDA equivalent.',
 'minor', 2, 'documents', 'food_safety', false, NULL, 'Management & Personnel',
 NULL),

('113949.1', 'Reporting of diagnosed illness by food employees',
 'A food employee diagnosed with a reportable illness (Norovirus, Hepatitis A, Shigella, STEC including E. coli O157:H7, typhoid fever, Salmonella) shall not work with exposed food, clean equipment, utensils, linens, or single-service articles. PIC reports to Department.',
 'major', 4, 'checklists', 'food_safety', true, 'RF5', 'Employee Health',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'shift_open_health_screen' AND mci.calcode_section = '113949.2'
    LIMIT 1)),

('113949.2', 'Reporting requirements — symptoms and lesions',
 'PIC must identify reportable employee illnesses. Food employees must report lesions/wounds on hand/wrist/exposed arm and reportable symptoms (diarrhea, vomiting, jaundice, sore throat with fever).',
 'major', 4, 'checklists', 'food_safety', true, 'RF5', 'Employee Health',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'shift_open_health_screen' AND mci.calcode_section = '113949.2'
    LIMIT 1)),

('113950', 'Restriction and exclusion of ill employees',
 'PIC must exclude diagnosed employees from facility; restrict from food-handling any employee with acute GI symptoms or asymptomatic carriers of reportable pathogens.',
 'major', 4, 'checklists', 'food_safety', true, 'RF5', 'Employee Health',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'shift_open_health_screen' AND mci.calcode_section = '113950'
    LIMIT 1)),

('113950.5', 'Removal of restriction and exclusion',
 'Restrictions removed when symptoms resolve. Exclusions removed only on written Department clearance.',
 'major', 2, 'documents', 'food_safety', false, NULL, 'Employee Health',
 NULL),

('113952', 'Hand cleanliness',
 'Food employees hands and exposed arms must be clean. Cuts/sores/rashes require single-use gloves or impermeable covers when contacting food or food-contact surfaces.',
 'major', 4, 'checklists', 'food_safety', true, 'RF5', 'Handwashing',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'handwashing_observation' AND mci.calcode_section = '113952'
    LIMIT 1)),

('113953.4', 'Hand sanitizers',
 'Hand sanitizers are not a substitute for handwashing. May be used after handwashing per manufacturer instructions.',
 'minor', 2, 'checklists', 'food_safety', false, NULL, 'Handwashing',
 NULL),

('113961', 'No bare-hand contact with ready-to-eat food',
 'Employees shall minimize bare-hand contact with non-prepackaged RTE food using non-latex utensils, deli tissue, single-use gloves, or dispensing equipment. No bare hands for wrapping leftovers.',
 'major', 4, 'checklists', 'food_safety', true, 'RF5', 'Handwashing',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'rte_handling_check' AND mci.calcode_section = '113961'
    LIMIT 1)),

('113968', 'Fingernails',
 'Fingernails of food handlers must be trimmed, filed, cleanable. Artificial nails, polish, or chipping polish require single-use gloves.',
 'minor', 2, 'checklists', 'food_safety', true, 'RF5', 'Personal Hygiene',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'personal_hygiene_observation' AND mci.calcode_section = '113968'
    LIMIT 1)),

('113969.5', 'Clean outer garments',
 'Food employees must wear clean outer garments. Aprons removed before using toilet.',
 'minor', 2, 'checklists', 'food_safety', false, NULL, 'Personal Hygiene',
 NULL),

('113974', 'Discharge from eyes, nose, mouth',
 'Employees with uncontrolled persistent sneezing, coughing, or runny nose with discharge that cannot be controlled by medication must not work with exposed food, clean equipment, utensils, or linens.',
 'major', 4, 'checklists', 'food_safety', true, 'RF5', 'Employee Health',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'shift_open_health_screen' AND mci.calcode_section = '113974'
    LIMIT 1)),

('113975', 'Lesions and wounds',
 'PIC must restrict food employees with exposed lesions/wounds on hand/wrist/arm not properly protected by impermeable cover plus single-use glove.',
 'major', 4, 'checklists', 'food_safety', true, 'RF5', 'Employee Health',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'shift_open_health_screen' AND mci.calcode_section = '113975'
    LIMIT 1)),

('113977', 'Eating, drinking, tobacco',
 'Employees may eat, drink, or use tobacco only in designated areas where contamination of exposed food, clean equipment, utensils, linens, or unwrapped single-use articles cannot result. Closed beverage containers permitted if handled to prevent contamination.',
 'minor', 2, 'checklists', 'food_safety', true, 'RF5', 'Personal Hygiene',
 (SELECT mci.id::text FROM master_checklist_definition_items mci
    JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
    WHERE mcd.code = 'personal_hygiene_observation' AND mci.calcode_section = '113977'
    LIMIT 1))

ON CONFLICT (calcode_section) DO UPDATE SET
  calcode_title = EXCLUDED.calcode_title,
  description = EXCLUDED.description,
  evidly_module = EXCLUDED.evidly_module,
  evidly_pillar = EXCLUDED.evidly_pillar,
  cdc_risk_factor = EXCLUDED.cdc_risk_factor,
  cdc_risk_category = EXCLUDED.cdc_risk_category,
  evidly_checklist_item = EXCLUDED.evidly_checklist_item;

-- -----------------------------------------------------------------
-- Re-wire 6 existing rows repaired in Migration 05
-- -----------------------------------------------------------------
UPDATE calcode_violation_map
SET evidly_checklist_item = (
  SELECT mci.id::text FROM master_checklist_definition_items mci
  JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
  WHERE mcd.code = 'handwash_station_check' AND mci.calcode_section = '113953'
  LIMIT 1
)
WHERE calcode_section = '113953';

UPDATE calcode_violation_map
SET evidly_checklist_item = (
  SELECT mci.id::text FROM master_checklist_definition_items mci
  JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
  WHERE mcd.code = 'handwash_station_check' AND mci.calcode_section = '113953.1'
  LIMIT 1
)
WHERE calcode_section = '113953.1';

UPDATE calcode_violation_map
SET evidly_checklist_item = (
  SELECT mci.id::text FROM master_checklist_definition_items mci
  JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
  WHERE mcd.code = 'handwash_station_check' AND mci.calcode_section = '113953.2'
  LIMIT 1
)
WHERE calcode_section = '113953.2';

UPDATE calcode_violation_map
SET evidly_checklist_item = (
  SELECT mci.id::text FROM master_checklist_definition_items mci
  JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
  WHERE mcd.code = 'handwashing_observation' AND mci.calcode_section = '113953.3'
  LIMIT 1
)
WHERE calcode_section = '113953.3';

UPDATE calcode_violation_map
SET evidly_checklist_item = (
  SELECT mci.id::text FROM master_checklist_definition_items mci
  JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
  WHERE mcd.code = 'personal_hygiene_observation' AND mci.calcode_section = '113969'
  LIMIT 1
)
WHERE calcode_section = '113969';

UPDATE calcode_violation_map
SET evidly_checklist_item = (
  SELECT mci.id::text FROM master_checklist_definition_items mci
  JOIN master_checklist_definitions mcd ON mcd.id = mci.definition_id
  WHERE mcd.code = 'rte_handling_check' AND mci.calcode_section = '113971'
  LIMIT 1
)
WHERE calcode_section = '113971';

-- -----------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------
DO $$
DECLARE
  domain_1_count int;
  wired_count int;
BEGIN
  SELECT COUNT(*) INTO domain_1_count
  FROM calcode_violation_map
  WHERE category IN ('Management & Personnel', 'Employee Health', 'Handwashing', 'Personal Hygiene');

  SELECT COUNT(*) INTO wired_count
  FROM calcode_violation_map
  WHERE evidly_checklist_item IS NOT NULL;

  RAISE NOTICE 'Domain 1 rows in calcode_violation_map: %', domain_1_count;
  RAISE NOTICE 'Rows wired to checklist items: %', wired_count;
END $$;

SELECT calcode_section, calcode_title, evidly_module, cdc_risk_category,
       CASE WHEN evidly_checklist_item IS NULL THEN 'unwired' ELSE 'wired' END AS wiring_status
FROM calcode_violation_map
WHERE category IN ('Management & Personnel', 'Employee Health', 'Handwashing', 'Personal Hygiene')
   OR calcode_section IN ('113953', '113953.1', '113953.2', '113953.3', '113969', '113971')
ORDER BY calcode_section;

COMMIT;
