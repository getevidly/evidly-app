-- ============================================================
-- IoT Sensor Platform v2 — Extended Tables
-- Adds: integrations, webhooks, CSV imports, calibration log,
--        door events, defrost schedules, cooling curves, incidents
-- ============================================================

-- ── Sensor Integrations (per-location provider connection) ──

CREATE TABLE IF NOT EXISTS sensor_integrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        text NOT NULL CHECK (provider IN ('sensorpush','tempstick','monnit','cooper_atkins','testo','compliancemate','thermoworks','deltatrak','webhook','csv')),
  auth_config     jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','error','disconnected')),
  last_sync_at    timestamptz,
  sync_interval_minutes int NOT NULL DEFAULT 5,
  error_count     int NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Sensor Devices ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_devices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    uuid NOT NULL REFERENCES sensor_integrations(id) ON DELETE CASCADE,
  location_id       uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  external_device_id text,
  device_name       text NOT NULL,
  device_model      text,
  sensor_type       text NOT NULL DEFAULT 'temperature' CHECK (sensor_type IN ('temperature','humidity','pressure','door','combo')),
  kitchen_zone      text NOT NULL DEFAULT 'walk_in_cooler' CHECK (kitchen_zone IN ('walk_in_cooler','walk_in_freezer','reach_in','prep_line','hot_holding','dry_storage','receiving','blast_chiller','display_case','custom')),
  thresholds        jsonb NOT NULL DEFAULT '{"max_temp_f": 41, "min_temp_f": null, "warning_buffer_f": 2, "max_humidity_pct": null}',
  alert_config      jsonb NOT NULL DEFAULT '{"recipients": ["kitchen_manager"], "methods": ["push","email"], "delay_min": 0, "escalation_enabled": true}',
  defrost_schedule  jsonb DEFAULT NULL,
  battery_level     int,
  signal_strength   int,
  firmware_version  text,
  last_reading_at   timestamptz,
  status            text NOT NULL DEFAULT 'online' CHECK (status IN ('online','warning','offline','violation','error')),
  calibration_date  date,
  mac_address       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── Sensor Readings (time-series) ───────────────────────────

CREATE TABLE IF NOT EXISTS sensor_readings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id         uuid NOT NULL REFERENCES sensor_devices(id) ON DELETE CASCADE,
  location_id       uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  reading_type      text NOT NULL DEFAULT 'temperature' CHECK (reading_type IN ('temperature','humidity','pressure','door_open','door_close')),
  value             numeric NOT NULL,
  unit              text NOT NULL DEFAULT 'fahrenheit' CHECK (unit IN ('fahrenheit','celsius','percent','hpa','boolean')),
  raw_value         numeric,
  timestamp         timestamptz NOT NULL DEFAULT now(),
  ingestion_method  text NOT NULL DEFAULT 'api_pull' CHECK (ingestion_method IN ('api_pull','webhook_push','csv_import','manual_entry','bluetooth')),
  source_provider   text NOT NULL,
  quality           text NOT NULL DEFAULT 'good' CHECK (quality IN ('good','suspect','error')),
  compliance_status text NOT NULL DEFAULT 'in_range' CHECK (compliance_status IN ('in_range','warning','violation')),
  threshold_applied jsonb,
  is_defrost_cycle  boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sensor_readings_device_ts ON sensor_readings (device_id, timestamp DESC);
CREATE INDEX idx_sensor_readings_location_ts ON sensor_readings (location_id, timestamp DESC);
CREATE INDEX idx_sensor_readings_compliance ON sensor_readings (compliance_status, timestamp DESC);

-- ── Sensor Alerts ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_alerts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id           uuid NOT NULL REFERENCES sensor_devices(id) ON DELETE CASCADE,
  location_id         uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  alert_type          text NOT NULL CHECK (alert_type IN ('threshold_violation','sustained_violation','device_offline','battery_low','signal_weak','rapid_change','door_open_extended','defrost_recovery_failed')),
  severity            text NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning','critical')),
  reading_id          uuid REFERENCES sensor_readings(id),
  threshold_exceeded  numeric,
  current_value       numeric,
  triggered_at        timestamptz NOT NULL DEFAULT now(),
  acknowledged_by     uuid REFERENCES user_profiles(id),
  acknowledged_at     timestamptz,
  resolved_at         timestamptz,
  escalated           boolean NOT NULL DEFAULT false,
  escalation_history  jsonb DEFAULT '[]'
);

