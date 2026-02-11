-- ================================================================
-- Enterprise Expanded Tables (White-Label System)
-- ================================================================

-- 1. enterprise_hierarchy_config
CREATE TABLE IF NOT EXISTS enterprise_hierarchy_config (
  tenant_id UUID PRIMARY KEY REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  levels JSONB NOT NULL DEFAULT '[]',
  rollup_method TEXT NOT NULL DEFAULT 'weighted' CHECK (rollup_method IN ('weighted', 'equal')),
  custom_labels JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_hierarchy_config_tenant ON enterprise_hierarchy_config(tenant_id);

-- 2. enterprise_location_assignments
CREATE TABLE IF NOT EXISTS enterprise_location_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  hierarchy_node_id UUID NOT NULL REFERENCES enterprise_hierarchy_nodes(id) ON DELETE CASCADE,
  location_id UUID,
  location_name TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID
);

CREATE INDEX idx_enterprise_loc_assign_tenant ON enterprise_location_assignments(tenant_id);
CREATE INDEX idx_enterprise_loc_assign_node ON enterprise_location_assignments(hierarchy_node_id);

-- 3. enterprise_api_keys
CREATE TABLE IF NOT EXISTS enterprise_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  label TEXT,
  permissions JSONB DEFAULT '[]',
  rate_limit INTEGER DEFAULT 1000,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_api_keys_tenant ON enterprise_api_keys(tenant_id);
CREATE INDEX idx_enterprise_api_keys_hash ON enterprise_api_keys(key_hash);

-- 4. enterprise_report_schedules
CREATE TABLE IF NOT EXISTS enterprise_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES enterprise_report_templates(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  recipients JSONB DEFAULT '[]',
  filters JSONB DEFAULT '{}',
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_report_sched_tenant ON enterprise_report_schedules(tenant_id);
CREATE INDEX idx_enterprise_report_sched_template ON enterprise_report_schedules(template_id);

-- 5. enterprise_rollup_scores
CREATE TABLE IF NOT EXISTS enterprise_rollup_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES enterprise_hierarchy_nodes(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  overall_score NUMERIC(5,2),
  operational_score NUMERIC(5,2),
  equipment_score NUMERIC(5,2),
  documentation_score NUMERIC(5,2),
  location_count INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(node_id, period_date)
);

CREATE INDEX idx_enterprise_rollup_tenant ON enterprise_rollup_scores(tenant_id);
CREATE INDEX idx_enterprise_rollup_node ON enterprise_rollup_scores(node_id);

-- 6. enterprise_integration_config
CREATE TABLE IF NOT EXISTS enterprise_integration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('temperature_monitoring', 'erp', 'bi_tool', 'communication', 'existing_platform')),
  provider_name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  credentials_encrypted TEXT,
  sync_frequency TEXT,
  last_sync_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'error', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_integration_tenant ON enterprise_integration_config(tenant_id);

-- 7. enterprise_bulk_operations
CREATE TABLE IF NOT EXISTS enterprise_bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('location_import', 'template_deploy', 'vendor_assign', 'user_provision', 'compliance_action')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  initiated_by UUID,
  details JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enterprise_bulk_ops_tenant ON enterprise_bulk_operations(tenant_id);

-- RLS
ALTER TABLE enterprise_hierarchy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_location_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_rollup_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_integration_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_bulk_operations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY enterprise_hierarchy_config_service ON enterprise_hierarchy_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_loc_assign_service ON enterprise_location_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_api_keys_service ON enterprise_api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_report_sched_service ON enterprise_report_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_rollup_scores_service ON enterprise_rollup_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_integration_service ON enterprise_integration_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY enterprise_bulk_ops_service ON enterprise_bulk_operations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tenant-scoped read access for authenticated users
CREATE POLICY enterprise_hierarchy_config_read ON enterprise_hierarchy_config FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_loc_assign_read ON enterprise_location_assignments FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_api_keys_read ON enterprise_api_keys FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_report_sched_read ON enterprise_report_schedules FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_rollup_scores_read ON enterprise_rollup_scores FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_integration_read ON enterprise_integration_config FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));

CREATE POLICY enterprise_bulk_ops_read ON enterprise_bulk_operations FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM enterprise_user_mappings WHERE user_id = auth.uid()));
