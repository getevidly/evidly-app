-- =====================================================================
-- CCP-06 Reheating — extend haccp_step enum + log_type CHECK
-- =====================================================================
-- A. Add 'reheating' to haccp_step enum
-- B. Extend log_type CHECK on temperature_logs to include 'reheating'
-- =====================================================================
-- No trigger changes needed: the existing fn_log_haccp_from_temperature_log
-- already routes via equipment.ccp_id, and fn_map_equipment_type_to_ccp
-- already maps 'reheating'/'oven_reheat' → CCP-06.
-- =====================================================================

BEGIN;

-- ─── A. Extend haccp_step enum ───────────────────────────────────────
ALTER TYPE haccp_step ADD VALUE IF NOT EXISTS 'reheating';

-- ─── B. Extend log_type CHECK constraint ─────────────────────────────
ALTER TABLE temperature_logs DROP CONSTRAINT IF EXISTS temperature_logs_log_type_check;
ALTER TABLE temperature_logs ADD CONSTRAINT temperature_logs_log_type_check
  CHECK (log_type IN (
    'equipment_check', 'hot_holding', 'cold_holding',
    'cooling', 'pre_shift', 'post_shift', 'reheating'
  ));

-- ─── Register migration ─────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260930000003');

COMMIT;
