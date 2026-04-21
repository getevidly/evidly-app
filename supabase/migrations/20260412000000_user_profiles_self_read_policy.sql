-- TESTING-FIX-01: Add self-read policy on user_profiles
-- Without this, any RLS policy on another table that checks
-- user_profiles.role (like admin_view_all_orgs) fails because
-- the user can't read their own profile through RLS.

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
  CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT TO authenticated
    USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;