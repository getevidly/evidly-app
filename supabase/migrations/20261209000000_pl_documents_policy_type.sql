-- ============================================================
-- PL DOCUMENTS: 'policy' doc_type + per-intake policy PDF count
--
-- 1. Widen pl_documents.doc_type to allow 'policy' so the uploaded
--    policy PDF can be represented as a pl_documents row. Every
--    existing value is preserved.
-- 2. policy_lens_intakes.policy_pdf_count — how many policy PDFs
--    the intake carries.
-- ============================================================


-- ── 1. doc_type CHECK — existing 10 values plus 'policy' ────

ALTER TABLE public.pl_documents
  DROP CONSTRAINT IF EXISTS pl_documents_doc_type_check;

ALTER TABLE public.pl_documents
  ADD CONSTRAINT pl_documents_doc_type_check
  CHECK (doc_type IN (
    'hood_cleaning',
    'suppression',
    'fire_sprinkler',
    'fire_alarm',
    'grease_trap',
    'backflow',
    'pest_control',
    'servsafe',
    'food_safety_other',
    'other',
    'policy'
  ));


-- ── 2. Per-intake policy PDF count ──────────────────────────

ALTER TABLE public.policy_lens_intakes
  ADD COLUMN IF NOT EXISTS policy_pdf_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.policy_lens_intakes.policy_pdf_count IS
  'Number of policy PDFs uploaded for this intake. 0 = none uploaded.';
