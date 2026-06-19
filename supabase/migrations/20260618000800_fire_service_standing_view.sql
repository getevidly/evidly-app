create or replace view fire_service_standing
with (security_invoker = true)
as
with fire_lines as (
  select code, short_name, nfpa_citation, default_cadence_days, regulatory_floor_days
  from service_type_definitions
  where category = 'fire_safety' and is_active = true
),
relevant as (
  select location_id, service_type_code
  from location_service_schedules
  where is_active = true and service_type_code in (select code from fire_lines)
  union
  select location_id, service_type_code
  from vendor_service_records
  where service_type_code in (select code from fire_lines)
),
latest_rec as (
  select distinct on (location_id, service_type_code)
    location_id, service_type_code, id as record_id,
    service_date, next_due_date as record_next_due, vendor_name
  from vendor_service_records
  where is_sample = false
    and sealed_at is not null
    and archived_at is null
    and disposed_at is null
    and id not in (select supersedes_id from vendor_service_records where supersedes_id is not null)
    and service_type_code in (select code from fire_lines)
  order by location_id, service_type_code, service_date desc, created_at desc
),
sched as (
  select distinct on (location_id, service_type_code)
    location_id, service_type_code, deferred_until, deferred_reason
  from location_service_schedules
  where is_active = true and service_type_code in (select code from fire_lines)
  order by location_id, service_type_code, created_at desc
)
select
  r.location_id,
  r.service_type_code,
  fl.short_name as line_name,
  fl.nfpa_citation,
  lr.record_id as latest_record_id,
  lr.service_date as last_service_date,
  lr.vendor_name as last_vendor_name,
  lr.record_next_due as next_due_date,
  s.deferred_until,
  s.deferred_reason,
  (lr.record_id is not null) as has_service_record,
  (s.location_id is not null) as has_schedule,
  least(30, greatest(7, round(fl.default_cadence_days * 0.2)))::int as approaching_lead_days,
  case
    when s.deferred_until is not null and s.deferred_until >= current_date then 'deferred'
    when lr.record_id is null then 'awaiting_first_service'
    when lr.record_next_due is null then 'monitored'
    when lr.record_next_due < current_date then 'overdue'
    when lr.record_next_due <= current_date + least(30, greatest(7, round(fl.default_cadence_days * 0.2)))::int then 'approaching'
    else 'current'
  end as standing
from relevant r
join fire_lines fl on fl.code = r.service_type_code
left join latest_rec lr on lr.location_id = r.location_id and lr.service_type_code = r.service_type_code
left join sched s on s.location_id = r.location_id and s.service_type_code = r.service_type_code;
