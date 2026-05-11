-- M5: Add vendor_service_record_id FK to compliance_document_requests
-- Enables: cron creates token → tied to specific service record → vendor uploads doc for that service

ALTER TABLE compliance_document_requests
  ADD COLUMN IF NOT EXISTS vendor_service_record_id uuid
    REFERENCES vendor_service_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cdr_vendor_service_record
  ON compliance_document_requests (vendor_service_record_id)
  WHERE vendor_service_record_id IS NOT NULL;
