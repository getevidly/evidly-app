-- ═══════════════════════════════════════════════════════════════════════
-- CRITICAL FIX: Remove ALL fabricated default weights
--
-- The 60/40 pillar split (food_safety/facility_safety) and 60/40
-- ops/docs split were NEVER verified against actual jurisdiction
-- methodology. The Mariposa 50/50 and Santa Clara 70/30 overrides
-- were inferred from reasoning, NOT from source data.
--
-- After this migration: 0 jurisdictions have weights.
-- The scoring engine will return "not yet verified" for all
-- jurisdictions until weights are confirmed from source data.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Remove DEFAULT constraints from weight columns
ALTER TABLE jurisdictions ALTER COLUMN food_safety_weight DROP DEFAULT;
ALTER TABLE jurisdictions ALTER COLUMN fire_safety_weight DROP DEFAULT;
ALTER TABLE jurisdictions ALTER COLUMN ops_weight DROP DEFAULT;
ALTER TABLE jurisdictions ALTER COLUMN docs_weight DROP DEFAULT;

-- 2. Set ALL weight values to NULL (none are verified)
UPDATE jurisdictions SET
  food_safety_weight = NULL,
  fire_safety_weight = NULL,
  ops_weight = NULL,
  docs_weight = NULL;

-- 3. Verify: should return 0 rows with non-null weights
-- SELECT county, food_safety_weight, fire_safety_weight, ops_weight, docs_weight
-- FROM jurisdictions
-- WHERE food_safety_weight IS NOT NULL
--    OR fire_safety_weight IS NOT NULL
--    OR ops_weight IS NOT NULL
--    OR docs_weight IS NOT NULL;
