-- AUDIT-FIX-04 / FIX 5: Per-user read/unread tracking for intelligence signals
-- Tracks which signals each user has read via (signal_id, user_id) unique pair.

CREATE TABLE IF NOT EXISTS signal_reads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id  uuid NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(signal_id, user_id)
);

ALTER TABLE signal_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_reads" ON signal_reads;
CREATE POLICY "users_manage_own_reads" ON signal_reads
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_signal_reads_user ON signal_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_reads_signal ON signal_reads(signal_id);
