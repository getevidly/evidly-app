-- Migration: I0 — task_definition_templates table + 10 system templates
-- Mirrors task_definitions schema for fields relevant to a template
-- (no organization_id binding, no location_id, no runtime fields).
-- Seeds 10 starter templates: 5 daily + 5 weekly. Monthly/quarterly
-- deferred until schedule_type enum is extended (I-followup-1).

CREATE TABLE IF NOT EXISTS task_definition_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  description           text,
  task_type             text NOT NULL,
  pillar                text NOT NULL,
  schedule_type         text NOT NULL,
  schedule_days         smallint[],
  schedule_shifts       text[],
  due_time              time,
  due_offset_minutes    integer,
  assigned_to_role      text,
  reminder_minutes      integer NOT NULL DEFAULT 15,
  due_soon_minutes      integer NOT NULL DEFAULT 30,
  escalation_config     jsonb NOT NULL DEFAULT '{"levels": [], "enabled": false}'::jsonb,
  regulation_reference  text,
  is_system             boolean NOT NULL DEFAULT true,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON task_definition_templates TO authenticated;

INSERT INTO task_definition_templates (name, description, task_type, pillar, schedule_type, schedule_days, schedule_shifts, due_time, assigned_to_role, regulation_reference, escalation_config)
SELECT * FROM (VALUES
  ('Walk-in cooler temperature check',
   'Record walk-in cooler temperature using calibrated thermometer. Verify reading at or below 41°F.',
   'temperature_log', 'food_safety', 'daily', NULL::smallint[], ARRAY['morning']::text[], '06:00'::time, 'kitchen_staff',
   'FDA Food Code 3-501.16',
   '{"enabled": true, "levels": [{"delay_minutes": 30, "notify_role": "kitchen_manager"}]}'::jsonb),

  ('Hot hold temperature check',
   'Verify hot held foods at or above 135°F. Record temperature for each hot holding unit.',
   'temperature_log', 'food_safety', 'daily', NULL::smallint[], ARRAY['midday']::text[], '11:00'::time, 'kitchen_staff',
   'FDA Food Code 3-501.16',
   '{"enabled": true, "levels": [{"delay_minutes": 30, "notify_role": "kitchen_manager"}]}'::jsonb),

  ('Opening checklist',
   'Complete opening checklist: sanitizer concentration verified, handwashing stations stocked, prep surfaces sanitized, hot/cold holding temps verified.',
   'checklist', 'food_safety', 'daily', NULL::smallint[], ARRAY['morning']::text[], '06:30'::time, 'kitchen_staff',
   NULL,
   '{"enabled": true, "levels": [{"delay_minutes": 60, "notify_role": "kitchen_manager"}]}'::jsonb),

  ('Closing checklist',
   'Complete closing checklist: surfaces sanitized, food properly stored and labeled, equipment shut down, walk-ins secured.',
   'checklist', 'food_safety', 'daily', NULL::smallint[], ARRAY['closing']::text[], '22:00'::time, 'kitchen_staff',
   NULL,
   '{"enabled": true, "levels": [{"delay_minutes": 60, "notify_role": "kitchen_manager"}]}'::jsonb),

  ('Sanitizer concentration check',
   'Test sanitizer concentration with test strips. Verify against manufacturer label requirements (typically 200-400 ppm quat or 50-100 ppm chlorine).',
   'custom', 'food_safety', 'daily', NULL::smallint[], ARRAY['morning']::text[], '09:00'::time, 'kitchen_staff',
   'FDA Food Code 4-501.114',
   '{"enabled": true, "levels": [{"delay_minutes": 30, "notify_role": "kitchen_manager"}]}'::jsonb),

  ('Equipment safety inspection',
   'Inspect equipment for damage, leaks, electrical issues, proper guarding. Verify thermometer calibration and refrigeration gauge readings.',
   'equipment_check', 'operational', 'weekly', ARRAY[1]::smallint[], NULL::text[], '08:00'::time, 'kitchen_manager',
   NULL,
   '{"enabled": true, "levels": [{"delay_minutes": 1440, "notify_role": "owner_operator"}]}'::jsonb),

  ('Deep clean rotation',
   'Execute weekly deep clean for designated zone. Document area cleaned and any maintenance findings.',
   'custom', 'food_safety', 'weekly', ARRAY[0]::smallint[], NULL::text[], '14:00'::time, 'kitchen_staff',
   NULL,
   '{"enabled": true, "levels": [{"delay_minutes": 240, "notify_role": "kitchen_manager"}]}'::jsonb),

  ('Pest activity walk-through',
   'Walk-through facility checking for pest evidence: droppings, gnaw marks, entry points, sanitation gaps. Document findings and required actions.',
   'custom', 'food_safety', 'weekly', ARRAY[5]::smallint[], NULL::text[], '10:00'::time, 'kitchen_manager',
   'FDA Food Code 6-501.111',
   '{"enabled": true, "levels": [{"delay_minutes": 1440, "notify_role": "owner_operator"}]}'::jsonb),

  ('Document upload review',
   'Upload weekly compliance documents: hood cleaning certificates, pest control reports, vendor service records, inspection findings.',
   'document_upload', 'operational', 'weekly', ARRAY[5]::smallint[], NULL::text[], '15:00'::time, 'kitchen_manager',
   NULL,
   '{"enabled": true, "levels": [{"delay_minutes": 1440, "notify_role": "owner_operator"}]}'::jsonb),

  ('Vendor service confirmation',
   'Confirm upcoming vendor services scheduled (hood cleaning, pest control, fire suppression). Verify certificates of insurance current.',
   'vendor_service', 'operational', 'weekly', ARRAY[1]::smallint[], NULL::text[], '10:00'::time, 'kitchen_manager',
   NULL,
   '{"enabled": true, "levels": [{"delay_minutes": 1440, "notify_role": "owner_operator"}]}'::jsonb)
) AS v(name, description, task_type, pillar, schedule_type, schedule_days, schedule_shifts, due_time, assigned_to_role, regulation_reference, escalation_config)
WHERE NOT EXISTS (
  SELECT 1 FROM task_definition_templates t WHERE t.name = v.name AND t.is_system = true
);
