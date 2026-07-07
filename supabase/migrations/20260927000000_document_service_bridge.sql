-- ════════════════════════════════════════════════════════════
-- B1-A: Document → Fire Protection bridge
--
-- Adds service_type_code + bridged_service_id to compliance_documents
-- so verified fire-safety documents can create vendor_service_records
-- and flow through to the Fire Protection page.
--
-- Extends vendor_service_records.source CHECK to allow 'document_bridge'.
-- Extends vendor_service_records.safeguard_type CHECK to allow 'fire_extinguisher'.
--
-- Tracker: supabase_migrations.schema_migrations version = '20260927000000'
-- ════════════════════════════════════════════════════════════

-- ── A. compliance_documents — bridge columns ───────────────

ALTER TABLE compliance_documents
  ADD COLUMN IF NOT EXISTS service_type_code text
    REFERENCES service_type_definitions(code);

ALTER TABLE compliance_documents
  ADD COLUMN IF NOT EXISTS bridged_service_id uuid;

CREATE INDEX IF NOT EXISTS idx_cd_service_type_code
  ON compliance_documents(service_type_code) WHERE service_type_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cd_bridged_service_id
  ON compliance_documents(bridged_service_id) WHERE bridged_service_id IS NOT NULL;

-- ── B. vendor_service_records.source — add 'document_bridge' ──

ALTER TABLE vendor_service_records DROP CONSTRAINT IF EXISTS vendor_service_records_source_check;
ALTER TABLE vendor_service_records ADD CONSTRAINT vendor_service_records_source_check
  CHECK (source = ANY (ARRAY[
    'manual','vendor_upload','hoodops','webhook','evidentiary_seal','document_bridge'
  ]::text[]));

-- ── C. vendor_service_records.safeguard_type — add 'fire_extinguisher' ──

ALTER TABLE vendor_service_records DROP CONSTRAINT IF EXISTS vendor_service_records_safeguard_type_check;
ALTER TABLE vendor_service_records ADD CONSTRAINT vendor_service_records_safeguard_type_check
  CHECK (safeguard_type IN (
    'hood_cleaning','fire_suppression','fire_alarm','sprinklers','fire_extinguisher'
  ));

-- ── D. Migration tracker ──────────────────────────────────

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260927000000')
ON CONFLICT DO NOTHING;
