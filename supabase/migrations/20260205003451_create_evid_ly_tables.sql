/*
  # Create EvidLY Application Tables

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `organization_id` (uuid, references organizations)
      - `avatar_url` (text, nullable)
      - `role` (varchar, default 'member')
      - `points` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `temp_logs`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `location_id` (uuid, references locations)
      - `equipment_name` (text)
      - `temperature` (numeric)
      - `unit` (varchar, default 'F')
      - `recorded_by` (uuid, references auth.users)
      - `recorded_at` (timestamptz)
      - `notes` (text, nullable)
      - `status` (varchar, default 'normal')
      - `created_at` (timestamptz)
    
    - `checklists`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `title` (text)
      - `description` (text, nullable)
      - `frequency` (varchar, e.g., 'daily', 'weekly')
      - `is_template` (boolean, default false)
      - `category` (varchar, nullable)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `checklist_items`
      - `id` (uuid, primary key)
      - `checklist_id` (uuid, references checklists)
      - `title` (text)
      - `description` (text, nullable)
      - `order` (integer)
      - `is_required` (boolean, default true)
      - `created_at` (timestamptz)
    
    - `checklist_assignments`
      - `id` (uuid, primary key)
      - `checklist_id` (uuid, references checklists)
      - `location_id` (uuid, references locations)
      - `assigned_to` (uuid, references auth.users, nullable)
      - `due_date` (date, nullable)
      - `created_at` (timestamptz)
    
    - `checklist_completions`
      - `id` (uuid, primary key)
      - `checklist_id` (uuid, references checklists)
      - `location_id` (uuid, references locations)
      - `completed_by` (uuid, references auth.users)
      - `completed_at` (timestamptz)
      - `items_data` (jsonb)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
    
    - `documents`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `location_id` (uuid, references locations, nullable)
      - `title` (text)
      - `category` (varchar)
      - `file_url` (text)
      - `file_size` (integer, nullable)
      - `file_type` (varchar, nullable)
      - `expiration_date` (date, nullable)
      - `uploaded_by` (uuid, references auth.users)
      - `status` (varchar, default 'active')
      - `tags` (text[], nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `vendors`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `name` (text)
      - `contact_name` (text, nullable)
      - `email` (text, nullable)
      - `phone` (text, nullable)
      - `address` (text, nullable)
      - `category` (varchar, nullable)
      - `license_number` (text, nullable)
      - `license_expiry` (date, nullable)
      - `status` (varchar, default 'active')
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `compliance_requirements`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `title` (text)
      - `description` (text, nullable)
      - `frequency` (varchar)
      - `category` (varchar)
      - `responsible_party` (uuid, references auth.users, nullable)
      - `next_due_date` (date, nullable)
      - `status` (varchar, default 'pending')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `tasks`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `location_id` (uuid, references locations, nullable)
      - `title` (text)
      - `description` (text, nullable)
      - `assigned_to` (uuid, references auth.users, nullable)
      - `due_date` (date, nullable)
      - `priority` (varchar, default 'medium')
      - `status` (varchar, default 'pending')
      - `created_by` (uuid, references auth.users)
      - `completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `activity_logs`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `user_id` (uuid, references auth.users)
      - `action_type` (varchar)
      - `entity_type` (varchar, nullable)
      - `entity_id` (uuid, nullable)
      - `description` (text)
      - `metadata` (jsonb, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their organization's data
    - Add policies for users to read/update their own profiles
*/

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  avatar_url text,
  role varchar(50) DEFAULT 'member',
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Temp Logs Table
CREATE TABLE IF NOT EXISTS temp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  equipment_name text NOT NULL,
  temperature numeric NOT NULL,
  unit varchar(10) DEFAULT 'F',
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz DEFAULT now(),
  notes text,
  status varchar(50) DEFAULT 'normal',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE temp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view temp logs in their organization"
  ON temp_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert temp logs in their organization"
  ON temp_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update temp logs in their organization"
  ON temp_logs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Checklists Table
CREATE TABLE IF NOT EXISTS checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  frequency varchar(50) NOT NULL,
  is_template boolean DEFAULT false,
  category varchar(100),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklists in their organization"
  ON checklists FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert checklists in their organization"
  ON checklists FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update checklists in their organization"
  ON checklists FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete checklists in their organization"
  ON checklists FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Checklist Items Table
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items if they can view the checklist"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert checklist items if they can access the checklist"
  ON checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update checklist items if they can access the checklist"
  ON checklist_items FOR UPDATE
  TO authenticated
  USING (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete checklist items if they can access the checklist"
  ON checklist_items FOR DELETE
  TO authenticated
  USING (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

-- Checklist Assignments Table
CREATE TABLE IF NOT EXISTS checklist_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments in their organization"
  ON checklist_assignments FOR SELECT
  TO authenticated
  USING (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert assignments in their organization"
  ON checklist_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update assignments in their organization"
  ON checklist_assignments FOR UPDATE
  TO authenticated
  USING (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete assignments in their organization"
  ON checklist_assignments FOR DELETE
  TO authenticated
  USING (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

-- Checklist Completions Table
CREATE TABLE IF NOT EXISTS checklist_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  completed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  items_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view completions in their organization"
  ON checklist_completions FOR SELECT
  TO authenticated
  USING (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert completions in their organization"
  ON checklist_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    checklist_id IN (
      SELECT id FROM checklists WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  title text NOT NULL,
  category varchar(100) NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type varchar(50),
  expiration_date date,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status varchar(50) DEFAULT 'active',
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their organization"
  ON documents FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents in their organization"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their organization"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their organization"
  ON documents FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  category varchar(100),
  license_number text,
  license_expiry date,
  status varchar(50) DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendors in their organization"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vendors in their organization"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vendors in their organization"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vendors in their organization"
  ON vendors FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Compliance Requirements Table
CREATE TABLE IF NOT EXISTS compliance_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  frequency varchar(50) NOT NULL,
  category varchar(100) NOT NULL,
  responsible_party uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  next_due_date date,
  status varchar(50) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance requirements in their organization"
  ON compliance_requirements FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert compliance requirements in their organization"
  ON compliance_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update compliance requirements in their organization"
  ON compliance_requirements FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete compliance requirements in their organization"
  ON compliance_requirements FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  priority varchar(50) DEFAULT 'medium',
  status varchar(50) DEFAULT 'pending',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their organization"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks in their organization"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their organization"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their organization"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type varchar(100) NOT NULL,
  entity_type varchar(100),
  entity_id uuid,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs in their organization"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activity logs in their organization"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_temp_logs_org ON temp_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_temp_logs_location ON temp_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_temp_logs_recorded_at ON temp_logs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiration ON documents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);