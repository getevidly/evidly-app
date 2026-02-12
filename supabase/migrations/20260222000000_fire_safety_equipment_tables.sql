-- Fire Safety Equipment Lifecycle Management Tables
-- Equipment = FIRE SAFETY pillar (35% of compliance score)
-- Includes: hoods, suppression systems, extinguishers, grease traps, exhaust fans, baffle filters

-- ── equipment ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  equipment_type VARCHAR(100) NOT NULL,
  make TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  purchase_price NUMERIC,
  warranty_expiry DATE,
  warranty_provider TEXT,
  warranty_terms TEXT,
  condition VARCHAR(20) NOT NULL DEFAULT 'Good' CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor', 'Critical')),
  next_maintenance_due DATE,
  maintenance_interval VARCHAR(50),
  linked_vendor TEXT,
  useful_life_years INTEGER,
  replacement_cost NUMERIC,
  notes TEXT,
  compliance_pillar VARCHAR(30) NOT NULL DEFAULT 'fire_safety',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_org ON equipment(organization_id);
CREATE INDEX idx_equipment_location ON equipment(organization_id, location_id);
CREATE INDEX idx_equipment_type ON equipment(equipment_type);
CREATE INDEX idx_equipment_maintenance ON equipment(next_maintenance_due) WHERE is_active = true;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org equipment"
  ON equipment FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org equipment"
  ON equipment FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org equipment"
  ON equipment FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org equipment"
  ON equipment FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access equipment"
  ON equipment FOR ALL TO service_role USING (true);

-- ── equipment_service_records ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  vendor TEXT NOT NULL,
  service_type TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_service_equipment ON equipment_service_records(equipment_id, service_date DESC);
CREATE INDEX idx_equipment_service_org ON equipment_service_records(organization_id);
ALTER TABLE equipment_service_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org service records"
  ON equipment_service_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org service records"
  ON equipment_service_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access service records"
  ON equipment_service_records FOR ALL TO service_role USING (true);

-- ── equipment_maintenance_schedule ─────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_maintenance_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  interval VARCHAR(50) NOT NULL,
  last_done DATE,
  next_due DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_schedule_equipment ON equipment_maintenance_schedule(equipment_id);
CREATE INDEX idx_equipment_schedule_due ON equipment_maintenance_schedule(next_due) WHERE next_due IS NOT NULL;
ALTER TABLE equipment_maintenance_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedule via equipment org"
  ON equipment_maintenance_schedule FOR SELECT TO authenticated
  USING (equipment_id IN (
    SELECT id FROM equipment WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert schedule via equipment org"
  ON equipment_maintenance_schedule FOR INSERT TO authenticated
  WITH CHECK (equipment_id IN (
    SELECT id FROM equipment WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update schedule via equipment org"
  ON equipment_maintenance_schedule FOR UPDATE TO authenticated
  USING (equipment_id IN (
    SELECT id FROM equipment WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Service role full access schedule"
  ON equipment_maintenance_schedule FOR ALL TO service_role USING (true);

-- ── Updated at triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER equipment_schedule_updated_at
  BEFORE UPDATE ON equipment_maintenance_schedule
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();
