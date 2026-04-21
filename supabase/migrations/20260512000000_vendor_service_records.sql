-- ════════════════════════════════════════════════════════════
-- VENDOR SERVICE RECORDS — PSE Safeguard Tracking
--
-- Stores service records for the four PSE-relevant safeguard
-- categories: hood_cleaning, fire_suppression, fire_alarm,
-- sprinklers. Used by PSESafeguardsSection on Facility Safety.
--
-- Sample rows with is_sample=true power the Guided Tour.
-- Production rows have is_sample=false (default).
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_service_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  location_id      UUID REFERENCES locations(id) ON DELETE CASCADE,
  safeguard_type   TEXT NOT NULL CHECK (safeguard_type IN (
    'hood_cleaning', 'fire_suppression', 'fire_alarm', 'sprinklers'
  )),
  vendor_name      TEXT,
  cert_number      TEXT,
  service_date     DATE,
  next_due_date    DATE,
  interval_label   TEXT,
  notes            TEXT,
  is_sample        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Reconcile: table may exist from 20260308000000 with different schema
ALTER TABLE vendor_service_records ADD COLUMN IF NOT EXISTS safeguard_type TEXT;
ALTER TABLE vendor_service_records ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE vendor_service_records ADD COLUMN IF NOT EXISTS cert_number TEXT;
ALTER TABLE vendor_service_records ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE vendor_service_records ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE vendor_service_records ADD COLUMN IF NOT EXISTS interval_label TEXT;
ALTER TABLE vendor_service_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vendor_service_records ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE;
-- Relax NOT NULL constraints from earlier migration (new schema allows NULLs)
ALTER TABLE vendor_service_records ALTER COLUMN location_id DROP NOT NULL;
ALTER TABLE vendor_service_records ALTER COLUMN vendor_id DROP NOT NULL;
ALTER TABLE vendor_service_records ALTER COLUMN service_type DROP NOT NULL;
ALTER TABLE vendor_service_records ALTER COLUMN service_due_date DROP NOT NULL;

ALTER TABLE vendor_service_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage service records" ON vendor_service_records;
CREATE POLICY "Org members manage service records"
  ON vendor_service_records FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_vendor_service_records_org_loc
  ON vendor_service_records (organization_id, location_id, safeguard_type);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_vendor_service_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_service_records_updated_at ON vendor_service_records;
CREATE TRIGGER trg_vendor_service_records_updated_at
  BEFORE UPDATE ON vendor_service_records
  FOR EACH ROW EXECUTE FUNCTION update_vendor_service_records_updated_at();

-- ── Guided Tour sample data ──────────────────────────────────────
-- is_sample=true, location_id=NULL (applies to all demo locations)
-- Only insert when the demo org exists (it's created at runtime, not by migrations)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM organizations WHERE id = '3df66b3b-0000-0000-0000-000000000000') THEN
    INSERT INTO vendor_service_records
      (organization_id, location_id, safeguard_type, vendor_name, cert_number,
       service_date, next_due_date, interval_label, is_sample)
    VALUES
      ('3df66b3b-0000-0000-0000-000000000000', NULL,
       'hood_cleaning', 'Cleaning Pros Plus', 'IKECA CECS #CPP-2024-0042',
       '2026-01-14', '2026-04-14', 'Quarterly — high volume fryer', TRUE),
      ('3df66b3b-0000-0000-0000-000000000000', NULL,
       'fire_suppression', 'Pacific Fire Protection', 'CA C-16 #892441',
       '2025-10-03', '2026-04-03', 'Semi-annual', TRUE),
      ('3df66b3b-0000-0000-0000-000000000000', NULL,
       'fire_alarm', 'Valley Alarm Systems', 'CA C-10 #441892',
       '2025-03-10', '2026-03-10', 'Annual', TRUE),
      ('3df66b3b-0000-0000-0000-000000000000', NULL,
       'sprinklers', NULL, NULL,
       NULL, NULL, 'Annual', TRUE);
  END IF;
END $$;
