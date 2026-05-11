-- M6: Add viewed_at for Resend email.opened webhook tracking

ALTER TABLE compliance_document_requests
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
