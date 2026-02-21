-- ================================================================
-- General Notifications Table + Supabase Realtime
-- Supports real-time delivery to authenticated clients
-- ================================================================

-- General notifications table (source of truth for realtime delivery)
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,         -- 'document_expiry', 'service_due', 'vendor_upload', etc.
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org notifications"
  ON notifications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Index for dropdown query (unread first, recent first)
CREATE INDEX IF NOT EXISTS idx_notifications_org_unread
  ON notifications(organization_id, created_at DESC)
  WHERE read_at IS NULL;

-- Enable Supabase Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
