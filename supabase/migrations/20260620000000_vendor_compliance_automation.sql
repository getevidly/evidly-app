-- ============================================================
-- VENDOR COMPLIANCE AUTOMATION
-- Migration: 20260620000000
-- Tables: vendor_document_submissions, vendor_document_expiry_tracking
-- Alters: vendor_secure_tokens
-- ============================================================

-- ── 1. vendor_document_submissions ────────────────────────────
-- AI validation results + client review state for each uploaded
-- vendor document. Created by validate-vendor-document edge function.

CREATE TABLE IF NOT EXISTS vendor_document_submissions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_document_id    UUID NOT NULL REFERENCES vendor_documents(id) ON DELETE CASCADE,
  vendor_id             UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- AI Validation
  ai_validated          BOOLEAN DEFAULT FALSE,
  ai_validation_status  VARCHAR(20) DEFAULT 'pending'
    CHECK (ai_validation_status IN ('pending', 'passed', 'failed', 'error')),
  ai_validation_result  JSONB,
  ai_validated_at       TIMESTAMPTZ,

  -- Client Review
  review_status         VARCHAR(20) DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'declined')),
  reviewed_by           UUID,
  reviewed_at           TIMESTAMPTZ,
  review_notes          TEXT,
  decline_reason        TEXT,

  -- Workflow
  notification_sent_at  TIMESTAMPTZ,
  auto_approved         BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vds_org_review_status
  ON vendor_document_submissions(organization_id, review_status);
CREATE INDEX IF NOT EXISTS idx_vds_vendor_document
  ON vendor_document_submissions(vendor_document_id);
CREATE INDEX IF NOT EXISTS idx_vds_vendor
  ON vendor_document_submissions(vendor_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_vendor_document_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vds_updated_at ON vendor_document_submissions;
CREATE TRIGGER trg_vds_updated_at
  BEFORE UPDATE ON vendor_document_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_document_submissions_updated_at();

-- RLS
ALTER TABLE vendor_document_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vds_org_select ON vendor_document_submissions;
CREATE POLICY vds_org_select ON vendor_document_submissions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vds_org_insert ON vendor_document_submissions;
CREATE POLICY vds_org_insert ON vendor_document_submissions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vds_org_update ON vendor_document_submissions;
CREATE POLICY vds_org_update ON vendor_document_submissions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vds_service_role ON vendor_document_submissions;
CREATE POLICY vds_service_role ON vendor_document_submissions
  FOR ALL USING (auth.role() = 'service_role');


-- ── 2. vendor_document_expiry_tracking ────────────────────────
-- Tracks the 7-stage reminder cadence per expiring vendor document.
-- One row per vendor_document with an expiration_date.

CREATE TABLE IF NOT EXISTS vendor_document_expiry_tracking (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id               UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_document_id      UUID NOT NULL REFERENCES vendor_documents(id) ON DELETE CASCADE,
  document_type           VARCHAR(100) NOT NULL,
  expiration_date         DATE NOT NULL,

  -- 7-stage reminder timestamps (NULL = not sent yet)
  reminder_60d_sent_at    TIMESTAMPTZ,
  reminder_30d_sent_at    TIMESTAMPTZ,
  reminder_14d_sent_at    TIMESTAMPTZ,
  reminder_7d_sent_at     TIMESTAMPTZ,
  reminder_0d_sent_at     TIMESTAMPTZ,
  reminder_neg1d_sent_at  TIMESTAMPTZ,
  reminder_neg7d_sent_at  TIMESTAMPTZ,

  -- Resolution
  resolved                BOOLEAN DEFAULT FALSE,
  resolved_at             TIMESTAMPTZ,
  replacement_document_id UUID REFERENCES vendor_documents(id) ON DELETE SET NULL,

  created_at              TIMESTAMPTZ DEFAULT NOW(),

  -- One tracking row per document
  CONSTRAINT uq_expiry_tracking_doc UNIQUE (vendor_document_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vdet_expiration_unresolved
  ON vendor_document_expiry_tracking(expiration_date, resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_vdet_vendor_type
  ON vendor_document_expiry_tracking(vendor_id, document_type);
CREATE INDEX IF NOT EXISTS idx_vdet_org
  ON vendor_document_expiry_tracking(organization_id);

-- RLS
ALTER TABLE vendor_document_expiry_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vdet_org_select ON vendor_document_expiry_tracking;
CREATE POLICY vdet_org_select ON vendor_document_expiry_tracking
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vdet_org_insert ON vendor_document_expiry_tracking;
CREATE POLICY vdet_org_insert ON vendor_document_expiry_tracking
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vdet_org_update ON vendor_document_expiry_tracking;
CREATE POLICY vdet_org_update ON vendor_document_expiry_tracking
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vdet_service_role ON vendor_document_expiry_tracking;
CREATE POLICY vdet_service_role ON vendor_document_expiry_tracking
  FOR ALL USING (auth.role() = 'service_role');


-- ── 3. ALTER vendor_secure_tokens ─────────────────────────────
-- Add context columns so uploads can be linked back to their trigger.

ALTER TABLE vendor_secure_tokens
  ADD COLUMN IF NOT EXISTS upload_context VARCHAR(30) DEFAULT 'manual'
    CHECK (upload_context IN ('manual', 'service_due', 'document_expiry', 'auto_request'));

ALTER TABLE vendor_secure_tokens
  ADD COLUMN IF NOT EXISTS service_record_id UUID REFERENCES vendor_service_records(id) ON DELETE SET NULL;

ALTER TABLE vendor_secure_tokens
  ADD COLUMN IF NOT EXISTS expiry_tracking_id UUID REFERENCES vendor_document_expiry_tracking(id) ON DELETE SET NULL;


-- ── 4. Auto-create expiry tracking on vendor_documents insert ──
-- When a vendor_document is inserted with an expiration_date,
-- automatically create a tracking row.

CREATE OR REPLACE FUNCTION fn_auto_create_expiry_tracking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiration_date IS NOT NULL AND NEW.status != 'superseded' THEN
    INSERT INTO vendor_document_expiry_tracking (
      organization_id, vendor_id, vendor_document_id,
      document_type, expiration_date
    ) VALUES (
      NEW.organization_id, NEW.vendor_id, NEW.id,
      NEW.document_type, NEW.expiration_date
    )
    ON CONFLICT (vendor_document_id) DO UPDATE SET
      expiration_date = EXCLUDED.expiration_date,
      resolved = FALSE,
      resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_doc_expiry_tracking ON vendor_documents;
CREATE TRIGGER trg_vendor_doc_expiry_tracking
  AFTER INSERT ON vendor_documents
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_create_expiry_tracking();


-- ── 5. Enable realtime for submissions ────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE vendor_document_submissions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
