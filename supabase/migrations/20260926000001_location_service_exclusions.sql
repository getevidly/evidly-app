-- ════════════════════════════════════════════════════════════
-- Fire Protection Phase 1 — Migration B
-- Create location_service_exclusions table (exclusions model).
--
-- Absence of an exclusion row = service is required.
-- Presence of an active exclusion row = service is excluded for
-- that location, with source (policy or lease) and optional
-- reference and date range.
--
-- RLS mirrors location_service_schedules: direct organization_id
-- match against user_profiles.organization_id for auth.uid().
--
-- Launches EMPTY — no rows inserted.
--
-- Tracker: supabase_migrations.schema_migrations version = '20260926000001'
-- ════════════════════════════════════════════════════════════

-- ── A. CREATE TABLE ──────────────────────────────────────────

CREATE TABLE location_service_exclusions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id),
  location_id         uuid NOT NULL REFERENCES locations(id),
  service_type_code   text NOT NULL REFERENCES service_type_definitions(code),
  source              text NOT NULL CHECK (source IN ('policy', 'lease')),
  reason              text,
  source_reference    text,
  effective_date      date,
  expiration_date     date,
  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'superseded', 'expired')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── B. INDEX ─────────────────────────────────────────────────

CREATE INDEX idx_location_service_exclusions_lookup
  ON location_service_exclusions (organization_id, location_id, service_type_code, status);

-- ── C. RLS ───────────────────────────────────────────────────
-- Mirrors location_service_schedules policy exactly:
--   FOR ALL TO authenticated
--   USING (organization_id IN (
--     SELECT organization_id FROM user_profiles WHERE id = auth.uid()
--   ))

ALTER TABLE location_service_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage location service exclusions"
  ON location_service_exclusions FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Service role full access location service exclusions"
  ON location_service_exclusions FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ── D. Migration tracker ─────────────────────────────────────

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260926000001')
ON CONFLICT DO NOTHING;
