-- ================================================================
-- RECOVERY COMMIT A: Provision notifications table
--
-- Context: Migration 20260310000000_notifications_table was tracked
-- in schema_migrations but the table was never created in PROD.
-- Subsequent column extensions (20260312000001, 20260601000000) also
-- never applied. This migration consolidates all three into one
-- idempotent CREATE TABLE with the full 21-column schema expected
-- by all current consumers.
--
-- Also removes the table-existence guard from notify_evidence_trail_message
-- (commit 4cfef01) now that the table is guaranteed to exist.
-- ================================================================

-- ── 1. CREATE TABLE ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium',
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- From 20260312000001 (signal_notifications)
  signal_id       UUID REFERENCES intelligence_signals(id) ON DELETE SET NULL,
  cic_pillar      TEXT,
  -- From 20260601000000 (notification_super_01)
  category        TEXT,
  severity        TEXT,
  dismissed_at    TIMESTAMPTZ,
  email_sent      BOOLEAN DEFAULT false,
  action_label    TEXT,
  source_type     TEXT,
  source_id       UUID,
  signal_type     TEXT,
  snoozed_until   TIMESTAMPTZ
);

-- ── 2. INDEXES ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_org_unread
  ON notifications(organization_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_signal_org
  ON notifications(signal_id, organization_id)
  WHERE signal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON notifications(organization_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON notifications(organization_id, created_at DESC)
  WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_source
  ON notifications(source_type, source_id)
  WHERE source_type IS NOT NULL;

-- ── 3. RLS ──────────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org notifications" ON notifications;
CREATE POLICY "Users see own org notifications"
  ON notifications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert org notifications" ON notifications;
CREATE POLICY "Users can insert org notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update org notifications" ON notifications;
CREATE POLICY "Users can update org notifications"
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

-- ── 4. REALTIME ─────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- ── 5. CLEAN notify_evidence_trail_message (remove guard) ───────

CREATE OR REPLACE FUNCTION notify_evidence_trail_message()
RETURNS TRIGGER AS $$
DECLARE
  v_thread RECORD;
  v_sender RECORD;
  v_participant RECORD;
BEGIN
  -- Resolve thread metadata + human-readable label
  SELECT t.organization_id, t.requirement_code, t.pillar, r.label
  INTO v_thread
  FROM onboarding_item_threads t
  LEFT JOIN onboarding_pillar_requirements r
    ON r.requirement_code = t.requirement_code
  WHERE t.id = NEW.thread_id;

  IF v_thread IS NULL THEN RETURN NEW; END IF;

  -- Resolve sender name
  SELECT full_name INTO v_sender
  FROM user_profiles WHERE id = NEW.sender_user_id;

  -- Notify each participant except sender
  FOR v_participant IN
    SELECT p.user_id
    FROM onboarding_item_thread_participants p
    WHERE p.thread_id = NEW.thread_id
      AND p.user_id != NEW.sender_user_id
  LOOP
    INSERT INTO notifications (
      organization_id, user_id, type, category, title, body,
      action_url, action_label, priority, severity,
      source_type, source_id
    ) VALUES (
      v_thread.organization_id,
      v_participant.user_id,
      'evidence_trail_message',
      'team',
      'New message on ' || COALESCE(v_thread.label, v_thread.requirement_code),
      COALESCE(v_sender.full_name, 'A team member') || ' added a message',
      '/onboarding?req=' || v_thread.requirement_code,
      'View discussion',
      'medium',
      'info',
      'onboarding_item_thread_messages',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. RULE #14 VERIFICATION BLOCK ─────────────────────────────

DO $$
DECLARE
  v_missing TEXT[] := '{}';
  v_col TEXT;
  v_idx TEXT;
  v_pol TEXT;
BEGIN
  -- 1. Table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    RAISE EXCEPTION 'VERIFY FAIL: notifications table does not exist';
  END IF;

  -- 2. All 21 columns
  FOREACH v_col IN ARRAY ARRAY[
    'id','organization_id','user_id','type','title','body','action_url',
    'priority','read_at','created_at','signal_id','cic_pillar','category',
    'severity','dismissed_at','email_sent','action_label','source_type',
    'source_id','signal_type','snoozed_until'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = v_col
    ) THEN
      v_missing := v_missing || v_col;
    END IF;
  END LOOP;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'VERIFY FAIL: missing columns: %', array_to_string(v_missing, ', ');
  END IF;

  -- 3. All 5 indexes
  FOREACH v_idx IN ARRAY ARRAY[
    'idx_notifications_org_unread','idx_notifications_signal_org',
    'idx_notifications_category','idx_notifications_active','idx_notifications_source'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = v_idx
    ) THEN
      RAISE EXCEPTION 'VERIFY FAIL: missing index %', v_idx;
    END IF;
  END LOOP;

  -- 4. All 3 RLS policies
  FOREACH v_pol IN ARRAY ARRAY[
    'Users see own org notifications',
    'Users can insert org notifications',
    'Users can update org notifications'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = v_pol
    ) THEN
      RAISE EXCEPTION 'VERIFY FAIL: missing RLS policy "%"', v_pol;
    END IF;
  END LOOP;

  -- 5. Realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    RAISE EXCEPTION 'VERIFY FAIL: notifications not in supabase_realtime publication';
  END IF;

  -- 6. Function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'notify_evidence_trail_message'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'VERIFY FAIL: notify_evidence_trail_message function missing';
  END IF;

  -- 7. Trigger binding exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_evidence_trail_notify'
      AND tgrelid = 'onboarding_item_thread_messages'::regclass
  ) THEN
    RAISE EXCEPTION 'VERIFY FAIL: trg_evidence_trail_notify trigger not bound to onboarding_item_thread_messages';
  END IF;

  RAISE NOTICE 'VERIFY PASS: notifications table — 21 columns, 5 indexes, 3 RLS policies, realtime, trigger function + binding';
END $$;
