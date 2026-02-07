/*
  # Add Temperature Equipment and Enhanced Checklist Tables

  1. New Tables
    - `temperature_equipment` - Equipment that requires temperature monitoring
    - `temp_check_completions` - Individual temperature check records
    - `receiving_temp_logs` - Temperature logs for receiving deliveries
    - `checklist_templates` - Reusable checklist templates
    - `checklist_template_items` - Items within checklist templates
    - `checklist_template_completions` - Completed checklist instances
    - `checklist_responses` - Individual item responses

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to access their organization's data
*/

-- Temperature Equipment Table
CREATE TABLE IF NOT EXISTS temperature_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  equipment_type varchar(50) NOT NULL,
  min_temp numeric NOT NULL,
  max_temp numeric NOT NULL,
  unit varchar(10) DEFAULT 'F',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE temperature_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view temperature equipment in their organization"
  ON temperature_equipment FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert temperature equipment in their organization"
  ON temperature_equipment FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update temperature equipment in their organization"
  ON temperature_equipment FOR UPDATE
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

CREATE POLICY "Users can delete temperature equipment in their organization"
  ON temperature_equipment FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Temp Check Completions Table
CREATE TABLE IF NOT EXISTS temp_check_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES temperature_equipment(id) ON DELETE CASCADE,
  temperature_value numeric NOT NULL,
  is_within_range boolean NOT NULL,
  recorded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corrective_action text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE temp_check_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view temp check completions in their organization"
  ON temp_check_completions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert temp check completions in their organization"
  ON temp_check_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Receiving Temp Logs Table
CREATE TABLE IF NOT EXISTS receiving_temp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  item_description text NOT NULL,
  temperature_value numeric NOT NULL,
  is_pass boolean NOT NULL,
  received_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receiving_temp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receiving temp logs in their organization"
  ON receiving_temp_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert receiving temp logs in their organization"
  ON receiving_temp_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Checklist Templates Table
CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  checklist_type varchar(50) NOT NULL,
  frequency varchar(50) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist templates in their organization"
  ON checklist_templates FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert checklist templates in their organization"
  ON checklist_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update checklist templates in their organization"
  ON checklist_templates FOR UPDATE
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

CREATE POLICY "Users can delete checklist templates in their organization"
  ON checklist_templates FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Checklist Template Items Table
CREATE TABLE IF NOT EXISTS checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  item_type varchar(50) NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist template items if they can view the template"
  ON checklist_template_items FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM checklist_templates WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert checklist template items if they can access the template"
  ON checklist_template_items FOR INSERT
  TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT id FROM checklist_templates WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update checklist template items if they can access the template"
  ON checklist_template_items FOR UPDATE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM checklist_templates WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM checklist_templates WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete checklist template items if they can access the template"
  ON checklist_template_items FOR DELETE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM checklist_templates WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

-- Checklist Template Completions Table
CREATE TABLE IF NOT EXISTS checklist_template_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  completed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  score_percentage integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_template_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist completions in their organization"
  ON checklist_template_completions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert checklist completions in their organization"
  ON checklist_template_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Checklist Responses Table
CREATE TABLE IF NOT EXISTS checklist_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id uuid NOT NULL REFERENCES checklist_template_completions(id) ON DELETE CASCADE,
  template_item_id uuid NOT NULL REFERENCES checklist_template_items(id) ON DELETE CASCADE,
  response_value text NOT NULL,
  is_pass boolean,
  corrective_action text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist responses for completions they can view"
  ON checklist_responses FOR SELECT
  TO authenticated
  USING (
    completion_id IN (
      SELECT id FROM checklist_template_completions WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert checklist responses for completions they can access"
  ON checklist_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    completion_id IN (
      SELECT id FROM checklist_template_completions WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_temp_equipment_org ON temperature_equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_temp_equipment_location ON temperature_equipment(location_id);
CREATE INDEX IF NOT EXISTS idx_temp_check_completions_equipment ON temp_check_completions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_temp_check_completions_created ON temp_check_completions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receiving_temp_logs_created ON receiving_temp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_org ON checklist_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_template_items_template ON checklist_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_responses_completion ON checklist_responses(completion_id);
CREATE INDEX IF NOT EXISTS idx_checklist_template_completions_template ON checklist_template_completions(template_id);
