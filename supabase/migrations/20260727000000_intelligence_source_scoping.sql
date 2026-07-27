-- ============================================================
-- Intelligence Source Scoping
-- Additive only. No drops.
--
-- 1. Add scope TEXT ('county' | 'national') to intelligence_sources
-- 2. Fix jurisdiction_id type: TEXT -> UUID (matches jurisdictions.id)
-- 3. Backfill scope for all 82 existing sources
-- ============================================================

-- 1. Add scope column (ADD COLUMN IF NOT EXISTS is safe for re-run)
ALTER TABLE public.intelligence_sources
  ADD COLUMN IF NOT EXISTS scope TEXT;

-- CHECK constraint (idempotent: drop-if-exists then add)
ALTER TABLE public.intelligence_sources
  DROP CONSTRAINT IF EXISTS intelligence_sources_scope_check;

ALTER TABLE public.intelligence_sources
  ADD CONSTRAINT intelligence_sources_scope_check
  CHECK (scope IN ('county', 'national'));

-- 2. Fix jurisdiction_id type: TEXT -> UUID
-- All 82 rows have jurisdiction_id = NULL so the cast is safe.
ALTER TABLE public.intelligence_sources
  ALTER COLUMN jurisdiction_id TYPE UUID USING jurisdiction_id::uuid;

-- 3. Backfill scope
-- 62 *_eh sources -> county (county environmental health feeds)
UPDATE public.intelligence_sources
  SET scope = 'county'
  WHERE source_key LIKE '%\_eh' AND scope IS NULL;

-- 20 non-EH sources -> national (CDC, USDA, NFPA, etc.)
UPDATE public.intelligence_sources
  SET scope = 'national'
  WHERE source_key NOT LIKE '%\_eh' AND scope IS NULL;
