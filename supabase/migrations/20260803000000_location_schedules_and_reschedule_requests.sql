-- ════════════════════════════════════════════════════════════
-- LOCATION-SERVICE-SCHEDULES + SERVICE-RESCHEDULE-REQUESTS
--
-- location_service_schedules — per-location service catalog with
--   vendor, frequency, last/next service dates, negotiated price.
--   UNIQUE (organization_id, location_id, service_type_code).
--
-- service_reschedule_requests — reschedule lifecycle with up to 3
--   preferred dates, urgency, status, vendor response tracking,
--   and reconciliation columns matching vendor_service_records.
--
-- Both tables reference service_type_definitions(code).
-- service_reschedule_requests.schedule_id FKs to
-- location_service_schedules with ON DELETE SET NULL.
-- ════════════════════════════════════════════════════════════

-- ── 1. location_service_schedules ──────────────────────────────────

CREATE TABLE IF NOT EXISTS location_service_schedules (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id                 uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  service_type_code           text NOT NULL REFERENCES service_type_definitions(code),

  vendor_name                 text,
  vendor_id                   uuid,

  frequency                   text NOT NULL DEFAULT 'quarterly',
  frequency_interval_days     integer,

  last_service_date           date,
  next_due_date               date,

  negotiated_price            numeric(10,2),
  notes                       text,

  is_active                   boolean NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, location_id, service_type_code)
);

ALTER TABLE location_service_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage location schedules" ON location_service_schedules;
CREATE POLICY "Org members manage location schedules"
  ON location_service_schedules FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role full access location schedules" ON location_service_schedules;
CREATE POLICY "Service role full access location schedules"
  ON location_service_schedules FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_location_service_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_location_service_schedules_updated_at ON location_service_schedules;
CREATE TRIGGER trg_location_service_schedules_updated_at
  BEFORE UPDATE ON location_service_schedules
  FOR EACH ROW EXECUTE FUNCTION update_location_service_schedules_updated_at();

CREATE INDEX IF NOT EXISTS idx_lss_lookup
  ON location_service_schedules (organization_id, location_id, service_type_code);

CREATE INDEX IF NOT EXISTS idx_lss_next_due_date
  ON location_service_schedules (next_due_date)
  WHERE next_due_date IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_lss_vendor_id
  ON location_service_schedules (vendor_id) WHERE vendor_id IS NOT NULL;


-- ── 2. service_reschedule_requests ─────────────────────────────────

CREATE TABLE IF NOT EXISTS service_reschedule_requests (
  -- Identity
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id                 uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Service taxonomy
  service_type_code           text NOT NULL REFERENCES service_type_definitions(code),
  schedule_id                 uuid REFERENCES location_service_schedules(id) ON DELETE SET NULL,

  -- Requester
  requested_by                uuid REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Request payload
  original_due_date           date NOT NULL,
  requested_dates             date[] NOT NULL CHECK (
    array_length(requested_dates, 1) BETWEEN 1 AND 3
  ),
  reason                      text,
  urgency                     text NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('normal', 'soon', 'urgent')),

  -- Vendor response
  vendor_confirmed_date       date,
  vendor_response_notes       text,

  -- Lifecycle
  status                      text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'confirmed', 'declined', 'canceled', 'expired'
    )),
  confirmed_by                text
    CHECK (confirmed_by IS NULL OR confirmed_by IN (
      'operator', 'vendor', 'auto', 'webhook'
    )),

  -- Source + provenance
  source                      text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'vendor_secure_token', 'hoodops')),

  -- Reconciliation (mirrors vendor_service_records)
  reconciliation_status       text NOT NULL DEFAULT 'verified'
    CHECK (reconciliation_status IN (
      'verified',
      'pending_review',
      'discrepancy',
      'accepted_manual',
      'accepted_vendor_secure_token',
      'accepted_hoodops',
      'superseded'
    )),
  reconciliation_notes        text,
  reconciliation_resolved_by  uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reconciliation_resolved_at  timestamptz,
  linked_record_ids           uuid[] NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_reschedule_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage reschedule requests" ON service_reschedule_requests;
CREATE POLICY "Org members manage reschedule requests"
  ON service_reschedule_requests FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role full access reschedule requests" ON service_reschedule_requests;
CREATE POLICY "Service role full access reschedule requests"
  ON service_reschedule_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_service_reschedule_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_reschedule_requests_updated_at ON service_reschedule_requests;
CREATE TRIGGER trg_service_reschedule_requests_updated_at
  BEFORE UPDATE ON service_reschedule_requests
  FOR EACH ROW EXECUTE FUNCTION update_service_reschedule_requests_updated_at();

CREATE INDEX IF NOT EXISTS idx_srr_org_loc_status
  ON service_reschedule_requests (organization_id, location_id, status);

CREATE INDEX IF NOT EXISTS idx_srr_schedule_id
  ON service_reschedule_requests (schedule_id) WHERE schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_srr_pending
  ON service_reschedule_requests (status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_srr_reconciliation_pending
  ON service_reschedule_requests (reconciliation_status)
  WHERE reconciliation_status IN ('pending_review', 'discrepancy');

-- One pending reschedule per service at a location at a time.
-- Operators can re-request after vendor responds (status flips).
CREATE UNIQUE INDEX IF NOT EXISTS idx_srr_one_pending_per_service
  ON service_reschedule_requests (organization_id, location_id, service_type_code)
  WHERE status = 'pending';
