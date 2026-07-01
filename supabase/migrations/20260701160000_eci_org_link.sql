alter table public.evidly_client_invites
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists organization_name text;
insert into supabase_migrations.schema_migrations (version, name)
values ('20260701160000','eci_org_link') on conflict do nothing;
