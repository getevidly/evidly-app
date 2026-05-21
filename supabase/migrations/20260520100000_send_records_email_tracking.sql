-- C16a-2: Add email tracking columns to compliance_document_send_records
-- Tracks whether the portal link email was sent, its Resend message ID, and delivery status.

ALTER TABLE compliance_document_send_records
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_message_id text,
  ADD COLUMN IF NOT EXISTS email_status text CHECK (
    email_status IS NULL OR email_status IN ('sent', 'delivered', 'bounced', 'failed', 'opened', 'complained')
  );

-- Index for future Resend webhook lookups by email_message_id
CREATE INDEX IF NOT EXISTS idx_compliance_doc_send_email_msg
  ON compliance_document_send_records (email_message_id)
  WHERE email_message_id IS NOT NULL;
