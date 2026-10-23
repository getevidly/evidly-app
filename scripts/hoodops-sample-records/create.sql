-- Sample sealed records for HoodOps demos.
--
-- ONE sample organization holding one sealed Report of Service and one sealed
-- Certificate of Service, so demo.gethoodops.com can link to real /sealed and
-- /verify pages. Run by create.ts, never by hand: the {{...}} placeholders are
-- the seal identity, the two content hashes and the two file sizes, which only
-- the script can compute (the hash covers the PDF bytes in storage).
--
-- Marked external_source = 'hoodops_sample' on the organization, location and
-- both documents. hoodops-webhook only ever matches 'hoodops', so no real
-- delivery can find, reuse or chain to any of these rows.
--
-- Every id is fixed and every insert is ON CONFLICT DO NOTHING: a rerun
-- changes nothing. The final block fails the transaction if any fixed row is
-- missing or a sealed row holds a different hash than the one computed.
--
-- Not created: location_jurisdictions, service schedules, notifications,
-- audit entries, compliance_document_send_records. Revert: revert.sql.

BEGIN;

-- plan_tier is set here, not defaulted: the BEFORE INSERT founder-seat
-- trigger only rewrites 'trial', so 'standard' never takes a founder seat.
INSERT INTO public.organizations (id, name, external_source, external_id, plan_tier)
VALUES ('7dbf7d73-5074-47c8-9e67-53176956b7ce', 'Sample Kitchen (HoodOps Demo)',
        'hoodops_sample', 'SAMPLE', 'standard')
ON CONFLICT DO NOTHING;

-- The PDF prints only "Fictional kitchen, California": no street, so none.
INSERT INTO public.locations (id, organization_id, name, address, city, state, zip,
                              external_source, external_id, status, business_hours_timezone)
VALUES ('57565702-a5b1-4d6a-b690-934d8dd8d71d', '7dbf7d73-5074-47c8-9e67-53176956b7ce',
        'Fictional Kitchen', NULL, 'Merced', 'CA', '95340',
        'hoodops_sample', 'SAMPLE', 'active', 'America/Los_Angeles')
ON CONFLICT DO NOTHING;

INSERT INTO public.vendors (id, organization_id, company_name, category, status)
VALUES ('3f696ecd-17ce-4cae-80ef-7b13bc7b43e1', '7dbf7d73-5074-47c8-9e67-53176956b7ce',
        'Cleaning Pros Plus, LLC', 'hood_cleaning', 'active')
ON CONFLICT DO NOTHING;

-- Sealed rows, field for field as hoodops-webhook handleDocumentEvent builds
-- them. retention_until = sealed_at + 3 years (retention_policies,
-- fire_service_record). next_due_date = service date + 90 days (quarterly).
INSERT INTO public.vendor_service_records (
  id, organization_id, location_id, safeguard_type, service_type_code,
  vendor_name, vendor_id, technician_name, cert_number, service_date,
  certificate_url, next_due_date, source, sealed_by, sealed_at, content_hash,
  lifecycle_state, retention_until, supersedes_id, notes, webhook_payload, is_sample)
VALUES (
  '0fd30ff0-fd92-4105-a519-63614975f641', '7dbf7d73-5074-47c8-9e67-53176956b7ce',
  '57565702-a5b1-4d6a-b690-934d8dd8d71d', 'hood_cleaning', 'KEC',
  'Cleaning Pros Plus, LLC', '3f696ecd-17ce-4cae-80ef-7b13bc7b43e1', 'Sample Technician',
  'RPT-K-SAMPLE', '2026-06-12',
  'documents:7dbf7d73-5074-47c8-9e67-53176956b7ce/hoodops/document.report:RPT-K-SAMPLE.pdf',
  '2026-09-10', 'evidentiary_seal', '{{SEALED_BY}}', '2026-06-12T23:00:00Z', '{{REPORT_HASH}}',
  'live', '2029-06-12T23:00:00Z', NULL,
  'HoodOps demo sample Report — sealed by scripts/hoodops-sample-records',
  jsonb_build_object(
    'event', 'document.report',
    'sample', true,
    'source', 'scripts/hoodops-sample-records',
    'hoodops_client_id', 'SAMPLE',
    'hoodops_location_id', 'SAMPLE',
    'hoodops_document_id', 'RPT-K-SAMPLE',
    'client_name', 'Sample Kitchen (HoodOps Demo)',
    'location_name', 'Fictional Kitchen',
    'location_city', 'Merced',
    'location_state', 'CA',
    'location_zip', '95340',
    'service_date', '2026-06-12',
    'service_type_code', 'KEC',
    'cert_number', 'RPT-K-SAMPLE',
    'vendor_name', 'Cleaning Pros Plus, LLC',
    'technician_name', 'Sample Technician',
    'frequency', 'quarterly',
    'document_url', 'https://www.gethoodops.com/samples/a1e5cb0239a6cf78/HoodOps-Sample-Report-and-Certificate-of-Service.pdf'),
  true)
