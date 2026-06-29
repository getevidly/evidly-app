-- plsr_select_via_grant: broker read access to pl_sealed_reports.
-- A broker may SELECT a sealed report only while holding a live grant
-- (un-revoked, un-expired) whose recipient_party_id maps to their
-- external_party_members membership, joined on run_id.
-- RLS TRAP context: pl_sealed_reports is RLS-enabled; without this policy the
-- portal (non-service-role) sees deny-all even though rows exist in the editor.
-- Sibling policies on this table: plsr_admin_select, plsr_service_role.
-- Applied directly in prod SQL editor; this file is for repo parity.

DROP POLICY IF EXISTS plsr_select_via_grant ON pl_sealed_reports;
CREATE POLICY plsr_select_via_grant
  ON pl_sealed_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pl_report_grants g
      JOIN external_party_members epm
        ON epm.party_id = g.recipient_party_id
      WHERE g.run_id = pl_sealed_reports.run_id
        AND epm.user_id = auth.uid()
        AND g.revoked_at IS NULL
        AND (g.expires_at IS NULL OR g.expires_at > now())
    )
  );

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260629000000', 'plsr_select_via_grant')
ON CONFLICT DO NOTHING;