CREATE INDEX idx_sensor_alerts_device ON sensor_alerts (device_id, triggered_at DESC);
CREATE INDEX idx_sensor_alerts_unresolved ON sensor_alerts (resolved_at) WHERE resolved_at IS NULL;

-- ── Sensor → Incident Link ──────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_incidents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id     uuid NOT NULL REFERENCES sensor_alerts(id) ON DELETE CASCADE,
  incident_id  uuid NOT NULL,
  auto_created boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Sensor Webhooks ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_webhooks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id      uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  integration_id   uuid NOT NULL REFERENCES sensor_integrations(id) ON DELETE CASCADE,
  webhook_url_path text NOT NULL UNIQUE,
  hmac_secret_hash text NOT NULL,
  payload_mapping  jsonb NOT NULL DEFAULT '{}',
  active           boolean NOT NULL DEFAULT true,
  last_received_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── CSV Imports ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_csv_imports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  imported_by     uuid NOT NULL REFERENCES user_profiles(id),
  file_name       text NOT NULL,
  column_mapping  jsonb NOT NULL DEFAULT '{}',
  rows_imported   int NOT NULL DEFAULT 0,
  rows_skipped    int NOT NULL DEFAULT 0,
  rows_errored    int NOT NULL DEFAULT 0,
  import_status   text NOT NULL DEFAULT 'pending' CHECK (import_status IN ('pending','processing','completed','failed')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Calibration Log ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_calibration_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id            uuid NOT NULL REFERENCES sensor_devices(id) ON DELETE CASCADE,
  calibrated_by        text NOT NULL,
  calibration_date     date NOT NULL,
  reference_temp       numeric NOT NULL,
  device_reading       numeric NOT NULL,
  offset_applied       numeric NOT NULL DEFAULT 0,
  nist_certificate_url text,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Door Events ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_door_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id            uuid NOT NULL REFERENCES sensor_devices(id) ON DELETE CASCADE,
  location_id          uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  opened_at            timestamptz NOT NULL,
  closed_at            timestamptz,
  duration_seconds     int,
  correlated_temp_rise numeric,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_door_events_device ON sensor_door_events (device_id, opened_at DESC);

-- ── Defrost Schedules ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_defrost_schedules (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id              uuid NOT NULL REFERENCES sensor_devices(id) ON DELETE CASCADE,
  frequency_hours        int NOT NULL DEFAULT 6,
  duration_minutes       int NOT NULL DEFAULT 25,
  expected_recovery_min  int NOT NULL DEFAULT 15,
  auto_detect            boolean NOT NULL DEFAULT false,
  last_defrost_at        timestamptz,
  next_defrost_at        timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── Cooling Curves ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_cooling_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       uuid NOT NULL REFERENCES sensor_devices(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  food_item       text NOT NULL,
  start_temp_f    numeric NOT NULL,
  target_temp_f   numeric NOT NULL,
  started_at      timestamptz NOT NULL,
  completed_at    timestamptz,
  readings        jsonb NOT NULL DEFAULT '[]',
  meets_standard  boolean,
  standard_name   text NOT NULL DEFAULT 'FDA 2-stage cooling',
  total_minutes   int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Row-Level Security ──────────────────────────────────────

ALTER TABLE sensor_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_calibration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_door_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_defrost_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_cooling_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: organization-scoped access
CREATE POLICY "sensor_integrations_org" ON sensor_integrations FOR ALL USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "sensor_devices_org" ON sensor_devices FOR ALL USING (location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "sensor_readings_org" ON sensor_readings FOR ALL USING (location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "sensor_alerts_org" ON sensor_alerts FOR ALL USING (location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "sensor_incidents_org" ON sensor_incidents FOR ALL USING (true);
CREATE POLICY "sensor_webhooks_org" ON sensor_webhooks FOR ALL USING (location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "sensor_csv_imports_org" ON sensor_csv_imports FOR ALL USING (location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "sensor_calibration_org" ON sensor_calibration_log FOR ALL USING (device_id IN (SELECT id FROM sensor_devices WHERE location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))));
CREATE POLICY "sensor_door_events_org" ON sensor_door_events FOR ALL USING (location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "sensor_defrost_org" ON sensor_defrost_schedules FOR ALL USING (device_id IN (SELECT id FROM sensor_devices WHERE location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))));
CREATE POLICY "sensor_cooling_org" ON sensor_cooling_logs FOR ALL USING (location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
