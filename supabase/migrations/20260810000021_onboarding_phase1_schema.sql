-- Phase 1: Onboarding data layer schema
-- S1: organizations.onboarding_skipped_items
-- S2: organizations.onboarding_team_invited
-- S3: CREATE TABLE onboarding_pillar_requirements
-- S4: user_profiles role CHECK constraint

-- S1
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_skipped_items JSONB DEFAULT '[]'::jsonb;

-- S2
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_team_invited JSONB DEFAULT '[]'::jsonb;

-- S3
CREATE TABLE IF NOT EXISTS onboarding_pillar_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('food_safety', 'fire_safety')),
  requirement_code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  citation TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'route_out', 'confirm', 'invite', 'identify_vendor')),
  typical_role TEXT NOT NULL CHECK (typical_role IN ('owner_operator','executive','compliance_manager','facilities_manager','chef','kitchen_manager','kitchen_staff')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opr_unique_state_pillar_code UNIQUE (state_code, pillar, requirement_code)
);

ALTER TABLE onboarding_pillar_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read onboarding requirements"
  ON onboarding_pillar_requirements
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE onboarding_pillar_requirements IS
  'State-scoped onboarding requirements per pillar. CA seeded at launch. Rows define what a new org in that state must complete during onboarding.';

-- S4
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('owner_operator','executive','compliance_manager','facilities_manager','chef','kitchen_manager','kitchen_staff','platform_admin'));

-- SEED: CA requirements (12 rows)
-- 2 of 6 food safety citations corrected during primary-source verification per editorial rule:
--   health_permit: CalCode 113700 → CalCode 114381 (§113700 is naming section; §114381 is permit requirement)
--   pest_control: CalCode 114259.5 → CalCode 114259.1 (§114259.5 is live animals; §114259.1 is vermin prevention)

INSERT INTO onboarding_pillar_requirements (state_code, pillar, requirement_code, label, description, citation, action_type, typical_role, sort_order) VALUES
('CA', 'food_safety', 'health_permit', 'Health Permit', 'Valid health permit issued by local EHD, posted in public view', 'CalCode 114381', 'upload', 'compliance_manager', 1),
('CA', 'food_safety', 'food_manager_cert', 'Food Manager Certification', 'At least one certified food safety manager per facility (ServSafe, NRFSP, or equivalent)', 'CalCode 113947.1', 'upload', 'kitchen_manager', 2),
('CA', 'food_safety', 'food_handler_cards', 'Food Handler Cards', 'All food handlers must complete ANSI-accredited training within 30 days of hire', 'CalCode 113948', 'confirm', 'kitchen_manager', 3),
('CA', 'food_safety', 'haccp_plan', 'HACCP Plan', 'Written HACCP plan required for facilities with specialized processes', 'CalCode 114419', 'route_out', 'chef', 4),
('CA', 'food_safety', 'temperature_logs', 'Temperature Logging', 'Time/temperature control for safety foods — continuous monitoring required', 'CalCode 114000', 'route_out', 'kitchen_manager', 5),
('CA', 'food_safety', 'pest_control', 'Pest Control Contract', 'Facility must prevent entrance and harborage of vermin; commercial pest control contract recommended', 'CalCode 114259.1', 'identify_vendor', 'facilities_manager', 6),
('CA', 'fire_safety', 'hood_cleaning', 'Hood Cleaning Schedule', 'Commercial kitchen exhaust systems cleaned per NFPA 96 frequency schedule', 'NFPA 96', 'identify_vendor', 'facilities_manager', 1),
('CA', 'fire_safety', 'fire_suppression', 'Fire Suppression Inspection', 'Kitchen fire suppression system inspected semi-annually by certified technician', 'NFPA 17A', 'identify_vendor', 'facilities_manager', 2),
('CA', 'fire_safety', 'fire_extinguishers', 'Fire Extinguisher Service', 'Portable fire extinguishers inspected monthly, serviced annually', 'NFPA 10', 'identify_vendor', 'facilities_manager', 3),
('CA', 'fire_safety', 'fire_alarm', 'Fire Alarm Monitoring', 'Fire alarm system inspected and tested per NFPA 72 schedule', 'NFPA 72', 'identify_vendor', 'facilities_manager', 4),
('CA', 'fire_safety', 'sprinkler_system', 'Sprinkler Inspection', 'Automatic sprinkler system inspected quarterly, tested annually', 'NFPA 25', 'identify_vendor', 'facilities_manager', 5),
('CA', 'fire_safety', 'ahj_inspection', 'AHJ Fire Inspection', 'Annual fire inspection by Authority Having Jurisdiction — confirm schedule or upload report', 'CFC Chapter 1', 'confirm', 'compliance_manager', 6);
