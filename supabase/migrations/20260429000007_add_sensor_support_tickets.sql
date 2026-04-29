-- Add sensor_support_tickets table for sensor vendor dispatch.
-- Audit-grade record of sensor support tickets through their lifecycle:
-- drafted → sent → acknowledged → on_site → resolved → closed.
-- Tracks manager approval, dispatch method (manual_approval vs auto_dispatched),
-- email content, vendor response, and resolution notes.

CREATE TYPE sensor_ticket_status AS ENUM ('drafted', 'sent', 'acknowledged', 'on_site', 'resolved', 'closed');
CREATE TYPE sensor_ticket_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE sensor_ticket_dispatch AS ENUM ('manual_approval', 'auto_dispatched');

CREATE TABLE sensor_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  vendor_contact_id uuid NOT NULL REFERENCES vendor_contacts(id) ON DELETE RESTRICT,
  equipment_id uuid REFERENCES temperature_equipment(id) ON DELETE SET NULL,
  sensor_id text,
  severity sensor_ticket_severity NOT NULL,
  status sensor_ticket_status NOT NULL DEFAULT 'drafted',
  dispatch_method sensor_ticket_dispatch NOT NULL,
  trigger_reason text NOT NULL,
  trigger_reading_id uuid,
  drafted_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  manager_approved_by uuid REFERENCES user_profiles(id),
  manager_approved_at timestamptz,
  email_subject text,
  email_body text,
  vendor_response text,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sensor_support_tickets_organization_id ON sensor_support_tickets(organization_id);
CREATE INDEX idx_sensor_support_tickets_location_id ON sensor_support_tickets(location_id);
CREATE INDEX idx_sensor_support_tickets_vendor_contact_id ON sensor_support_tickets(vendor_contact_id);
CREATE INDEX idx_sensor_support_tickets_status ON sensor_support_tickets(status);
CREATE INDEX idx_sensor_support_tickets_drafted_at ON sensor_support_tickets(drafted_at DESC);

ALTER TABLE sensor_support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY sensor_support_tickets_select ON sensor_support_tickets FOR SELECT
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY sensor_support_tickets_insert ON sensor_support_tickets FOR INSERT
  WITH CHECK (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY sensor_support_tickets_update ON sensor_support_tickets FOR UPDATE
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
