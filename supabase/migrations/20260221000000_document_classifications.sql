-- Document AI Classification Log
-- Tracks every AI classification attempt for quality monitoring and learning
CREATE TABLE IF NOT EXISTS document_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  -- AI classification results
  ai_document_type TEXT,
  ai_document_label TEXT,
  ai_pillar TEXT,
  ai_vendor_name TEXT,
  ai_service_date DATE,
  ai_expiry_date DATE,
  ai_confidence REAL DEFAULT 0,
  ai_summary TEXT,
  ai_suggested_fields JSONB DEFAULT '{}'::jsonb,
  -- User actions
  user_accepted BOOLEAN DEFAULT FALSE,
  user_override_type TEXT,
  user_override_pillar TEXT,
  user_override_vendor TEXT,
  -- Metadata
  classified_by UUID REFERENCES auth.users(id),
  classification_method TEXT DEFAULT 'ai' CHECK (classification_method IN ('ai', 'manual', 'filename_only')),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_classifications_org ON document_classifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_classifications_type ON document_classifications(ai_document_type);
CREATE INDEX IF NOT EXISTS idx_doc_classifications_confidence ON document_classifications(ai_confidence);
CREATE INDEX IF NOT EXISTS idx_doc_classifications_created ON document_classifications(created_at DESC);

-- Enable RLS
ALTER TABLE document_classifications ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can view and insert classifications for their organization
CREATE POLICY "Users can view own org classifications"
  ON document_classifications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert classifications for own org"
  ON document_classifications FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org classifications"
  ON document_classifications FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_doc_classifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_doc_classifications_updated_at
  BEFORE UPDATE ON document_classifications
  FOR EACH ROW
  EXECUTE FUNCTION update_doc_classifications_updated_at();
