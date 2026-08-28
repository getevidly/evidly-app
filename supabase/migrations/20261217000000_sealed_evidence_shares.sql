-- Carrier share tokens for the sealed-evidence summary.
--
-- A kitchen mints a token, hands the link to its carrier or broker, and the
-- public page renders counts only — never record contents. The token in the
-- URL is the sole auth for the public read, which is why it is 32+ bytes of
-- crypto-random and why revoke and expiry are first-class columns.
--
-- The edge function reads this table with the service role; nothing here is
-- readable anonymously through PostgREST.

CREATE TABLE IF NOT EXISTS public.sealed_evidence_shares (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL,
  token            text NOT NULL UNIQUE,
  created_by       uuid NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT now() + interval '30 days',
  revoked_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sealed_evidence_shares_org
  ON public.sealed_evidence_shares (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sealed_evidence_shares_token
  ON public.sealed_evidence_shares (token);

ALTER TABLE public.sealed_evidence_shares ENABLE ROW LEVEL SECURITY;

-- ── RLS: house standard ────────────────────────────────────────────
-- Read: any member of the owning org can see its links.
DROP POLICY IF EXISTS "org_members_read_own" ON public.sealed_evidence_shares;
CREATE POLICY "org_members_read_own" ON public.sealed_evidence_shares
  FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Mint: decision-maker roles only, and only for their own org.
DROP POLICY IF EXISTS "dm_roles_insert" ON public.sealed_evidence_shares;
CREATE POLICY "dm_roles_insert" ON public.sealed_evidence_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = sealed_evidence_shares.organization_id
        AND up.role IN ('owner_operator', 'executive', 'compliance_manager')
    )
  );

-- Revoke: same three roles, same org. UPDATE is how revoked_at is set.
DROP POLICY IF EXISTS "dm_roles_update" ON public.sealed_evidence_shares;
CREATE POLICY "dm_roles_update" ON public.sealed_evidence_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = sealed_evidence_shares.organization_id
        AND up.role IN ('owner_operator', 'executive', 'compliance_manager')
    )
  );

DROP POLICY IF EXISTS "service_role_all" ON public.sealed_evidence_shares;
CREATE POLICY "service_role_all" ON public.sealed_evidence_shares
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "platform_admin_all" ON public.sealed_evidence_shares;
CREATE POLICY "platform_admin_all" ON public.sealed_evidence_shares
  FOR ALL
  USING (is_platform_admin());
