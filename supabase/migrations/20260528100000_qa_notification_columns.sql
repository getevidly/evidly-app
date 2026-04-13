-- QA Notification System
-- Migration: 20260528100000_qa_notification_columns.sql

-- =============================================
-- ADD QA NOTIFICATION COLUMNS
-- =============================================

ALTER TABLE service_reports ADD COLUMN IF NOT EXISTS qa_notified_at TIMESTAMPTZ;
ALTER TABLE service_reports ADD COLUMN IF NOT EXISTS qa_notification_sent BOOLEAN DEFAULT false;

-- =============================================
-- ADD JOB NUMBER COLUMN
-- =============================================

-- Job numbers use service-type prefix: KEC 2603-001, FPM 2603-001, etc.
-- Format: {PREFIX} {YY}{MM}-{###}
-- Resets monthly per vendor per service type
ALTER TABLE service_reports ALTER COLUMN certificate_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_certificate ON service_reports(certificate_id);

-- =============================================
-- QA NOTIFICATION TRIGGER
-- =============================================

-- Automatically notify QA when both signatures are captured
CREATE OR REPLACE FUNCTION notify_qa_on_signatures()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when both signatures are present and notification hasn't been sent
  IF NEW.lead_tech_signature_url IS NOT NULL
     AND NEW.customer_signature_url IS NOT NULL
     AND (NEW.qa_notification_sent = false OR NEW.qa_notification_sent IS NULL) THEN

    -- Mark as notified (the edge function call is handled by the application layer)
    NEW.qa_notification_sent := true;
    NEW.qa_notified_at := NOW();

    -- Update status to completed if still in_progress
    IF NEW.overall_status = 'in_progress' THEN
      NEW.overall_status := 'completed';
    END IF;

    -- Set QA status to pending if not already set
    IF NEW.qa_status = 'pending' OR NEW.qa_status IS NULL THEN
      NEW.qa_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS trigger_notify_qa ON service_reports;
CREATE TRIGGER trigger_notify_qa
  BEFORE UPDATE ON service_reports
  FOR EACH ROW EXECUTE FUNCTION notify_qa_on_signatures();

-- =============================================
-- EMAIL QUEUE TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_template ON email_queue(template);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to email_queue
CREATE POLICY email_queue_service ON email_queue
  FOR ALL USING (true);
