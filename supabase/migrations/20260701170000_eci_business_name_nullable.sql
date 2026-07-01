alter table public.evidly_client_invites alter column business_name drop not null;
insert into supabase_migrations.schema_migrations (version, name)
values ('20260701170000','eci_business_name_nullable') on conflict do nothing;
