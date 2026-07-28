-- ============================================================
-- External Identity Columns
-- Enables cross-system matching (HoodOps → EvidLY) and
-- duplicate prevention on compliance_documents.
--
-- Additive only. No drops. IF NOT EXISTS throughout.
-- ============================================================

-- ── 1. organizations ─────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS external_source text;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_external_identity
  ON public.organizations (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

-- ── 2. locations ─────────────────────────────────────────────
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS external_source text;

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_loc_external_identity
  ON public.locations (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

-- ── 3. compliance_documents ──────────────────────────────────
-- This is the duplicate-prevention key. Today there is ZERO
-- unique constraint on compliance_documents beyond the PK.
ALTER TABLE public.compliance_documents
  ADD COLUMN IF NOT EXISTS external_source text;

ALTER TABLE public.compliance_documents
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cd_external_identity
  ON public.compliance_documents (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;
