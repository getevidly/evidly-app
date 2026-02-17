-- ═══════════════════════════════════════════════════════════════════════
-- Daily Checklists Module — Database + Templates + HACCP Pipeline
--
-- Enhances existing checklist/HACCP/equipment tables with:
--   - Authority citations (CalCode, NFPA 96, CFC, Title 19)
--   - HACCP CCP mapping on temperature items
--   - Pillar assignments (food_safety / fire_safety)
--   - Temperature thresholds
--   - Equipment service tracking (Ansul, extinguishers, hoods)
--
-- Creates new: alerts table
-- Seeds: 7 default checklist templates with 67 items
--
-- References: CalCode §113947-114259, NFPA 96 (2024), CFC Title 24 Part 9
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- PART 1: ALTER EXISTING TABLES — Add missing columns
-- ═══════════════════════════════════════════════════════════════════════

-- ── checklist_templates — add pillar, facility_id, sort_order ────────
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS pillar TEXT DEFAULT 'food_safety',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ── checklist_template_items — add authority, HACCP, temperature ─────
ALTER TABLE checklist_template_items
  ADD COLUMN IF NOT EXISTS item_text TEXT,
  ADD COLUMN IF NOT EXISTS pillar TEXT DEFAULT 'food_safety',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS authority_source TEXT DEFAULT 'evidly_best_practice',
  ADD COLUMN IF NOT EXISTS authority_section TEXT,
  ADD COLUMN IF NOT EXISTS authority_note TEXT,
  ADD COLUMN IF NOT EXISTS temp_min DECIMAL,
  ADD COLUMN IF NOT EXISTS temp_max DECIMAL,
  ADD COLUMN IF NOT EXISTS temp_unit TEXT DEFAULT 'F',
  ADD COLUMN IF NOT EXISTS haccp_ccp TEXT,
  ADD COLUMN IF NOT EXISTS haccp_hazard TEXT,
  ADD COLUMN IF NOT EXISTS haccp_critical_limit TEXT,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_photo_on_fail BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_corrective_action BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_checklist_items_ccp
  ON checklist_template_items(haccp_ccp) WHERE haccp_ccp IS NOT NULL;

-- ── checklist_template_completions — add review, status, counts ──────
ALTER TABLE checklist_template_completions
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passed_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL;

CREATE INDEX IF NOT EXISTS idx_checklist_completions_status
  ON checklist_template_completions(status);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_date
  ON checklist_template_completions(completed_at);

-- ── checklist_responses — add temperature, device, corrective detail ─
ALTER TABLE checklist_responses
  ADD COLUMN IF NOT EXISTS response_type TEXT,
  ADD COLUMN IF NOT EXISTS response_passed BOOLEAN,
  ADD COLUMN IF NOT EXISTS temperature_reading DECIMAL,
  ADD COLUMN IF NOT EXISTS corrective_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS corrective_action_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_checklist_responses_temp
  ON checklist_responses(temperature_reading) WHERE temperature_reading IS NOT NULL;

-- ── haccp_plans — add facility_id, version, specialized_processes ────
ALTER TABLE haccp_plans
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS specialized_processes JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_haccp_plans_facility
  ON haccp_plans(facility_id) WHERE facility_id IS NOT NULL;

-- ── haccp_critical_control_points — add name, frequency, linked items ─
ALTER TABLE haccp_critical_control_points
  ADD COLUMN IF NOT EXISTS ccp_name TEXT,
  ADD COLUMN IF NOT EXISTS monitoring_frequency TEXT,
  ADD COLUMN IF NOT EXISTS record_keeping TEXT,
  ADD COLUMN IF NOT EXISTS linked_item_ids UUID[] DEFAULT '{}';

-- ── haccp_monitoring_logs — add facility, corrective, source links ───
ALTER TABLE haccp_monitoring_logs
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS critical_limit TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS corrective_action_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS source_checklist_completion_id UUID REFERENCES checklist_template_completions(id),
  ADD COLUMN IF NOT EXISTS source_checklist_response_id UUID REFERENCES checklist_responses(id);

