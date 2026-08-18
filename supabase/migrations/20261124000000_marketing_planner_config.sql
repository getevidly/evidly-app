-- Marketing Planner config — one-row settings for the Planner tab.

create table if not exists public.marketing_planner_config (
  id uuid primary key default gen_random_uuid(),
  is_singleton boolean not null default true,
  goal_count integer not null default 1 check (goal_count >= 0),
  goal_period text not null default 'week' check (goal_period in ('week','month')),
  include_enterprise_path boolean not null default false,
  attribution_channel text not null default 'all',
  -- standard path
  rate_touch_contact numeric not null default 30 check (rate_touch_contact between 0 and 100),
  rate_contact_discovery numeric not null default 50 check (rate_contact_discovery between 0 and 100),
  rate_discovery_tour numeric not null default 60 check (rate_discovery_tour between 0 and 100),
  rate_tour_won numeric not null default 40 check (rate_tour_won between 0 and 100),
  -- enterprise / custom branch
  rate_tour_proposal numeric not null default 70 check (rate_tour_proposal between 0 and 100),
  rate_proposal_negotiation numeric not null default 60 check (rate_proposal_negotiation between 0 and 100),
  rate_negotiation_won numeric not null default 50 check (rate_negotiation_won between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by text,
  unique (is_singleton)
);

insert into public.marketing_planner_config (is_singleton)
values (true)
on conflict (is_singleton) do nothing;

-- Enable RLS
alter table public.marketing_planner_config enable row level security;

-- Admin-only policy (mirror marketing_shows)
drop policy if exists "admin_only" on public.marketing_planner_config;
create policy "admin_only" on public.marketing_planner_config for all
  using (auth.jwt() ->> 'email' like '%@getevidly.com');

-- Service role policy (mirror marketing_shows)
drop policy if exists "service_role_all" on public.marketing_planner_config;
create policy "service_role_all" on public.marketing_planner_config for all
  using (auth.role() = 'service_role');
