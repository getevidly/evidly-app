-- SIGNAL-VALIDATION-01: Seven-Step Human Validation Pipeline
-- Adds review columns to intelligence_signals + signal_review_log table

-- ────────────────────────────────────────────────────────
-- 1. New columns on intelligence_signals
-- ────────────────────────────────────────────────────────
ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS arthur_notes TEXT;

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS target_org_ids UUID[];

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS preview_sent BOOLEAN DEFAULT false;

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS detail_markdown TEXT;

-- GIN index for subset-targeted signal queries
CREATE INDEX IF NOT EXISTS idx_signals_target_org_ids
  ON intelligence_signals USING GIN (target_org_ids)
  WHERE target_org_ids IS NOT NULL;

-- ────────────────────────────────────────────────────────
-- 2. signal_review_log — immutable review action log
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signal_review_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id  UUID NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  action     TEXT NOT NULL CHECK (action IN (
    'approve', 'approve_subset', 'edit', 'reject', 'hold',
    'preview_sent', 'restore', 'edit_approve', 'create'
  )),
  actor_id   UUID REFERENCES auth.users(id),
  actor_email TEXT,
  notes      TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srl_signal  ON signal_review_log (signal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_srl_actor   ON signal_review_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_srl_action  ON signal_review_log (action, created_at DESC);

ALTER TABLE signal_review_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access (matches platform_audit_log pattern)
DO $$ BEGIN
  CREATE POLICY srl_admin_all ON signal_review_log
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY srl_service ON signal_review_log
    FOR ALL TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE signal_review_log IS 'Immutable log of all admin review actions on intelligence signals';
COMMENT ON COLUMN intelligence_signals.arthur_notes IS 'Admin review notes for the signal';
COMMENT ON COLUMN intelligence_signals.target_org_ids IS 'UUID array for subset-targeted signal delivery';
COMMENT ON COLUMN intelligence_signals.preview_sent IS 'Whether a preview was sent before publishing';
COMMENT ON COLUMN intelligence_signals.edit_count IS 'Number of times the signal has been edited';
