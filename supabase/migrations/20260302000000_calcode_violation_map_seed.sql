-- ═══════════════════════════════════════════════════════════════════════
-- JURISDICTION INTELLIGENCE — JI-2: CalCode Violation Map
-- 45 California Retail Food Code sections mapped to EvidLY modules
-- Reference: California Retail Food Code (Health & Safety Code Division 104, Part 7)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO calcode_violation_map (calcode_section, calcode_title, description, severity_default, point_deduction_default, evidly_module, evidly_pillar, cdc_risk_factor, cdc_risk_category, category) VALUES

-- ═══════════════════════════════════════════════════════════
-- TEMPERATURE CONTROL (CDC Risk Factor: Improper Holding Temp / Inadequate Cooking)
-- ═══════════════════════════════════════════════════════════
('113996', 'Food Temperature - Hot Holding', 'Potentially hazardous foods shall be held at 135F or above', 'critical', 4, 'temperatures', 'food_safety', true, 'improper_holding_temp', 'temperature'),
('113996.5', 'Food Temperature - Cold Holding', 'Potentially hazardous foods shall be held at 41F or below', 'critical', 4, 'temperatures', 'food_safety', true, 'improper_holding_temp', 'temperature'),
('114002', 'Food Temperature - Cooking', 'Raw animal foods shall be cooked to required minimum temperatures', 'critical', 4, 'temperatures', 'food_safety', true, 'inadequate_cooking', 'temperature'),
('114004', 'Food Temperature - Reheating', 'Foods reheated for hot holding shall reach 165F within 2 hours', 'critical', 4, 'temperatures', 'food_safety', true, 'inadequate_cooking', 'temperature'),
('114002.1', 'Food Temperature - Microwave Cooking', 'Food cooked in microwave shall be rotated/stirred and reach 165F', 'major', 2, 'temperatures', 'food_safety', true, 'inadequate_cooking', 'temperature'),
('113999', 'Food Temperature - Cooling', 'Cooked PHF cooled from 135F to 70F within 2 hours, then to 41F within 4 more hours', 'critical', 4, 'temperatures', 'food_safety', true, 'improper_holding_temp', 'temperature'),
('114000', 'Food Temperature - Cooling Methods', 'Approved cooling methods used: shallow pans, ice bath, rapid chill', 'major', 2, 'temperatures', 'food_safety', true, 'improper_holding_temp', 'temperature'),
('113998', 'Food Temperature - Thawing', 'PHF thawed under refrigeration, cold running water, microwave, or as part of cooking', 'major', 2, 'temperatures', 'food_safety', true, 'improper_holding_temp', 'temperature'),
('114057', 'Thermometer Provided', 'Accurate food thermometer provided and accessible in facility', 'minor', 1, 'temperatures', 'food_safety', false, NULL, 'temperature'),
('114159', 'Thermometer in Refrigeration Units', 'Accurate thermometer in each refrigeration unit, visible', 'minor', 1, 'temperatures', 'food_safety', false, NULL, 'temperature'),

-- ═══════════════════════════════════════════════════════════
-- PERSONAL HYGIENE (CDC Risk Factor: Poor Hygiene)
-- ═══════════════════════════════════════════════════════════
('113953', 'Handwashing - When Required', 'Food employees shall wash hands before handling food, after using restroom, after touching body/face', 'critical', 4, 'checklists', 'food_safety', true, 'poor_hygiene', 'hygiene'),
('113953.1', 'Handwashing - No Bare Hand Contact', 'No bare hand contact with ready-to-eat foods. Gloves, utensils, or deli tissue required', 'critical', 4, 'checklists', 'food_safety', true, 'poor_hygiene', 'hygiene'),
('113953.2', 'Handwashing - Method', 'Hands washed with soap and warm water for at least 10-15 seconds, dried with single-use towels', 'major', 2, 'checklists', 'food_safety', true, 'poor_hygiene', 'hygiene'),
('113953.3', 'Handwashing - Facilities', 'Handwashing facilities accessible, supplied with soap and towels, not blocked', 'major', 2, 'equipment', 'food_safety', true, 'poor_hygiene', 'hygiene'),
('113969', 'Employee Health - Illness Reporting', 'Food employees report illness symptoms: vomiting, diarrhea, jaundice, sore throat with fever', 'critical', 4, 'checklists', 'food_safety', true, 'poor_hygiene', 'hygiene'),
('113971', 'Employee Health - Exclusion/Restriction', 'Employees with diagnosed illness excluded or restricted from food handling duties', 'critical', 4, 'checklists', 'food_safety', true, 'poor_hygiene', 'hygiene'),
('113969.5', 'Clean Outer Garments', 'Food employees wear clean outer garments. Hair restraints required', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'hygiene'),

-- ═══════════════════════════════════════════════════════════
-- FOOD SOURCE & PROTECTION (CDC Risk Factor: Unsafe Source)
-- ═══════════════════════════════════════════════════════════
('113980', 'Food Source - Approved', 'Food obtained from approved sources. No home-prepared foods.', 'critical', 4, 'documents', 'food_safety', true, 'unsafe_source', 'food_source'),
('113982', 'Food Source - Shell Eggs', 'Shell eggs from approved source, stored at 45F or below', 'major', 2, 'documents', 'food_safety', true, 'unsafe_source', 'food_source'),
('114021', 'Food Labels - Original Container', 'Food in original container with manufacturer label intact, or properly labeled if transferred', 'minor', 1, 'documents', 'food_safety', false, NULL, 'food_source'),
('113990', 'Food Protection - Contamination Prevention', 'Food protected from contamination during storage, prep, display, transport', 'major', 2, 'checklists', 'food_safety', true, 'contaminated_equipment', 'food_protection'),
('114047', 'Food Protection - Consumer Advisory', 'Written consumer advisory for raw/undercooked animal foods on menu', 'minor', 1, 'documents', 'food_safety', false, NULL, 'food_protection'),

