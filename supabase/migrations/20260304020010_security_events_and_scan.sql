-- ============================================================
-- Layer 4: security_events table for document upload logging
-- Layer 3: scan_status column on documents table
-- Layer 5: admin_notifications table for quarantine alerts
-- ============================================================

-- Layer 4: Security events table — logs every upload scan event
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  document_id uuid,
  file_hash text, -- SHA-256 hash of file contents
  scan_result text NOT NULL CHECK (scan_result IN ('clean', 'quarantined', 'download_failed', 'scan_error')),
  event_type text NOT NULL CHECK (event_type IN ('upload_scan', 'scan_error', 'quarantine_review', 'quarantine_release')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by document
CREATE INDEX IF NOT EXISTS idx_security_events_document_id ON security_events(document_id);
-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
-- Index for quarantine reviews
CREATE INDEX IF NOT EXISTS idx_security_events_scan_result ON security_events(scan_result) WHERE scan_result = 'quarantined';

-- RLS: only org admins and the user themselves can see their events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own security events" ON security_events;
CREATE POLICY "Users can view own security events"
  ON security_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to security events" ON security_events;
CREATE POLICY "Service role has full access to security events"
  ON security_events FOR ALL
  USING (auth.role() = 'service_role');

-- Layer 3: Add scan_status column to documents table
-- Values: 'scanning' (upload in progress), 'available' (clean), 'quarantined' (failed scan)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'scan_status'
  ) THEN
    ALTER TABLE documents ADD COLUMN scan_status text DEFAULT 'available'
      CHECK (scan_status IN ('scanning', 'available', 'quarantined'));
  END IF;
END $$;

-- Layer 5: Admin notifications table (if not exists)
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for org lookup
CREATE INDEX IF NOT EXISTS idx_admin_notifications_org ON admin_notifications(organization_id);
-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(organization_id) WHERE read_at IS NULL;

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to admin notifications" ON admin_notifications;
CREATE POLICY "Service role has full access to admin notifications"
  ON admin_notifications FOR ALL
  USING (auth.role() = 'service_role');
