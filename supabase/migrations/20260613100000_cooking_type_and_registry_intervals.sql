-- ════════════════════════════════════════════════════════════
-- STEP 1: Add cooking_type column to locations
-- CFC Table 606.3.3.1 cooking-volume classification.
-- Values: solid_fuel | high_volume | low_volume | NULL (= all other)
-- No fabricated default — NULL means "all other cooking operations"
-- (the residual category per CFC Table 606.3.3.1).
-- ════════════════════════════════════════════════════════════

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS cooking_type TEXT DEFAULT NULL;

COMMENT ON COLUMN locations.cooking_type IS
  'CFC Table 606.3.3.1 cooking-volume classification: solid_fuel | high_volume | low_volume | NULL (all other). Determines hood cleaning inspection interval.';

-- ════════════════════════════════════════════════════════════
-- STEP 2a: Add intervals_days to hood_cleaning registry row
-- Grounded from CFC Table 606.3.3.1:
--   solid_fuel  = 30 days  (1 month)
--   high_volume = 90 days  (3 months)
--   all_other   = 180 days (6 months)
--   low_volume  = 365 days (12 months)
-- ════════════════════════════════════════════════════════════

UPDATE pl_standards_registry
SET requirement = jsonb_set(
  requirement,
  '{state,US-CA,frequency,intervals_days}',
  '{"solid_fuel":30,"high_volume":90,"all_other":180,"low_volume":365}'::jsonb
),
updated_at = now()
WHERE topic = 'hood_cleaning';

-- ════════════════════════════════════════════════════════════
-- STEP 2b: Add intervals_days to suppression registry row
-- Grounded from CFC §904.13.5.2: not less than every 6 months
--   default = 180 days
-- ════════════════════════════════════════════════════════════

UPDATE pl_standards_registry
SET requirement = jsonb_set(
  requirement,
  '{state,US-CA,frequency,intervals_days}',
  '{"default":180}'::jsonb
),
updated_at = now()
WHERE topic = 'suppression';

-- ════════════════════════════════════════════════════════════
-- Migration registration
-- ════════════════════════════════════════════════════════════

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260613100000', 'cooking_type_and_registry_intervals')
ON CONFLICT (version) DO NOTHING;
