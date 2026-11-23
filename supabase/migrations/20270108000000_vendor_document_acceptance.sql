-- ══════════════════════════════════════════════════════════════
-- Migration: inbound vendor documents, Part 4: preview, accept, tamper detection
--
-- At Send, the sender's check travels with the document so the recipient
-- can see what was checked (they only preview and accept; they never fix):
--
--   check_rows           Detail / sent / on the document / result, exactly
--                        as the sender's screen showed it when every row
--                        matched
--   content_sha256       SHA-256 of the file that was checked and sent
--
-- At acceptance the stored file is hashed again. Only if it still equals
-- content_sha256 is the document accepted, and from then on:
--
--   tamper_detection_at  tamper detection is on: any later read can
--                        re-hash the file and compare with content_sha256
--
-- partner_documents also gains accepted_at / accepted_by (the admin's
-- email); compliance_documents already has accepted_at / accepted_by.
--
-- Defensive: ADD COLUMN IF NOT EXISTS.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.compliance_documents
  ADD COLUMN IF NOT EXISTS check_rows          JSONB,
  ADD COLUMN IF NOT EXISTS content_sha256      TEXT,
  ADD COLUMN IF NOT EXISTS tamper_detection_at TIMESTAMPTZ;

ALTER TABLE public.partner_documents
  ADD COLUMN IF NOT EXISTS check_rows          JSONB,
  ADD COLUMN IF NOT EXISTS content_sha256      TEXT,
  ADD COLUMN IF NOT EXISTS tamper_detection_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by         TEXT;
