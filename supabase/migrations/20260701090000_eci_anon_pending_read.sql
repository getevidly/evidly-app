create policy ecli_anon_pending_select on public.evidly_client_invites
  for select
  to anon
  using (status = 'pending' and expires_at > now());
insert into supabase_migrations.schema_migrations (version, name)
values ('20260701090000','eci_anon_pending_read') on conflict do nothing;
