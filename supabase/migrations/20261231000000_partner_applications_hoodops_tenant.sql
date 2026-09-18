-- Applied by hand on prod 17 Sep 2026.
BEGIN;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS hoodops_tenant_id uuid REFERENCES public.hoodops_tenants(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS partner_applications_hoodops_tenant_uidx ON public.partner_applications (hoodops_tenant_id) WHERE hoodops_tenant_id IS NOT NULL;
COMMENT ON COLUMN public.partner_applications.hoodops_tenant_id IS 'The HoodOps tenant whose own business records these are. One records set per tenant. Null for companies that came in through the public form.';
COMMIT;
