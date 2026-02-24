-- Create demo_leads table for lead capture from demo wizard and modal
CREATE TABLE IF NOT EXISTS demo_leads (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  full_name       text        NOT NULL,
  email           text        NOT NULL,
  phone           text,
  organization_name text,
  industry_type   text,
  industry_subtype text,
  location_type   text,
  location_count  int,
  location_name   text
);

-- Enable Row Level Security
ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert leads (public demo form)
CREATE POLICY "anon_insert_demo_leads"
  ON demo_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only service_role can read leads (admin/backend only)
CREATE POLICY "service_role_select_demo_leads"
  ON demo_leads
  FOR SELECT
  TO service_role
  USING (true);

COMMENT ON TABLE demo_leads IS 'Lead capture from demo wizard and modal. FIX-01.';
