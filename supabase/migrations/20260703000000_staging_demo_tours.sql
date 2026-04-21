-- ================================================================
-- STAGING-DEMO-01: Virtual Demo Environment
-- STAGING ONLY — run on nyucpjheecdkjpgiglzx, never on production
-- Creates demo_templates, demo_tours, demo_vendor_profiles tables,
-- adds source columns for cleanup tracking, and seeds industry +
-- vendor profile data.
-- ================================================================

-- ── 1. demo_templates ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demo_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_type TEXT NOT NULL,
  industry_label TEXT NOT NULL,
  sb1383_tier TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE demo_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admin manages demo templates" ON demo_templates;
CREATE POLICY "Platform admin manages demo templates"
  ON demo_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "service_role_demo_templates" ON demo_templates;
CREATE POLICY "service_role_demo_templates"
  ON demo_templates FOR ALL
  USING (auth.role() = 'service_role');

INSERT INTO demo_templates (industry_type, industry_label, sb1383_tier, description) VALUES
('restaurant', 'Restaurant', 'tier1', 'Full-service restaurant, moderate volume cooking'),
('hotel', 'Hotel / Hospitality', 'tier1', 'Hotel kitchen, banquet, room service operations'),
('healthcare', 'Healthcare / Senior Living', 'tier1', 'Hospital, skilled nursing, senior living food service'),
('k12', 'K-12 Education', 'tier1', 'School district food service, USDA program'),
('contract_food', 'Contract Food Service', 'tier1', 'Aramark/Sodexo-style multi-location operator'),
('state_cardroom', 'State Cardroom / Casino', 'tier1', 'State-licensed cardroom, standard county EHD'),
('tribal_casino', 'Tribal Casino (Indian Gaming)', null, 'Tribal sovereign, TEHO authority, advisory food safety mode'),
('higher_ed', 'Higher Education', 'tier1', 'University, college food service'),
('sb1383_tier1', 'SB 1383 — Tier 1 Generator', 'tier1', 'Large edible food generator — restaurant, hotel, healthcare'),
('sb1383_tier2', 'SB 1383 — Tier 2 Generator', 'tier2', 'Commercial edible food generator — wholesaler, distributor')
ON CONFLICT DO NOTHING;

-- ── 2. demo_tours ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demo_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Prospect info
  prospect_first_name TEXT NOT NULL,
  prospect_last_name TEXT NOT NULL,
  prospect_email TEXT NOT NULL,
  prospect_phone TEXT,
  business_name TEXT NOT NULL,

  -- Template selection
  template_id UUID REFERENCES demo_templates(id),
  industry_type TEXT NOT NULL,
  county TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'California',
  num_locations INTEGER DEFAULT 1,
  location_details JSONB,

  -- Demo account (staging)
  demo_org_id UUID,
  demo_user_id UUID,
  demo_email TEXT,
  demo_password TEXT,
  demo_url TEXT DEFAULT 'https://evidly-app-staging.vercel.app',

  -- Tour status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'active', 'completed', 'cleaned')),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cleanup_scheduled_for TIMESTAMPTZ,
  cleaned_at TIMESTAMPTZ,

  -- Notes
  arthur_notes TEXT,
  outcome TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

ALTER TABLE demo_tours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admin manages demo tours" ON demo_tours;
CREATE POLICY "Platform admin manages demo tours"
  ON demo_tours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "service_role_demo_tours" ON demo_tours;
CREATE POLICY "service_role_demo_tours"
  ON demo_tours FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_demo_tours_status
  ON demo_tours(status);

CREATE INDEX IF NOT EXISTS idx_demo_tours_cleanup
  ON demo_tours(cleanup_scheduled_for)
  WHERE status = 'completed';

-- ── 3. demo_vendor_profiles ───────────────────────────────────

CREATE TABLE IF NOT EXISTS demo_vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_type TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  license_number TEXT,
  insurance_carrier TEXT,
  coverage_amount TEXT,
  certifications JSONB,
  performance_score INTEGER,
  performance_tier TEXT,
  last_service_days_ago INTEGER,
  next_service_days_from_now INTEGER,
  status TEXT,
  notes TEXT,
  industry_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE demo_vendor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admin manages demo vendor profiles" ON demo_vendor_profiles;
CREATE POLICY "Platform admin manages demo vendor profiles"
  ON demo_vendor_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "service_role_demo_vendor_profiles" ON demo_vendor_profiles;
