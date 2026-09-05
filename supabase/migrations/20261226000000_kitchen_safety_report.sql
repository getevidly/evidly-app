-- ─────────────────────────────────────────────────────────────────────
-- Commercial Kitchen Safety Report — cached per-county aggregates.
--
-- Feeds a PUBLIC page on getstovio.com, so the cache holds ONLY
-- aggregates: counts and percentages by facility type and by CalCode form
-- item. No facility name, address, id or single-facility row ever enters
-- this table, which is what makes the read endpoint safe to expose.
--
-- APPLIED DIRECTLY via `supabase db query`, not `db push` — seven unrelated
-- migrations are pending locally and a push would apply those too. Every
-- statement is idempotent, so a later push re-runs it harmlessly.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.kitchen_safety_report_cache (
  county       text primary key,
  report_json  jsonb       not null,
  computed_at  timestamptz not null default now()
);

alter table public.kitchen_safety_report_cache enable row level security;

-- Readable by anyone: the contents are aggregate statistics destined for a
-- public web page. Writes happen only through the refresh function, which
-- runs as its definer.
drop policy if exists ksr_public_read on public.kitchen_safety_report_cache;
create policy ksr_public_read
  on public.kitchen_safety_report_cache for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────
-- refresh_kitchen_safety_report() — the heavy half.
--
-- Aggregates ~960k violations across six counties. Far too slow to run per
-- request against PostgREST's 8s ceiling, so it runs here on a maintenance
-- timeout and the endpoint only ever reads the result.
--
-- TWO GUARDS, both load-bearing:
--
-- 1. EVERY VIOLATION COUNTS ONCE. A violation can match two mapping rows —
--    one on source_code and one on cal_section — and a blind three-table
--    join then counts it twice. Measured: Ventura inflates by 5,626 rows
--    (1.7%) and San Francisco double-counts ~2,082 without the guard.
--    `distinct on (v.id)` collapses each violation to a single row before
--    anything is counted.
--
-- 2. SIZE BANDS ARE NOT COMPARABLE ACROSS COUNTIES. LA bands restaurants by
--    SEATS, San Francisco by SQUARE FOOTAGE. by_type therefore lives inside
--    each county's own object and is never rolled up; the only cross-county
--    axis this produces is the form-item category, which is the same
--    54-item California form everywhere.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.refresh_kitchen_safety_report()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_written int := 0;
  v_slugs   text[] := array[
    'la-county-ca','san-diego-ca','san-francisco-ca',
    'santa-clara-ca','ventura-ca','merced-ca'
  ];
  -- Counties whose code mappings carry form_item_code. Ventura's mappings
  -- exist but were built against requirement_code only, and Merced has no
  -- mappings at all, so neither can produce a category breakdown yet.
  v_categorized text[] := array[
    'la-county-ca','san-diego-ca','san-francisco-ca','santa-clara-ca'
  ];
  v_typed text[] := array['la-county-ca','san-diego-ca','san-francisco-ca'];
