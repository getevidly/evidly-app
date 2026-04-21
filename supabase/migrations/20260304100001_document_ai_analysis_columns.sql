-- ============================================================
-- Document AI Analysis Columns + Cloud Import Metadata
-- ============================================================
-- Adds structured AI-extracted fields to the documents table
-- (stored as individual columns per prompt requirement).
-- Also adds cloud import tracking columns.
-- ============================================================

-- ── AI Analysis Columns ──────────────────────────────────────

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_document_type       text,
  ADD COLUMN IF NOT EXISTS ai_document_type_label text,
  ADD COLUMN IF NOT EXISTS ai_issue_date          date,
  ADD COLUMN IF NOT EXISTS ai_expiration_date     date,
  ADD COLUMN IF NOT EXISTS ai_issuing_agency      text,
  ADD COLUMN IF NOT EXISTS ai_inspector_name      text,
  ADD COLUMN IF NOT EXISTS ai_score_grade         text,
  ADD COLUMN IF NOT EXISTS ai_violations          text[],
  ADD COLUMN IF NOT EXISTS ai_compliance_status   text CHECK (ai_compliance_status IN ('compliant', 'non_compliant', 'needs_review')),
  ADD COLUMN IF NOT EXISTS ai_confidence          numeric(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ADD COLUMN IF NOT EXISTS ai_analyzed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS needs_attention         boolean DEFAULT false;

-- ── Cloud Import Metadata ────────────────────────────────────

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS import_source     text DEFAULT 'direct' CHECK (import_source IN ('direct', 'google_drive', 'onedrive', 'dropbox')),
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS imported_at       timestamptz;

-- ── Expiration Alert Tracking ────────────────────────────────

CREATE TABLE IF NOT EXISTS document_expiration_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  days_before     int NOT NULL CHECK (days_before IN (60, 30, 7)),
  alert_date      date NOT NULL,
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'skipped')),
  sent_at         timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (document_id, days_before)
);

-- RLS for expiration alerts
ALTER TABLE document_expiration_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org alerts" ON document_expiration_alerts;
CREATE POLICY "Users can view their org alerts"
  ON document_expiration_alerts FOR SELECT
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role manages alerts" ON document_expiration_alerts;
CREATE POLICY "Service role manages alerts"
  ON document_expiration_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_documents_needs_attention
  ON documents (needs_attention) WHERE needs_attention = true;

CREATE INDEX IF NOT EXISTS idx_documents_import_source
  ON documents (import_source) WHERE import_source != 'direct';

CREATE INDEX IF NOT EXISTS idx_documents_ai_analyzed
  ON documents (ai_analyzed_at) WHERE ai_analyzed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_doc_exp_alerts_status
  ON document_expiration_alerts (status, alert_date) WHERE status = 'scheduled';
