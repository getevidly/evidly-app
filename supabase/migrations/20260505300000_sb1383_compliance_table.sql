-- SB1383-BUILD-01: SB 1383 Organic Waste Reduction compliance tracking table
-- Documents organic waste diversion, food recovery partnerships, hauler info, and inspection notes.
-- EvidLY documents what happened — jurisdiction determines compliance.

CREATE TABLE IF NOT EXISTS sb1383_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  reporting_period text NOT NULL,
  edible_food_recovery_lbs numeric DEFAULT 0,
  organic_waste_diverted_lbs numeric DEFAULT 0,
  food_recovery_partner text,
  food_recovery_partner_contact text,
  food_recovery_agreement_on_file boolean DEFAULT false,
  hauler_name text,
  hauler_service_frequency text,
  hauler_provides_organics boolean DEFAULT false,
  weight_tickets_on_file boolean DEFAULT false,
  generator_tier integer,
  recovery_plan_on_file boolean DEFAULT false,
  last_inspection_date date,
  inspection_notes text,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE sb1383_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_sb1383" ON sb1383_compliance
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
