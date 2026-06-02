/*
 * Admin read-access fix for organizations + user_profiles.
 *
 * Problem: Both tables have RLS policies that scope reads to the user's own
 * org (via user_location_access). Platform admins see ~nothing because there
 * is no bypass policy. AdminOrgs shows 0 orgs; AdminUsers shows 0 users.
 *
 * Fix: Add SELECT-only bypass for platform_admin, matching the signal used by
 * user_sessions and user_mfa_config in 20260520000000_admin_security_hardening:
 *   EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
 *
 * Also adds a SECURITY DEFINER RPC so AdminUsers can fetch emails from
 * auth.users (email is not a column on user_profiles).
 *
 * Also adds is_system boolean to organizations so AdminOrgs can exclude
 * system/seed rows (__SYSTEM_TEMPLATES__) from the tenant org count.
 *
 * Tenant users are unaffected — their existing org-scoped policies remain.
 */

-- ── 1. Organizations: platform_admin can read all orgs ────────────

DROP POLICY IF EXISTS "admin_read_all_organizations" ON organizations;
CREATE POLICY "admin_read_all_organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- ── 2. User profiles: platform_admin can read all profiles ────────

DROP POLICY IF EXISTS "admin_read_all_profiles" ON user_profiles;
CREATE POLICY "admin_read_all_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

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
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    );
$$;
