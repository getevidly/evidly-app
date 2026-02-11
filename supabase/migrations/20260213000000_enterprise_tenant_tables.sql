-- ================================================================
-- Enterprise Tenant / White-Label Tables
-- ================================================================

-- 1. enterprise_tenants
CREATE TABLE IF NOT EXISTS enterprise_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  powered_by TEXT DEFAULT 'Powered by EvidLY',
  show_powered_by BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('active', 'onboarding', 'pilot', 'suspended')),
  branding_config JSONB DEFAULT '{}',
  domain_config JSONB DEFAULT '{}',
  auth_config JSONB DEFAULT '{}',
  features_config JSONB DEFAULT '{}',
  hierarchy_config JSONB DEFAULT '[]',
  compliance_config JSONB DEFAULT '{}',
  contract_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_tenants_slug ON enterprise_tenants(slug);
CREATE INDEX idx_enterprise_tenants_status ON enterprise_tenants(status);

-- 2. enterprise_sso_configs
CREATE TABLE IF NOT EXISTS enterprise_sso_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
  metadata_url TEXT,
  entity_id TEXT,
  acs_url TEXT,
  certificate_pem TEXT,
  oidc_client_id TEXT,
  oidc_client_secret TEXT,
  oidc_discovery_url TEXT,
  attribute_mapping JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT false,
  test_status TEXT DEFAULT 'untested' CHECK (test_status IN ('passed', 'failed', 'untested')),
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_sso_tenant ON enterprise_sso_configs(tenant_id);

-- 3. enterprise_scim_tokens
CREATE TABLE IF NOT EXISTS enterprise_scim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  description TEXT DEFAULT 'Default SCIM token',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_scim_tenant ON enterprise_scim_tokens(tenant_id);
CREATE INDEX idx_enterprise_scim_hash ON enterprise_scim_tokens(token_hash);

-- 4. enterprise_hierarchy_nodes
CREATE TABLE IF NOT EXISTS enterprise_hierarchy_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES enterprise_hierarchy_nodes(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('corporate', 'division', 'region', 'district', 'location')),
  name TEXT NOT NULL,
  code TEXT,
  location_id UUID,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_hierarchy_tenant ON enterprise_hierarchy_nodes(tenant_id);
CREATE INDEX idx_enterprise_hierarchy_parent ON enterprise_hierarchy_nodes(parent_id);
CREATE INDEX idx_enterprise_hierarchy_level ON enterprise_hierarchy_nodes(level);

-- 5. enterprise_user_mappings
CREATE TABLE IF NOT EXISTS enterprise_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  external_id TEXT,
  sso_provider TEXT,
  groups JSONB DEFAULT '[]',
  role_mapping JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_enterprise_user_tenant ON enterprise_user_mappings(tenant_id);
CREATE INDEX idx_enterprise_user_ext ON enterprise_user_mappings(external_id);

-- 6. enterprise_report_templates
CREATE TABLE IF NOT EXISTS enterprise_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('executive_summary', 'regional_rollup', 'location_detail', 'audit_package')),
  sections JSONB DEFAULT '[]',
  branding_overrides JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_report_tenant ON enterprise_report_templates(tenant_id);

-- 7. enterprise_audit_log
CREATE TABLE IF NOT EXISTS enterprise_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_audit_tenant ON enterprise_audit_log(tenant_id);
CREATE INDEX idx_enterprise_audit_action ON enterprise_audit_log(action);
CREATE INDEX idx_enterprise_audit_created ON enterprise_audit_log(created_at DESC);

-- RLS
ALTER TABLE enterprise_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_scim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_hierarchy_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY enterprise_tenants_service ON enterprise_tenants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_sso_service ON enterprise_sso_configs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_scim_service ON enterprise_scim_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_hierarchy_service ON enterprise_hierarchy_nodes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_users_service ON enterprise_user_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_reports_service ON enterprise_report_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_audit_service ON enterprise_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tenant-scoped read access for authenticated users
CREATE POLICY enterprise_tenants_read ON enterprise_tenants FOR SELECT TO authenticated
  USING (id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_sso_read ON enterprise_sso_configs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_hierarchy_read ON enterprise_hierarchy_nodes FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_users_read ON enterprise_user_mappings FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_reports_read ON enterprise_report_templates FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_audit_read ON enterprise_audit_log FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));
