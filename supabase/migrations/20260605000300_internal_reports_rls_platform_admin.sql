-- RLS: grant is_platform_admin() full access to internal_reports.
-- Already applied manually in PROD — this file is for repo record only.

DROP POLICY IF EXISTS admin_only_reports ON internal_reports;
CREATE POLICY admin_only_reports ON internal_reports
  USING (is_platform_admin());

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260605000300', 'internal_reports_rls_platform_admin')
ON CONFLICT DO NOTHING;
