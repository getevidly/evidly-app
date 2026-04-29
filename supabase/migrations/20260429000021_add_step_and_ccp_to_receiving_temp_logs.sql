-- Migration: Add step + derived ccp_number on receiving_temp_logs
-- Why: Mirrors commit 2's shape on a different table. receiving_temp_logs is
--      purpose-built for the Receiving Step, so step defaults to 'receiving'
--      and ccp_number is constant 1 (every row in this table is CCP 1).
--      Honors "capture once, surface everywhere" constitutional rule —
--      Receiving CCP reports query this table directly, no duplicate
--      CCP-specific table.
-- CCP mapping (locked from dev/test transfer doc):
--   receiving = CCP 1 (this table, every row)
-- Cross-references:
--   - Phase 1 Schema Sprint commit 1 (haccp_step enum)
--   - Phase 1 Schema Sprint commit 2 (same shape on temperature_logs)
--   - Phase 1 Schema Sprint commit 4 (override columns + dedupe indexes)
-- Pre-launch context: receiving_temp_logs has 0 rows, NOT NULL is safe.

ALTER TABLE receiving_temp_logs
  ADD COLUMN step haccp_step NOT NULL DEFAULT 'receiving';

ALTER TABLE receiving_temp_logs
  ADD COLUMN ccp_number SMALLINT
  GENERATED ALWAYS AS (1) STORED;

CREATE INDEX idx_receiving_temp_logs_step
  ON receiving_temp_logs(step);
