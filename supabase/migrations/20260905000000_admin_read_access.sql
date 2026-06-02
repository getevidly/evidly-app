/*
 * Admin read-access fix for organizations + user_profiles.
 *
 * Problem: Both tables have RLS policies that scope reads to the user's own
 * org (via user_location_access). Platform admins see ~nothing because there
 * is no bypass policy. AdminOrgs shows 0 orgs; AdminUsers shows 0 users.
 *
 * Fix: A SECURITY DEFINER helper (is_platform_admin) checks the caller's role
 * without triggering RLS on user_profiles — avoids 42P17 infinite recursion.
 * Both SELECT bypass policies and the email RPC call is_platform_admin().
 *
 * Also adds a SECURITY DEFINER RPC so AdminUsers can fetch emails from
 * auth.users (email is not a column on user_profiles).
 *
 * Also adds is_system boolean to organizations so AdminOrgs can exclude
 * system/seed rows (__SYSTEM_TEMPLATES__) from the tenant org count.
 *
 * Tenant users are unaffected — their existing org-scoped policies remain.
 */

-- ── 0. Helper: check platform_admin without triggering RLS ────────
--    SECURITY DEFINER runs as the function owner (superuser), so the
--    internal SELECT on user_profiles bypasses RLS. Policies can call
--    this safely without recursion.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'platform_admin'
  );
$$;

-- ── 1. Organizations: platform_admin can read all orgs ────────────

DROP POLICY IF EXISTS "admin_read_all_organizations" ON organizations;
CREATE POLICY "admin_read_all_organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING ( public.is_platform_admin() );

-- ── 2. User profiles: platform_admin can read all profiles ────────

DROP POLICY IF EXISTS "admin_read_all_profiles" ON user_profiles;
CREATE POLICY "admin_read_all_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING ( public.is_platform_admin() );

-- ── 3. is_system flag on organizations ─────────────────────────────

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

UPDATE organizations SET is_system = true WHERE name = '__SYSTEM_TEMPLATES__';

-- ── 4. RPC: fetch emails from auth.users for admin user management ─

CREATE OR REPLACE FUNCTION admin_get_user_emails(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id AS user_id, au.email::text
  FROM auth.users au
  WHERE au.id = ANY(p_user_ids)
    AND public.is_platform_admin();
$$;
