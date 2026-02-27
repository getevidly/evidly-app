-- ============================================================================
-- Migration: FOG Compliance Tracking + Solid-Fuel Cooking Classification
-- ============================================================================
-- 1. grease_trap_services table — FOG pumping event tracking with chain of custody
-- 2. Solid-fuel checklist template items (NFPA 96 Chapter 14)
-- 3. New equipment types for backflow, grease interceptor, and solid-fuel
-- ============================================================================

BEGIN;

-- ─── 1. Grease Trap / FOG Compliance Tracking ──────────────────────────

CREATE TABLE IF NOT EXISTS grease_trap_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

  -- Service event data
  service_date DATE NOT NULL,
  trap_size_gallons NUMERIC,
  gallons_collected NUMERIC NOT NULL,
  percent_full NUMERIC CHECK (percent_full >= 0 AND percent_full <= 100),

  -- Hauler information
  hauler_name TEXT NOT NULL,
  hauler_license_number TEXT,

  -- Receiving facility (disposal chain of custody)
  receiving_facility_name TEXT,
  receiving_facility_address TEXT,
  receiving_facility_permit TEXT,
  manifest_number TEXT,
  disposal_date DATE,

  -- Condition and cost
  condition_notes TEXT,
  cost NUMERIC,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grease_trap_services_org ON grease_trap_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_grease_trap_services_location ON grease_trap_services(location_id);
CREATE INDEX IF NOT EXISTS idx_grease_trap_services_date ON grease_trap_services(service_date DESC);

-- RLS
ALTER TABLE grease_trap_services ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'grease_trap_services' AND policyname = 'org_member_select'
  ) THEN
    CREATE POLICY org_member_select ON grease_trap_services FOR SELECT
      USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'grease_trap_services' AND policyname = 'org_member_insert'
  ) THEN
    CREATE POLICY org_member_insert ON grease_trap_services FOR INSERT
      WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'grease_trap_services' AND policyname = 'org_member_update'
  ) THEN
    CREATE POLICY org_member_update ON grease_trap_services FOR UPDATE
      USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

-- ─── 2. Add cooking_type column to locations if not exists ─────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'locations' AND column_name = 'cooking_type') THEN
    ALTER TABLE locations ADD COLUMN cooking_type TEXT DEFAULT 'moderate_volume';
  END IF;
END $$;

-- ─── 3. Solid-Fuel Checklist Template (NFPA 96 Chapter 14) ────────────
-- Only insert if checklist_templates table exists (from daily_checklists migration)

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checklist_templates') THEN
    -- Create the solid-fuel compliance template
    INSERT INTO checklist_templates (
      id, name, description, checklist_type, frequency, pillar, is_active, is_system
    ) VALUES (
      gen_random_uuid(),
      'Solid-Fuel Cooking — NFPA 96 Chapter 14',
      'Additional compliance requirements for locations with wood-fired, charcoal, or pellet cooking equipment per NFPA 96 (2024) Chapter 14.',
      'compliance',
      'monthly',
      'facility_safety',
      true,
      true
    ) RETURNING id INTO v_template_id;

    -- Insert checklist items
    INSERT INTO checklist_template_items (template_id, item_text, description, pillar, "order") VALUES
      (v_template_id, 'Dedicated exhaust system inspection', 'Verify solid-fuel exhaust is not shared with standard hoods — NFPA 96 §14.4', 'facility_safety', 1),
      (v_template_id, 'Spark arrestor inspection', 'Inspect spark arrestor for damage, blockage, and proper installation — NFPA 96 §14.5', 'facility_safety', 2),
      (v_template_id, 'Grease removal device rated for solid fuel', 'Confirm grease removal device is listed for solid-fuel applications — NFPA 96 §14.6', 'facility_safety', 3),
      (v_template_id, 'Ash disposal protocol documented', 'Verify written ash disposal procedure exists and is followed — NFPA 96 §14.7', 'facility_safety', 4),
      (v_template_id, 'Clearance to combustibles verified', 'Measure and document clearances from solid-fuel appliance to combustible materials — NFPA 96 §14.8', 'facility_safety', 5),
      (v_template_id, 'Creosote inspection (separate from grease)', 'Inspect exhaust system for creosote buildup — requires separate inspection from standard grease — NFPA 96 §14.9', 'facility_safety', 6),
      (v_template_id, 'Monthly hood cleaning verification', 'Confirm hood cleaning was performed within the last 30 days — NFPA 96 Table 12.4 requires monthly for solid-fuel', 'facility_safety', 7),
      (v_template_id, 'Solid-fuel storage area inspection', 'Verify fuel storage meets clearance requirements and is properly contained — NFPA 96 §14.3', 'facility_safety', 8);
  END IF;
END $$;

-- ─── 4. Add new equipment types to any CHECK constraints if they exist ─

-- Update equipment compliance_pillar for new facility_safety types
UPDATE equipment SET compliance_pillar = 'facility_safety'
  WHERE type IN ('grease_interceptor', 'backflow_preventer', 'wood_fired_oven', 'charcoal_grill', 'wood_smoker', 'pellet_smoker')
    AND (compliance_pillar IS NULL OR compliance_pillar = 'food_safety');

COMMIT;
