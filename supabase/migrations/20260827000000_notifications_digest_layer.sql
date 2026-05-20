-- C10.5 — Notifications digest layer
-- Adds digest infrastructure to existing notification system.
-- Does NOT recreate notifications, notification_preferences, or user_profiles.phone.

-- ═══════════════════════════════════════════════════════════════
-- ALTER 1: notifications — add acknowledged_at + digest_eligible
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS digest_eligible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_notifications_digest
  ON notifications (user_id, created_at)
  WHERE digest_eligible = true AND acknowledged_at IS NULL AND dismissed_at IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- ALTER 2: notification_preferences — upgrade from v1 (single-row)
-- to v2 (per-category) + add digest_opt_out
-- PROD has: id, user_id (UNIQUE), sms/email/push_enabled,
--   cooldown/out_of_range/missed_reading alerts, quiet_hours, timestamps
-- Need: category, organization_id, digest_opt_out columns + new UNIQUE
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS digest_opt_out BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Drop old UNIQUE(user_id) so we can have multiple rows per user (one per category)
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_key;

-- Add new UNIQUE(user_id, category) for per-category upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_preferences_user_id_category_key'
  ) THEN
    -- First, delete any existing rows that would conflict (orphaned single-row prefs)
    -- These will be replaced by the backfill below
    DELETE FROM notification_preferences WHERE category IS NULL;
    ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_category_key UNIQUE (user_id, category);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: notification_deliveries
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id     UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  recipient           TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced', 'suppressed')),
  provider_message_id TEXT,
  failure_reason      TEXT,
  digest_batch_id     UUID,
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notification_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON notification_deliveries (status, sent_at);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_digest_batch
  ON notification_deliveries (digest_batch_id)
  WHERE digest_batch_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- RLS: notification_deliveries
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can see their own deliveries (via join to notifications)
CREATE POLICY "Users read own deliveries"
  ON notification_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_deliveries.notification_id
        AND n.user_id = auth.uid()
    )
  );

-- Service role can insert/update (edge functions only)
CREATE POLICY "Service role manages deliveries"
  ON notification_deliveries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- BACKFILL: ensure all existing users have preference rows
-- ═══════════════════════════════════════════════════════════════

-- Backfill: create per-category rows for all users with an org
INSERT INTO notification_preferences (user_id, organization_id, category, email_enabled, sms_enabled, push_enabled, digest_opt_out)
SELECT
  up.id,
  up.organization_id,
  c.category::text,
  true,
  false,
  true,
  false
FROM user_profiles up
CROSS JOIN (VALUES ('compliance'), ('safety'), ('documents'), ('vendors'), ('team'), ('system')) AS c(category)
WHERE up.organization_id IS NOT NULL
ON CONFLICT (user_id, category) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- CRON: daily digest (hourly UTC, edge fn filters to 7 AM org-local)
-- ═══════════════════════════════════════════════════════════════
-- NOTE: Run manually in SQL Editor after deploying the edge function:
--
-- SELECT cron.schedule(
--   'daily-notification-digest',
--   '0 * * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/send-daily-digest',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json',
--       'x-evidly-cron-source', 'daily-digest'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'acknowledged_at') THEN
    RAISE EXCEPTION 'acknowledged_at column missing from notifications';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'digest_eligible') THEN
    RAISE EXCEPTION 'digest_eligible column missing from notifications';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'category') THEN
    RAISE EXCEPTION 'category column missing from notification_preferences';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'organization_id') THEN
    RAISE EXCEPTION 'organization_id column missing from notification_preferences';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'digest_opt_out') THEN
    RAISE EXCEPTION 'digest_opt_out column missing from notification_preferences';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_user_id_category_key') THEN
    RAISE EXCEPTION 'UNIQUE(user_id, category) constraint missing from notification_preferences';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_deliveries') THEN
    RAISE EXCEPTION 'notification_deliveries table missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_digest') THEN
    RAISE EXCEPTION 'idx_notifications_digest index missing';
  END IF;
  RAISE NOTICE 'C10.5 digest layer verification passed — all objects present';
END $$;
