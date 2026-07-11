-- Per-user thread read tracking for service request message threads.
-- Replaces localStorage-only approach so read/unread syncs across devices.
-- RLS: users can only access their own rows, scoped by organization_id via user_profiles.

CREATE TABLE IF NOT EXISTS thread_reads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  last_read_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Index for fast lookup: user's read timestamps across threads
CREATE INDEX IF NOT EXISTS idx_thread_reads_user_org
  ON thread_reads (user_id, organization_id);

-- RLS: scoped via user_profiles (NOT auth.users)
ALTER TABLE thread_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thread_reads_user_org_policy"
  ON thread_reads FOR ALL
  USING (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
