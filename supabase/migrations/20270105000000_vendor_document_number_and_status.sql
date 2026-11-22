-- ══════════════════════════════════════════════════════════════
-- Migration: inbound vendor documents, Part 1: number + status
--
-- Arthur's rule (21-22 Nov 2026): every inbound vendor document or
-- certificate carries the sender-typed expiration date AND policy or
-- license number, and moves through one status:
--
--   draft                   sender is filling it in, nothing sent
--   needs_fix               the check found a detail that does not match
--   waiting_for_acceptance  sent; the recipient can preview and accept
--   accepted                recipient accepted; tamper detection on
--   expired                 past its expiration date
--
-- Applied to both inbound flows:
--   compliance_documents  kitchen-requested (the kitchen is the recipient)
--   partner_documents     Trusted Partner flow (Arthur is the recipient)
--
-- doc_number is nullable: W-9s carry no number, and every row that
-- predates this migration has none. review_status is nullable for the
-- same reason: legacy rows keep their existing status column untouched
-- and no backfill is done.
--
-- draft and needs_fix are never written to these two tables. A document
-- that has not been sent lives only in the service-role-only check table
-- (Part 2), so the recipient cannot see it, not even by its status.
--
-- Defensive: ADD COLUMN IF NOT EXISTS + guarded constraints.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.compliance_documents
  ADD COLUMN IF NOT EXISTS doc_number    TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT;

ALTER TABLE public.partner_documents
  ADD COLUMN IF NOT EXISTS doc_number    TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.compliance_documents'::regclass
      AND conname  = 'compliance_documents_review_status_check'
  ) THEN
    ALTER TABLE public.compliance_documents
      ADD CONSTRAINT compliance_documents_review_status_check
      CHECK (review_status IN (
        'draft', 'needs_fix', 'waiting_for_acceptance', 'accepted', 'expired'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partner_documents'::regclass
      AND conname  = 'partner_documents_review_status_check'
  ) THEN
    ALTER TABLE public.partner_documents
      ADD CONSTRAINT partner_documents_review_status_check
      CHECK (review_status IN (
        'draft', 'needs_fix', 'waiting_for_acceptance', 'accepted', 'expired'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_compliance_documents_review_status
  ON public.compliance_documents (organization_id, review_status)
  WHERE review_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_documents_review_status
  ON public.partner_documents (review_status)
  WHERE review_status IS NOT NULL;
