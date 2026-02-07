/*
  # Create Report Subscriptions Table

  ## New Tables
  
  ### `report_subscriptions`
  - `id` (uuid, primary key)
  - `organization_id` (uuid, references organizations)
  - `location_id` (uuid, references locations, nullable) - null means all locations
  - `report_type` (text) - weekly_compliance, daily_temperature, weekly_checklist, monthly_document, monthly_vendor, weekly_team
  - `frequency` (text) - daily, weekly, monthly
  - `delivery_method` (text) - email, sms, both
  - `delivery_day` (integer, nullable) - 0-6 for day of week (0=Sunday), null for daily
  - `delivery_time` (time) - time of day to send report
  - `recipients` (jsonb) - array of email addresses and phone numbers
  - `is_active` (boolean) - whether subscription is active
  - `created_by` (uuid, references user_profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - Enable RLS on report_subscriptions table
  - Add policies for authenticated users to manage their organization's subscriptions
  
  ## Important Notes
  1. Report types: weekly_compliance, daily_temperature, weekly_checklist, monthly_document, monthly_vendor, weekly_team
  2. Recipients stored as JSON array: [{"email": "user@example.com"}, {"phone": "+1234567890"}]
  3. delivery_day: 0=Sunday, 1=Monday, etc. (null for daily reports)
  4. Multiple subscriptions can exist for same report type with different recipients
*/

CREATE TABLE IF NOT EXISTS report_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly',
  delivery_method text NOT NULL DEFAULT 'email',
  delivery_day integer,
  delivery_time time NOT NULL DEFAULT '07:00:00',
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE report_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report subscriptions in their organization"
  ON report_subscriptions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert report subscriptions in their organization"
  ON report_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update report subscriptions in their organization"
  ON report_subscriptions FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete report subscriptions in their organization"
  ON report_subscriptions FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_report_subscriptions_org ON report_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_active ON report_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_type ON report_subscriptions(report_type);