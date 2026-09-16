-- ============================================================
-- Identity bridge, Build 1 — hoodops_tenants
-- Per-tenant HoodOps identity + signing secret, so a cert seal
-- can be authenticated as the tenant that sent it instead of via
-- one globally shared secret.
-- Purely additive: new table, new nullable column. Nothing reads
-- either yet — hoodops-webhook is untouched and keeps working on
-- the existing HOODOPS_WEBHOOK_SECRET path.
-- ============================================================

-- ── A. hoodops_tenants ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS hoodops_tenants (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug    text        NOT NULL UNIQUE,
  tenant_name    text        NOT NULL,
  signing_secret text        NOT NULL,
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  rotated_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ht_slug_active
  ON hoodops_tenants (tenant_slug) WHERE active = true;

-- ── B. RLS — service_role ONLY ──────────────────────────────
-- signing_secret is a live HMAC key. Unlike every other table in
-- this schema, hoodops_tenants intentionally has NO policy for
-- anon or authenticated: with RLS enabled and no permissive
-- policy, those roles can read nothing. Do not "fix" this by
-- adding an org-scoped SELECT policy — that would ship every
-- tenant's signing key to the browser.

ALTER TABLE hoodops_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to hoodops tenants"
  ON hoodops_tenants;
CREATE POLICY "Service role full access to hoodops tenants"
  ON hoodops_tenants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Belt-and-braces against a later grant restoring table privileges.
REVOKE ALL ON hoodops_tenants FROM anon, authenticated;

-- ── C. vendors → tenant link ────────────────────────────────
-- Nullable: every existing vendor row predates the bridge and
-- stays NULL. No backfill.

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS hoodops_tenant_id uuid
    REFERENCES hoodops_tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_hoodops_tenant
  ON vendors (hoodops_tenant_id) WHERE hoodops_tenant_id IS NOT NULL;
