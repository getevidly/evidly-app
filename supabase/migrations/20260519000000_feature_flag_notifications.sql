-- FEATURE-FLAGS-02: Notification preferences for scheduled feature flags
-- Users can opt-in to be notified when a scheduled feature goes live.

CREATE TABLE IF NOT EXISTS feature_flag_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  UNIQUE(flag_key, user_id)
);

ALTER TABLE feature_flag_notifications ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notification preferences
CREATE POLICY "users_manage_own_notifications"
  ON feature_flag_notifications FOR ALL
  USING (user_id = auth.uid());

-- Admins can manage all notification preferences
CREATE POLICY "admin_manage_all_notifications"
  ON feature_flag_notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE INDEX idx_ffn_flag_key ON feature_flag_notifications(flag_key);
CREATE INDEX idx_ffn_user_id ON feature_flag_notifications(user_id);
