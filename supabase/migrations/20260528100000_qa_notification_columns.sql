-- QA Notification System
-- Migration: 20260528100000_qa_notification_columns.sql

-- =============================================
-- ADD QA NOTIFICATION COLUMNS (only if service_reports exists)
-- =============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_reports') THEN
    ALTER TABLE service_reports ADD COLUMN IF NOT EXISTS qa_notified_at TIMESTAMPTZ;
    ALTER TABLE service_reports ADD COLUMN IF NOT EXISTS qa_notification_sent BOOLEAN DEFAULT false;
    ALTER TABLE service_reports ALTER COLUMN certificate_id DROP NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_reports_certificate ON service_reports(certificate_id);
  END IF;
END $$;

-- =============================================
-- QA NOTIFICATION TRIGGER (only if service_reports exists)
-- =============================================

CREATE OR REPLACE FUNCTION notify_qa_on_signatures()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_tech_signature_url IS NOT NULL
     AND NEW.customer_signature_url IS NOT NULL
     AND (NEW.qa_notification_sent = false OR NEW.qa_notification_sent IS NULL) THEN
    NEW.qa_notification_sent := true;
    NEW.qa_notified_at := NOW();
    IF NEW.overall_status = 'in_progress' THEN
      NEW.overall_status := 'completed';
    END IF;
    IF NEW.qa_status = 'pending' OR NEW.qa_status IS NULL THEN
      NEW.qa_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_reports') THEN
    DROP TRIGGER IF EXISTS trigger_notify_qa ON service_reports;
    CREATE TRIGGER trigger_notify_qa
      BEFORE UPDATE ON service_reports
      FOR EACH ROW EXECUTE FUNCTION notify_qa_on_signatures();
  END IF;
END $$;

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

DROP POLICY IF EXISTS email_queue_service ON email_queue;
CREATE POLICY email_queue_service ON email_queue
  FOR ALL USING (true);
