/*
 * 20260604000004_admin_onboarding_profiles_locations_policy.sql
 *
 * Fix #8b: Parallel platform_admin INSERT policies for user_profiles + locations.
 *
 * Problem: AdminClientOnboarding (platform_admin) creates a new org, then
 * inserts a user_profiles row (id ≠ auth.uid()) and locations rows (admin has
 * no ULA row for the new org). Both are blocked by existing self-scoped RLS.
 *
 * Fix: Two narrow INSERT policies — platform_admin (via the existing
 * is_platform_admin() SECURITY DEFINER function) may insert into user_profiles
 * and locations for any user/org. Existing self-scoped policies are untouched.
 *
 * Uses public.is_platform_admin() from 20260905000000_admin_read_access.sql
 * which checks user_profiles.role = 'platform_admin' without RLS recursion.
 *
 * Companion to Fix #8 (20260604000003 — user_location_access INSERT policy).
 */

-- 1. user_profiles: platform_admin can insert profiles for any user
DROP POLICY IF EXISTS "platform_admin_insert_profiles" ON user_profiles;
CREATE POLICY "platform_admin_insert_profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_platform_admin() );

-- 2. locations: platform_admin can insert locations for any org
DROP POLICY IF EXISTS "platform_admin_insert_locations" ON locations;
CREATE POLICY "platform_admin_insert_locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_platform_admin() );

-- Migration tracker
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260604000004')
ON CONFLICT DO NOTHING;
