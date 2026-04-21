-- ============================================================
-- Emulation Audit Log — tracks every user emulation session
-- ============================================================

CREATE TABLE IF NOT EXISTS emulation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id text NOT NULL, -- text to support demo IDs (d1, d2, etc.)
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  actions_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for admin lookups
CREATE INDEX IF NOT EXISTS idx_emulation_audit_admin ON emulation_audit_log(admin_id);

-- Index for target user lookups
CREATE INDEX IF NOT EXISTS idx_emulation_audit_target ON emulation_audit_log(target_user_id);

-- Index for active sessions (no ended_at)
CREATE INDEX IF NOT EXISTS idx_emulation_audit_active ON emulation_audit_log(admin_id) WHERE ended_at IS NULL;

-- RLS: only the admin who initiated the session can view their own logs
ALTER TABLE emulation_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view own emulation logs" ON emulation_audit_log;
CREATE POLICY "Admins can view own emulation logs"
  ON emulation_audit_log FOR SELECT
  USING (auth.uid() = admin_id);

DROP POLICY IF EXISTS "Admins can insert emulation logs" ON emulation_audit_log;
CREATE POLICY "Admins can insert emulation logs"
  ON emulation_audit_log FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

DROP POLICY IF EXISTS "Admins can update own emulation logs" ON emulation_audit_log;
CREATE POLICY "Admins can update own emulation logs"
  ON emulation_audit_log FOR UPDATE
  USING (auth.uid() = admin_id);

DROP POLICY IF EXISTS "Service role has full access" ON emulation_audit_log;
CREATE POLICY "Service role has full access"
  ON emulation_audit_log FOR ALL
  USING (auth.role() = 'service_role');
