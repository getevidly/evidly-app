-- Migration: internal_reports_public_share_rls
-- Adds the public_share_reports RLS policy to internal_reports.
-- Allows unauthenticated SELECT by share_token for ready/published reports.
-- Defense-in-depth: the generate-report edge function uses the service-role
-- client (bypasses RLS), but this policy covers any future non-service-role path.

DROP POLICY IF EXISTS public_share_reports ON internal_reports;
CREATE POLICY public_share_reports ON internal_reports
  FOR SELECT USING (
    share_token IS NOT NULL
    AND (share_expires IS NULL OR share_expires > now())
    AND status IN ('ready', 'published')
  );

-- Ledger
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260930000000', 'internal_reports_public_share_rls')
ON CONFLICT DO NOTHING;
