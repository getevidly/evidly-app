-- Migration: Temperature QR Codes & Input Method Tracking (FS-5)
-- Adds equipment QR code management and input_method column for
-- tracking how temperature readings are captured (manual, qr_scan, iot_sensor)

-- ============================================================
-- 1. Equipment QR Codes Table
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES temperature_equipment(id) ON DELETE CASCADE,
  qr_code text NOT NULL UNIQUE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  label_printed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipment QR codes in their organization"
  ON equipment_qr_codes FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert equipment QR codes in their organization"
  ON equipment_qr_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update equipment QR codes in their organization"
  ON equipment_qr_codes FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_equipment ON equipment_qr_codes(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_qr ON equipment_qr_codes(qr_code);
CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_location ON equipment_qr_codes(location_id);

-- ============================================================
-- 2. Add input_method to temp_check_completions
-- ============================================================
ALTER TABLE temp_check_completions
  ADD COLUMN IF NOT EXISTS input_method text NOT NULL DEFAULT 'manual'
  CHECK (input_method IN ('manual', 'qr_scan', 'iot_sensor'));

CREATE INDEX IF NOT EXISTS idx_temp_check_completions_method ON temp_check_completions(input_method);

-- ============================================================
-- 3. Seed demo QR codes for standard equipment
-- ============================================================
-- Note: These reference equipment by conventional IDs. In production,
-- QR codes are generated on-demand via the frontend.
-- Format: EVIDLY-EQ-{8 alphanumeric chars}

COMMENT ON TABLE equipment_qr_codes IS 'QR code labels for temperature monitoring equipment. Format: EVIDLY-EQ-{8char}. Scanned via mobile to initiate quick temp entry.';
COMMENT ON COLUMN temp_check_completions.input_method IS 'How the reading was captured: manual (typed), qr_scan (scanned QR label), iot_sensor (auto-logged from IoT device).';
