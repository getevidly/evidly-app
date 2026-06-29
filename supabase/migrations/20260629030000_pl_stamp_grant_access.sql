-- pl_stamp_grant_access: broker open-stamp for report grants.
-- SECURITY DEFINER — broker holds SELECT on pl_report_grants but not UPDATE;
-- this stamps last_accessed_at + access_count only, after verifying the caller
-- holds the live (un-revoked, un-expired) grant via external_party_members.
-- Applied directly in prod SQL editor; this file is for repo parity.

CREATE OR REPLACE FUNCTION public.pl_stamp_grant_access(p_grant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update pl_report_grants g
  set last_accessed_at = now(),
      access_count = coalesce(g.access_count, 0) + 1
  where g.id = p_grant_id
    and exists (
      select 1 from external_party_members epm
      where epm.party_id = g.recipient_party_id
        and epm.user_id = auth.uid()
    )
    and g.revoked_at is null
    and (g.expires_at is null or g.expires_at > now());
end;
$function$;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260629030000', 'pl_stamp_grant_access')
ON CONFLICT DO NOTHING;
