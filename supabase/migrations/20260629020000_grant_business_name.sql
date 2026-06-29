-- Denormalize business_name onto pl_report_grants.
-- Avoids exposing the full policy_lens_intakes row (contact email/phone,
-- policy_pdf_path) to brokers via the portal Reports surface; the grant-read
-- path needs only the display name.
-- Nullable: pre-backfill grants may be null; release flow now writes it forward
-- (pl-release-report intake select + grant insert), and existing rows were
-- backfilled from policy_lens_intakes.business_name (one-time DML, not in this
-- forward migration). Applied directly in prod SQL editor; this file is parity.

ALTER TABLE pl_report_grants
  ADD COLUMN IF NOT EXISTS business_name text;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260629020000', 'grant_business_name')
ON CONFLICT DO NOTHING;
