-- Drop unused iot_* schema family.
-- Phase 0 inventory (2026-04-28) confirmed all six tables had zero rows
-- and were not queried by any page in the codebase. The sensor_* family
-- (12 tables) is the canonical IoT/sensor schema going forward.
-- Verified empty 2026-04-29 before drop.

DROP TABLE IF EXISTS iot_ingestion_log CASCADE;
DROP TABLE IF EXISTS iot_integration_configs CASCADE;
DROP TABLE IF EXISTS iot_sensor_alerts CASCADE;
DROP TABLE IF EXISTS iot_sensor_readings CASCADE;
DROP TABLE IF EXISTS iot_sensors CASCADE;
DROP TABLE IF EXISTS iot_sensor_providers CASCADE;
