-- Migration: create service_requests table + CPP Leads pseudo-org
-- Supports: useServiceRequests hook, evidly-service-request edge function,
--           ai-estimate-submit edge function, RequestsTab UI

-- 1. Create CPP Leads pseudo-org for unassigned leads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'CPP Leads') THEN
    INSERT INTO organizations (name, industry_type, subscription_status, plan_tier, onboarding_completed)
    VALUES ('CPP Leads', 'system', 'active', 'enterprise', true);
  END IF;
END
$$;

-- 2. Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id             uuid REFERENCES locations(id) ON DELETE SET NULL,
  vendor_id               uuid REFERENCES vendors(id) ON DELETE SET NULL,
  requested_by            uuid REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Request classification
  service_type            text NOT NULL DEFAULT '',
  request_type            text NOT NULL DEFAULT 'scheduled',
  urgency                 text NOT NULL DEFAULT 'normal',
  notes                   text,
  source                  text NOT NULL DEFAULT 'evidly',

  -- Operator proposed slots
  proposed_slot_1         timestamptz,
  proposed_slot_2         timestamptz,
  proposed_slot_3         timestamptz,

  -- Vendor alternative slots
  vendor_alt_slot_1       timestamptz,
  vendor_alt_slot_2       timestamptz,
  vendor_alt_slot_3       timestamptz,
  vendor_response_notes   text,

  -- Confirmed result
  confirmed_datetime      timestamptz,
  confirmed_by            text,
  calendar_event_id       uuid,

  -- Status workflow
  status                  text NOT NULL DEFAULT 'pending_vendor',
  schedule_token_id       uuid,

  -- Contact / location info (from edge functions)
  evidly_location_id      uuid,
  business_name           text,
  contact_name            text,
  contact_email           text,
  contact_phone           text,
  address                 text,
  city                    text,
  state_code              text,
  zip                     text,
  service_types           jsonb DEFAULT '[]'::jsonb,
  preferred_date          text,
  preferred_time_window   text DEFAULT 'anytime',
  referral_code           text,

  -- AI estimate fields (from ai-estimate-submit)
  ai_estimate_data        jsonb,
  ai_estimated_price_low  numeric,
  ai_estimated_price_high numeric,
  ai_estimated_hours      numeric,
  ai_equipment_detected   jsonb,
  ai_condition_assessment text,
  ai_photos               jsonb,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_org
  ON service_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_vendor
  ON service_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status
  ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_org_status
  ON service_requests(organization_id, status);

-- 4. RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read own service requests"
  ON service_requests FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org members insert own service requests"
  ON service_requests FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org members update own service requests"
  ON service_requests FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to service requests"
  ON service_requests FOR ALL
  USING (auth.role() = 'service_role');
