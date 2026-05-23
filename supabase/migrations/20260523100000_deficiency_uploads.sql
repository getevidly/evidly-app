-- ============================================================
-- deficiency_uploads — Inspection report uploads for AI extraction
-- Stores uploaded inspection report files + AI-extracted deficiency
-- items for operator review before batch creation.
-- ============================================================

CREATE TABLE IF NOT EXISTS deficiency_uploads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id),
  location_id           UUID REFERENCES locations(id),

  -- File metadata
  file_name             TEXT NOT NULL,
  file_size             INTEGER NOT NULL,
  file_type             TEXT NOT NULL,
  storage_path          TEXT NOT NULL,

  -- Optional link to a service record (attach mode)
  service_record_id     UUID,

  -- Processing lifecycle
  status                TEXT NOT NULL DEFAULT 'processing'
                          CHECK (status IN ('processing', 'review', 'completed', 'failed', 'cancelled')),
  error_message         TEXT,

  -- AI extraction results
  extracted_items       JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- AI metadata
  ai_model              TEXT,
  ai_prompt_version     TEXT,
  tokens_used           INTEGER,
  extraction_latency_ms INTEGER,

  -- Completion
  completed_at          TIMESTAMPTZ,
  completed_by          UUID,
  items_accepted        INTEGER,
  items_discarded       INTEGER,

  -- Ownership
  created_by            UUID REFERENCES user_profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for org lookups
CREATE INDEX IF NOT EXISTS idx_def_uploads_org
  ON deficiency_uploads (organization_id);

-- Index for status polling
CREATE INDEX IF NOT EXISTS idx_def_uploads_status
  ON deficiency_uploads (id, status);

-- RLS
ALTER TABLE deficiency_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their uploads"
  ON deficiency_uploads FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert uploads"
  ON deficiency_uploads FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org members can update their uploads"
  ON deficiency_uploads FOR UPDATE
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to uploads"
  ON deficiency_uploads FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_def_upload_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_def_upload_updated_at
  BEFORE UPDATE ON deficiency_uploads
  FOR EACH ROW EXECUTE FUNCTION update_def_upload_updated_at();

-- Add source_upload_id to deficiencies for traceability
ALTER TABLE deficiencies
  ADD COLUMN IF NOT EXISTS source_upload_id UUID REFERENCES deficiency_uploads(id);
