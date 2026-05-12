-- Checkpoint 2: Add identify_vendor action_type + service_type_definitions for FE/PC

-- 1. Widen CHECK constraint to include identify_vendor
ALTER TABLE onboarding_pillar_requirements
  DROP CONSTRAINT IF EXISTS onboarding_pillar_requirements_action_type_check;

ALTER TABLE onboarding_pillar_requirements
  ADD CONSTRAINT onboarding_pillar_requirements_action_type_check
    CHECK (action_type IN ('upload', 'route_out', 'confirm', 'invite', 'identify_vendor'));

-- 2. Update 6 vendor-service rows from 'upload' to 'identify_vendor'
UPDATE onboarding_pillar_requirements
SET action_type = 'identify_vendor'
WHERE state_code = 'CA'
  AND requirement_code IN (
    'pest_control', 'hood_cleaning', 'fire_suppression',
    'fire_extinguishers', 'fire_alarm', 'sprinkler_system'
  );

-- 3. Add Fire Extinguisher + Pest Control to service_type_definitions
INSERT INTO service_type_definitions (
  code, name, short_name, description, parent_code, icon, color,
  badge_bg, badge_text, base_price, compliance_codes, default_frequency,
  nfpa_citation, catalog_id, is_active
) VALUES
  ('FE', 'Fire Extinguisher Service', 'Fire Extinguisher',
   'Portable fire extinguisher inspection and certification per NFPA 10',
   NULL, 'FireExtinguisher', '#DC2626', '#FEF2F2', '#DC2626',
   0.00, ARRAY['NFPA10'], 'annual', 'NFPA 10', 'fire_extinguisher', true),
  ('PC', 'Pest Control Service', 'Pest Control',
   'Commercial pest management including monitoring and treatment',
   NULL, 'Bug', '#059669', '#ECFDF5', '#059669',
   0.00, ARRAY[]::text[], 'monthly', NULL, 'pest_control', true)
ON CONFLICT (code) DO NOTHING;