CREATE INDEX IF NOT EXISTS idx_haccp_logs_facility_date
  ON haccp_monitoring_logs(facility_id, monitored_at) WHERE facility_id IS NOT NULL;

-- ── equipment — add fire safety specific columns ────────────────────
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS pillar TEXT DEFAULT 'fire_safety',
  ADD COLUMN IF NOT EXISTS location_in_facility TEXT,
  ADD COLUMN IF NOT EXISTS temp_min DECIMAL,
  ADD COLUMN IF NOT EXISTS temp_max DECIMAL,
  ADD COLUMN IF NOT EXISTS service_frequency TEXT,
  ADD COLUMN IF NOT EXISTS last_service_date DATE,
  ADD COLUMN IF NOT EXISTS next_service_date DATE,
  ADD COLUMN IF NOT EXISTS service_vendor TEXT,
  ADD COLUMN IF NOT EXISTS service_vendor_cert TEXT,
  ADD COLUMN IF NOT EXISTS extinguisher_class TEXT,
  ADD COLUMN IF NOT EXISTS extinguisher_last_annual DATE,
  ADD COLUMN IF NOT EXISTS extinguisher_last_6yr DATE,
  ADD COLUMN IF NOT EXISTS extinguisher_hydro_due DATE,
  ADD COLUMN IF NOT EXISTS suppression_last_inspection DATE,
  ADD COLUMN IF NOT EXISTS suppression_next_inspection DATE,
  ADD COLUMN IF NOT EXISTS suppression_agent_expiry DATE,
  ADD COLUMN IF NOT EXISTS hood_cleaning_frequency TEXT,
  ADD COLUMN IF NOT EXISTS hood_last_cleaned DATE,
  ADD COLUMN IF NOT EXISTS hood_next_cleaning DATE,
  ADD COLUMN IF NOT EXISTS hood_cleaning_vendor TEXT,
  ADD COLUMN IF NOT EXISTS hood_cleaning_cert TEXT;

CREATE INDEX IF NOT EXISTS idx_equipment_pillar
  ON equipment(pillar) WHERE pillar IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- PART 2: CREATE NEW TABLE — alerts
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,

  alert_type TEXT NOT NULL CHECK (alert_type IN ('info', 'warning', 'critical')),
  category TEXT NOT NULL,

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  authority_reference TEXT,

  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_facility ON alerts(facility_id);
CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved
  ON alerts(facility_id, is_resolved) WHERE is_resolved = false;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts in their organization"
  ON alerts FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update alerts in their organization"
  ON alerts FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access alerts"
  ON alerts FOR ALL TO service_role USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- PART 3: HACCP AUTO-POPULATE TRIGGER
-- When a checklist response is inserted for an item with a HACCP CCP,
-- automatically insert a monitoring log entry
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_haccp_from_checklist_response()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_completion RECORD;
  v_ccp_id UUID;
  v_org_id UUID;
  v_facility_id UUID;
