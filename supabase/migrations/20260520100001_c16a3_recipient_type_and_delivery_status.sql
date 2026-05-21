-- C16a-3: recipient_type CHECK reconciliation + delivery_status CHECK extension
--
-- FIX 1: Align recipient_type CHECK on both recipient_profiles and
--         compliance_document_send_records to 7-value phase15 set + custom.
-- FIX 2: Extend inspection_package_deliveries delivery_status CHECK to
--         include 'complained' and 'opened'. Add opened_at + opened_count columns.

BEGIN;

-- ── Step A: Backfill legacy recipient_type values ──────────────────
-- Run BEFORE dropping constraints so rows are valid under old CHECK.

UPDATE recipient_profiles SET recipient_type = 'ehd' WHERE recipient_type = 'government';
UPDATE recipient_profiles SET recipient_type = 'ahj' WHERE recipient_type = 'fire_authority';
UPDATE recipient_profiles SET recipient_type = 'client_legal' WHERE recipient_type = 'legal';
UPDATE recipient_profiles SET recipient_type = 'insurance_broker' WHERE recipient_type = 'insurance';
UPDATE recipient_profiles SET recipient_type = 'custom' WHERE recipient_type = 'property';

UPDATE compliance_document_send_records SET recipient_type = 'ehd' WHERE recipient_type = 'government';
UPDATE compliance_document_send_records SET recipient_type = 'ahj' WHERE recipient_type = 'fire_authority';
UPDATE compliance_document_send_records SET recipient_type = 'client_legal' WHERE recipient_type = 'legal';
UPDATE compliance_document_send_records SET recipient_type = 'insurance_broker' WHERE recipient_type = 'insurance';
UPDATE compliance_document_send_records SET recipient_type = 'custom' WHERE recipient_type = 'property';

-- ── Step B: DROP existing CHECK constraints ────────────────────────

ALTER TABLE recipient_profiles
  DROP CONSTRAINT IF EXISTS recipient_profiles_recipient_type_check;

ALTER TABLE compliance_document_send_records
  DROP CONSTRAINT IF EXISTS compliance_document_send_records_recipient_type_check;

-- ── Step C: ADD new identical CHECK constraints (7 values) ─────────

ALTER TABLE recipient_profiles
  ADD CONSTRAINT recipient_profiles_recipient_type_check
    CHECK (recipient_type IN (
      'ehd', 'ahj', 'insurance_broker', 'insurance_carrier',
      'auditor', 'client_legal', 'custom'
    ));

ALTER TABLE compliance_document_send_records
  ADD CONSTRAINT compliance_document_send_records_recipient_type_check
    CHECK (recipient_type IN (
      'ehd', 'ahj', 'insurance_broker', 'insurance_carrier',
      'auditor', 'client_legal', 'custom'
    ));

-- ── Step D: Extend inspection_package_deliveries ───────────────────

ALTER TABLE inspection_package_deliveries
  DROP CONSTRAINT IF EXISTS inspection_package_deliveries_delivery_status_check;

ALTER TABLE inspection_package_deliveries
  ADD CONSTRAINT inspection_package_deliveries_delivery_status_check
    CHECK (delivery_status IN (
      'sent', 'delivered', 'failed', 'bounced', 'complained', 'opened'
    ));

ALTER TABLE inspection_package_deliveries
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_count integer NOT NULL DEFAULT 0;

COMMIT;
