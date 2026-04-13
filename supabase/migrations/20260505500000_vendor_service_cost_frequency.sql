-- ================================================================
-- VENDOR-SERVICES-BUILD-01: Cost, Frequency & Contract Fields
-- Adds per-visit cost, annual contract amount, service frequency,
-- and contract date tracking to vendor_service_records.
-- ================================================================

-- Cost fields
ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS cost_per_visit NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cost_annual NUMERIC(10,2);

-- Frequency fields
ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS service_frequency TEXT,
  ADD COLUMN IF NOT EXISTS frequency_interval_days INTEGER;

-- Service date tracking
ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS last_service_date DATE,
  ADD COLUMN IF NOT EXISTS next_service_date DATE;

-- Contract fields
ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS contract_notes TEXT;

-- Index for upcoming service queries (dashboard widget)
CREATE INDEX IF NOT EXISTS idx_vsr_next_service
  ON vendor_service_records(next_service_date)
  WHERE next_service_date IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN vendor_service_records.service_frequency IS
  'Human-readable frequency: Monthly, Quarterly, Semi-Annual, Annual, As Needed, Custom';
COMMENT ON COLUMN vendor_service_records.frequency_interval_days IS
  'Numeric interval in days for next-due calculation. Used when service_frequency = Custom.';
COMMENT ON COLUMN vendor_service_records.cost_per_visit IS
  'Customer-entered cost per service visit. EvidLY never estimates costs.';
COMMENT ON COLUMN vendor_service_records.cost_annual IS
  'Customer-entered annual contract amount. EvidLY never estimates costs.';
