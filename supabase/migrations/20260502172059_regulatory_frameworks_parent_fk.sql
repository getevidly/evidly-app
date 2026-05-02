-- 20260502172059_regulatory_frameworks_parent_fk.sql
--
-- Adds parent_framework_id self-FK to regulatory_frameworks.
-- Models the parent/child relationship between federal model codes
-- (e.g., FDA Food Code 2017) and the operative state/local codes
-- that wrap them (e.g., WAC 246-215 wraps FDA 2017; MCEHC wraps
-- FDA 2017). Independent codes (e.g., CalCode) have NULL parent.
--
-- ON DELETE SET NULL preserves the child framework if a parent is
-- removed; state law survives federal model code deletion.

BEGIN;

ALTER TABLE public.regulatory_frameworks
  ADD COLUMN parent_framework_id uuid
    REFERENCES public.regulatory_frameworks(id) ON DELETE SET NULL;

ALTER TABLE public.regulatory_frameworks
  ADD CONSTRAINT regulatory_frameworks_no_self_parent
  CHECK (parent_framework_id IS NULL OR parent_framework_id <> id);

CREATE INDEX idx_regulatory_frameworks_parent_framework_id
  ON public.regulatory_frameworks(parent_framework_id);

COMMENT ON COLUMN public.regulatory_frameworks.parent_framework_id IS
  'Self-referential FK for federal model code that this framework wraps. State and county codes point at the FDA edition they incorporate (e.g., WAC 246-215 -> FDA 2017). Independent codes (e.g., CalCode) have NULL parent. ON DELETE SET NULL preserves child on parent removal.';

COMMIT;
