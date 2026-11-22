-- ══════════════════════════════════════════════════════════════
-- Migration: inbound vendor documents, Part 3: the "Fix One Detail" email
--
-- Only if the sender leaves while their check says needs_fix: one email,
-- "Fix One Detail on Your {Document Type} for {Recipient}", with a
-- "Fix My Document" link back to the same screen (the existing token
-- link). The recipient is never told; the document was never sent.
--
--   fix_email_queued_at  set when the sender left in needs_fix. One email
--                        per needs_fix result: a later check that still
--                        does not match (checked_at > queued_at) may queue
--                        one more.
--   fix_email_sent_at    set only after the email provider accepted it.
--                        Queued without sent = not delivered (for example
--                        staging, which has no email key).
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.vendor_document_checks
  ADD COLUMN IF NOT EXISTS fix_email_queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fix_email_sent_at   TIMESTAMPTZ;
