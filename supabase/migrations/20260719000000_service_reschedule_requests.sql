-- ================================================================
-- RESCHEDULE-EVIDLY-01 — Service Reschedule Requests
--
-- Tracks reschedule lifecycle for vendor services (KEC/FPM/GFX/RGC/FS).
-- Primary path: manual confirmation by operator.
-- Secondary path: auto-confirmed via inbound HoodOps webhook.
-- ================================================================

-- 1. service_reschedule_requests table
CREATE TABLE IF NOT EXISTS service_reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  service_type_code TEXT NOT NULL REFERENCES service_type_definitions(code),
  schedule_id UUID REFERENCES location_service_schedules(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Original vs requested dates
  original_due_date DATE NOT NULL,
  requested_date DATE NOT NULL,
  reason TEXT,
  urgency VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('normal','soon','urgent')),

  -- Vendor response
  vendor_confirmed_date DATE,
  vendor_response_notes TEXT,

  -- Status lifecycle
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'confirmed',
      'declined',
      'canceled',
      'expired'
    )),
  confirmed_by VARCHAR(20) CHECK (confirmed_by IN ('operator','vendor','auto','webhook')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_srr_org_status
  ON service_reschedule_requests(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_srr_location_service
  ON service_reschedule_requests(location_id, service_type_code);

-- Prevent duplicate pending reschedules for same service at same location
CREATE UNIQUE INDEX IF NOT EXISTS idx_srr_one_pending_per_service
  ON service_reschedule_requests(organization_id, location_id, service_type_code)
  WHERE status = 'pending';

-- 3. RLS
ALTER TABLE service_reschedule_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org reschedule requests" ON service_reschedule_requests;
CREATE POLICY "Users can view own org reschedule requests"
  ON service_reschedule_requests FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create reschedule requests in own org" ON service_reschedule_requests;
CREATE POLICY "Users can create reschedule requests in own org"
  ON service_reschedule_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own org reschedule requests" ON service_reschedule_requests;
CREATE POLICY "Users can update own org reschedule requests"
  ON service_reschedule_requests FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role full access reschedule requests" ON service_reschedule_requests;
CREATE POLICY "Service role full access reschedule requests"
  ON service_reschedule_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION update_reschedule_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reschedule_requests_updated_at ON service_reschedule_requests;
CREATE TRIGGER trg_reschedule_requests_updated_at
  BEFORE UPDATE ON service_reschedule_requests
  FOR EACH ROW EXECUTE FUNCTION update_reschedule_requests_updated_at();

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE service_reschedule_requests;
