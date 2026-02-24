/*
  Fix: Allow authenticated users to create organizations during sign-up.

  The sign-up flow (AuthContext.signUp) inserts into organizations from the
  client as a freshly authenticated user. The existing RLS policies only allow
  SELECT and UPDATE — no INSERT policy existed, causing:
    "new row violates row-level security policy for table organizations"

  This migration adds:
  1. INSERT policy on organizations — any authenticated user can create an org
  2. INSERT policy on user_location_access — users can create their own access rows
  3. INSERT policy on user_profiles — users can create their own profile row

  The SECURITY DEFINER trigger (handle_new_user) already bypasses RLS, but the
  client-side signUp flow also inserts into these tables as a fallback/complement.
*/

-- Allow authenticated users to insert organizations (needed during sign-up)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to insert their own profile row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
      AND policyname = 'Users can insert their own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can insert their own profile"
        ON user_profiles FOR INSERT
        TO authenticated
        WITH CHECK (id = auth.uid())
    $policy$;
  END IF;
END $$;

-- Allow users to insert their own access rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_location_access'
      AND policyname = 'Users can insert their own access'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can insert their own access"
        ON user_location_access FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
    $policy$;
  END IF;
END $$;
