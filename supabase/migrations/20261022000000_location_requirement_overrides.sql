-- Per-location requirement applicability overrides.
-- applicable=false → operator marks a catalog requirement as N/A for this location.
-- applicable=true  → operator marks a conditional requirement as applicable.
-- Without an override row, catalog defaults apply.

CREATE TABLE IF NOT EXISTS location_requirement_overrides (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id      UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  requirement_code TEXT NOT NULL,
  applicable       BOOLEAN NOT NULL,
  reason           TEXT,
  set_by           UUID REFERENCES auth.users(id),
  set_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, requirement_code)
);

ALTER TABLE location_requirement_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read overrides"
  ON location_requirement_overrides FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Org members can manage overrides"
  ON location_requirement_overrides FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Service role full access on overrides"
  ON location_requirement_overrides FOR ALL
  USING (auth.role() = 'service_role');
