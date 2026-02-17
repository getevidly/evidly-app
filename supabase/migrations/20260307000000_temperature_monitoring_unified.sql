-- ============================================================
-- FS-5: Temperature Monitoring — Unified Three-Method System
-- ============================================================
-- Creates the unified temperature_logs table (manual + QR + IoT)
-- and cooling_logs table. Other tables (iot_sensors,
-- iot_sensor_readings, equipment_qr_codes) already exist from
-- prior migrations 20260210200000 and 20260306000000.
-- ============================================================

-- ── TABLE 1: temperature_logs ────────────────────────────────
-- Unified temperature log — all three input methods write here.

CREATE TABLE IF NOT EXISTS temperature_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES temperature_equipment(id) ON DELETE CASCADE,
  input_method text NOT NULL CHECK (input_method IN ('manual', 'qr_scan', 'iot_sensor')),
  temperature decimal NOT NULL,
  required_min decimal NULL,
  required_max decimal NULL,
  temp_pass boolean NOT NULL,
  reading_time timestamptz NOT NULL,
  shift text NULL CHECK (shift IN ('morning', 'afternoon', 'evening')),
  log_type text NOT NULL CHECK (log_type IN (
    'equipment_check', 'hot_holding', 'cold_holding',
    'cooling', 'pre_shift', 'post_shift'
  )),
  logged_by uuid NULL,
  sensor_id text NULL,
  qr_code_id text NULL,
  notes text NULL,
  photo_url text NULL,
  corrective_action text NULL,
  corrective_action_by uuid NULL,
  corrective_action_time timestamptz NULL,
  haccp_ccp_log_id uuid NULL,
  checklist_completion_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_temp_logs_facility
  ON temperature_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_temp_logs_equipment
  ON temperature_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_temp_logs_reading_time
  ON temperature_logs(reading_time DESC);
CREATE INDEX IF NOT EXISTS idx_temp_logs_method
  ON temperature_logs(input_method);
CREATE INDEX IF NOT EXISTS idx_temp_logs_pass
  ON temperature_logs(temp_pass);
CREATE INDEX IF NOT EXISTS idx_temp_logs_type
  ON temperature_logs(log_type);

-- ── TABLE 5: cooling_logs ────────────────────────────────────
-- FDA 2-stage cooling: 135→70 in 2hr, 70→41 in 4hr (total 6hr)

CREATE TABLE IF NOT EXISTS cooling_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  food_item text NOT NULL,
  batch_id text NULL,
  start_temp decimal NOT NULL,
  start_time timestamptz NOT NULL,
  target_stage1_temp decimal NOT NULL DEFAULT 70,
  target_stage1_deadline timestamptz NOT NULL,
  stage1_actual_temp decimal NULL,
  stage1_actual_time timestamptz NULL,
  stage1_pass boolean NULL,
  target_final_temp decimal NOT NULL DEFAULT 41,
  target_final_deadline timestamptz NOT NULL,
  final_actual_temp decimal NULL,
  final_actual_time timestamptz NULL,
  final_pass boolean NULL,
  overall_pass boolean NULL,
  input_method text NOT NULL CHECK (input_method IN ('manual', 'qr_scan', 'iot_sensor')),
  corrective_action text NULL CHECK (
    corrective_action IS NULL OR
    corrective_action IN ('reheated', 'discarded', 'continued_cooling')
  ),
  logged_by uuid NULL,
  sensor_id text NULL,
  notes text NULL,
  photo_url text NULL,
  haccp_ccp_log_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cooling_logs_facility
  ON cooling_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_cooling_logs_start_time
  ON cooling_logs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_cooling_logs_pass
  ON cooling_logs(overall_pass);

-- ── Enhance existing iot_sensors table ───────────────────────
-- Add columns if missing (idempotent via DO block)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iot_sensors' AND column_name = 'alert_threshold_high'
  ) THEN
    ALTER TABLE iot_sensors ADD COLUMN alert_threshold_high decimal NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iot_sensors' AND column_name = 'alert_threshold_low'
  ) THEN
    ALTER TABLE iot_sensors ADD COLUMN alert_threshold_low decimal NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iot_sensors' AND column_name = 'alert_delay_minutes'
  ) THEN
    ALTER TABLE iot_sensors ADD COLUMN alert_delay_minutes integer DEFAULT 15;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iot_sensors' AND column_name = 'battery_level'
  ) THEN
    ALTER TABLE iot_sensors ADD COLUMN battery_level integer NULL;
  END IF;
END $$;

-- ── Enhance existing equipment_qr_codes table ────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_qr_codes' AND column_name = 'qr_code_url'
  ) THEN
    ALTER TABLE equipment_qr_codes ADD COLUMN qr_code_url text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_qr_codes' AND column_name = 'print_count'
  ) THEN
    ALTER TABLE equipment_qr_codes ADD COLUMN print_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_qr_codes' AND column_name = 'status'
  ) THEN
    ALTER TABLE equipment_qr_codes ADD COLUMN status text NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'replaced', 'decommissioned'));
  END IF;
END $$;

-- ── RLS policies ─────────────────────────────────────────────

ALTER TABLE temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooling_logs ENABLE ROW LEVEL SECURITY;

-- Org-member read access
CREATE POLICY "temperature_logs_select"
  ON temperature_logs FOR SELECT
  USING (
    facility_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "temperature_logs_insert"
  ON temperature_logs FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "cooling_logs_select"
  ON cooling_logs FOR SELECT
  USING (
    facility_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "cooling_logs_insert"
  ON cooling_logs FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Service role bypass for Edge Functions (IoT auto-logging)
CREATE POLICY "temperature_logs_service_insert"
  ON temperature_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "cooling_logs_service_insert"
  ON cooling_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
