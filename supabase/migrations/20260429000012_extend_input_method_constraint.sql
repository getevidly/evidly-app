-- Extend input_method CHECK constraints on temperature_logs and receiving_temp_logs.
-- Adds voice, photo_ocr, bluetooth_probe to support the six-mode capture flow
-- locked for Phase 1.
--
-- temperature_logs: manual, qr_scan, iot_sensor, voice, photo_ocr, bluetooth_probe
--   (replaces prior photo_read → photo_ocr, bluetooth → bluetooth_probe)
-- receiving_temp_logs: same six + 'imported' for migrated data
--   (input_method column added as nullable — did not previously exist on this table.
--    Nullable is intentional: column stays empty until the application explicitly
--    sets it during Phase 1 UI wiring. CHECK allows NULL implicitly.)

ALTER TABLE temperature_logs DROP CONSTRAINT IF EXISTS temperature_logs_input_method_check;
ALTER TABLE temperature_logs ADD CONSTRAINT temperature_logs_input_method_check
  CHECK (input_method IN ('manual','qr_scan','iot_sensor','voice','photo_ocr','bluetooth_probe'));

ALTER TABLE receiving_temp_logs
  ADD COLUMN IF NOT EXISTS input_method text;

ALTER TABLE receiving_temp_logs ADD CONSTRAINT receiving_temp_logs_input_method_check
  CHECK (input_method IN ('manual','qr_scan','iot_sensor','voice','photo_ocr','bluetooth_probe','imported'));
