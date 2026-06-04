-- ============================================================
-- POLICY LENS INTAKE TABLE — Schema v1.1 (additive)
-- Migration: 20260911000000
-- PL-01b: Agent identity + verification timestamps.
-- ============================================================

ALTER TABLE public.policy_lens_intakes
  ADD COLUMN agency_name              text,
  ADD COLUMN agent_license_number     text,
  ADD COLUMN phone_verified_at        timestamptz,
  ADD COLUMN agent_email_verified_at  timestamptz;

ALTER TABLE public.policy_lens_intakes
  ALTER COLUMN schema_version SET DEFAULT '1.1';

COMMENT ON TABLE public.policy_lens_intakes IS
  'Policy Lens intake landing zone. Schema v1.1 LOCKED. v1.1 adds agent
  identity (agency_name, agent_license_number) and verification
  timestamps (phone_verified_at for prospect SMS,
  agent_email_verified_at for agency-email OTP). Free-email domain
  blocklist is enforced in the app layer, not the schema. Column
  changes require a versioned migration + explicit approval. Rows are
  never deleted; extracted_fields immutable once status=verified.';

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260911000000')
ON CONFLICT DO NOTHING;
