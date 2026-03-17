-- Add 'imported' input_method for vendor migration CSV imports
-- and migrated_from column for tracking source platform

-- 1. Update CHECK constraint on temperature_logs
ALTER TABLE temperature_logs
  DROP CONSTRAINT IF EXISTS temperature_logs_input_method_check;

ALTER TABLE temperature_logs
  ADD CONSTRAINT temperature_logs_input_method_check
  CHECK (input_method IN ('manual', 'qr_scan', 'iot_sensor', 'imported'));

-- 2. Add migration metadata column
ALTER TABLE temperature_logs
  ADD COLUMN IF NOT EXISTS migrated_from text DEFAULT NULL;

COMMENT ON COLUMN temperature_logs.migrated_from IS
  'Source platform for imported records: zenput, squadle, compliancemate, jolt, other';

-- 3. Update CHECK constraint on receiving_temp_logs if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receiving_temp_logs') THEN
    EXECUTE 'ALTER TABLE receiving_temp_logs DROP CONSTRAINT IF EXISTS receiving_temp_logs_input_method_check';
    EXECUTE 'ALTER TABLE receiving_temp_logs ADD CONSTRAINT receiving_temp_logs_input_method_check CHECK (input_method IN (''manual'', ''qr_scan'', ''iot_sensor'', ''imported''))';
    EXECUTE 'ALTER TABLE receiving_temp_logs ADD COLUMN IF NOT EXISTS migrated_from text DEFAULT NULL';
  END IF;
END $$;