CREATE POLICY "service_role_demo_vendor_profiles"
  ON demo_vendor_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Seed 11 PSE vendor types
INSERT INTO demo_vendor_profiles (
  vendor_type, vendor_name, contact_name, contact_phone, contact_email,
  address, city, state, license_number, insurance_carrier, coverage_amount,
  certifications, performance_score, performance_tier,
  last_service_days_ago, next_service_days_from_now, status, notes,
  industry_types
) VALUES
-- HOOD CLEANING (IKECA certified — CPP branding)
(
  'hood_cleaning', 'Cleaning Pros Plus', 'Samuel Haggerty',
  '(209) 636-6116', 'service@cprosplus.com',
  NULL, 'Merced', 'CA', 'IKECA-76716495', 'Berkley One', '$2,000,000',
  '[{"name":"IKECA CECS","number":"76716495","expiry":"2027-01-01"},{"name":"NFPA 96 Certified","expiry":"2027-01-01"}]'::jsonb,
  96, 'excellent', 45, 45, 'current',
  'IKECA-certified kitchen exhaust cleaning. NFPA 96-2024 compliant service.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- FIRE SUPPRESSION
(
  'fire_suppression', 'Valley Fire Protection Services', 'Mike Torres',
  '(559) 445-2200', 'service@valleyfirepro.com',
  '1847 N Blackstone Ave', 'Fresno', 'CA', 'CSFM-FSC-12847', 'Travelers Insurance', '$2,000,000',
  '[{"name":"CSFM Fire Suppression Tech","number":"FSC-12847","expiry":"2026-12-01"},{"name":"Ansul Certified","expiry":"2026-11-01"}]'::jsonb,
  91, 'excellent', 120, 60, 'current',
  'Semi-annual suppression service. Last inspection passed all checkpoints.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- FIRE EXTINGUISHER
(
  'fire_extinguisher', 'Central Valley Fire Safety', 'Rosa Mendez',
  '(559) 237-8844', 'info@cvfiresafety.com',
  '3201 Fresno St', 'Fresno', 'CA', 'CSFM-FET-44291', 'State Farm Commercial', '$1,000,000',
  '[{"name":"CSFM Fire Extinguisher Tech","number":"FET-44291","expiry":"2026-10-01"}]'::jsonb,
  78, 'good', 305, 60, 'due_soon',
  'Annual inspection due in 60 days. Monthly visual checks up to date.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- FIRE ALARM & MONITORING
(
  'fire_alarm', 'SecureAlert Systems', 'David Park',
  '(916) 442-7700', 'commercial@securealert.com',
  '445 Capitol Mall', 'Sacramento', 'CA', 'CSLB-987234', 'Hartford Insurance', '$2,000,000',
  '[{"name":"NICET Level II","expiry":"2027-03-01"},{"name":"CA Fire Alarm License","number":"CSLB-987234","expiry":"2026-09-01"}]'::jsonb,
  88, 'good', 180, 185, 'current',
  'Annual inspection and monitoring. UL listed central station.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- PEST CONTROL (intentionally at_risk)
(
  'pest_control', 'ProShield Pest Management', 'Carlos Reyes',
  '(559) 485-3300', 'commercial@proshield.com',
  '2847 Ventura Ave', 'Fresno', 'CA', 'CDPR-QAC-88421', 'Nationwide Commercial', '$1,000,000',
  '[{"name":"CA Qualified Applicator Certificate","number":"QAC-88421","expiry":"2026-06-01"}]'::jsonb,
  58, 'at_risk', 35, -5, 'overdue',
  'Monthly service overdue by 5 days. COI renewal pending. Performance flagged.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- GREASE TRAP / FOG
(
  'grease_trap', 'Clean Water Solutions', 'Jennifer Walsh',
  '(559) 264-9900', 'service@cleanwatersolutions.com',
  '1600 N Sunnyside Ave', 'Clovis', 'CA', 'CWEA-WDO-33847', 'Zurich Commercial', '$2,000,000',
  '[{"name":"CWEA Wastewater Treatment Operator","expiry":"2027-01-01"},{"name":"CA Grease Hauler License","number":"GH-44721","expiry":"2026-12-01"}]'::jsonb,
  94, 'excellent', 60, 30, 'due_soon',
  'Quarterly FOG pumping. Waste manifest on file. Clean Water Act compliant.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- ICE MACHINE (overdue)
(
  'ice_machine', 'Arctic Service Company', 'Tom Nguyen',
  '(559) 322-4400', 'commercial@arcticservice.com',
  '789 N Cedar Ave', 'Fresno', 'CA', 'EPA-608-44721', 'Progressive Commercial', '$1,000,000',
  '[{"name":"EPA 608 Certification","number":"44721","expiry":"2027-06-01"},{"name":"CFESA Certified","expiry":"2026-08-01"}]'::jsonb,
  62, 'needs_attention', 210, -30, 'overdue',
  'Ice machine cleaning overdue by 30 days. Sanitization certificate expired.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- HVAC
(
  'hvac', 'ComfortPro Commercial HVAC', 'Steve Martinez',
  '(559) 438-7700', 'commercial@comfortpro.com',
  '4521 E Shields Ave', 'Fresno', 'CA', 'CSLB-C20-778234', 'Employers Holdings', '$2,000,000',
  '[{"name":"CSLB C-20 License","number":"778234","expiry":"2027-09-01"},{"name":"EPA 608 Universal","expiry":"2027-01-01"}]'::jsonb,
  85, 'good', 90, 275, 'current',
  'Semi-annual preventive maintenance. Filter logs on file.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- PLUMBING
(
  'plumbing', 'Valley Commercial Plumbing', 'Frank Oliveira',
  '(559) 497-2200', 'commercial@valleyplumbing.com',
  '2200 N Blackstone Ave', 'Fresno', 'CA', 'CSLB-C36-445821', 'ICW Group', '$2,000,000',
  '[{"name":"CSLB C-36 License","number":"445821","expiry":"2027-06-01"}]'::jsonb,
  90, 'excellent', 180, 185, 'current',
  'Annual plumbing inspection. Grease interceptor compliance verified.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- BACKFLOW PREVENTION (due soon)
(
  'backflow_prevention', 'FlowSafe Backflow Testing', 'Maria Santos',
  '(559) 291-8800', 'testing@flowsafe.com',
  '1122 N Fresno St', 'Fresno', 'CA', 'AWWA-BPT-22841', 'Markel Insurance', '$1,000,000',
  '[{"name":"AWWA Backflow Tester Certification","number":"BPT-22841","expiry":"2026-11-01"}]'::jsonb,
  82, 'good', 320, 45, 'due_soon',
  'Annual backflow test due in 45 days. Previous test passed.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
),
-- COMMERCIAL INSURANCE
(
  'commercial_insurance', 'Pacific Kitchen Insurance Group', 'Linda Chen',
  '(415) 882-4400', 'commercial@pacifickitchen.com',
  '101 California St', 'San Francisco', 'CA', 'CA-DOI-0H44821', 'Lloyd''s of London', '$3,000,000',
  '[{"name":"CA DOI Licensed Broker","number":"0H44821","expiry":"2027-01-01"}]'::jsonb,
  95, 'excellent', 30, 335, 'current',
  'Commercial general liability + property. Food contamination rider included.',
  ARRAY['restaurant','hotel','healthcare','k12','contract_food','state_cardroom','tribal_casino','higher_ed','sb1383_tier1','sb1383_tier2']
)
ON CONFLICT DO NOTHING;

-- ── 4. Add source column to existing tables ───────────────────

ALTER TABLE temp_logs ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE checklist_completions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE equipment_service_records ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE insurance_risk_scores ADD COLUMN IF NOT EXISTS source TEXT;
-- Create sb1383_compliance if it doesn't exist (may be missing on staging)
CREATE TABLE IF NOT EXISTS sb1383_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  reporting_period TEXT,
  edible_food_recovery_lbs NUMERIC,
  organic_waste_diverted_lbs NUMERIC,
  food_recovery_partner TEXT,
  food_recovery_agreement_on_file BOOLEAN DEFAULT false,
  generator_tier INTEGER,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE sb1383_compliance ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS source TEXT;

-- ── 5. Add tribal casino advisory columns to organizations ───

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS food_safety_mode TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS food_safety_authority TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS food_safety_advisory_text TEXT;

-- ── 6. Partial indexes for cleanup queries ────────────────────

CREATE INDEX IF NOT EXISTS idx_temp_logs_source
  ON temp_logs(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_source
  ON documents(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_source
  ON vendors(source) WHERE source IS NOT NULL;
