-- pl_broker_invites: admin-sent invite for an insurance agency to join the portal.
-- Mint-on-accept: agency_name held as text; external_parties row + membership seat
-- created only when the invite is accepted (edge function). No orphan parties.
-- Staff-only writes (evidly_staff_role). Acceptance runs via service-role function.

create table if not exists pl_broker_invites (
  id            uuid primary key default gen_random_uuid(),
  agency_name   text not null,
  email         text not null,
  role          text not null default 'member',
  token         text not null unique,
  status        text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  invited_by    uuid,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_pl_broker_invites_token on pl_broker_invites (token);
create index if not exists idx_pl_broker_invites_status on pl_broker_invites (status);

alter table pl_broker_invites enable row level security;

drop policy if exists plbi_staff_select on pl_broker_invites;
create policy plbi_staff_select on pl_broker_invites
  for select using (
    exists (select 1 from user_profiles up
            where up.id = auth.uid() and up.evidly_staff_role is not null)
  );

drop policy if exists plbi_staff_insert on pl_broker_invites;
create policy plbi_staff_insert on pl_broker_invites
  for insert with check (
    exists (select 1 from user_profiles up
            where up.id = auth.uid() and up.evidly_staff_role is not null)
  );

drop policy if exists plbi_staff_update on pl_broker_invites;
create policy plbi_staff_update on pl_broker_invites
  for update using (
    exists (select 1 from user_profiles up
            where up.id = auth.uid() and up.evidly_staff_role is not null)
  );

drop policy if exists plbi_service_role on pl_broker_invites;
create policy plbi_service_role on pl_broker_invites
  for all using (auth.role() = 'service_role');

insert into supabase_migrations.schema_migrations (version, name)
values ('20260629110000', 'pl_broker_invites')
on conflict do nothing;
