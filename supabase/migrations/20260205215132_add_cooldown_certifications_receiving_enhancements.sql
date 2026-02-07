/*
  # Add Cooldown Tracking, Employee Certifications, and Enhanced Receiving

  ## New Tables
  
  ### `employee_certifications`
  - `id` (uuid, primary key)
  - `organization_id` (uuid, references organizations)
  - `user_id` (uuid, references user_profiles)
  - `certification_name` (text) - e.g., Food Handler Card, ServSafe
  - `issue_date` (date)
  - `expiration_date` (date)
  - `status` (text) - active, expired, expiring_soon
  - `file_url` (text, optional) - uploaded certificate file
  - `notes` (text, optional)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `cooldown_logs`
  - `id` (uuid, primary key)
  - `organization_id` (uuid, references organizations)
  - `location_id` (uuid, references locations)
  - `food_item_name` (text)
  - `starting_temp` (decimal) - should be 135°F or higher
  - `stage1_target_temp` (decimal) - 70°F
  - `stage2_target_temp` (decimal) - 41°F
  - `current_stage` (integer) - 1 or 2
  - `status` (text) - active, pass, fail
  - `start_time` (timestamptz)
  - `stage1_complete_time` (timestamptz, optional)
  - `stage2_complete_time` (timestamptz, optional)
  - `recorded_by` (uuid, references user_profiles)
  - `notes` (text, optional)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `cooldown_temp_checks`
  - `id` (uuid, primary key)
  - `cooldown_log_id` (uuid, references cooldown_logs)
  - `temperature_value` (decimal)
  - `check_time` (timestamptz)
  - `stage` (integer) - which stage this check was for
  - `created_at` (timestamptz)
  
  ## Enhanced Tables
  
  ### `receiving_temp_logs` - Add columns for enhanced tracking
  - `item_category` (text) - meat, poultry, seafood, dairy, frozen, produce, other
  - `pass_fail_status` (text) - pass, fail, accepted, rejected
  - `corrective_action` (text, optional)
  - `photo_url` (text, optional) - delivery invoice photo
  - `delivery_time` (timestamptz) - when delivery arrived
  
  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated users to access their organization's data
  
  ## Important Notes
  1. Cooldown tracking follows FDA two-stage cooling:
     - Stage 1: 135°F to 70°F within 2 hours
     - Stage 2: 70°F to 41°F within 4 hours
  2. Employee certifications track expiration and auto-update status
  3. Enhanced receiving supports multiple item categories with specific FDA limits
*/

-- Create employee_certifications table
CREATE TABLE IF NOT EXISTS employee_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  certification_name text NOT NULL,
  issue_date date,
  expiration_date date,
  status text DEFAULT 'active',
  file_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employee_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view certifications in their organization"
  ON employee_certifications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert certifications in their organization"
  ON employee_certifications FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update certifications in their organization"
  ON employee_certifications FOR UPDATE
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

-- Create cooldown_logs table
CREATE TABLE IF NOT EXISTS cooldown_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  food_item_name text NOT NULL,
  starting_temp decimal NOT NULL,
  stage1_target_temp decimal DEFAULT 70,
  stage2_target_temp decimal DEFAULT 41,
  current_stage integer DEFAULT 1,
  status text DEFAULT 'active',
  start_time timestamptz DEFAULT now(),
  stage1_complete_time timestamptz,
  stage2_complete_time timestamptz,
  recorded_by uuid REFERENCES user_profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cooldown_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cooldown logs in their organization"
  ON cooldown_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cooldown logs in their organization"
  ON cooldown_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update cooldown logs in their organization"
  ON cooldown_logs FOR UPDATE
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

-- Create cooldown_temp_checks table
CREATE TABLE IF NOT EXISTS cooldown_temp_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooldown_log_id uuid REFERENCES cooldown_logs(id) ON DELETE CASCADE NOT NULL,
  temperature_value decimal NOT NULL,
  check_time timestamptz DEFAULT now(),
  stage integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cooldown_temp_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cooldown checks for their organization"
  ON cooldown_temp_checks FOR SELECT
  TO authenticated
  USING (
    cooldown_log_id IN (
      SELECT id FROM cooldown_logs 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert cooldown checks for their organization"
  ON cooldown_temp_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    cooldown_log_id IN (
      SELECT id FROM cooldown_logs 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Enhance receiving_temp_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_temp_logs' AND column_name = 'item_category'
  ) THEN
    ALTER TABLE receiving_temp_logs ADD COLUMN item_category text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_temp_logs' AND column_name = 'pass_fail_status'
  ) THEN
    ALTER TABLE receiving_temp_logs ADD COLUMN pass_fail_status text DEFAULT 'pass';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_temp_logs' AND column_name = 'corrective_action'
  ) THEN
    ALTER TABLE receiving_temp_logs ADD COLUMN corrective_action text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_temp_logs' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE receiving_temp_logs ADD COLUMN photo_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_temp_logs' AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE receiving_temp_logs ADD COLUMN delivery_time timestamptz DEFAULT now();
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employee_certifications_org ON employee_certifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_user ON employee_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiration ON employee_certifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_cooldown_logs_org ON cooldown_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_cooldown_logs_status ON cooldown_logs(status);
CREATE INDEX IF NOT EXISTS idx_cooldown_temp_checks_log ON cooldown_temp_checks(cooldown_log_id);