-- ═══════════════════════════════════════════════════════════
-- EQUIPMENT & UTENSILS (CDC Risk Factor: Contaminated Equipment)
-- ═══════════════════════════════════════════════════════════
('114097', 'Equipment - Food Contact Surfaces Clean', 'Food contact surfaces of equipment and utensils clean and sanitized', 'major', 2, 'checklists', 'food_safety', true, 'contaminated_equipment', 'equipment'),
('114099', 'Equipment - Non-Food Contact Surfaces', 'Non-food contact surfaces kept clean and free of accumulation', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'equipment'),
('114099.1', 'Equipment - Condition and Repair', 'Equipment in good repair, surfaces smooth, easily cleanable', 'minor', 1, 'equipment', 'food_safety', false, NULL, 'equipment'),
('114101', 'Utensils - Proper Use and Storage', 'Utensils stored to prevent contamination. Handles above food.', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'equipment'),
('114105', 'Sanitization - Manual Warewashing', 'Manual warewashing in 3-compartment sink: wash, rinse, sanitize', 'major', 2, 'checklists', 'food_safety', true, 'contaminated_equipment', 'equipment'),
('114099.4', 'Sanitization - Mechanical Warewashing', 'Mechanical warewashing equipment operating at proper temp and chemical concentration', 'major', 2, 'equipment', 'food_safety', true, 'contaminated_equipment', 'equipment'),
('114117', 'Wiping Cloths', 'Wet wiping cloths stored in sanitizer solution between uses. Proper concentration.', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'equipment'),

-- ═══════════════════════════════════════════════════════════
-- FACILITY & STRUCTURAL
-- ═══════════════════════════════════════════════════════════
('114143', 'Floors - Condition', 'Floors smooth, durable, easily cleanable. No cracks or holes.', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'structural'),
('114145', 'Walls and Ceilings - Condition', 'Walls and ceilings smooth, durable, easily cleanable, light-colored', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'structural'),
('114149', 'Lighting - Adequate', 'Adequate lighting in all areas: 50 foot-candles prep, 20 fc storage, 10 fc other', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'structural'),
('114149.1', 'Lighting - Shielded', 'Light bulbs shielded or shatter-resistant in food prep and storage areas', 'minor', 1, 'equipment', 'food_safety', false, NULL, 'structural'),
('114141', 'Plumbing - Adequate', 'Adequate plumbing, hot and cold running water under pressure', 'major', 2, 'equipment', 'food_safety', false, NULL, 'structural'),
('114165', 'Toilet Facilities - Adequate', 'Adequate toilet facilities, clean, supplied, self-closing doors', 'major', 2, 'checklists', 'food_safety', false, NULL, 'structural'),

-- ═══════════════════════════════════════════════════════════
-- PEST CONTROL
-- ═══════════════════════════════════════════════════════════
('114259.1', 'Vermin - No Evidence', 'No evidence of vermin: rodents, insects, birds in food facility', 'major', 2, 'checklists', 'food_safety', false, NULL, 'pest'),
('114259.4', 'Vermin - Openings Protected', 'Openings to outside protected: screens, air curtains, self-closing doors', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'pest'),

-- ═══════════════════════════════════════════════════════════
-- CHEMICAL / TOXIC SUBSTANCES
-- ═══════════════════════════════════════════════════════════
('114254', 'Toxic Substances - Properly Stored', 'Toxic substances stored away from food, utensils, and food contact surfaces', 'major', 2, 'checklists', 'food_safety', false, NULL, 'chemical'),
('114254.3', 'Toxic Substances - Properly Labeled', 'All containers of toxic substances clearly labeled', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'chemical'),

-- ═══════════════════════════════════════════════════════════
-- STORAGE
-- ═══════════════════════════════════════════════════════════
('114047.1', 'Food Storage - Off Floor', 'All food stored at least 6 inches off floor, away from walls', 'minor', 1, 'checklists', 'food_safety', false, NULL, 'storage'),
('114049', 'Food Storage - Proper Order', 'Food stored in proper order in refrigeration: ready-to-eat on top, raw meats on bottom by cook temp', 'major', 2, 'checklists', 'food_safety', true, 'contaminated_equipment', 'storage'),

-- ═══════════════════════════════════════════════════════════
-- DOCUMENTATION & PERMITS
-- ═══════════════════════════════════════════════════════════
('114381', 'Permit - Valid and Posted', 'Valid health permit posted in conspicuous location', 'minor', 1, 'documents', 'food_safety', false, NULL, 'documentation'),
('113725.1', 'HACCP Plan - Required Operations', 'HACCP plan required for specialized processing: smoking, curing, reduced oxygen packaging', 'critical', 4, 'haccp', 'food_safety', false, NULL, 'documentation'),
('114197', 'Food Handler Cards', 'All food handlers possess valid California Food Handler Card within 30 days of hire', 'minor', 1, 'training', 'food_safety', false, NULL, 'documentation');
