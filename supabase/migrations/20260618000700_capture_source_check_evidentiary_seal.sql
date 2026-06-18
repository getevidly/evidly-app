alter table public.vendor_service_records drop constraint if exists vendor_service_records_source_check;
alter table public.vendor_service_records add constraint vendor_service_records_source_check
  check (source = any (array['manual'::text,'vendor_upload'::text,'hoodops'::text,'webhook'::text,'evidentiary_seal'::text]));

alter table public.inspection_reports drop constraint if exists inspection_reports_source_check;
alter table public.inspection_reports add constraint inspection_reports_source_check
  check (source = any (array['upload'::text,'crawl'::text,'api'::text,'manual'::text,'evidentiary_seal'::text]));
