alter table public.vendor_service_records add column if not exists sealed_at timestamptz;
alter table public.vendor_service_records add column if not exists sealed_by uuid references auth.users(id);
alter table public.vendor_service_records add column if not exists content_hash text;
alter table public.vendor_service_records add column if not exists lifecycle_state text not null default 'live';
alter table public.vendor_service_records add column if not exists retention_until timestamptz;
alter table public.vendor_service_records add column if not exists supersedes_id uuid references public.vendor_service_records(id);
alter table public.vendor_service_records add column if not exists archived_at timestamptz;
alter table public.vendor_service_records add column if not exists disposed_at timestamptz;

alter table public.inspection_reports add column if not exists sealed_at timestamptz;
alter table public.inspection_reports add column if not exists sealed_by uuid references auth.users(id);
alter table public.inspection_reports add column if not exists content_hash text;
alter table public.inspection_reports add column if not exists lifecycle_state text not null default 'live';
alter table public.inspection_reports add column if not exists retention_until timestamptz;
alter table public.inspection_reports add column if not exists supersedes_id uuid references public.inspection_reports(id);
alter table public.inspection_reports add column if not exists archived_at timestamptz;
alter table public.inspection_reports add column if not exists disposed_at timestamptz;

create or replace function public.tg_vendor_service_records_immutable()
returns trigger language plpgsql as $
begin
  raise exception 'vendor_service_records rows are immutable once created; create a correction via the supersession process instead. Attempted operation: %', TG_OP;
end;
$;

create or replace function public.tg_inspection_reports_immutable()
returns trigger language plpgsql as $
begin
  raise exception 'inspection_reports rows are immutable once sealed; create a correction via the supersession process instead. Attempted operation: %', TG_OP;
end;
$;

drop trigger if exists vsr_immutable_no_update on public.vendor_service_records;
drop trigger if exists vsr_immutable_no_delete on public.vendor_service_records;
create trigger vsr_immutable_no_update before update on public.vendor_service_records for each row execute function public.tg_vendor_service_records_immutable();
create trigger vsr_immutable_no_delete before delete on public.vendor_service_records for each row execute function public.tg_vendor_service_records_immutable();

drop trigger if exists immutable_no_update on public.inspection_reports;
drop trigger if exists immutable_no_delete on public.inspection_reports;
create trigger immutable_no_update before update on public.inspection_reports for each row execute function public.tg_inspection_reports_immutable();
create trigger immutable_no_delete before delete on public.inspection_reports for each row execute function public.tg_inspection_reports_immutable();
