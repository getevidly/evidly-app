-- Applied by hand on prod 17 Sep 2026.
BEGIN;
DROP INDEX IF EXISTS public.partner_applications_hoodops_tenant_uidx;
ALTER TABLE public.partner_applications DROP COLUMN IF EXISTS hoodops_tenant_id;
COMMIT;
