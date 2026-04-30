-- Migration: Add sensor_devices table for protocol-agnostic sensor registration
-- Why: Constitutional rule — any open API sensor support. Bluetooth handhelds,
--      IoT cloud sensors, HTTP webhook providers, future protocols all
--      register through one table. Adding a new sensor brand becomes a row
--      plus (if new protocol) one edge function adapter — schema doesn't
--      change, capture flow doesn't change, mockups don't change.
-- Design notes:
--   - sensor_protocol enum has 4 values; 'custom' is the forward-compat slot
--   - connection_config jsonb absorbs protocol-specific config (endpoints,
--     polling intervals, header maps, auth refs)
--   - CHECK constraint enforces protocol/default_input_method consistency
--     (uses 'iot_sensor' to match temperature_logs input_method CHECK values)
--   - Unique constraint prevents duplicate registration of the same physical
--     sensor at the same location
--   - RLS location-scoped, full CRUD (config table, not audit)
-- Cross-references:
--   - Original schema sprint commit 6 (vendor_contacts table)
--   - Original schema sprint commit 10 (temperature_equipment.sensor_device_id
--     FK already exists; this commit creates the target table sensor_devices
--     that FK points to)
--   - Phase 1 Schema Sprint commit 7.5 (dropped legacy sensor_* family)
--   - Future Sensor Integration Sprint (vendor_credentials for secrets)

-- ── sensor_protocol enum ─────────────────────────────────────────────

CREATE TYPE sensor_protocol AS ENUM (
  'bluetooth_handheld',
  'iot_cloud_pull',
  'iot_webhook_push',
  'custom'
);

-- ── sensor_devices table ─────────────────────────────────────────────

CREATE TABLE sensor_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  model TEXT NULL,
  protocol sensor_protocol NOT NULL,
  device_identifier TEXT NULL,
  connection_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_input_method TEXT NOT NULL,
  equipment_id UUID NULL REFERENCES temperature_equipment(id) ON DELETE SET NULL,
  vendor_contact_id UUID NULL REFERENCES vendor_contacts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  paired_at TIMESTAMPTZ NULL,
  last_seen_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT sensor_devices_default_input_method_chk CHECK (
    (protocol = 'bluetooth_handheld' AND default_input_method = 'bluetooth_probe')
    OR (protocol IN ('iot_cloud_pull', 'iot_webhook_push') AND default_input_method = 'iot_sensor')
    OR (protocol = 'custom')
  )
);

-- Indexes
CREATE INDEX idx_sensor_devices_organization_id
  ON sensor_devices(organization_id);

CREATE INDEX idx_sensor_devices_location_id
  ON sensor_devices(location_id);

CREATE INDEX idx_sensor_devices_equipment_id
  ON sensor_devices(equipment_id)
  WHERE equipment_id IS NOT NULL;

CREATE INDEX idx_sensor_devices_vendor_contact_id
  ON sensor_devices(vendor_contact_id)
  WHERE vendor_contact_id IS NOT NULL;

CREATE INDEX idx_sensor_devices_protocol_active
  ON sensor_devices(protocol, is_active);

CREATE INDEX idx_sensor_devices_active
  ON sensor_devices(location_id, is_active);

-- Unique constraint: same vendor + device_identifier at one location, only one active
CREATE UNIQUE INDEX sensor_devices_active_identity_uq
  ON sensor_devices(location_id, vendor_name, device_identifier)
  WHERE is_active = true AND device_identifier IS NOT NULL;

-- RLS
ALTER TABLE sensor_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY sensor_devices_select ON sensor_devices
  FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY sensor_devices_insert ON sensor_devices
  FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY sensor_devices_update ON sensor_devices
  FOR UPDATE
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY sensor_devices_delete ON sensor_devices
  FOR DELETE
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );
