-- Migration: Drop legacy sensor_* family (9 tables)
-- Why: Phase 1 Schema Sprint replaces this functionality with a smaller,
--      more flexible set. Original IoT design iteration was never populated
--      (0 rows across all 9 tables) and zero application code references it.
-- Tables dropped:
--   sensor_devices            → new sensor_devices in commit 8 (protocol-agnostic)
--   sensor_integrations       → sensor_devices.connection_config absorbs this
--   sensor_readings           → temperature_logs (already exists)
--   sensor_alerts             → step_alert_dispatch (commit 9)
--   sensor_cooling_logs       → cooldown_logs / cooldown_temp_checks (already exist)
--   sensor_calibration_log    → deferred (future calibration sprint)
--   sensor_defrost_schedules  → deferred (future defrost sprint)
--   sensor_door_events        → deferred (future door-event sprint)
--   sensor_incidents          → handled by step_alert_dispatch escalation
-- CASCADE used to clean up:
--   - 15 FK constraints
--   - 13 indexes
--   - 7 RLS policies
-- Pre-launch context: 0 rows across all 9 tables. Zero application code
-- references (verified via grep). Safe destructive operation.
-- Cross-references:
--   - Original schema sprint commit 2 (dropped iot_* family — same pattern)
--   - Phase 1 Schema Sprint commit 8 (new sensor_devices replacement)

-- ── Drop child tables first (those with FKs into other sensor_* tables) ──

DROP TABLE IF EXISTS sensor_incidents CASCADE;
DROP TABLE IF EXISTS sensor_alerts CASCADE;
DROP TABLE IF EXISTS sensor_door_events CASCADE;
DROP TABLE IF EXISTS sensor_calibration_log CASCADE;
DROP TABLE IF EXISTS sensor_cooling_logs CASCADE;
DROP TABLE IF EXISTS sensor_defrost_schedules CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;

-- ── Drop sensor_devices (parent of most child FKs) ──

DROP TABLE IF EXISTS sensor_devices CASCADE;

-- ── Drop sensor_integrations (parent of sensor_devices) ──

DROP TABLE IF EXISTS sensor_integrations CASCADE;
