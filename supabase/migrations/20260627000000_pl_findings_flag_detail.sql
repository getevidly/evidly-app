-- 20260627000000_pl_findings_flag_detail
-- Adds flag_detail jsonb to pl_findings: a flag's reason-code + optional notes.
-- Workflow data only — flagged findings block release, so this never enters
-- the sealed report. Already applied to PROD via SQL editor; this file is repo parity.

ALTER TABLE pl_findings ADD COLUMN IF NOT EXISTS flag_detail jsonb;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260627000000', 'pl_findings_flag_detail')
ON CONFLICT DO NOTHING;
