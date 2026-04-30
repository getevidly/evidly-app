-- Migration: Add step + derived ccp_number on cooldown_logs
-- Why: Closes structural gap surfaced during commit 4 inspection.
--      cooldown_logs is purpose-built for the Cooldown Step, so step defaults
--      to 'cooldown' and ccp_number is constant 4 (every row in this table
--      is CCP 4). Honors "capture once, surface everywhere" — CCP 4 reports
--      query this table directly via the parent row, with checkpoint reads
--      joined from cooldown_temp_checks.
-- CCP mapping (locked from dev/test transfer doc):
--   cooldown = CCP 4 (this table, every row)
-- Cross-references:
--   - Phase 1 Schema Sprint commit 1 (haccp_step enum)
--   - Phase 1 Schema Sprint commit 2 (same shape on temperature_logs)
--   - Phase 1 Schema Sprint commit 3 (same shape on receiving_temp_logs)
--   - Phase 1 Schema Sprint commit 4 (override columns + dedupe indexes,
--     covers cooldown_logs AND cooldown_temp_checks)
-- Pre-launch context: cooldown_logs has 0 rows, NOT NULL DEFAULT is safe.

ALTER TABLE cooldown_logs
  ADD COLUMN step haccp_step NOT NULL DEFAULT 'cooldown';

ALTER TABLE cooldown_logs
  ADD COLUMN ccp_number SMALLINT
  GENERATED ALWAYS AS (4) STORED;

CREATE INDEX idx_cooldown_logs_step
  ON cooldown_logs(step);
