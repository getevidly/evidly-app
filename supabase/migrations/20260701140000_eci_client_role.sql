alter table public.evidly_client_invites
  add column if not exists client_role text not null default 'owner_operator'
  check (client_role in ('owner_operator','executive','compliance_manager','facilities_manager','chef','kitchen_manager','kitchen_staff','platform_admin'));
insert into supabase_migrations.schema_migrations (version, name)
values ('20260701140000','eci_client_role') on conflict do nothing;
