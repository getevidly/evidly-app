-- M9a: Add vendor_id to vendor_service_records (nullable for safe rollout)
-- Two-step approach: M9a adds nullable column, M9b adds NOT NULL after backfill

ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS vendor_id uuid
    REFERENCES vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vsr_vendor_id
  ON vendor_service_records (vendor_id)
  WHERE vendor_id IS NOT NULL;
