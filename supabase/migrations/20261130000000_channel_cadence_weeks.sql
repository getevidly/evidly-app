create table if not exists public.channel_cadence_weeks (
  id           uuid primary key default gen_random_uuid(),
  channel_id   uuid not null references public.channel_cadences(id) on delete cascade,
  week_start   date not null,                 -- Monday of the week
  target_count integer not null check (target_count >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (channel_id, week_start)
);

create index if not exists idx_channel_cadence_weeks_channel
  on public.channel_cadence_weeks (channel_id, week_start);

alter table public.channel_cadence_weeks enable row level security;

-- mirror channel_cadences' own policies verbatim (admin_only + service_role_all)
create policy channel_cadence_weeks_admin_only on public.channel_cadence_weeks
  for all to authenticated
  using (auth.jwt() ->> 'email' like '%@getevidly.com')
  with check (auth.jwt() ->> 'email' like '%@getevidly.com');
create policy channel_cadence_weeks_service_role_all on public.channel_cadence_weeks
  for all to service_role using (true) with check (true);

revoke all on public.channel_cadence_weeks from anon, public;
