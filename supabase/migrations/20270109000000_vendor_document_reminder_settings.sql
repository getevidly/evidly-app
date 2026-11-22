-- ══════════════════════════════════════════════════════════════
-- Migration: inbound vendor documents, Part 5: expiration timing setting
--
-- partner-expiry-scan keeps its vendor reminders, but WHEN they go is now
-- a setting instead of fixed constants. Default: 30 days before, then 7
-- days before, then once on expiry. The same scan now covers both inbound
-- flows (partner_documents and the kitchen's compliance_documents).
--
--   vendor_document_reminder_settings  one row (id = 1). reminder_days is
--     the list of days-before-expiry at which the vendor is reminded,
--     e.g. {30,7}. Edited by a platform admin in the Partners tab.
--
--   last_reminder_stage on both document tables: the smallest stage
--     already sent for the current document (30, 7, ... ; 0 = the expiry
--     notice). A stage is sent once; a new document (renewal) starts
--     with NULL. Written only after the vendor's email was accepted, same
--     rule as last_expiry_notified_at.
--
--   renewal_requested_at on compliance_documents: when the scan created
--     the renewal request (a new requested document + secure link) so the
--     renewal goes through the sender-side check like any other.
--
-- Service role only for the settings table.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.vendor_document_reminder_settings (
  id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  reminder_days  INTEGER[] NOT NULL DEFAULT '{30,7}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by     TEXT,
  CONSTRAINT vendor_document_reminder_days_valid CHECK (
    cardinality(reminder_days) BETWEEN 1 AND 6
    AND 0 < ALL (reminder_days)
    AND 366 > ALL (reminder_days)
  )
);

INSERT INTO public.vendor_document_reminder_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.vendor_document_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.vendor_document_reminder_settings;
CREATE POLICY "service_role_all" ON public.vendor_document_reminder_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.vendor_document_reminder_settings FROM anon, authenticated, PUBLIC;

ALTER TABLE public.partner_documents
  ADD COLUMN IF NOT EXISTS last_reminder_stage INTEGER;

ALTER TABLE public.compliance_documents
  ADD COLUMN IF NOT EXISTS last_reminder_stage  INTEGER,
  ADD COLUMN IF NOT EXISTS renewal_requested_at TIMESTAMPTZ;