begin
  perform set_config('statement_timeout', '240s', true);

  with src as (
    select j.slug, s.id as sid
    from jurisdictions j
    join inspection_sources s on s.jurisdiction_id = j.id
    where j.slug = any(v_slugs)
  ),

  -- ── Headline volumes, one cheap pass per county ──────────────────
  headline as (
    select src.slug,
      (select count(*) from facilities f where f.source_id = src.sid) as facilities,
      (select count(*) from inspections i where i.source_id = src.sid) as inspections,
      (select count(*) from violations v
         join inspections i2 on i2.id = v.inspection_id
        where i2.source_id = src.sid) as violations,
      (select max(i3.inspection_date) from inspections i3 where i3.source_id = src.sid) as newest
    from src
  ),

  -- ── Facility TYPE, resolved once per facility ────────────────────
  -- Type is a property of the facility, not of one inspection. Reading it
  -- per facility matters for LA specifically: its live-portal rows carry
  -- no pe_description, so typing off the inspection row would leave every
  -- freshly crawled LA inspection unclassified. Taking the newest row that
  -- HAS a type lets live rows inherit their facility's classification.
  ftype as (
    select distinct on (i.facility_id)
      src.slug,
      i.facility_id,
      case src.slug
        when 'la-county-ca'      then i.raw_payload->>'pe_description'
        when 'san-francisco-ca'  then i.raw_payload->>'permit_type'
        when 'san-diego-ca'      then
          case split_part(i.raw_payload->>'custom_id', '-', 2)
            when 'FFPP' then 'Restaurant / food prep (permanent)'
            when 'FFPN' then 'Retail, no food prep (permanent)'
            when 'FFMP' then 'Mobile food facility, with prep'
            when 'FFMN' then 'Mobile food facility, no prep'
            when 'FCFO' then 'Cottage food operation'
            else null
          end
      end as facility_type
    from inspections i
    join src on src.sid = i.source_id
    where src.slug = any(v_typed)
      and coalesce(
            case src.slug
              when 'la-county-ca'     then i.raw_payload->>'pe_description'
              when 'san-francisco-ca' then i.raw_payload->>'permit_type'
              when 'san-diego-ca'     then
                case split_part(i.raw_payload->>'custom_id', '-', 2)
                  when 'FFPP' then 'x' when 'FFPN' then 'x' when 'FFMP' then 'x'
                  when 'FFMN' then 'x' when 'FCFO' then 'x' else null end
            end, '') <> ''
    order by i.facility_id, i.inspection_date desc
  ),

  -- ── One row per violation. THE FAN-OUT GUARD. ────────────────────
  vio as (
    select distinct on (v.id)
      src.slug,
      v.id           as violation_id,
      i.facility_id,
      m.form_item_code
    from violations v
    join inspections i on i.id = v.inspection_id
    join src on src.sid = i.source_id
    left join inspection_code_mappings m
           on m.source_id = src.sid
          and (m.source_code = v.source_code or m.source_code = v.cal_section)
    where src.slug = any(v_categorized)
    order by v.id, m.form_item_code nulls last
  ),

  -- ── Overall top categories per county ────────────────────────────
  cat AS (
    select vio.slug, vio.form_item_code, count(*) as n,
           round(100.0 * count(*) / sum(count(*)) over (partition by vio.slug), 1) as pct,
           row_number() over (partition by vio.slug order by count(*) desc) as rk
    from vio
    where vio.form_item_code is not null
    group by 1, 2
  ),
  cat_json as (
    select cat.slug,
           jsonb_agg(jsonb_build_object(
             'form_item', cat.form_item_code,
             'label', coalesce(fi.label, cat.form_item_code),
             'violations', cat.n,
             'pct', cat.pct
           ) order by cat.rk) as categories
    from cat left join inspection_form_items fi on fi.form_item_code = cat.form_item_code
    where cat.rk <= 10
    group by 1
  ),

  -- ── Category mix within each facility type ───────────────────────
  bytype as (
    select vio.slug, ft.facility_type, vio.form_item_code, count(*) as n,
           round(100.0 * count(*) / sum(count(*)) over (partition by vio.slug, ft.facility_type), 1) as pct,
           row_number() over (partition by vio.slug, ft.facility_type order by count(*) desc) as rk,
           sum(count(*)) over (partition by vio.slug, ft.facility_type) as type_total
    from vio
    join ftype ft on ft.facility_id = vio.facility_id and ft.slug = vio.slug
    where vio.form_item_code is not null
    group by 1, 2, 3
  ),
  -- Capped at the 20 highest-volume types. San Francisco's permit_type
  -- spans 86 values including massage establishments, laundries and
  -- tobacco retailers — real permits, but not commercial kitchens, and
  -- noise on this report. Ranking by volume keeps every food type that
  -- matters (LA's full 18 all survive) and drops the long tail.
  bytype_json as (
    select b.slug,
           jsonb_agg(t.obj order by t.type_total desc) filter (where t.trk <= 20) as by_type
    from (
      select bytype.slug, bytype.facility_type, max(bytype.type_total) as type_total,
             row_number() over (partition by bytype.slug order by max(bytype.type_total) desc) as trk,
             jsonb_build_object(
               'facility_type', bytype.facility_type,
               'violations', max(bytype.type_total),
               'top_categories', jsonb_agg(jsonb_build_object(
                 'form_item', bytype.form_item_code,
                 'label', coalesce(fi.label, bytype.form_item_code),
                 'violations', bytype.n,
                 'pct', bytype.pct
               ) order by bytype.rk) filter (where bytype.rk <= 5)
             ) as obj
      from bytype left join inspection_form_items fi on fi.form_item_code = bytype.form_item_code
      group by 1, 2
    ) t
    join src b on b.slug = t.slug
    group by b.slug
  )

  insert into public.kitchen_safety_report_cache (county, report_json, computed_at)
  select h.slug,
         jsonb_strip_nulls(jsonb_build_object(
           'county', h.slug,
           'headline', jsonb_build_object(
             'facilities', h.facilities,
             'inspections', h.inspections,
             'violations', h.violations,
             'newest_inspection_date', h.newest
           ),
           'categories_pending', not (h.slug = any(v_categorized)),
           'has_facility_type', h.slug = any(v_typed),
           'top_categories', cj.categories,
           'by_type', bj.by_type,
           -- Stated in the payload so a consumer cannot accidentally chart
           -- LA seat-bands against SF square-foot bands as if they matched.
           'type_basis', case h.slug
             when 'la-county-ca'     then 'seats (restaurants) / square feet (markets), with the county risk tier'
             when 'san-francisco-ca' then 'square feet, from the permit class'
             when 'san-diego-ca'     then 'permit program: prep vs non-prep, permanent vs mobile'
             else null end,
           'notes', case
             when h.slug = 'ventura-ca' then 'Category breakdown pending: this county''s code mappings do not yet carry a form-item code.'
             when h.slug = 'merced-ca'  then 'Category breakdown pending: no code mappings exist for this county yet.'
             else null end
         )),
         now()
    from headline h
    left join cat_json cj on cj.slug = h.slug
    left join bytype_json bj on bj.slug = h.slug
  on conflict (county) do update
    set report_json = excluded.report_json,
        computed_at = now();

  get diagnostics v_written = row_count;

  return jsonb_build_object(
    'ok', true,
    'counties_written', v_written,
    'computed_at', now()
  );
end;
$fn$;

revoke all on function public.refresh_kitchen_safety_report() from public, anon, authenticated;
grant execute on function public.refresh_kitchen_safety_report() to service_role;

-- ── Nightly recompute ────────────────────────────────────────────────
-- 9:05 UTC: ten minutes after refresh-regenerate-all (8:55) and clear of
-- the Sunday weekly jobs (9:10 / 9:30 / 9:50). ~47s. Called in-database,
-- so there is no HTTP hop and no service-role key involved.
select cron.schedule('refresh-kitchen-safety-report', '5 9 * * *',
  $$select public.refresh_kitchen_safety_report()$$);
