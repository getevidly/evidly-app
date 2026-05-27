-- ============================================================
-- Sprint 1.2 — service_configurations table
-- Per-org, per-location, per-service cadence + scheduling state.
-- Backfills from vendor_service_records where data exists.
-- No UI changes — schema + backfill only.
-- ============================================================

-- ── A. service_configurations table ─────────────────────────

CREATE TABLE IF NOT EXISTS service_configurations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id        uuid        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  service_code       text        NOT NULL REFERENCES service_type_definitions(code) ON DELETE RESTRICT,
  assigned_vendor_id uuid        REFERENCES vendors(id) ON DELETE SET NULL,
  cadence_days       integer     NOT NULL,
  last_service_at    timestamptz,
  next_due_at        timestamptz,
  is_active          boolean     NOT NULL DEFAULT true,
  activated_at       timestamptz NOT NULL DEFAULT now(),
  deactivated_at     timestamptz,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, service_code)
);

CREATE INDEX IF NOT EXISTS idx_sc_org_loc  ON service_configurations (organization_id, location_id);
CREATE INDEX IF NOT EXISTS idx_sc_next_due ON service_configurations (next_due_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sc_service  ON service_configurations (service_code);
CREATE INDEX IF NOT EXISTS idx_sc_vendor   ON service_configurations (assigned_vendor_id) WHERE assigned_vendor_id IS NOT NULL;


-- ── B. RLS policies ────────────────────────────────────────

ALTER TABLE service_configurations ENABLE ROW LEVEL SECURITY;

-- Service role: full access for backend jobs
DROP POLICY IF EXISTS "Service role full access to service configurations"
  ON service_configurations;
CREATE POLICY "Service role full access to service configurations"
  ON service_configurations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT: org-scoped via user_location_access
DROP POLICY IF EXISTS "Users can view service configurations in their organization"
  ON service_configurations;
CREATE POLICY "Users can view service configurations in their organization"
  ON service_configurations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Authenticated INSERT: org-scoped + role check
DROP POLICY IF EXISTS "Authorized users can insert service configurations"
  ON service_configurations;
CREATE POLICY "Authorized users can insert service configurations"
  ON service_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner_operator', 'facilities_manager', 'platform_admin')
    )
  );

-- Authenticated UPDATE: org-scoped + role check
DROP POLICY IF EXISTS "Authorized users can update service configurations"
  ON service_configurations;
CREATE POLICY "Authorized users can update service configurations"
  ON service_configurations FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner_operator', 'facilities_manager', 'platform_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner_operator', 'facilities_manager', 'platform_admin')
    )
  );

-- No DELETE policy for authenticated users — use is_active=false toggle


-- ── C. updated_at trigger ──────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_service_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_service_configurations_updated_at
  ON service_configurations;
CREATE TRIGGER set_service_configurations_updated_at
  BEFORE UPDATE ON service_configurations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_service_configurations_updated_at();


-- ── D. Backfill from vendor_service_records ─────────────────

INSERT INTO service_configurations (
  organization_id, location_id, service_code, assigned_vendor_id,
  cadence_days, last_service_at, next_due_at, is_active
)
SELECT DISTINCT ON (vsr.organization_id, vsr.location_id, vsr.service_type_code)
  vsr.organization_id,
  vsr.location_id,
  vsr.service_type_code                                           AS service_code,
  vsr.vendor_id                                                   AS assigned_vendor_id,
  COALESCE(std.default_cadence_days, 90)                          AS cadence_days,
  vsr.service_date::timestamptz                                   AS last_service_at,
  (vsr.service_date::timestamptz
    + (COALESCE(std.default_cadence_days, 90) || ' days')::interval) AS next_due_at,
  true                                                            AS is_active
FROM vendor_service_records vsr
JOIN service_type_definitions std ON std.code = vsr.service_type_code
WHERE vsr.service_date IS NOT NULL
  AND vsr.service_type_code IS NOT NULL
  AND vsr.organization_id IS NOT NULL
  AND vsr.location_id IS NOT NULL
ORDER BY vsr.organization_id, vsr.location_id, vsr.service_type_code, vsr.service_date DESC
ON CONFLICT (organization_id, location_id, service_code) DO NOTHING;


-- ── E. Done ─────────────────────────────────────────────────
