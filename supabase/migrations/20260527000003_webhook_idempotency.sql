-- AUDIT-FIX-07 / H-3: Webhook idempotency via event_id
-- Guarantees duplicate HoodOps webhook calls do not create duplicate records.

ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_service_event_id
  ON vendor_service_records(event_id)
  WHERE event_id IS NOT NULL;
