-- ============================================================================
-- BE-1 FIX: Replace handle_new_user trigger — remove domain-based org creation
--
-- Root cause: trigger extracted email domain (e.g. "gmail.com"), looked up or
-- created an org with that domain as its name, and linked the new user to it.
-- This raced EmailConfirmed.tsx provisioning and dropped the real business name
-- from the signup form's raw_user_meta_data.org_name.
--
-- Fix: org creation ownership is decided by an explicit metadata flag.
--
--   Self-signup path: org_name is in metadata. Trigger creates org from that
--   name, creates profile, creates access. RAISE EXCEPTION if org_name missing.
--
--   Admin-onboarding path: AdminClientOnboarding sets skip_trigger_org = true.
--   Admin already created org + profile + access before signUp(). Trigger
--   returns immediately — creates nothing, no duplicate org.
--
-- Also fixes BE-6: user_location_access role 'owner' → 'owner_operator'.
--
-- The trigger on_auth_user_created is NOT recreated — it already points to
-- handle_new_user(). CREATE OR REPLACE swaps the function body in place.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_name    text;
  _full_name   text;
  _org_id      uuid;
BEGIN
  -- Admin-onboarding path: admin already created org + profile + access.
  -- Skip entirely — do not create a duplicate org.
  IF (NEW.raw_user_meta_data ->> 'skip_trigger_org')::boolean IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Self-signup path: read real business name from signup form metadata
  _org_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'org_name', '')), '');

  -- If org_name is missing, fail loudly. Every self-signup MUST supply it.
  IF _org_name IS NULL THEN
    RAISE EXCEPTION 'Signup requires org_name in user metadata. Got NULL or empty for user %', NEW.id;
  END IF;

  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create a NEW org for this signup.
  -- NEVER look up by email domain. NEVER share orgs by domain.
  INSERT INTO organizations (name, industry_type)
  VALUES (_org_name, 'food_service')
  RETURNING id INTO _org_id;

  -- Create user profile linked to the new org
  INSERT INTO user_profiles (id, full_name, organization_id, role, created_at, updated_at)
  VALUES (NEW.id, _full_name, _org_id, 'owner_operator', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Link user to org (BE-6 fix: 'owner_operator', not 'owner')
  INSERT INTO user_location_access (user_id, organization_id, role)
  VALUES (NEW.id, _org_id, 'owner_operator')
  ON CONFLICT (user_id, organization_id, location_id) DO NOTHING;

  RETURN NEW;
END;
$$;
