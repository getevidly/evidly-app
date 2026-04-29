-- Add shift assignment tables (three tightly coupled tables in one migration).
-- shift_templates: define recurring shifts with start/end times and day patterns.
-- shift_assignments: link primary/secondary users to zones or equipment per shift.
-- shift_assignment_overrides: capture day-of swaps for callouts or schedule changes.
-- assignment_unit controls granularity: per_shift, per_zone, or per_equipment.

CREATE TYPE shift_assignment_unit AS ENUM ('per_shift', 'per_zone', 'per_equipment');

CREATE TABLE shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  day_of_week_pattern text NOT NULL DEFAULT 'MTWRFSU',
  assignment_unit shift_assignment_unit NOT NULL DEFAULT 'per_shift',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_templates_location_id ON shift_templates(location_id);

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_templates_select ON shift_templates FOR SELECT
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY shift_templates_insert ON shift_templates FOR INSERT
  WITH CHECK (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY shift_templates_update ON shift_templates FOR UPDATE
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY shift_templates_delete ON shift_templates FOR DELETE
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));

CREATE TABLE shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_template_id uuid NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES temperature_equipment(id) ON DELETE CASCADE,
  primary_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  secondary_user_id uuid REFERENCES user_profiles(id) ON DELETE RESTRICT,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (zone_id IS NOT NULL AND equipment_id IS NULL) OR
    (zone_id IS NULL AND equipment_id IS NOT NULL) OR
    (zone_id IS NULL AND equipment_id IS NULL)
  )
);

CREATE INDEX idx_shift_assignments_shift_template_id ON shift_assignments(shift_template_id);
CREATE INDEX idx_shift_assignments_zone_id ON shift_assignments(zone_id);
CREATE INDEX idx_shift_assignments_equipment_id ON shift_assignments(equipment_id);
CREATE INDEX idx_shift_assignments_primary_user_id ON shift_assignments(primary_user_id);
CREATE INDEX idx_shift_assignments_secondary_user_id ON shift_assignments(secondary_user_id);

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_assignments_select ON shift_assignments FOR SELECT
  USING (shift_template_id IN (SELECT id FROM shift_templates WHERE location_id IN (
    SELECT location_id FROM user_location_access WHERE user_id = auth.uid())));
CREATE POLICY shift_assignments_insert ON shift_assignments FOR INSERT
  WITH CHECK (shift_template_id IN (SELECT id FROM shift_templates WHERE location_id IN (
    SELECT location_id FROM user_location_access WHERE user_id = auth.uid())));
CREATE POLICY shift_assignments_update ON shift_assignments FOR UPDATE
  USING (shift_template_id IN (SELECT id FROM shift_templates WHERE location_id IN (
    SELECT location_id FROM user_location_access WHERE user_id = auth.uid())));
CREATE POLICY shift_assignments_delete ON shift_assignments FOR DELETE
  USING (shift_template_id IN (SELECT id FROM shift_templates WHERE location_id IN (
    SELECT location_id FROM user_location_access WHERE user_id = auth.uid())));

CREATE TABLE shift_assignment_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_assignment_id uuid NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  original_user_id uuid NOT NULL REFERENCES user_profiles(id),
  replacement_user_id uuid NOT NULL REFERENCES user_profiles(id),
  override_role text NOT NULL CHECK (override_role IN ('primary', 'secondary')),
  reason text,
  overridden_by uuid NOT NULL REFERENCES user_profiles(id),
  overridden_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_assignment_overrides_shift_assignment_id ON shift_assignment_overrides(shift_assignment_id);
CREATE INDEX idx_shift_assignment_overrides_override_date ON shift_assignment_overrides(override_date);

ALTER TABLE shift_assignment_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_assignment_overrides_select ON shift_assignment_overrides FOR SELECT
  USING (shift_assignment_id IN (SELECT id FROM shift_assignments WHERE shift_template_id IN (
    SELECT id FROM shift_templates WHERE location_id IN (
      SELECT location_id FROM user_location_access WHERE user_id = auth.uid()))));
CREATE POLICY shift_assignment_overrides_insert ON shift_assignment_overrides FOR INSERT
  WITH CHECK (shift_assignment_id IN (SELECT id FROM shift_assignments WHERE shift_template_id IN (
    SELECT id FROM shift_templates WHERE location_id IN (
      SELECT location_id FROM user_location_access WHERE user_id = auth.uid()))));
