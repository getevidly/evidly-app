-- ================================================================
-- NOTIFICATION-SUPER-01: Unified Notification System
--
-- 1. ALTER notifications table — add category, severity, dismissed_at,
--    email_sent, action_label, source_type, source_id, signal_type,
--    snoozed_until + indexes
-- 2. CREATE notification_preferences — per-user per-category channel prefs
-- 3. Backfill existing rows
-- 4. Update signal publish trigger to set category + severity
-- ================================================================

-- ── 1. Extend notifications table ────────────────────────────────

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN category TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN severity TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN dismissed_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN email_sent BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN action_label TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN source_type TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN source_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN signal_type TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN snoozed_until TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index for category-based filtering
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON notifications(organization_id, category, created_at DESC);

-- Index for dismissed/snoozed filtering
CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON notifications(organization_id, created_at DESC)
  WHERE dismissed_at IS NULL;

-- Index for source deduplication
CREATE INDEX IF NOT EXISTS idx_notifications_source
  ON notifications(source_type, source_id)
  WHERE source_type IS NOT NULL;

-- ── 2. Create notification_preferences table ─────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  email_enabled   BOOLEAN NOT NULL DEFAULT true,
  sms_enabled     BOOLEAN NOT NULL DEFAULT false,
  push_enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own preferences" ON notification_preferences;
CREATE POLICY "Users see own preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own preferences" ON notification_preferences;
CREATE POLICY "Users update own preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own preferences" ON notification_preferences;
CREATE POLICY "Users insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own preferences" ON notification_preferences;
CREATE POLICY "Users delete own preferences"
  ON notification_preferences FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user
  ON notification_preferences(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_prefs_updated_at ON notification_preferences;
CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_updated_at();

-- ── 3. Backfill category on existing notification rows ───────────

UPDATE notifications SET category = 'safety'
WHERE type = 'intelligence_signal' AND category IS NULL;

UPDATE notifications SET category = 'vendors'
WHERE type IN ('vendor_upload', 'vendor_document', 'service_due', 'coi_expiry',
               'vendor_coi_expiry', 'vendor_service_overdue', 'vendor_cert_missing',
               'vendor_document_upload', 'vendor_document_flagged')
  AND category IS NULL;

UPDATE notifications SET category = 'documents'
WHERE type IN ('document_expiry', 'document_upload', 'document_renewal')
  AND category IS NULL;

UPDATE notifications SET category = 'team'
WHERE type IN ('employee_cert_expiry', 'training_assignment', 'team_invite', 'training_due')
  AND category IS NULL;

UPDATE notifications SET category = 'system'
WHERE type IN ('feature_release', 'weekly_digest', 'billing_alert', 'onboarding_step')
  AND category IS NULL;

-- Default unmatched to system
UPDATE notifications SET category = 'system'
WHERE category IS NULL;

-- Backfill severity from priority
UPDATE notifications SET severity = CASE
  WHEN priority IN ('critical', 'high') THEN 'urgent'
  WHEN priority = 'medium' THEN 'advisory'
  ELSE 'info'
END
WHERE severity IS NULL;

-- ── 4. Update signal publish trigger to set category + severity ──

CREATE OR REPLACE FUNCTION notify_on_signal_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = true AND (OLD.is_published IS DISTINCT FROM true) THEN
    INSERT INTO notifications (
      organization_id, signal_id, type, category, title, body,
      action_url, action_label, cic_pillar, priority, severity
    )
    SELECT
      o.id,
      NEW.id,
      'intelligence_signal',
      'safety',
      NEW.title,
      COALESCE(NEW.summary, NEW.ai_summary, NEW.content_summary),
      '/insights/intelligence',
      'View Signal',
      NEW.cic_pillar,
      CASE
        WHEN COALESCE(NEW.revenue_risk_level,'none')   = 'critical'
          OR COALESCE(NEW.liability_risk_level,'none')  = 'critical'
          OR COALESCE(NEW.ai_urgency,'medium')          = 'critical'
          THEN 'critical'
        WHEN COALESCE(NEW.revenue_risk_level,'none')   = 'high'
          OR COALESCE(NEW.liability_risk_level,'none')  = 'high'
          OR COALESCE(NEW.ai_urgency,'medium')          = 'high'
          THEN 'high'
        WHEN COALESCE(NEW.cost_risk_level,'none')      = 'high'
          OR COALESCE(NEW.operational_risk_level,'none') = 'high'
          THEN 'medium'
        ELSE 'low'
      END,
      CASE
        WHEN COALESCE(NEW.revenue_risk_level,'none')   = 'critical'
          OR COALESCE(NEW.liability_risk_level,'none')  = 'critical'
          OR COALESCE(NEW.ai_urgency,'medium')          = 'critical'
          THEN 'urgent'
        WHEN COALESCE(NEW.revenue_risk_level,'none')   = 'high'
          OR COALESCE(NEW.liability_risk_level,'none')  = 'high'
          OR COALESCE(NEW.ai_urgency,'medium')          = 'high'
          THEN 'urgent'
        WHEN COALESCE(NEW.cost_risk_level,'none')      = 'high'
          OR COALESCE(NEW.operational_risk_level,'none') = 'high'
          THEN 'advisory'
        ELSE 'info'
      END
    FROM organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.signal_id = NEW.id AND n.organization_id = o.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
