-- ════════════════════════════════════════════════════════════
-- Lease Intake Phase A — location_safeguard_responsibility
--
-- Per protective safeguard (service_type_code), records WHO
-- maintains the system and WHO carries impairment-notification
-- duty. Source is either 'lease' or 'policy'.
--
-- AI extraction stages rows with ai_suggested JSONB and NULL
-- confirmed_by/confirmed_at. A row is ONLY authoritative once
-- a human sets confirmed_by (Phase B). Nothing downstream may
-- treat confirmed_by IS NULL as a confirmed responsibility.
--
-- Supersede: UNIQUE (location_id, service_type_code, source)
-- means a re-extraction UPSERTs — old row is overwritten, not
-- soft-deleted. The latest extraction wins; history is in the
-- compliance_documents metadata trail.
--
-- Launches EMPTY — no rows inserted.
--
-- Tracker: supabase_migrations.schema_migrations version = '20260929000000'
-- ════════════════════════════════════════════════════════════

-- ── A. CREATE TABLE ──────────────────────────────────────────

CREATE TABLE location_safeguard_responsibility (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id),
  location_id         uuid NOT NULL REFERENCES locations(id),
  service_type_code   text NOT NULL REFERENCES service_type_definitions(code),
  maintenance_party   text CHECK (maintenance_party IN
                        ('tenant','landlord','shared','unspecified')),
  notification_party  text CHECK (notification_party IN
                        ('tenant','landlord','shared','unspecified')),
  source              text NOT NULL DEFAULT 'lease'
                      CHECK (source IN ('lease','policy')),
  source_reference    text,
  finding_type        text NOT NULL DEFAULT 'silent'
                      CHECK (finding_type IN
                        ('allocated','silent','ambiguous','conflicting')),
  lease_document_id   uuid REFERENCES compliance_documents(id),
  ai_suggested        jsonb,
  confirmed_by        uuid,
  confirmed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── B. UNIQUE CONSTRAINT ────────────────────────────────────
-- One responsibility per safeguard per location per source.
-- Re-extraction UPSERTs (overwrites the existing row).

ALTER TABLE location_safeguard_responsibility
  ADD CONSTRAINT uq_location_safeguard_resp_loc_code_source
  UNIQUE (location_id, service_type_code, source);

-- ── C. INDEX ────────────────────────────────────────────────

CREATE INDEX idx_safeguard_responsibility_org_loc
  ON location_safeguard_responsibility (organization_id, location_id);

-- ── D. RLS ──────────────────────────────────────────────────
-- Mirrors location_service_exclusions: org-scoped for
-- authenticated users, full access for service_role.

ALTER TABLE location_safeguard_responsibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage safeguard responsibility"
  ON location_safeguard_responsibility FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Service role full access safeguard responsibility"
  ON location_safeguard_responsibility FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── E. Migration tracker ────────────────────────────────────

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260929000000')
ON CONFLICT DO NOTHING;
