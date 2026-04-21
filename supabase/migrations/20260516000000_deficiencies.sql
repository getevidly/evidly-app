-- DEFICIENCIES-1: Deficiency tracking module
--
-- Tables:
--   deficiencies           — core deficiency records
--   deficiency_timeline    — status change audit trail
--   deficiency_photos      — finding + resolution photo evidence

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. deficiencies — core table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deficiencies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id           UUID REFERENCES locations(id) ON DELETE SET NULL,
  code                  TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  location_description  TEXT,
  severity              TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'advisory')),
  status                TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'deferred')),
  equipment_id          UUID,
  service_record_id     UUID REFERENCES vendor_service_records(id) ON DELETE SET NULL,
  found_by              TEXT,
  found_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  required_action       TEXT,
  timeline_requirement  TEXT CHECK (timeline_requirement IS NULL OR timeline_requirement IN (
    'immediate', '30_days', '90_days', 'next_service'
  )),
  estimated_cost        NUMERIC(10,2),
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID REFERENCES user_profiles(id),
  resolution_notes      TEXT,
  follow_up_service_id  UUID REFERENCES vendor_service_records(id) ON DELETE SET NULL,
  deferred_reason       TEXT,
  deferred_until        DATE,
  ai_detected           BOOLEAN NOT NULL DEFAULT FALSE,
  ai_confidence         SMALLINT CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 100)),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE deficiencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deficiencies_read_own_org ON deficiencies;
CREATE POLICY deficiencies_read_own_org ON deficiencies
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS deficiencies_write_own_org ON deficiencies;
CREATE POLICY deficiencies_write_own_org ON deficiencies
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_deficiencies_org      ON deficiencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_location ON deficiencies(location_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_status   ON deficiencies(status);
CREATE INDEX IF NOT EXISTS idx_deficiencies_severity ON deficiencies(severity);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. deficiency_timeline — status change audit trail
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deficiency_timeline (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deficiency_id     UUID NOT NULL REFERENCES deficiencies(id) ON DELETE CASCADE,
  status            TEXT NOT NULL CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'deferred')),
  changed_by        UUID REFERENCES user_profiles(id),
  changed_by_name   TEXT,
  notes             TEXT,
  notification_method TEXT CHECK (notification_method IS NULL OR notification_method IN (
    'in_person', 'email', 'phone'
  )),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE deficiency_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deficiency_timeline_read ON deficiency_timeline;
CREATE POLICY deficiency_timeline_read ON deficiency_timeline
  FOR SELECT USING (
    deficiency_id IN (
      SELECT id FROM deficiencies WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS deficiency_timeline_write ON deficiency_timeline;
CREATE POLICY deficiency_timeline_write ON deficiency_timeline
  FOR ALL USING (
    deficiency_id IN (
      SELECT id FROM deficiencies WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_dt_deficiency ON deficiency_timeline(deficiency_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. deficiency_photos — photo evidence
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deficiency_photos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deficiency_id     UUID NOT NULL REFERENCES deficiencies(id) ON DELETE CASCADE,
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  photo_type        TEXT NOT NULL CHECK (photo_type IN ('finding', 'resolution')),
  file_url          TEXT NOT NULL,
  caption           TEXT,
  taken_at          TIMESTAMPTZ,
  uploaded_by       UUID REFERENCES user_profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE deficiency_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deficiency_photos_read ON deficiency_photos;
CREATE POLICY deficiency_photos_read ON deficiency_photos
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS deficiency_photos_write ON deficiency_photos;
CREATE POLICY deficiency_photos_write ON deficiency_photos
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_dp_deficiency ON deficiency_photos(deficiency_id);
CREATE INDEX IF NOT EXISTS idx_dp_org        ON deficiency_photos(organization_id);
