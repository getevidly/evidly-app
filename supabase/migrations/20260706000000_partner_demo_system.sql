-- ================================================================
-- STAGING-DEMO-02: Partnership & Channel Demo System
-- STAGING ONLY — run on nyucpjheecdkjpgiglzx, never on production
-- Creates partner_demos and partner_demo_templates tables,
-- adds partial indexes for source = 'partner_demo' cleanup,
-- RLS for platform_admin only.
-- ================================================================

-- ── 1. partner_demo_templates ───────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_demo_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_type TEXT NOT NULL,
  partner_label TEXT NOT NULL,
  description TEXT,
  default_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE partner_demo_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admin manages partner demo templates"
  ON partner_demo_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "service_role_partner_demo_templates"
  ON partner_demo_templates FOR ALL
  USING (auth.role() = 'service_role');

INSERT INTO partner_demo_templates (partner_type, partner_label, description, default_config) VALUES
(
  'vendor',
  'Hood Cleaning / Fire Safety Vendor',
  'Vendor partner demo: 5 client locations across 3 counties, 12-month service history, PSE impact tracking, Vendor Connect slot data.',
  '{"counties": ["Merced", "Fresno", "Stanislaus"], "client_count": 5, "service_months": 12}'::jsonb
),
(
  'association',
  'Trade Association Partner',
  'Association partner demo: 10 member orgs across 5 counties, aggregate compliance data, K2C impact tracking.',
  '{"counties": ["Merced", "Fresno", "Stanislaus", "Los Angeles", "San Diego"], "member_count": 10}'::jsonb
),
(
  'integration',
  'Integration / Technology Partner',
  'Integration partner demo: 3-5 joint customer locations with mock integration data for Toast, DineHR, Next Insurance, or Cintas.',
  '{"integration_types": ["toast", "dinehr", "next_insurance", "cintas"], "customer_count": 4}'::jsonb
),
(
  'carrier',
  'Insurance Carrier',
  'Carrier partner demo: 10 locations across 4 counties, CIC 5-pillar risk output, PSE verification status, insurance risk scores.',
  '{"counties": ["Merced", "Fresno", "Stanislaus", "Los Angeles"], "location_count": 10}'::jsonb
),
(
  'tribal_casino',
  'Tribal Casino Sales Demo',
  'Tribal casino demo: 1 tribal org with 5 food outlets, 60 days operational data, fire safety fully populated, NIGC checklist, 11 PSE vendors.',
  '{"outlet_count": 5, "data_days": 60}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ── 2. partner_demos ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Partner info
  partner_type TEXT NOT NULL
    CHECK (partner_type IN ('vendor', 'association', 'integration', 'carrier', 'tribal_casino')),
  partner_company TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,

  -- Type-specific config stored as JSONB
  partner_config JSONB DEFAULT '{}',

  -- Demo account (staging)
  demo_org_id UUID,
  demo_user_id UUID,
  demo_email TEXT,
  demo_password TEXT,
  demo_url TEXT DEFAULT 'https://evidly-app-staging.vercel.app',

  -- Status lifecycle
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'expired', 'cleaned')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cleanup_scheduled_for TIMESTAMPTZ,
  cleaned_at TIMESTAMPTZ,

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE partner_demos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admin manages partner demos"
  ON partner_demos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "service_role_partner_demos"
  ON partner_demos FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_partner_demos_status
  ON partner_demos(status);

CREATE INDEX IF NOT EXISTS idx_partner_demos_cleanup
  ON partner_demos(cleanup_scheduled_for)
  WHERE status IN ('active', 'completed');

CREATE INDEX IF NOT EXISTS idx_partner_demos_partner_type
  ON partner_demos(partner_type);

-- ── 3. Partial indexes for partner_demo source tag cleanup ──────
-- Rows with source = 'partner_demo' need fast lookup during cleanup.
-- The source columns already exist (added by STAGING-DEMO-01).

CREATE INDEX IF NOT EXISTS idx_temp_logs_partner_source
  ON temp_logs(organization_id) WHERE source = 'partner_demo';

CREATE INDEX IF NOT EXISTS idx_checklist_completions_partner_source
  ON checklist_completions(location_id) WHERE source = 'partner_demo';

CREATE INDEX IF NOT EXISTS idx_documents_partner_source
  ON documents(organization_id) WHERE source = 'partner_demo';

CREATE INDEX IF NOT EXISTS idx_equipment_service_records_partner_source
  ON equipment_service_records(organization_id) WHERE source = 'partner_demo';

CREATE INDEX IF NOT EXISTS idx_insurance_risk_scores_partner_source
  ON insurance_risk_scores(organization_id) WHERE source = 'partner_demo';

CREATE INDEX IF NOT EXISTS idx_vendors_partner_source
  ON vendors(organization_id) WHERE source = 'partner_demo';

CREATE INDEX IF NOT EXISTS idx_checklists_partner_source
  ON checklists(organization_id) WHERE source = 'partner_demo';

CREATE INDEX IF NOT EXISTS idx_locations_partner_source
  ON locations(organization_id) WHERE source = 'partner_demo';

-- ── 4. updated_at trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_partner_demos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partner_demos_updated_at
  BEFORE UPDATE ON partner_demos
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_demos_updated_at();
