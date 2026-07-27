-- Allow platform_admin users to manage intelligence_signals regardless of
-- email domain.  The existing sig_staff_all policy gates on
-- auth.jwt()->>'email' ~~ '%@getevidly.com', which silently rejects any
-- admin whose JWT email falls outside that domain.
--
-- PostgreSQL OR-combines RLS policies for the same command type, so this
-- second policy works alongside the existing one: if EITHER matches the
-- operation is allowed.

CREATE POLICY sig_platform_admin_all ON intelligence_signals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'platform_admin'
    )
  );
