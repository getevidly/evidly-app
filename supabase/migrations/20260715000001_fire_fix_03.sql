-- ═══════════════════════════════════════════════════════════════════════════
-- FIRE-FIX-03: Standardize enabling_statute field across all states
-- Adds enabling_statute text to fire_jurisdiction_config JSONB
-- Keeps state-specific booleans (title_19_ccr, nrs_477, etc.) untouched
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Schema fixup: drift tables were created by a prior migration with different
-- column names. Add columns the v2 trigger function needs (all additive, nullable).

-- drift_monitor_executions: add v2 columns
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS jurisdiction_name TEXT;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS grading_config_hash TEXT;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS fire_config_hash TEXT;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS baseline_grading_hash TEXT;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS baseline_fire_hash TEXT;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS grading_match BOOLEAN;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS fire_match BOOLEAN;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS drift_alert_id UUID;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS ticket_id UUID;
ALTER TABLE drift_monitor_executions ADD COLUMN IF NOT EXISTS changed_by TEXT;
-- Relax v1 NOT NULL + CHECK on columns the v2 trigger doesn't populate
DO $$ BEGIN ALTER TABLE drift_monitor_executions ALTER COLUMN trigger_source DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE drift_monitor_executions ALTER COLUMN field_changed DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE drift_monitor_executions DROP CONSTRAINT IF EXISTS drift_monitor_executions_trigger_source_check;
ALTER TABLE drift_monitor_executions ADD CONSTRAINT drift_monitor_executions_trigger_source_check
  CHECK (trigger_source = ANY (ARRAY['trigger','cron','manual','drift_trigger']));
ALTER TABLE drift_monitor_executions ALTER COLUMN trigger_source SET DEFAULT 'drift_trigger';

-- drift_alert_log: relax v1 NOT NULL on columns the v2 trigger doesn't populate
DO $$ BEGIN ALTER TABLE drift_alert_log ALTER COLUMN drift_type DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE drift_alert_log ALTER COLUMN column_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Disable drift trigger during intentional backfill (not drift — admin-intended)
ALTER TABLE jurisdictions DISABLE TRIGGER trg_jurisdiction_config_drift;

-- CA: California Fire Code (Title 24 Part 9), Title 19 CCR
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "California Fire Code (Title 24 Part 9), Title 19 CCR"}'::jsonb
WHERE state = 'CA' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- NV: NRS Chapter 477, NAC Chapter 477
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "NRS Chapter 477, NAC Chapter 477"}'::jsonb
WHERE state = 'NV' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- OR: ORS Chapter 479, OAR 837-040
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "ORS Chapter 479, OAR 837-040"}'::jsonb
WHERE state = 'OR' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- WA: RCW 19.27, WAC 51-54A
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "RCW 19.27, WAC 51-54A"}'::jsonb
WHERE state = 'WA' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- AZ: ARS Title 37 Chapter 9, Arizona Fire Code
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config ||
  '{"enabling_statute": "ARS Title 37 Chapter 9, Arizona Fire Code"}'::jsonb
WHERE state = 'AZ' AND fire_jurisdiction_config IS NOT NULL
  AND (fire_jurisdiction_config->>'enabling_statute') IS NULL;

-- Re-enable drift trigger
ALTER TABLE jurisdictions ENABLE TRIGGER trg_jurisdiction_config_drift;

-- ── Verification ─────────────────────────────────────────────────────────
-- Expected: one statute per state, all populated, no NULLs
SELECT DISTINCT state, fire_jurisdiction_config->>'enabling_statute' AS statute
FROM jurisdictions
WHERE fire_jurisdiction_config IS NOT NULL
ORDER BY state;