BEGIN
  -- Look up the checklist item to see if it has a HACCP CCP
  SELECT * INTO v_item
    FROM checklist_template_items
    WHERE id = NEW.template_item_id;

  IF v_item IS NULL OR v_item.haccp_ccp IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up completion for org/facility context
  SELECT * INTO v_completion
    FROM checklist_template_completions
    WHERE id = NEW.completion_id;

  IF v_completion IS NULL THEN
    RETURN NEW;
  END IF;

  v_org_id := v_completion.organization_id;
  v_facility_id := v_completion.location_id;

  -- Find the matching CCP record for this facility
  SELECT hccp.id INTO v_ccp_id
    FROM haccp_critical_control_points hccp
    JOIN haccp_plans hp ON hccp.plan_id = hp.id
    WHERE hccp.ccp_number = v_item.haccp_ccp
      AND (hp.facility_id = v_facility_id OR hp.organization_id = v_org_id)
    LIMIT 1;

  -- Only insert if we found a matching CCP
  IF v_ccp_id IS NOT NULL THEN
    INSERT INTO haccp_monitoring_logs (
      ccp_id,
      organization_id,
      facility_id,
      reading_value,
      reading_unit,
      reading_text,
      is_within_limit,
      monitored_by,
      monitored_at,
      critical_limit,
      corrective_action,
      source_checklist_completion_id,
      source_checklist_response_id
    ) VALUES (
      v_ccp_id,
      v_org_id,
      v_facility_id,
      NEW.temperature_reading,
      'F',
      COALESCE(NEW.response_value, ''),
      COALESCE(NEW.response_passed, NEW.is_pass, true),
      v_completion.completed_by,
      COALESCE(NEW.responded_at, now()),
      v_item.haccp_critical_limit,
      NEW.corrective_action,
      NEW.completion_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to avoid duplicate trigger
DROP TRIGGER IF EXISTS trg_log_haccp_from_checklist ON checklist_responses;

CREATE TRIGGER trg_log_haccp_from_checklist
  AFTER INSERT ON checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION log_haccp_from_checklist_response();

-- ═══════════════════════════════════════════════════════════════════════
-- PART 4: SEED DEFAULT CHECKLIST TEMPLATES
-- 7 templates covering food safety + fire safety
-- All items have authority citations
-- ═══════════════════════════════════════════════════════════════════════

-- Use a DO block so we can use variables for template IDs
DO $$
DECLARE
  v_system_org_id UUID;
  t_opening_food UUID;
  t_opening_fire UUID;
  t_receiving UUID;
  t_mid_shift UUID;
  t_closing UUID;
  t_fire_weekly UUID;
  t_fire_monthly UUID;
BEGIN

  -- Get or create a system organization for default templates
  -- Default templates have organization_id but NULL facility_id (org-wide)
  SELECT id INTO v_system_org_id FROM organizations LIMIT 1;

  -- If no organization exists yet, skip seeding (will be done on first org creation)
  IF v_system_org_id IS NULL THEN
    RAISE NOTICE 'No organization found — skipping template seed. Templates will be created on first org setup.';
    RETURN;
  END IF;

  -- Check if we already seeded (idempotent)
  IF EXISTS (SELECT 1 FROM checklist_templates WHERE name = 'Opening Checklist — Food Safety' AND organization_id = v_system_org_id) THEN
    RAISE NOTICE 'Default templates already seeded — skipping.';
    RETURN;
  END IF;

  -- ══════════════════════════════════════════════════════
  -- Template 1: Opening Checklist — Food Safety
  -- ══════════════════════════════════════════════════════
  INSERT INTO checklist_templates (id, organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (gen_random_uuid(), v_system_org_id, 'Opening Checklist — Food Safety', 'opening', 'daily', 'food_safety', 1, true)
  RETURNING id INTO t_opening_food;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, authority_note, is_critical, haccp_ccp, haccp_hazard, haccp_critical_limit, requires_corrective_action, requires_photo_on_fail, temp_max, "order", sort_order) VALUES
  (t_opening_food, 'Employee health screening completed', 'Employee health screening completed — all staff report illness symptoms to PIC', 'yes_no', 'food_safety', 'employee_health', 'calcode', '§113949.5', 'CalCode requires employees to report illness symptoms to PIC', true, NULL, NULL, NULL, false, false, NULL, 1, 1),
  (t_opening_food, 'Hair restraints worn', 'All employees wearing proper hair restraints', 'yes_no', 'food_safety', 'employee_health', 'calcode', '§113969.5', 'Hair restraints required for all food handlers', false, NULL, NULL, NULL, false, false, NULL, 2, 2),
  (t_opening_food, 'Handwashing stations stocked', 'Handwashing stations stocked — soap, paper towels, warm water', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§113953', 'Must have soap, single-use towels, and warm water at all handwash sinks', false, NULL, NULL, NULL, true, false, NULL, 3, 3),
  (t_opening_food, 'Sanitizer concentration verified', 'Sanitizer buckets prepared — concentration verified (chlorine 50-200 ppm or per manufacturer for quat)', 'temperature', 'food_safety', 'sanitation', 'calcode', '§113980(c)', 'Sanitizer concentration must be within effective range', false, NULL, NULL, NULL, true, false, NULL, 4, 4),
  (t_opening_food, 'Walk-in cooler temperature', 'Walk-in cooler temperature ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'Cold holding at 41°F or below', false, 'CCP-01', 'Biological — pathogen growth', '≤41°F', false, false, 41, 5, 5),
  (t_opening_food, 'Walk-in freezer temperature', 'Walk-in freezer temperature ≤0°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'Frozen food storage at 0°F or below', false, 'CCP-01', 'Biological — pathogen growth', '≤0°F', false, false, 0, 6, 6),
  (t_opening_food, 'Reach-in cooler temperatures', 'Reach-in cooler temperatures ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'All reach-in units at proper cold holding temp', false, 'CCP-01', 'Biological — pathogen growth', '≤41°F', false, false, 41, 7, 7),
  (t_opening_food, 'Prep surfaces sanitized', 'Prep surfaces clean and sanitized', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114097', 'Food contact surfaces must be clean and sanitized before use', false, NULL, NULL, NULL, false, false, NULL, 8, 8),
  (t_opening_food, 'No pest activity', 'No evidence of pest activity', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114259', 'Facility must be free of vermin', false, NULL, NULL, NULL, false, true, NULL, 9, 9),
  (t_opening_food, 'Food storage 6" off floor', 'Food storage — items 6 inches off floor', 'yes_no', 'food_safety', 'storage', 'calcode', '§114047.1', 'Food must be stored at least 6 inches above floor', false, NULL, NULL, NULL, false, false, NULL, 10, 10),
  (t_opening_food, 'Date labels on prepped items', 'Date labels on all prepped items', 'yes_no', 'food_safety', 'storage', 'calcode', '§114057.1', 'Ready-to-eat TCS food held >24hrs must be date-marked', false, NULL, NULL, NULL, false, false, NULL, 11, 11),
  (t_opening_food, 'FIFO rotation verified', 'FIFO (First In First Out) rotation verified', 'yes_no', 'food_safety', 'storage', 'evidly_best_practice', NULL, 'Ensures oldest product used first to prevent spoilage', false, NULL, NULL, NULL, false, false, NULL, 12, 12),
  (t_opening_food, 'Thermometer calibrated', 'Thermometer calibrated — ice bath 32°F ±2°', 'yes_no', 'food_safety', 'equipment', 'calcode', '§114002(b)', 'Thermometers must be accurate to ±2°F', true, NULL, NULL, NULL, false, false, NULL, 13, 13);

  -- ══════════════════════════════════════════════════════
  -- Template 2: Opening Checklist — Fire Safety (Daily)
  -- ══════════════════════════════════════════════════════
  INSERT INTO checklist_templates (id, organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (gen_random_uuid(), v_system_org_id, 'Opening Checklist — Fire Safety', 'fire_daily', 'daily', 'fire_safety', 2, true)
  RETURNING id INTO t_opening_fire;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, authority_note, "order", sort_order) VALUES
  (t_opening_fire, 'Hood system visual inspection', 'Hood system visual inspection — filters in place, no visible grease buildup', 'yes_no', 'fire_safety', 'hood_system', 'nfpa_96', '§11.4', 'NFPA 96 requires regular inspection of grease removal devices', 1, 1),
  (t_opening_fire, 'Ansul system gauge check', 'Ansul system indicator — gauge in green range', 'yes_no', 'fire_safety', 'suppression', 'nfpa_96', '§12.1', 'Fire suppression system must show proper pressure', 2, 2),
  (t_opening_fire, 'Manual pull station accessible', 'Manual pull station — accessible, not blocked', 'yes_no', 'fire_safety', 'suppression', 'cfc', '§607.2', 'Manual activation device must be unobstructed', 3, 3),
  (t_opening_fire, 'K-class extinguisher in place', 'K-class fire extinguisher — in place near cooking equipment, pin intact', 'yes_no', 'fire_safety', 'extinguisher', 'nfpa_96', '§12.3', 'Class K extinguisher required within 30ft of cooking', 4, 4),
  (t_opening_fire, 'Exit signs illuminated', 'Exit signs — illuminated front and back of house', 'yes_no', 'fire_safety', 'egress', 'cfc', '§1013.1', 'Exit signs must be illuminated at all times', 5, 5),
  (t_opening_fire, 'Exit routes clear', 'Exit routes — clear and unobstructed', 'yes_no', 'fire_safety', 'egress', 'cfc', '§1003.6', 'Means of egress must be free of obstructions', 6, 6),
  (t_opening_fire, 'Emergency lighting functional', 'Emergency lighting — functional', 'yes_no', 'fire_safety', 'egress', 'cfc', '§1008.3', 'Emergency lighting must activate on power failure', 7, 7),
  (t_opening_fire, 'Gas line connections secure', 'Gas line connections — no smell, secure', 'yes_no', 'fire_safety', 'general_fire', 'evidly_best_practice', NULL, 'Check gas connections for leaks before firing equipment', 8, 8);

  -- ══════════════════════════════════════════════════════
  -- Template 3: Receiving Temperature Log
  -- ══════════════════════════════════════════════════════
  INSERT INTO checklist_templates (id, organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (gen_random_uuid(), v_system_org_id, 'Receiving Temperature Log', 'receiving', 'per_shift', 'food_safety', 3, true)
  RETURNING id INTO t_receiving;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, authority_note, is_critical, haccp_ccp, haccp_hazard, haccp_critical_limit, temp_max, requires_corrective_action, "order", sort_order) VALUES
  (t_receiving, 'Vendor/supplier name', 'Vendor/supplier name', 'text', 'food_safety', 'general', 'evidly_best_practice', NULL, NULL, false, NULL, NULL, NULL, NULL, false, 1, 1),
  (t_receiving, 'Delivery truck temperature', 'Delivery truck temperature', 'temperature', 'food_safety', 'temperature', 'calcode', '§113980', 'Delivery vehicle must maintain proper cold chain', true, NULL, NULL, NULL, NULL, false, 2, 2),
  (t_receiving, 'Poultry received ≤41°F', 'Poultry — received at ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113980', 'Poultry must be received at 41°F or below', false, 'CCP-04', 'Biological', '≤41°F', 41, true, 3, 3),
  (t_receiving, 'Ground meat received ≤41°F', 'Ground meat — received at ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113980', 'Ground meat must be received at 41°F or below', false, 'CCP-04', 'Biological', '≤41°F', 41, true, 4, 4),
  (t_receiving, 'Seafood received ≤41°F', 'Seafood — received at ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113980', 'Seafood must be received at 41°F or below', false, 'CCP-04', 'Biological', '≤41°F', 41, true, 5, 5),
  (t_receiving, 'Dairy received ≤41°F', 'Dairy — received at ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113980', 'Dairy must be received at 41°F or below', false, 'CCP-04', 'Biological', '≤41°F', 41, true, 6, 6),
  (t_receiving, 'Frozen items received ≤0°F', 'Frozen items — received at ≤0°F, no evidence of thawing', 'temperature', 'food_safety', 'temperature', 'calcode', '§113980', 'Frozen food received at 0°F or below', false, NULL, NULL, NULL, 0, true, 7, 7),
  (t_receiving, 'Produce visual inspection', 'Produce — visual inspection, no damage/mold', 'yes_no', 'food_safety', 'general', 'calcode', '§113996', 'Fresh produce must be free of damage and contamination', false, NULL, NULL, NULL, NULL, false, 8, 8),
  (t_receiving, 'Packaging intact', 'Packaging intact — no dents, tears, pest evidence', 'yes_no', 'food_safety', 'general', 'calcode', '§113980', 'Reject packages showing damage or contamination', false, NULL, NULL, NULL, NULL, false, 9, 9),
  (t_receiving, 'Photo of delivery receipt', 'Photo of delivery receipt', 'photo', 'food_safety', 'general', 'evidly_best_practice', NULL, 'Document delivery for traceability', false, NULL, NULL, NULL, NULL, false, 10, 10),
  (t_receiving, 'Items rejected', 'Items rejected — describe reason', 'text', 'food_safety', 'general', 'evidly_best_practice', NULL, 'Document any rejected items and reason', false, NULL, NULL, NULL, NULL, false, 11, 11);

  -- ══════════════════════════════════════════════════════
  -- Template 4: Mid-Shift Temperature Check
  -- ══════════════════════════════════════════════════════
  INSERT INTO checklist_templates (id, organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (gen_random_uuid(), v_system_org_id, 'Mid-Shift Temperature Check', 'mid_shift', 'per_shift', 'food_safety', 4, true)
  RETURNING id INTO t_mid_shift;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, authority_note, haccp_ccp, haccp_hazard, haccp_critical_limit, temp_min, temp_max, "order", sort_order) VALUES
  (t_mid_shift, 'Hot holding ≥135°F', 'Hot holding — all items ≥135°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'Hot held TCS food must be at 135°F or above', 'CCP-02', 'Biological — pathogen growth', '≥135°F', 135, NULL, 1, 1),
  (t_mid_shift, 'Cold holding ≤41°F', 'Cold holding — all items ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'Cold held TCS food must be at 41°F or below', 'CCP-01', 'Biological — pathogen growth', '≤41°F', NULL, 41, 2, 2),
  (t_mid_shift, 'Walk-in cooler temperature', 'Walk-in cooler temperature', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'Walk-in cooler at proper holding temp', 'CCP-01', 'Biological — pathogen growth', '≤41°F', NULL, 41, 3, 3),
  (t_mid_shift, 'Walk-in freezer temperature', 'Walk-in freezer temperature', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'Walk-in freezer at proper storage temp', NULL, NULL, NULL, NULL, 0, 4, 4),
  (t_mid_shift, 'Active cooling on track', 'Active cooling — items in cooling process on track (135→70 in 2hrs, 70→41 in 4hrs)', 'yes_no', 'food_safety', 'temperature', 'calcode', '§114002', 'Two-stage cooling: 135→70°F in 2hrs, 70→41°F within next 4hrs', 'CCP-03', 'Biological — pathogen growth', '135→70 in 2hrs, 70→41 in 4hrs', NULL, NULL, 5, 5),
  (t_mid_shift, 'Handwashing observed', 'Handwashing observed this shift', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§113953', 'Verify proper handwashing technique being followed', NULL, NULL, NULL, NULL, NULL, 6, 6),
  (t_mid_shift, 'Cross-contamination controls', 'Cross-contamination controls in place', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114097', 'Raw and ready-to-eat properly separated', NULL, NULL, NULL, NULL, NULL, 7, 7);

  -- ══════════════════════════════════════════════════════
  -- Template 5: Closing Checklist — Food Safety
  -- ══════════════════════════════════════════════════════
  INSERT INTO checklist_templates (id, organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (gen_random_uuid(), v_system_org_id, 'Closing Checklist — Food Safety', 'closing', 'daily', 'food_safety', 5, true)
  RETURNING id INTO t_closing;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, authority_note, is_critical, haccp_ccp, haccp_critical_limit, temp_max, requires_corrective_action, "order", sort_order) VALUES
  (t_closing, 'Walk-in cooler final temp', 'Walk-in cooler final temperature ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'Verify cooler holding temp before closing', false, 'CCP-01', '≤41°F', 41, false, 1, 1),
  (t_closing, 'Walk-in freezer final temp', 'Walk-in freezer final temperature ≤0°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', 'Verify freezer storage temp before closing', false, NULL, NULL, 0, false, 2, 2),
  (t_closing, 'Cooling items completed', 'All cooling items completed to ≤41°F', 'yes_no', 'food_safety', 'temperature', 'calcode', '§114002', 'All items in cooling process must reach 41°F', true, 'CCP-03', '≤41°F', NULL, true, 3, 3),
  (t_closing, 'Walk-in storage order', 'Walk-in storage order verified — raw below ready-to-eat', 'yes_no', 'food_safety', 'storage', 'calcode', '§114049', 'Proper vertical storage prevents cross-contamination', false, NULL, NULL, NULL, false, 4, 4),
  (t_closing, 'Prepped items dated', 'All prepped items dated and labeled', 'yes_no', 'food_safety', 'storage', 'calcode', '§114057.1', 'TCS food held >24hrs must have date marks', false, NULL, NULL, NULL, false, 5, 5),
  (t_closing, 'Surfaces cleaned and sanitized', 'Food contact surfaces cleaned and sanitized', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114097', 'All food contact surfaces sanitized at end of shift', false, NULL, NULL, NULL, false, 6, 6),
  (t_closing, 'Floors swept and mopped', 'Floors swept and mopped', 'yes_no', 'food_safety', 'sanitation', 'evidly_best_practice', NULL, 'Clean floors reduce pest attraction', false, NULL, NULL, NULL, false, 7, 7),
  (t_closing, 'Drains cleared', 'Drains cleared', 'yes_no', 'food_safety', 'sanitation', 'evidly_best_practice', NULL, 'Prevents standing water and pest breeding', false, NULL, NULL, NULL, false, 8, 8),
  (t_closing, 'Restroom supplies stocked', 'Restroom supplies stocked — soap, towels, toilet paper', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§113977', 'Restroom facilities must be maintained and supplied', false, NULL, NULL, NULL, false, 9, 9),
  (t_closing, 'Back door sealed', 'Back door sealed — no gaps', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114259.4', 'Outer openings must be protected against pest entry', false, NULL, NULL, NULL, false, 10, 10),
  (t_closing, 'Trash removed', 'Trash removed, dumpster area clean', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114259', 'Waste must be properly contained and removed', false, NULL, NULL, NULL, false, 11, 11),
  (t_closing, 'Equipment powered down', 'Equipment powered down or set to overnight mode', 'yes_no', 'food_safety', 'equipment', 'evidly_best_practice', NULL, 'Ensure non-essential equipment is properly shut down', false, NULL, NULL, NULL, false, 12, 12);

  -- ══════════════════════════════════════════════════════
  -- Template 6: Fire Safety — Weekly
  -- ══════════════════════════════════════════════════════
  INSERT INTO checklist_templates (id, organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (gen_random_uuid(), v_system_org_id, 'Fire Safety — Weekly', 'fire_weekly', 'weekly', 'fire_safety', 6, true)
  RETURNING id INTO t_fire_weekly;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, authority_note, "order", sort_order) VALUES
  (t_fire_weekly, 'Hood filters inspection', 'Hood filters — remove and inspect for grease saturation', 'yes_no', 'fire_safety', 'hood_system', 'nfpa_96', '§11.4', 'Grease removal devices must be cleaned when grease buildup is evident', 1, 1),
  (t_fire_weekly, 'Grease trap level check', 'Grease trap/grease interceptor level check', 'yes_no', 'fire_safety', 'hood_system', 'evidly_best_practice', NULL, 'Prevents overflow and sewer backup', 2, 2),
  (t_fire_weekly, 'Fire extinguishers visual', 'All fire extinguishers — visual inspection, accessible, charged, pin intact', 'yes_no', 'fire_safety', 'extinguisher', 'nfpa_96', '§12.3', 'Portable extinguishers must be inspected monthly minimum', 3, 3),
  (t_fire_weekly, 'Ansul nozzles visual', 'Ansul nozzles — visual check for grease blockage', 'yes_no', 'fire_safety', 'suppression', 'nfpa_96', '§12.1', 'Nozzle tips must be free of grease/debris', 4, 4),
  (t_fire_weekly, 'Emergency exit lighting test', 'Emergency exit lighting — test function', 'yes_no', 'fire_safety', 'egress', 'cfc', '§1008.3', 'Emergency lighting must be tested regularly', 5, 5),
  (t_fire_weekly, 'Electrical panels clearance', 'Electrical panels — 36" clearance maintained', 'yes_no', 'fire_safety', 'general_fire', 'cfc', '§605.3', '36-inch clearance required for electrical panels', 6, 6),
  (t_fire_weekly, 'Combustible clearance 18"', '18" clearance from cooking equipment to combustibles', 'yes_no', 'fire_safety', 'general_fire', 'cfc', '§607.1', 'Maintain clearance between cooking surfaces and combustible materials', 7, 7);

  -- ══════════════════════════════════════════════════════
  -- Template 7: Fire Safety — Monthly
  -- ══════════════════════════════════════════════════════
  INSERT INTO checklist_templates (id, organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (gen_random_uuid(), v_system_org_id, 'Fire Safety — Monthly', 'fire_monthly', 'monthly', 'fire_safety', 7, true)
  RETURNING id INTO t_fire_monthly;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, authority_note, requires_photo_on_fail, "order", sort_order) VALUES
  (t_fire_monthly, 'Extinguisher monthly inspection', 'Fire extinguisher monthly inspection — document on tag', 'yes_no', 'fire_safety', 'extinguisher', 'nfpa_96', '§12.3', 'Monthly inspection required per NFPA 10', true, 1, 1),
  (t_fire_monthly, 'Ansul gauge photo', 'Ansul system gauge — photograph current reading', 'photo', 'fire_safety', 'suppression', 'nfpa_96', '§12.1', 'Document suppression system pressure monthly', false, 2, 2),
  (t_fire_monthly, 'Hood/duct exterior inspection', 'Hood/duct system — visual exterior inspection', 'yes_no', 'fire_safety', 'hood_system', 'nfpa_96', '§11.6', 'Check for grease leaks at duct joints and access panels', false, 3, 3),
  (t_fire_monthly, 'Roof grease containment', 'Grease containment on roof — check level', 'yes_no', 'fire_safety', 'hood_system', 'nfpa_96', '§11.4', 'Rooftop grease containment must not overflow', false, 4, 4),
  (t_fire_monthly, 'Fire alarm test', 'Fire alarm test (if owner-testable)', 'yes_no', 'fire_safety', 'general_fire', 'cfc', '§907.8', 'Fire alarm systems require periodic testing', false, 5, 5),
  (t_fire_monthly, 'Sprinkler head inspection', 'Sprinkler head inspection — not obstructed, not painted', 'yes_no', 'fire_safety', 'general_fire', 'cfc', '§903.5', 'Sprinkler heads must have proper clearance and not be painted or modified', false, 6, 6),
  (t_fire_monthly, 'K-class travel distance', 'K-class extinguisher — verify within 30ft travel distance of cooking', 'yes_no', 'fire_safety', 'extinguisher', 'nfpa_96', '§12.3', 'Maximum 30ft travel distance to Class K extinguisher from cooking equipment', false, 7, 7);

  RAISE NOTICE 'Successfully seeded 7 default checklist templates with items';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════
