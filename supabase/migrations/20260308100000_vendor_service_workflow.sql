-- ================================================================
-- Vendor Service Day Workflow
-- Adds tokenized vendor update pages, service status tracking,
-- two-way verification, and historical scorecard metrics.
-- Builds on existing vendor_service_records table.
-- ================================================================

-- 1. vendor_service_tokens — tokenized access for vendor updates
CREATE TABLE IF NOT EXISTS vendor_service_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id UUID NOT NULL REFERENCES vendor_service_records(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  token_type VARCHAR(20) NOT NULL DEFAULT 'service_update'
    CHECK (token_type IN ('service_update', 'verification')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vst_token ON vendor_service_tokens(token);
CREATE INDEX idx_vst_service_record ON vendor_service_tokens(service_record_id);
CREATE INDEX idx_vst_org ON vendor_service_tokens(organization_id);
CREATE INDEX idx_vst_vendor ON vendor_service_tokens(vendor_id);
CREATE INDEX idx_vst_expires ON vendor_service_tokens(expires_at) WHERE used_at IS NULL;

ALTER TABLE vendor_service_tokens ENABLE ROW LEVEL SECURITY;

-- Public can validate tokens (read-only by token value)
CREATE POLICY "Anyone can validate service tokens"
  ON vendor_service_tokens FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage own org tokens"
  ON vendor_service_tokens FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access vendor service tokens"
  ON vendor_service_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 2. vendor_service_updates — vendor-submitted status updates
CREATE TABLE IF NOT EXISTS vendor_service_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id UUID NOT NULL REFERENCES vendor_service_records(id) ON DELETE CASCADE,
  token_id UUID REFERENCES vendor_service_tokens(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  update_type VARCHAR(20) NOT NULL
    CHECK (update_type IN ('completed', 'rescheduled', 'canceled')),
  technician_name VARCHAR(100),
  completion_date TIMESTAMPTZ,
  reschedule_date DATE,
  reschedule_reason VARCHAR(50),
  cancel_reason VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vsu_service_record ON vendor_service_updates(service_record_id);
CREATE INDEX idx_vsu_org ON vendor_service_updates(organization_id);
CREATE INDEX idx_vsu_vendor ON vendor_service_updates(vendor_id);
CREATE INDEX idx_vsu_type ON vendor_service_updates(update_type);

ALTER TABLE vendor_service_updates ENABLE ROW LEVEL SECURITY;

-- Anon can insert (vendor submitting via token)
CREATE POLICY "Anyone can submit service updates via token"
  ON vendor_service_updates FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view own org updates"
  ON vendor_service_updates FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access vendor service updates"
  ON vendor_service_updates FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 3. vendor_service_verifications — two-way confirmation
CREATE TABLE IF NOT EXISTS vendor_service_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id UUID NOT NULL REFERENCES vendor_service_records(id) ON DELETE CASCADE,
  update_id UUID NOT NULL REFERENCES vendor_service_updates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('confirmed', 'disputed', 'pending')),
  dispute_reason TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vsv_service_record ON vendor_service_verifications(service_record_id);
CREATE INDEX idx_vsv_update ON vendor_service_verifications(update_id);
CREATE INDEX idx_vsv_org ON vendor_service_verifications(organization_id);
CREATE INDEX idx_vsv_status ON vendor_service_verifications(verification_status);

ALTER TABLE vendor_service_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view own org verifications"
  ON vendor_service_verifications FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can manage own org verifications"
  ON vendor_service_verifications FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can update own org verifications"
  ON vendor_service_verifications FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access vendor service verifications"
  ON vendor_service_verifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 4. vendor_scorecard_metrics — historical scorecard snapshots
CREATE TABLE IF NOT EXISTS vendor_scorecard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  reliability_score NUMERIC(5,2),
  on_time_rate NUMERIC(5,2),
  doc_compliance_rate NUMERIC(5,2),
  response_time_avg_hours NUMERIC(8,2),
  total_services INT DEFAULT 0,
  completed_on_time INT DEFAULT 0,
  rescheduled_count INT DEFAULT 0,
  canceled_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vsm_org ON vendor_scorecard_metrics(organization_id);
CREATE INDEX idx_vsm_vendor ON vendor_scorecard_metrics(vendor_id);
CREATE INDEX idx_vsm_period ON vendor_scorecard_metrics(period_start, period_end);
CREATE UNIQUE INDEX idx_vsm_unique_period ON vendor_scorecard_metrics(organization_id, vendor_id, period_start, period_end);

ALTER TABLE vendor_scorecard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view own org scorecard metrics"
  ON vendor_scorecard_metrics FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can manage own org scorecard metrics"
  ON vendor_scorecard_metrics FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access vendor scorecard metrics"
  ON vendor_scorecard_metrics FOR ALL TO service_role
  USING (true) WITH CHECK (true);
