-- ============================================================
-- VENDOR DOCUMENT UPDATE NOTIFICATIONS
-- Migration: 20260407000000
-- Tables: vendor_documents, vendor_document_notifications, vendor_document_reviews
-- ============================================================

-- ── 1. vendor_documents ─────────────────────────────────────────
-- Tracks documents uploaded by vendors with version history,
-- review status, and AI classification metadata.

CREATE TABLE IF NOT EXISTS vendor_documents (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id         UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Document metadata
  document_type     VARCHAR(100) NOT NULL,
  title             TEXT NOT NULL,
  file_url          TEXT,
  file_size         INTEGER,
  file_type         VARCHAR(50),

  -- Status & versioning
  status            VARCHAR(30) NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'accepted', 'flagged', 'expired', 'superseded')),
  version           INTEGER NOT NULL DEFAULT 1,
  parent_id         UUID REFERENCES vendor_documents(id) ON DELETE SET NULL,

  -- Expiration
  expiration_date   DATE,

  -- Upload context
  upload_method     VARCHAR(20) DEFAULT 'manual'
    CHECK (upload_method IN ('manual', 'secure_link', 'vendor_portal', 'auto_request')),
  uploaded_by_vendor BOOLEAN DEFAULT FALSE,
  vendor_notes      TEXT,

  -- AI classification
  ai_classified     BOOLEAN DEFAULT FALSE,
  ai_confidence     REAL,
  ai_document_label TEXT,

  -- Review
  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ,
  review_notes      TEXT,

  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_documents_org_vendor
  ON vendor_documents(organization_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_org_status
  ON vendor_documents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_expiration
  ON vendor_documents(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_documents_parent
  ON vendor_documents(parent_id) WHERE parent_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_vendor_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendor_documents_updated_at
  BEFORE UPDATE ON vendor_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_documents_updated_at();

-- RLS
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_documents_org_select ON vendor_documents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vendor_documents_org_insert ON vendor_documents
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vendor_documents_org_update ON vendor_documents
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vendor_documents_service_role ON vendor_documents
  FOR ALL USING (auth.role() = 'service_role');


-- ── 2. vendor_document_notifications ────────────────────────────
-- Tracks notifications sent when vendors upload/update documents
-- or when documents approach expiration.

CREATE TABLE IF NOT EXISTS vendor_document_notifications (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_document_id  UUID REFERENCES vendor_documents(id) ON DELETE CASCADE,
  vendor_id           UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Recipient
  recipient_user_id   UUID,
  recipient_role      VARCHAR(50),

  -- Notification content
  channel             VARCHAR(10) NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  notification_type   VARCHAR(30) NOT NULL CHECK (notification_type IN (
    'new_upload', 'updated', 'expiring_90', 'expiring_60', 'expiring_30',
    'expiring_14', 'expired', 'review_required', 'review_completed', 'flagged'
  )),
  title               TEXT NOT NULL,
  body                TEXT,
  action_url          TEXT,

  -- Lifecycle
  read_at             TIMESTAMPTZ,
  clicked_at          TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  delivery_status     VARCHAR(20) DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vdn_org_recipient
  ON vendor_document_notifications(organization_id, recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_vdn_notification_type
  ON vendor_document_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_vdn_unread
  ON vendor_document_notifications(recipient_user_id, read_at) WHERE read_at IS NULL;

-- RLS
ALTER TABLE vendor_document_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY vdn_org_select ON vendor_document_notifications
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vdn_org_insert ON vendor_document_notifications
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vdn_org_update ON vendor_document_notifications
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vdn_service_role ON vendor_document_notifications
  FOR ALL USING (auth.role() = 'service_role');


-- ── 3. vendor_document_reviews ──────────────────────────────────
-- Tracks review actions (accept / flag) on vendor documents.

CREATE TABLE IF NOT EXISTS vendor_document_reviews (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_document_id  UUID NOT NULL REFERENCES vendor_documents(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reviewer
  reviewer_id         UUID,
  reviewer_name       TEXT,

  -- Review outcome
  status              VARCHAR(20) NOT NULL CHECK (status IN ('accepted', 'flagged')),
  flag_reason         TEXT,
  flag_category       VARCHAR(50),

  -- Resolution
  resolution_status   VARCHAR(20) DEFAULT 'open'
    CHECK (resolution_status IN ('open', 'resolved', 'escalated')),
  resolution_notes    TEXT,
  resolved_by         UUID,
  resolved_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vdr_vendor_document
  ON vendor_document_reviews(vendor_document_id);
CREATE INDEX IF NOT EXISTS idx_vdr_org_status
  ON vendor_document_reviews(organization_id, status);

-- RLS
ALTER TABLE vendor_document_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY vdr_org_select ON vendor_document_reviews
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vdr_org_insert ON vendor_document_reviews
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vdr_org_update ON vendor_document_reviews
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY vdr_service_role ON vendor_document_reviews
  FOR ALL USING (auth.role() = 'service_role');


-- ── Enable realtime for in-app notifications ────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE vendor_document_notifications;
