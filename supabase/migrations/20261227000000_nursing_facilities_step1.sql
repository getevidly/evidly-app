-- ─────────────────────────────────────────────────────────────────────
-- Nursing Facilities program — step 1: tables only.
--
-- cms_facilities is the refreshable side: every column below except the
-- call-tracking pair is overwritten by cms-refresh from the CMS Provider
-- Data Catalog and the CDPH ELMS extract.
--
-- call_status and next_step_date are NOT refreshable. They are operator
-- state, and cms-refresh is written never to name them in its upsert, so
-- a refresh cannot erase who has been called. cms_call_log is likewise
-- append-only from the operator side and is never touched by the refresh.
--
-- Idempotent throughout, so a replay is harmless.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.cms_facilities (
  ccn                text primary key,
  name               text,
  address            text,
  city               text,
  county             text,
  zip                text,
  state              text default 'CA',
  phone              text,
  admin_name         text,
  admin_email        text,
  admin_phone        text,
  chain_name         text,
  chain_id           text,
  beds               int,
  overall_rating     int,
  health_rating      int,
  sff_status         text,
  k324               int default 0,
  k353               int default 0,
  k345               int default 0,
  f812               int default 0,
  f908               int default 0,
  f921               int default 0,
  fire_tags          int default 0,
  food_tags          int default 0,
  both_same_survey   int default 0,
  fines_total        numeric default 0,
  fine_events        int default 0,
  last_survey_date   date,
  call_status        text default 'notcalled',
  next_step_date     date,
  source_refreshed_at timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists public.cms_call_log (
  id            uuid primary key default gen_random_uuid(),
  ccn           text references public.cms_facilities(ccn),
  called_at     timestamptz default now(),
  outcome       text check (outcome in ('vm','reached','callback','interested','pilot','no','dnc')),
  next_step_date date,
  notes         text,
  created_by    text
);

create index if not exists idx_cms_call_log_ccn       on public.cms_call_log (ccn);
create index if not exists idx_cms_call_log_called_at on public.cms_call_log (called_at desc);

-- ── RLS: same shape as inspection_triggers ───────────────────────────
alter table public.cms_facilities enable row level security;
alter table public.cms_call_log  enable row level security;

drop policy if exists cms_facilities_admin_only        on public.cms_facilities;
drop policy if exists cms_facilities_service_role_all  on public.cms_facilities;
drop policy if exists cms_call_log_admin_only          on public.cms_call_log;
drop policy if exists cms_call_log_service_role_all    on public.cms_call_log;

create policy cms_facilities_admin_only on public.cms_facilities
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@getevidly.com')
  with check ((auth.jwt() ->> 'email') like '%@getevidly.com');

create policy cms_facilities_service_role_all on public.cms_facilities
  for all to service_role using (true) with check (true);

create policy cms_call_log_admin_only on public.cms_call_log
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@getevidly.com')
  with check ((auth.jwt() ->> 'email') like '%@getevidly.com');

create policy cms_call_log_service_role_all on public.cms_call_log
  for all to service_role using (true) with check (true);

revoke all on public.cms_facilities from anon, public;
revoke all on public.cms_call_log  from anon, public;
