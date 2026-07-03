-- VENDOR-SERVICE-SEAL-02a: capture service_type_code + location_id at request time
-- so the accept step can advance the correct location_service_schedules row.
-- Nullable + FK; set only for service-category requests where the vendor's
-- linked schedule resolves them. Business-category requests leave them null.

ALTER TABLE compliance_documents
  ADD COLUMN IF NOT EXISTS service_type_code text
    REFERENCES service_type_definitions(code);

ALTER TABLE compliance_document_requests
  ADD COLUMN IF NOT EXISTS service_type_code text
    REFERENCES service_type_definitions(code),
  ADD COLUMN IF NOT EXISTS location_id uuid
    REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cdr_service_type_code
  ON compliance_document_requests (service_type_code)
  WHERE service_type_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cdr_location_id
  ON compliance_document_requests (location_id)
  WHERE location_id IS NOT NULL;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260916000000', 'request_service_and_location')
ON CONFLICT (version) DO NOTHING;
