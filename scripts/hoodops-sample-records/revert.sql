-- Revert the HoodOps demo sample (create.sql). DO NOT RUN unless the sample
-- is being removed on purpose.
--
-- Deletes exactly the sample organization's rows, by fixed id. The write-once
-- trigger on vendor_service_records is disabled only inside this transaction:
-- DISABLE TRIGGER holds an ACCESS EXCLUSIVE lock on the table until COMMIT,
-- so no other session can delete anything while it is off, and the guard
-- below aborts unless exactly the two sample rows went.
--
-- The two PDFs are storage objects; delete them through the Storage API
-- afterward (direct DELETE on storage.objects is blocked):
--   curl -X DELETE "https://irxgmhxhmxtzfwuieblc.supabase.co/storage/v1/object/documents" \
--     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"prefixes":["7dbf7d73-5074-47c8-9e67-53176956b7ce/hoodops/document.report:RPT-K-SAMPLE.pdf","7dbf7d73-5074-47c8-9e67-53176956b7ce/hoodops/document.cert:CERT-K-SAMPLE.pdf"]}'

BEGIN;

DELETE FROM public.sealed_document_links
 WHERE id IN ('c63d6ee5-660a-4fd9-a4e5-f97f935d9a03', 'c27e835f-018b-49f6-8a86-56769faa346a')
   AND organization_id = '7dbf7d73-5074-47c8-9e67-53176956b7ce';

DELETE FROM public.compliance_documents
 WHERE id IN ('04ae0fc3-8817-4e8e-bd59-62364f2d7df7', '0514c20f-8d42-4a31-9dcf-99889c6ee22e')
   AND organization_id = '7dbf7d73-5074-47c8-9e67-53176956b7ce';

ALTER TABLE public.vendor_service_records DISABLE TRIGGER vsr_immutable_no_delete;

DO $$
DECLARE n int;
BEGIN
  -- Both in one statement: the certificate's supersedes_id points at the report.
  DELETE FROM public.vendor_service_records
   WHERE id IN ('0fd30ff0-fd92-4105-a519-63614975f641', '5162df5a-2f41-46af-bf6f-8c2504ff3877')
     AND organization_id = '7dbf7d73-5074-47c8-9e67-53176956b7ce';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'expected to delete 2 sample sealed rows, deleted %', n; END IF;
END $$;

ALTER TABLE public.vendor_service_records ENABLE TRIGGER vsr_immutable_no_delete;

DELETE FROM public.vendors
 WHERE id = '3f696ecd-17ce-4cae-80ef-7b13bc7b43e1'
   AND organization_id = '7dbf7d73-5074-47c8-9e67-53176956b7ce';

-- Written by the trg_rfe_locations trigger when the sample location was inserted.
DELETE FROM public.risk_free_eligibility
 WHERE organization_id = '7dbf7d73-5074-47c8-9e67-53176956b7ce';

DELETE FROM public.locations
 WHERE id = '57565702-a5b1-4d6a-b690-934d8dd8d71d'
   AND organization_id = '7dbf7d73-5074-47c8-9e67-53176956b7ce';

DELETE FROM public.organizations
 WHERE id = '7dbf7d73-5074-47c8-9e67-53176956b7ce'
   AND external_source = 'hoodops_sample';

COMMIT;
