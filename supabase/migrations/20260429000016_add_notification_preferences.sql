-- Add notification_preferences table for per-user delivery channel and alert opt-in.
-- Also adds phone_verified column to user_profiles (phone already exists).
--
-- notification_preferences controls how a user receives alerts:
--   - sms_enabled / email_enabled / push_enabled: per-channel toggles
--   - cooldown_alerts_enabled: server-side cooldown alerts (locked decision —
--     fires regardless of login state, hits primary + secondary + manager simultaneously)
--   - out_of_range_alerts_enabled: temperature out-of-range push notifications
--   - missed_reading_alerts_enabled: missed reading reminders
--   - quiet_hours_start / quiet_hours_end: local-time window where non-critical
--     alerts suppress (CRITICAL severity always overrides quiet hours)
--
-- phone_verified column added to user_profiles (existing phone column kept as-is).

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  sms_enabled boolean DEFAULT false,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  cooldown_alerts_enabled boolean DEFAULT true,
  out_of_range_alerts_enabled boolean DEFAULT true,
  missed_reading_alerts_enabled boolean DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY notification_preferences_insert ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY notification_preferences_update ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid());
