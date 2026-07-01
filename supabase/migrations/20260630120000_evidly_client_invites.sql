create table if not exists public.evidly_client_invites (
  id               uuid primary key default gen_random_uuid(),
  business_name    text not null,
  contact_name     text not null,
  email            text not null,
  phone            text,
  message          text,
  role             text not null default 'owner',
  token            text not null unique,
  status           text not null default 'pending'
                     check (status in ('pending','accepted','expired','revoked')),
  invited_by       uuid references auth.users(id) on delete set null,
  reminder_count   integer not null default 0,
  last_reminded_at timestamptz,
  expires_at       timestamptz not null default (now() + interval '7 days'),
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_eci_status on public.evidly_client_invites (status);
create index if not exists idx_eci_email  on public.evidly_client_invites (lower(email));
alter table public.evidly_client_invites enable row level security;
create policy ecli_service_role on public.evidly_client_invites
  for all using (auth.role() = 'service_role');
create policy ecli_staff_select on public.evidly_client_invites
  for select using (exists (select 1 from user_profiles up where up.id = auth.uid() and up.evidly_staff_role is not null));
create policy ecli_staff_insert on public.evidly_client_invites
  for insert with check (exists (select 1 from user_profiles up where up.id = auth.uid() and up.evidly_staff_role is not null));
create policy ecli_staff_update on public.evidly_client_invites
  for update using (exists (select 1 from user_profiles up where up.id = auth.uid() and up.evidly_staff_role is not null));
insert into supabase_migrations.schema_migrations (version, name)
values ('20260630120000','evidly_client_invites') on conflict do nothing;
