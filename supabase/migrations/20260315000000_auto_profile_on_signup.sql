/*
  Auto-create organization + user_profiles on sign-up

  Trigger fires AFTER INSERT on auth.users.
  1. Extracts email domain (e.g. "getevidly.com")
  2. Looks for an existing organization with that domain name
     - If found, reuses it (so teammates join the same org)
     - If not found, creates a new one
  3. Creates a user_profiles row linked to the org
  4. Creates a user_location_access row linking user → org
*/

-- RLS INSERT policies required for the trigger to work
CREATE POLICY "Service role can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert their own access"
  ON user_location_access FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger function (SECURITY DEFINER, owned by postgres)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email       text;
  _domain      text;
  _full_name   text;
  _org_id      uuid;
BEGIN
  _email     := NEW.email;
  _domain    := split_part(_email, '@', 2);
  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(_email, '@', 1)
  );

  -- Look for an existing org with this domain name
  SELECT id INTO _org_id
    FROM organizations
   WHERE name = _domain
   LIMIT 1;

  -- If none, create one
  IF _org_id IS NULL THEN
    INSERT INTO organizations (name, industry_type)
    VALUES (_domain, 'food_service')
    RETURNING id INTO _org_id;
  END IF;

  -- Create user profile
  INSERT INTO user_profiles (id, full_name, organization_id, role, created_at, updated_at)
  VALUES (NEW.id, _full_name, _org_id, 'owner_operator', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Link user to org
  INSERT INTO user_location_access (user_id, organization_id, role)
  VALUES (NEW.id, _org_id, 'owner')
  ON CONFLICT (user_id, organization_id, location_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
