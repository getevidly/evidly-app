-- 20260502182040_backfill_ca_jurisdictions_to_calcode.sql
--
-- Backfill regulatory_framework_id for California jurisdictions.
-- Sprint commit 3c-4a. Tier 1 data write.
--
-- Sets all 62 California jurisdictions to point at CalCode framework.
-- Defensive WHERE clause: only updates rows where
-- regulatory_framework_id IS NULL. Re-run-safe; preserves any future
-- overrides (e.g., hypothetical CA county wrapper that wraps CalCode).
--
-- Pre-condition (confirmed via inspection):
--   - 62 jurisdictions with state = 'CA'
--   - All 62 currently have regulatory_framework_id = NULL
--   - CALCODE framework exists in regulatory_frameworks
--
-- Post-condition (verified at Step 6):
--   - 62 CA jurisdictions point at CALCODE
--   - 0 CA jurisdictions have regulatory_framework_id = NULL
--
-- Other states (WA, OR, NV, AZ) remain NULL until their state wrapper
-- is activated. NOT NULL promotion deferred until all priority states
-- have wrappers.

BEGIN;

UPDATE public.jurisdictions
SET regulatory_framework_id = (
  SELECT id FROM public.regulatory_frameworks WHERE code = 'CALCODE'
)
WHERE state = 'CA'
  AND regulatory_framework_id IS NULL;

COMMIT;
