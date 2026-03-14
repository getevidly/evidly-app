-- AUDIT-FIX-05 / H-1: Add safeguard_type column to vendor_service_records
-- Bridges HoodOps service_type_code (KEC/FPM/GFX/RGC/FS) to PSE safeguard_type
-- (hood_cleaning/fire_suppression/fire_alarm/sprinklers).

ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS safeguard_type text
  CHECK (safeguard_type IN ('hood_cleaning', 'fire_suppression', 'fire_alarm', 'sprinklers') OR safeguard_type IS NULL);

-- Backfill existing records from service_type_code
UPDATE vendor_service_records SET safeguard_type = 'hood_cleaning'    WHERE service_type_code = 'KEC' AND safeguard_type IS NULL;
UPDATE vendor_service_records SET safeguard_type = 'fire_suppression' WHERE service_type_code = 'FS'  AND safeguard_type IS NULL;

-- Index for PSESafeguardsSection queries
CREATE INDEX IF NOT EXISTS idx_vendor_service_safeguard
  ON vendor_service_records(safeguard_type, location_id, organization_id)
  WHERE safeguard_type IS NOT NULL;
