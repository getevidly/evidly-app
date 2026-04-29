-- Migration: Add step + derived ccp_number on temperature_logs
-- Why: Phase 1 capture flow uses Step as the primary classifier for every
--      reading. ccp_number is derived from step automatically so staff never
--      enter it twice and CCP reports query the same source-of-truth row.
--      Honors "capture once, surface everywhere" constitutional rule.
-- CCP mapping (locked from dev/test transfer doc):
--   receiving=1, cold_holding=2, hot_holding=3, cooldown=4, cooking=5
--   storage, prep, serving = NULL (not designated CCPs)
-- Cross-references:
--   - Phase 1 Schema Sprint commit 1 (haccp_step enum)
--   - Phase 1 Schema Sprint commit 3 (same shape applied to receiving_temp_logs)
--   - Phase 1 Schema Sprint commit 4 (override columns + dedupe indexes)
-- Pre-launch context: temperature_logs has 0 rows, NOT NULL is safe.

ALTER TABLE temperature_logs
  ADD COLUMN step haccp_step NOT NULL;

ALTER TABLE temperature_logs
  ADD COLUMN ccp_number SMALLINT
  GENERATED ALWAYS AS (
    CASE step
      WHEN 'receiving'    THEN 1
      WHEN 'cold_holding' THEN 2
      WHEN 'hot_holding'  THEN 3
      WHEN 'cooldown'     THEN 4
      WHEN 'cooking'      THEN 5
      ELSE NULL
    END
  ) STORED;

CREATE INDEX idx_temperature_logs_step
  ON temperature_logs(step);

CREATE INDEX idx_temperature_logs_ccp_number
  ON temperature_logs(ccp_number)
  WHERE ccp_number IS NOT NULL;
