-- SERVICE-RECORDS-1: QA review workflow + photo evidence for service records
--
-- Adds QA review columns to vendor_service_records, plus two new tables:
--   service_record_reviews  — audit trail of QA approve/flag actions
--   service_record_photos   — before/after photo evidence per service visit

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Add QA columns to vendor_service_records
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS qa_status TEXT DEFAULT NULL
    CHECK (qa_status IS NULL OR qa_status IN ('pending_review', 'approved', 'flagged')),
  ADD COLUMN IF NOT EXISTS qa_reviewed_by UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS qa_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS technician_name TEXT,
  ADD COLUMN IF NOT EXISTS result TEXT
    CHECK (result IS NULL OR result IN ('pass', 'fail', 'n/a')),
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS service_id TEXT;

CREATE INDEX IF NOT EXISTS idx_vsr_qa_status
  ON vendor_service_records(qa_status)
  WHERE qa_status IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. service_record_reviews — audit trail of QA reviews
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS service_record_reviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id  UUID NOT NULL REFERENCES vendor_service_records(id) ON DELETE CASCADE,
  organization_id    UUID REFERENCES organizations(id) ON DELETE CASCADE,
  reviewer_id        UUID REFERENCES user_profiles(id),
  reviewer_name      TEXT,
  status             TEXT NOT NULL CHECK (status IN ('approved', 'flagged')),
  flag_category      TEXT CHECK (flag_category IS NULL OR flag_category IN (
    'incomplete_work', 'wrong_service', 'safety_concern', 'documentation_issue', 'other'
  )),
  flag_reason        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE service_record_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_record_reviews_read_own_org ON service_record_reviews;
CREATE POLICY service_record_reviews_read_own_org ON service_record_reviews
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_record_reviews_write_managers ON service_record_reviews;
CREATE POLICY service_record_reviews_write_managers ON service_record_reviews
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner_operator', 'executive', 'compliance_manager', 'facilities_manager', 'platform_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_srr_service_record
  ON service_record_reviews(service_record_id);

CREATE INDEX IF NOT EXISTS idx_srr_org
  ON service_record_reviews(organization_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. service_record_photos — before/after photo evidence
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS service_record_photos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id  UUID NOT NULL REFERENCES vendor_service_records(id) ON DELETE CASCADE,
  organization_id    UUID REFERENCES organizations(id) ON DELETE CASCADE,
  photo_type         TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  file_url           TEXT NOT NULL,
  caption            TEXT,
  taken_at           TIMESTAMPTZ,
  lat                DOUBLE PRECISION,
  lng                DOUBLE PRECISION,
  uploaded_by        UUID REFERENCES user_profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE service_record_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_record_photos_read_own_org ON service_record_photos;
CREATE POLICY service_record_photos_read_own_org ON service_record_photos
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_record_photos_write_own_org ON service_record_photos;
CREATE POLICY service_record_photos_write_own_org ON service_record_photos
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_srp_service_record
  ON service_record_photos(service_record_id);

CREATE INDEX IF NOT EXISTS idx_srp_org
  ON service_record_photos(organization_id);
