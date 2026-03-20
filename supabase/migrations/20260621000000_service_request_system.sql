-- ================================================================
-- SERVICE-REQUEST-01 — Vendor Service Request System
-- Two workflows: CPP (auto-confirm from available slots) and
-- Non-CPP (3-slot proposal → vendor response → confirm/counter).
-- ================================================================

-- 1. service_requests — full request lifecycle tracking
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Request details
  service_type VARCHAR(100) NOT NULL,
  request_type VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (request_type IN ('scheduled','on_demand','out_of_cycle','emergency')),
  urgency VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('normal','soon','urgent','emergency')),
  notes TEXT,

  -- Operator's proposed slots (non-CPP: 3 slots; CPP: selected slot in slot_1)
  proposed_slot_1 TIMESTAMPTZ,
  proposed_slot_2 TIMESTAMPTZ,
  proposed_slot_3 TIMESTAMPTZ,

  -- Vendor's alternative slots (if vendor counters)
  vendor_alt_slot_1 TIMESTAMPTZ,
  vendor_alt_slot_2 TIMESTAMPTZ,
  vendor_alt_slot_3 TIMESTAMPTZ,
  vendor_response_notes TEXT,

  -- Confirmed result
  confirmed_datetime TIMESTAMPTZ,
  confirmed_by VARCHAR(20) CHECK (confirmed_by IN ('operator','vendor','auto')),

  -- Calendar event created on confirmation
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,

  -- Status lifecycle
  status VARCHAR(30) NOT NULL DEFAULT 'pending_vendor'
    CHECK (status IN (
      'pending_vendor',
      'vendor_selected',
      'vendor_proposed_alt',
      'pending_operator',
      'confirmed',
      'canceled',
      'expired'
    )),

  -- Token for vendor response page
  schedule_token_id UUID REFERENCES vendor_service_tokens(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sr_org_status ON service_requests(organization_id, status);
CREATE INDEX idx_sr_vendor ON service_requests(vendor_id);
CREATE INDEX idx_sr_location ON service_requests(location_id);
CREATE INDEX idx_sr_requested_by ON service_requests(requested_by);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org service requests"
  ON service_requests FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create service requests in own org"
  ON service_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org service requests"
  ON service_requests FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Service role full access service requests"
  ON service_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 2. cpp_availability_slots — CPP vendor available time slots
CREATE TABLE IF NOT EXISTS cpp_availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  service_type VARCHAR(100) NOT NULL,
  slot_datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 120,
  is_available BOOLEAN DEFAULT true,
  claimed_by_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cas_vendor_type ON cpp_availability_slots(vendor_id, service_type);
CREATE INDEX idx_cas_slot ON cpp_availability_slots(slot_datetime) WHERE is_available = true;

ALTER TABLE cpp_availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CPP slots for their org vendors"
  ON cpp_availability_slots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role full access CPP availability slots"
  ON cpp_availability_slots FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 3. ALTER vendors — add CPP vendor identification
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS is_cpp_vendor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cpp_vendor_id UUID;


-- 4. ALTER calendar_events — link to service request
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL;


-- 5. Enable realtime for service_requests
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
