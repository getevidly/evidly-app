-- IoT Sensor Integration Framework tables

-- =====================================================
-- Table 1: iot_sensor_providers
-- Lookup table for sensor hardware vendors (MonnIT, Govee, SensorPush, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS iot_sensor_providers (
  slug text PRIMARY KEY,
  name text NOT NULL,
  auth_type text NOT NULL CHECK (auth_type IN ('oauth', 'apikey', 'webhook', 'bluetooth', 'csv')),
  api_base_url text,
  capabilities jsonb DEFAULT '[]',
  rate_limit_per_min integer,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('active', 'deprecated', 'available')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_iot_provider_status ON iot_sensor_providers(status);

-- =====================================================
-- Table 2: iot_sensors
-- Individual sensor devices registered to locations
-- =====================================================
CREATE TABLE IF NOT EXISTS iot_sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  provider_slug text NOT NULL REFERENCES iot_sensor_providers(slug),
  name text NOT NULL,
  mac_address text NOT NULL,
  sensor_type text NOT NULL CHECK (sensor_type IN ('temperature', 'humidity', 'combo', 'pressure')),
  zone text,
  equipment_id uuid REFERENCES temperature_equipment(id),
  battery_pct integer DEFAULT 100,
  signal_rssi integer DEFAULT 0,
  firmware text,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning', 'error')),
  last_seen_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, mac_address)
);

CREATE INDEX idx_iot_sensors_org ON iot_sensors(organization_id);
CREATE INDEX idx_iot_sensors_location ON iot_sensors(location_id);
CREATE INDEX idx_iot_sensors_provider ON iot_sensors(provider_slug);
CREATE INDEX idx_iot_sensors_status ON iot_sensors(status);
CREATE INDEX idx_iot_sensors_equipment ON iot_sensors(equipment_id);

-- =====================================================
-- Table 3: iot_sensor_readings
-- Time-series sensor data
-- =====================================================
CREATE TABLE IF NOT EXISTS iot_sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL REFERENCES iot_sensors(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL,
  temperature_f numeric,
  humidity_pct numeric,
  pressure_hpa numeric,
  battery_pct integer,
  is_anomaly boolean DEFAULT false,
  ingestion_method text NOT NULL CHECK (ingestion_method IN ('api_pull', 'webhook', 'manual', 'bluetooth')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_iot_readings_sensor_time ON iot_sensor_readings(sensor_id, recorded_at DESC);
CREATE INDEX idx_iot_readings_recorded_at ON iot_sensor_readings(recorded_at DESC);
CREATE INDEX idx_iot_readings_anomaly ON iot_sensor_readings(is_anomaly) WHERE is_anomaly = true;

-- =====================================================
-- Table 4: iot_sensor_alerts
-- Threshold violation alerts and notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS iot_sensor_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL REFERENCES iot_sensors(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('high_temp', 'low_temp', 'humidity_high', 'humidity_low', 'battery_low', 'offline', 'rapid_change')),
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  threshold_value numeric,
  actual_value numeric,
  message text,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_iot_alerts_sensor ON iot_sensor_alerts(sensor_id);
CREATE INDEX idx_iot_alerts_severity ON iot_sensor_alerts(severity);
CREATE INDEX idx_iot_alerts_unack ON iot_sensor_alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX idx_iot_alerts_created ON iot_sensor_alerts(created_at DESC);

-- =====================================================
-- Table 5: iot_integration_configs
-- Per-organization integration settings for each provider
-- =====================================================
CREATE TABLE IF NOT EXISTS iot_integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_slug text NOT NULL REFERENCES iot_sensor_providers(slug),
  auth_credentials jsonb DEFAULT '{}',
  polling_interval_min integer DEFAULT 5,
  alert_thresholds jsonb DEFAULT '{"high_temp_f": 41, "low_temp_f": -10, "humidity_high": 70, "humidity_low": 20, "battery_low_pct": 20}',
  auto_log_compliance boolean DEFAULT true,
  notification_channels jsonb DEFAULT '["email"]',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, provider_slug)
);

CREATE INDEX idx_iot_config_org ON iot_integration_configs(organization_id);
CREATE INDEX idx_iot_config_enabled ON iot_integration_configs(enabled) WHERE enabled = true;

-- =====================================================
-- Table 6: iot_ingestion_log
-- Audit trail for data ingestion events
-- =====================================================
CREATE TABLE IF NOT EXISTS iot_ingestion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_slug text NOT NULL,
  method text NOT NULL CHECK (method IN ('api_pull', 'webhook', 'manual', 'bluetooth')),
  sensor_count integer DEFAULT 0,
  reading_count integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_iot_log_org ON iot_ingestion_log(organization_id);
CREATE INDEX idx_iot_log_provider ON iot_ingestion_log(provider_slug);
CREATE INDEX idx_iot_log_status ON iot_ingestion_log(status);
CREATE INDEX idx_iot_log_created ON iot_ingestion_log(created_at DESC);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE iot_sensor_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_sensor_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_ingestion_log ENABLE ROW LEVEL SECURITY;

-- iot_sensor_providers: public read access (lookup table)
CREATE POLICY "Anyone can read sensor providers"
  ON iot_sensor_providers FOR SELECT
  TO authenticated
  USING (true);

-- iot_sensors: users can read sensors for their org's locations
CREATE POLICY "Users can read sensors for their org locations"
  ON iot_sensors FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sensors for their org locations"
  ON iot_sensors FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update sensors for their org locations"
  ON iot_sensors FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- iot_sensor_readings: users can read readings for their org's sensors
CREATE POLICY "Users can read readings for their org sensors"
  ON iot_sensor_readings FOR SELECT
  TO authenticated
  USING (
    sensor_id IN (
      SELECT s.id FROM iot_sensors s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert readings for their org sensors"
  ON iot_sensor_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    sensor_id IN (
      SELECT s.id FROM iot_sensors s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.id = auth.uid()
    )
  );

-- iot_sensor_alerts: users can read/update alerts for their org's sensors
CREATE POLICY "Users can read alerts for their org sensors"
  ON iot_sensor_alerts FOR SELECT
  TO authenticated
  USING (
    sensor_id IN (
      SELECT s.id FROM iot_sensors s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update alerts for their org sensors"
  ON iot_sensor_alerts FOR UPDATE
  TO authenticated
  USING (
    sensor_id IN (
      SELECT s.id FROM iot_sensors s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    sensor_id IN (
      SELECT s.id FROM iot_sensors s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.id = auth.uid()
    )
  );

-- iot_integration_configs: users can read/manage configs for their org
CREATE POLICY "Users can read integration configs for their org"
  ON iot_integration_configs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert integration configs for their org"
  ON iot_integration_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update integration configs for their org"
  ON iot_integration_configs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- iot_ingestion_log: users can read ingestion logs for their org
CREATE POLICY "Users can read ingestion logs for their org"
  ON iot_ingestion_log FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- Service role gets full access on all tables
CREATE POLICY "Service role can manage all sensor providers"
  ON iot_sensor_providers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all sensors"
  ON iot_sensors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all sensor readings"
  ON iot_sensor_readings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all sensor alerts"
  ON iot_sensor_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all integration configs"
  ON iot_integration_configs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all ingestion logs"
  ON iot_ingestion_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Future: consider TimescaleDB hypertable for iot_sensor_readings for time-series optimization
