-- Add vendor_contacts table for sensor support and equipment repair contacts.
-- vendor_type 'sensor_support' contacts are auto-dispatchable via sensor_support_tickets.
-- vendor_type 'equipment_repair' contacts are reference-only (per locked decisions 5a/5b).

CREATE TYPE vendor_contact_type AS ENUM ('sensor_support', 'equipment_repair');

CREATE TABLE vendor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  vendor_type vendor_contact_type NOT NULL,
  contact_email text,
  contact_phone text,
  after_hours_phone text,
  service_area text,
  equipment_types text[],
  response_sla_hours integer,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_contacts_organization_id ON vendor_contacts(organization_id);
CREATE INDEX idx_vendor_contacts_location_id ON vendor_contacts(location_id);
CREATE INDEX idx_vendor_contacts_vendor_type ON vendor_contacts(vendor_type);

ALTER TABLE vendor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_contacts_select ON vendor_contacts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY vendor_contacts_insert ON vendor_contacts FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY vendor_contacts_update ON vendor_contacts FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY vendor_contacts_delete ON vendor_contacts FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
