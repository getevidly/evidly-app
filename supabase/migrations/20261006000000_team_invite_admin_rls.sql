-- ── Team-invite reconcile: RLS + adopt helper ──────────────────
-- 1. Platform admin can read user_invitations (mirrors
--    platform_admin_read_invites on evidly_client_invites).
-- 2. Service-role-only RPC to look up an auth user ID by email
--    (used by accept-team-invite ADOPT path when createUser 422s).

-- ── 1. Platform admin SELECT policy ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'platform_admin_read_team_invites'
      AND tablename  = 'user_invitations'
  ) THEN
    CREATE POLICY "platform_admin_read_team_invites"
      ON user_invitations FOR SELECT
      TO authenticated
      USING ( public.is_platform_admin() );
  END IF;
END $$;

-- ── 2. auth_uid_by_email — SECURITY DEFINER, service-role only ─
CREATE OR REPLACE FUNCTION public.auth_uid_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

-- Restrict: only service_role (edge functions) can call this.
REVOKE EXECUTE ON FUNCTION public.auth_uid_by_email(text) FROM anon, authenticated;
