-- ══════════════════════════════════════════════════════════════
-- Migration: inbound vendor documents, Part 2: the sender-side check
--
-- One row per inbound document slot while the SENDER is working on it:
-- the file they chose, what they typed, what the reader found on the
-- document, and the row-by-row comparison shown on their screen.
--
-- This is the only place a draft exists. It is service-role only:
-- no anon, no authenticated, no org policy. The kitchen (or Arthur, for
-- the partner flow) cannot see a draft, its status, or its file until
-- the sender presses Send and every detail matched. At Send the file
-- and the typed values are copied onto compliance_documents or
-- partner_documents and review_status becomes waiting_for_acceptance.
--
-- Exactly one of compliance_document_id / partner_document_id is set.
--
--   status       draft | needs_fix | sent
--   file_*       the draft file (bucket + path), its type and SHA-256
--   typed_*      what the sender typed
--   read_*       what the reader found on the document, kept beside the
--                typed values. read_sha256 is the file those values came
--                from: a new file means a new read, a changed field only
--                means a new comparison.
--   check_rows   the comparison table exactly as the sender saw it
--   check_passed true only when every row matched
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.vendor_document_checks (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow                    TEXT NOT NULL CHECK (flow IN ('kitchen', 'partner')),
  compliance_document_id  UUID UNIQUE REFERENCES public.compliance_documents (id) ON DELETE CASCADE,
  partner_document_id     UUID UNIQUE REFERENCES public.partner_documents (id) ON DELETE CASCADE,
  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'needs_fix', 'sent')),

  file_bucket             TEXT,
  file_path               TEXT,
  file_mime_type          TEXT,
  file_size_bytes         BIGINT,
  file_sha256             TEXT,
  original_filename       TEXT,

  typed_expiration_date   DATE,
  typed_doc_number        TEXT,

  read_sha256             TEXT,
  read_expiration_date    DATE,
  read_doc_number         TEXT,
  read_insured_name       TEXT,
  read_legible            BOOLEAN,
  read_error              TEXT,
  read_at                 TIMESTAMPTZ,

  check_rows              JSONB NOT NULL DEFAULT '[]'::jsonb,
  check_passed            BOOLEAN NOT NULL DEFAULT false,
  checked_at              TIMESTAMPTZ,


  sent_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT vendor_document_checks_one_target CHECK (
    (compliance_document_id IS NOT NULL)::int + (partner_document_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_vendor_document_checks_needs_fix
  ON public.vendor_document_checks (status)
  WHERE status = 'needs_fix';

ALTER TABLE public.vendor_document_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.vendor_document_checks;
CREATE POLICY "service_role_all" ON public.vendor_document_checks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.vendor_document_checks FROM anon, authenticated, PUBLIC;
