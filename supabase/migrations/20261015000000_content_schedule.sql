-- Content Schedule table for marketing editorial calendar
-- Phase 6: Marketing Console - Content Schedule

create table if not exists public.content_schedule (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  channel_id uuid null references public.marketing_channels(id) on delete set null,
  channel_label text,
  scheduled_date date not null,
  status text not null default 'planned' check (status in ('planned', 'drafted', 'scheduled', 'published')),
  prp_band text null check (prp_band in ('Predict', 'Reduce', 'Prove') or prp_band is null),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for date-based queries
create index if not exists idx_content_schedule_scheduled_date 
  on public.content_schedule(scheduled_date);

-- Enable RLS
alter table public.content_schedule enable row level security;

-- Admin-only policy (mirror marketing_channels)
drop policy if exists "admin_only" on public.content_schedule;
create policy "admin_only" on public.content_schedule for all
  using (auth.jwt() ->> 'email' like '%@getevidly.com');

-- Service role policy (mirror marketing_channels)
drop policy if exists "service_role_all" on public.content_schedule;
create policy "service_role_all" on public.content_schedule for all
  using (auth.role() = 'service_role');
