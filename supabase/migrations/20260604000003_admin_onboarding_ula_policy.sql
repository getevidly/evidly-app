/*
 * 20260604000003_admin_onboarding_ula_policy.sql
 *
 * Fix #8: Allow platform_admin to insert user_location_access rows for any org.
 *
 * Problem: AdminClientOnboarding creates a ULA row for the new owner user,
 * but the existing INSERT policy requires auth.uid() = user_id. The platform
 * admin's uid ≠ the new user's id, so the insert is blocked by RLS.
 *
 * Fix: Narrow INSERT policy — platform_admin (checked via the existing
 * is_platform_admin() SECURITY DEFINER function) may insert ULA rows for
 * any user/org. Existing self-insert policy is untouched.
 *
 * Uses public.is_platform_admin() from 20260905000000_admin_read_access.sql
 * which checks user_profiles.role = 'platform_admin' without RLS recursion.
 */

-- New policy: platform_admin can insert ULA rows for any user/org
DROP POLICY IF EXISTS "platform_admin_insert_ula" ON user_location_access;
CREATE POLICY "platform_admin_insert_ula"
  ON user_location_access FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_platform_admin() );

-- Migration tracker
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260604000003')
ON CONFLICT DO NOTHING;
