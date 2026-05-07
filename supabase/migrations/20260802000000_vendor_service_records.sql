-- ════════════════════════════════════════════════════════════
-- VENDOR-SERVICE-RECORDS — Consolidated PSE-safeguard service event tracking
--
-- Replaces dead 20260308 + 20260512 + 20260313 + 20260505 + 20260621
-- migrations (all removed in Sprint Zero 0.1). Single canonical schema
-- combining: PSE base, service_type_code FK, cost/frequency, source,
-- reconciliation, webhook idempotency.
--
-- safeguard_type maps to one of 4 PSE safeguards.
-- service_type_code maps to one of 7 service codes (KEC/FPM/GFX/RGC/FS/FA/SP).
-- event_id UNIQUE provides HoodOps webhook idempotency.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_service_records (
  -- Identity
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_id                 uuid REFERENCES locations(id) ON DELETE CASCADE,

  -- Safeguard + service-type taxonomy
  safeguard_type              text NOT NULL CHECK (safeguard_type IN (
    'hood_cleaning', 'fire_suppression', 'fire_alarm', 'sprinklers'
  )),
  service_type_code           text REFERENCES service_type_definitions(code),

  -- Vendor + service event
  vendor_name                 text,
  technician_name             text,
  cert_number                 text,
  service_date                date,
  next_due_date               date,
  interval_label              text,
  notes                       text,

  -- Cost + frequency (operator-set per event)
  price_charged               numeric(10,2),
  cost_per_visit              numeric(10,2),
  cost_annual                 numeric(10,2),
  service_frequency           text,
  frequency_interval_days     integer,
  contract_start_date         date,
  contract_end_date           date,
  contract_notes              text,

  -- Document evidence
  certificate_url             text,
  document_url                text,
  document_filename           text,

  -- Source + provenance
  source                      text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'vendor_upload', 'hoodops', 'webhook')),
  entered_by                  uuid REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Webhook idempotency (HoodOps event_id; null for non-webhook rows)
  event_id                    text UNIQUE,
  webhook_payload             jsonb,

  -- Reconciliation (human-verified discrepancy resolution)
  reconciliation_status       text NOT NULL DEFAULT 'verified'
    CHECK (reconciliation_status IN (
      'verified',
      'pending_review',
      'discrepancy',
      'accepted_manual',
      'accepted_vendor_upload',
      'accepted_hoodops',
      'superseded'
    )),
  reconciliation_notes        text,
  reconciliation_resolved_by  uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reconciliation_resolved_at  timestamptz,
  linked_record_ids           uuid[] NOT NULL DEFAULT '{}',

  -- Sample data flag (Guided Tour rows)
  is_sample                   boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendor_service_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage service records" ON vendor_service_records;
CREATE POLICY "Org members manage service records"
  ON vendor_service_records FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role full access vendor service records" ON vendor_service_records;
CREATE POLICY "Service role full access vendor service records"
  ON vendor_service_records FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_vendor_service_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_service_records_updated_at ON vendor_service_records;
CREATE TRIGGER trg_vendor_service_records_updated_at
  BEFORE UPDATE ON vendor_service_records
  FOR EACH ROW EXECUTE FUNCTION update_vendor_service_records_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vsr_org_loc_safeguard
  ON vendor_service_records (organization_id, location_id, safeguard_type);

CREATE INDEX IF NOT EXISTS idx_vsr_service_type_code
  ON vendor_service_records (service_type_code);

CREATE INDEX IF NOT EXISTS idx_vsr_next_due_date
  ON vendor_service_records (next_due_date) WHERE next_due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vsr_reconciliation_pending
  ON vendor_service_records (reconciliation_status)
  WHERE reconciliation_status IN ('pending_review', 'discrepancy');
