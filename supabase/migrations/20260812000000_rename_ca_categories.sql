-- Rename corrective-action categories:
--   facility_safety → fire_safety
--   operational     → facility_services
--
-- Applies to both corrective_actions and corrective_action_templates.

-- 1. Update existing rows
UPDATE corrective_actions SET category = 'fire_safety' WHERE category = 'facility_safety';
UPDATE corrective_actions SET category = 'facility_services' WHERE category = 'operational';

UPDATE corrective_action_templates SET category = 'fire_safety' WHERE category = 'facility_safety';
UPDATE corrective_action_templates SET category = 'facility_services' WHERE category = 'operational';

-- 2. Replace CHECK constraints
ALTER TABLE corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_category_check;
ALTER TABLE corrective_actions ADD CONSTRAINT corrective_actions_category_check
  CHECK (category IN ('food_safety', 'fire_safety', 'facility_services'));

ALTER TABLE corrective_action_templates DROP CONSTRAINT IF EXISTS corrective_action_templates_category_check;
ALTER TABLE corrective_action_templates ADD CONSTRAINT corrective_action_templates_category_check
  CHECK (category IN ('food_safety', 'fire_safety', 'facility_services'));
