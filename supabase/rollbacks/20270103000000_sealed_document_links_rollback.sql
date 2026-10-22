-- Rollback for 20270103000000_sealed_document_links.sql.
-- Every /sealed/<token> link stops working once this runs.
BEGIN;
DROP FUNCTION IF EXISTS public.get_sealed_document(text);
DROP TABLE IF EXISTS public.sealed_document_links;
COMMIT;