ON CONFLICT DO NOTHING;

-- The certificate chains to the report: supersedes_id = the report's row, and
-- the report's content_hash is the predecessor hash inside its own hash.
INSERT INTO public.vendor_service_records (
  id, organization_id, location_id, safeguard_type, service_type_code,
  vendor_name, vendor_id, technician_name, cert_number, service_date,
  certificate_url, next_due_date, source, sealed_by, sealed_at, content_hash,
  lifecycle_state, retention_until, supersedes_id, notes, webhook_payload, is_sample)
VALUES (
  '5162df5a-2f41-46af-bf6f-8c2504ff3877', '7dbf7d73-5074-47c8-9e67-53176956b7ce',
  '57565702-a5b1-4d6a-b690-934d8dd8d71d', 'hood_cleaning', 'KEC',
  'Cleaning Pros Plus, LLC', '3f696ecd-17ce-4cae-80ef-7b13bc7b43e1', 'Sample Technician',
  'CERT-K-SAMPLE', '2026-06-12',
  'documents:7dbf7d73-5074-47c8-9e67-53176956b7ce/hoodops/document.cert:CERT-K-SAMPLE.pdf',
  '2026-09-10', 'evidentiary_seal', '{{SEALED_BY}}', '2026-06-12T23:00:05Z', '{{CERT_HASH}}',
  'live', '2029-06-12T23:00:05Z', '0fd30ff0-fd92-4105-a519-63614975f641',
  'HoodOps demo sample Certificate — sealed by scripts/hoodops-sample-records',
  jsonb_build_object(
    'event', 'document.cert',
    'sample', true,
    'source', 'scripts/hoodops-sample-records',
    'hoodops_client_id', 'SAMPLE',
    'hoodops_location_id', 'SAMPLE',
    'hoodops_document_id', 'CERT-K-SAMPLE',
    'report_document_id', 'RPT-K-SAMPLE',
    'client_name', 'Sample Kitchen (HoodOps Demo)',
    'location_name', 'Fictional Kitchen',
    'location_city', 'Merced',
    'location_state', 'CA',
    'location_zip', '95340',
    'service_date', '2026-06-12',
    'service_type_code', 'KEC',
    'cert_number', 'CERT-K-SAMPLE',
    'vendor_name', 'Cleaning Pros Plus, LLC',
    'technician_name', 'Sample Technician',
    'frequency', 'quarterly',
    'document_url', 'https://www.gethoodops.com/samples/a1e5cb0239a6cf78/HoodOps-Sample-Report-and-Certificate-of-Service.pdf'),
  true)
ON CONFLICT DO NOTHING;

-- Documents, already bridged to their sealed rows (the webhook inserts, then
-- updates bridged_service_id and metadata; the end state is the same).
INSERT INTO public.compliance_documents (
  id, organization_id, location_id, category, type, name, status, service_type_code,
  storage_path, mime_type, file_size_bytes, issued_date, expiry_date, vendor_id,
  import_source, import_source_metadata, external_source, external_id,
  bridged_service_id, metadata)
