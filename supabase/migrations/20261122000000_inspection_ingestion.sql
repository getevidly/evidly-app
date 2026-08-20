-- Inspection-outreach ingestion schema
-- 4 tables: inspection_sources, facilities, inspections, violations
-- ALREADY APPLIED to the live database. History-only file. Do not re-run.
-- inspection_sources keys to jurisdictions(id), NOT free text: a county name
-- cannot distinguish la-county-ca from long-beach-ca / pasadena-ca / vernon-ca,
-- which all carry county = 'Los Angeles'.
-- NOTE: jurisdictions itself is not in migration history (applied as raw SQL).
-- Rollback:
--   drop table if exists public.violations, public.inspections,
--     public.facilities, public.inspection_sources cascade;

create table if not exists public.inspection_sources (
  id                  uuid primary key default gen_random_uuid(),
  jurisdiction_id     uuid not null unique references public.jurisdictions(id),
  platform_family     text,
  endpoint_config     jsonb not null default '{}'::jsonb,
  track               text not null default 'portal' check (track in ('portal','records_request')),
  address_available   boolean not null default false,
  cadence_per_year    numeric,
  cadence_note        text,
  cutover_date        date,
  history_floor       date,
  posting_lag         text,
  is_active           boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.facilities (
  id                   uuid primary key default gen_random_uuid(),
  source_id            uuid not null references public.inspection_sources(id) on delete cascade,
  source_facility_key  text not null,
  name                 text,
  address              text,
  city                 text,
  zip                  text,
  lat                  numeric,
  lng                  numeric,
  identity_status      text not null default 'unresolved'
                       check (identity_status in ('unresolved','resolved','held')),
  resolved_pipeline_id uuid references public.sales_pipeline(id) on delete set null,
  is_client            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (source_id, source_facility_key)
);

create table if not exists public.inspections (
  id                    uuid primary key default gen_random_uuid(),
  facility_id           uuid not null references public.facilities(id) on delete cascade,
  source_id             uuid not null references public.inspection_sources(id) on delete cascade,
  source_facility_key   text not null,
  source_inspection_key text,
  program_id            text,
  inspection_date       date,
  inspection_type       text,
  outcome               text,
  score                 numeric,
  trigger_type          text check (trigger_type in ('cited','clean','due')),
  source_url            text,
  raw_payload           jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create table if not exists public.violations (
  id                    uuid primary key default gen_random_uuid(),
  inspection_id         uuid not null references public.inspections(id) on delete cascade,
  source_violation_key  text,
  source_code           text,
  description           text,
  severity_raw          text,
  corrected_on_site     boolean not null default false,
  raw_payload           jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_facilities_source on public.facilities (source_id);
create index if not exists idx_facilities_pipeline on public.facilities (resolved_pipeline_id);
create index if not exists idx_inspections_facility on public.inspections (facility_id);
create index if not exists idx_inspections_date on public.inspections (inspection_date);
create index if not exists idx_violations_inspection on public.violations (inspection_id);

-- Keys are the source system's own Oid GUIDs. A facility can hold multiple
-- programs, so two inspections legitimately share facility + date.
create unique index if not exists idx_inspections_source_key
  on public.inspections (source_id, source_inspection_key);
create unique index if not exists idx_violations_source_key
  on public.violations (inspection_id, source_violation_key);

-- RLS: admin-only internal tables (mirrors channel_cadences / pipeline_touches)
do $
declare t text;
begin
  foreach t in array array['inspection_sources','facilities','inspections','violations'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (auth.jwt() ->> 'email' like '%%@getevidly.com')
      with check (auth.jwt() ->> 'email' like '%%@getevidly.com');$p$, t||'_admin_only', t);
    execute format($p$create policy %I on public.%I for all to service_role
      using (true) with check (true);$p$, t||'_service_role_all', t);
    execute format('revoke all on public.%I from anon, public;', t);
  end loop;
end $;

-- Seed: Ventura, the first adapter target. Selected by slug, never by name.
insert into public.inspection_sources
  (jurisdiction_id, platform_family, track, address_available, cadence_note, notes)
select j.id, 'decade_accela', 'portal', true,
       'Routine and follow-up, updated every business day. History to January 2004.',
       'DECADE (Accela) / Envision Connect Online v2.2.8.67 at eco.vcrma.org. 5,000+ facilities.'
from public.jurisdictions j
where j.slug = 'ventura-ca'
on conflict (jurisdiction_id) do nothing;
