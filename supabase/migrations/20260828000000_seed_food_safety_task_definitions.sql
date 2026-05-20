-- C11 — Seed food-safety task_definitions from task_definition_templates
-- Clones the 7 food-safety system templates into task_definitions for every
-- org × location pair that doesn't already have them.
-- Idempotent: re-running creates nothing new (ON CONFLICT DO NOTHING).
--
-- NOTE: Future orgs/locations will need seeding via onboarding flow or admin
-- action — this migration only covers orgs that exist at apply time.

-- ═══════════════════════════════════════════════════════════════
-- SEED: clone 7 food-safety templates per org × location
-- ═══════════════════════════════════════════════════════════════

INSERT INTO task_definitions (
  organization_id,
  location_id,
  name,
  description,
  task_type,
  pillar,
  schedule_type,
  schedule_days,
  schedule_shifts,
  due_time,
  assigned_to_role,
  assigned_to_user_id,
  template_id,
  is_active
)
SELECT
  l.organization_id,
  l.id AS location_id,
  t.name,
  t.description,
  t.task_type,
  t.pillar,
  t.schedule_type,
  CASE t.schedule_type
    WHEN 'daily' THEN ARRAY[0,1,2,3,4,5,6]
    WHEN 'weekly' THEN ARRAY[1]
    ELSE ARRAY[0,1,2,3,4,5,6]
  END AS schedule_days,
  ARRAY['morning'] AS schedule_shifts,
  '11:00:00'::time AS due_time,
  CASE t.name
    WHEN 'Opening checklist'                THEN 'kitchen_staff'
    WHEN 'Closing checklist'                THEN 'kitchen_staff'
    WHEN 'Walk-in cooler temperature check' THEN 'kitchen_staff'
    WHEN 'Hot hold temperature check'       THEN 'kitchen_staff'
    WHEN 'Sanitizer concentration check'    THEN 'kitchen_staff'
    WHEN 'Deep clean rotation'              THEN 'kitchen_manager'
    WHEN 'Pest activity walk-through'       THEN 'kitchen_manager'
    ELSE 'kitchen_staff'
  END AS assigned_to_role,
  NULL AS assigned_to_user_id,
  t.id AS template_id,
  true AS is_active
FROM task_definition_templates t
CROSS JOIN locations l
WHERE t.pillar = 'food_safety'
  AND t.is_system = true
  AND t.is_active = true
  AND l.organization_id != '00000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM task_definitions td
    WHERE td.organization_id = l.organization_id
      AND td.location_id = l.id
      AND td.template_id = t.id
  );

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE seeded_count int;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM task_definitions
  WHERE pillar = 'food_safety' AND is_active = true;

  IF seeded_count = 0 THEN
    RAISE EXCEPTION 'No food_safety task_definitions seeded — check template join';
  END IF;

  RAISE NOTICE 'C11 seed: % active food_safety task_definitions now exist', seeded_count;
END $$;