VALUES
  ('04ae0fc3-8817-4e8e-bd59-62364f2d7df7', '7dbf7d73-5074-47c8-9e67-53176956b7ce',
   '57565702-a5b1-4d6a-b690-934d8dd8d71d', 'service', 'KEC',
   'Hood Cleaning Report — 2026-06-12', 'current', 'KEC',
   '7dbf7d73-5074-47c8-9e67-53176956b7ce/hoodops/document.report:RPT-K-SAMPLE.pdf',
   'application/pdf', {{REPORT_BYTES}}, '2026-06-12', NULL, '3f696ecd-17ce-4cae-80ef-7b13bc7b43e1',
   'api', jsonb_build_object('source', 'hoodops_sample_script',
                             'hoodops_document_id', 'RPT-K-SAMPLE', 'event', 'document.report'),
   'hoodops_sample', 'document.report:RPT-K-SAMPLE',
   '0fd30ff0-fd92-4105-a519-63614975f641',
   jsonb_build_object('seal_record_id', '0fd30ff0-fd92-4105-a519-63614975f641',
                      'sealed_at', '2026-06-12T23:00:00+00:00')),
  ('0514c20f-8d42-4a31-9dcf-99889c6ee22e', '7dbf7d73-5074-47c8-9e67-53176956b7ce',
   '57565702-a5b1-4d6a-b690-934d8dd8d71d', 'service', 'KEC',
   'Hood Cleaning Certificate — 2026-06-12', 'current', 'KEC',
   '7dbf7d73-5074-47c8-9e67-53176956b7ce/hoodops/document.cert:CERT-K-SAMPLE.pdf',
   'application/pdf', {{CERT_BYTES}}, '2026-06-12', NULL, '3f696ecd-17ce-4cae-80ef-7b13bc7b43e1',
   'api', jsonb_build_object('source', 'hoodops_sample_script',
                             'hoodops_document_id', 'CERT-K-SAMPLE', 'event', 'document.cert'),
   'hoodops_sample', 'document.cert:CERT-K-SAMPLE',
   '5162df5a-2f41-46af-bf6f-8c2504ff3877',
   jsonb_build_object('seal_record_id', '5162df5a-2f41-46af-bf6f-8c2504ff3877',
                      'sealed_at', '2026-06-12T23:00:05+00:00'))
ON CONFLICT DO NOTHING;

-- Non-expiring /sealed/<token> links. Fixed tokens: these are public sample
-- records, and a rerun must not mint new ones.
INSERT INTO public.sealed_document_links (id, sealed_record_id, organization_id, token)
VALUES
  ('c63d6ee5-660a-4fd9-a4e5-f97f935d9a03', '0fd30ff0-fd92-4105-a519-63614975f641',
   '7dbf7d73-5074-47c8-9e67-53176956b7ce', 'cN-i8NUXWuIAETWb_2u2H-zksEvT5TcoPePjK2Rdd7Y'),
  ('c27e835f-018b-49f6-8a86-56769faa346a', '5162df5a-2f41-46af-bf6f-8c2504ff3877',
   '7dbf7d73-5074-47c8-9e67-53176956b7ce', 'Qj0LogpOpo8eR21CRxOJ8MhIpBYVnJj1R-NWRnTaBps')
ON CONFLICT DO NOTHING;

-- ON CONFLICT DO NOTHING also skips on a clash with some OTHER row, so prove
-- every fixed row is the one intended before committing.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.organizations
       WHERE id = '7dbf7d73-5074-47c8-9e67-53176956b7ce'
         AND external_source = 'hoodops_sample' AND plan_tier = 'standard') <> 1
  THEN RAISE EXCEPTION 'sample organization missing or not standard'; END IF;
  IF (SELECT count(*) FROM public.locations
       WHERE id = '57565702-a5b1-4d6a-b690-934d8dd8d71d'
         AND external_source = 'hoodops_sample') <> 1
  THEN RAISE EXCEPTION 'sample location missing'; END IF;
  IF (SELECT count(*) FROM public.vendors
       WHERE id = '3f696ecd-17ce-4cae-80ef-7b13bc7b43e1') <> 1
  THEN RAISE EXCEPTION 'sample vendor missing'; END IF;
  IF (SELECT count(*) FROM public.vendor_service_records
       WHERE (id = '0fd30ff0-fd92-4105-a519-63614975f641' AND content_hash = '{{REPORT_HASH}}')
          OR (id = '5162df5a-2f41-46af-bf6f-8c2504ff3877' AND content_hash = '{{CERT_HASH}}')) <> 2
  THEN RAISE EXCEPTION 'sealed sample rows missing or hold a different hash'; END IF;
  IF (SELECT count(*) FROM public.compliance_documents
       WHERE id IN ('04ae0fc3-8817-4e8e-bd59-62364f2d7df7', '0514c20f-8d42-4a31-9dcf-99889c6ee22e')
         AND external_source = 'hoodops_sample') <> 2
  THEN RAISE EXCEPTION 'sample documents missing'; END IF;
  IF (SELECT count(*) FROM public.sealed_document_links
       WHERE id IN ('c63d6ee5-660a-4fd9-a4e5-f97f935d9a03', 'c27e835f-018b-49f6-8a86-56769faa346a')
         AND revoked_at IS NULL) <> 2
  THEN RAISE EXCEPTION 'sample sealed links missing'; END IF;
END $$;

COMMIT;
