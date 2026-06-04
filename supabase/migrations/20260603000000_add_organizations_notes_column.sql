/*
 * Add `notes` column to organizations table.
 *
 * Purpose: Admin-facing internal notes field. Configure.tsx and AdminOrgs.tsx
 * both read/write this column. Previously phantom — code wrote to it but the
 * column did not exist in PROD (PostgREST 42703).
 *
 * Nullable text, no default. Existing rows get NULL.
 */

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.organizations.notes IS
  'Free-text internal notes visible to platform admins only.';

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260603000000')
ON CONFLICT DO NOTHING;
