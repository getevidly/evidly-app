-- Add zones table for kitchen physical area assignment.
-- Zones allow equipment and food batches to be grouped by physical area
-- (e.g., "Walk-in Corridor", "Prep Line", "Service Line") within a location.
-- Used by shift assignments, temperature equipment, and food batches.

CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(location_id, name)
);

CREATE INDEX idx_zones_organization_id ON zones(organization_id);
CREATE INDEX idx_zones_location_id ON zones(location_id);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY zones_select ON zones FOR SELECT
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY zones_insert ON zones FOR INSERT
  WITH CHECK (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY zones_update ON zones FOR UPDATE
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY zones_delete ON zones FOR DELETE
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
