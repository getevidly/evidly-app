-- Audit Trail Reports
-- Stores generated audit trail reports with tamper-evident hashes and shareable links.

-- ── audit_trail_reports ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_trail_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_number TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Configuration
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  location_filter TEXT, -- NULL = all locations
  modules_included TEXT[] NOT NULL DEFAULT '{}',
  
  -- Report content & integrity
  report_data JSONB NOT NULL DEFAULT '{}',
  sha256_hash TEXT NOT NULL,
  
  -- Sharing
  share_token UUID UNIQUE,
  share_expires_at TIMESTAMPTZ,
  shared_with TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'shared', 'expired', 'revoked')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── audit_trail_access_log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_trail_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES audit_trail_reports(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES auth.users(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'share', 'print', 'verify')),
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_trail_reports_org
  ON audit_trail_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_reports_generated_by
  ON audit_trail_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_reports_share_token
  ON audit_trail_reports(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_trail_reports_number
  ON audit_trail_reports(report_number);
CREATE INDEX IF NOT EXISTS idx_audit_trail_access_log_report
  ON audit_trail_access_log(report_id);

-- ── Updated-at trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_audit_trail_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_trail_reports_updated_at
  BEFORE UPDATE ON audit_trail_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_trail_reports_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────
ALTER TABLE audit_trail_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail_access_log ENABLE ROW LEVEL SECURITY;

-- Reports: users can view/manage their org's reports
CREATE POLICY "Users can view own org reports"
  ON audit_trail_reports FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create own org reports"
  ON audit_trail_reports FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org reports"
  ON audit_trail_reports FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Public access via share token (for shared reports)
CREATE POLICY "Public can view shared reports"
  ON audit_trail_reports FOR SELECT TO anon
  USING (
    share_token IS NOT NULL
    AND share_expires_at > NOW()
    AND status = 'shared'
  );

-- Access log: users can view their org's access log
CREATE POLICY "Users can view own org access log"
  ON audit_trail_access_log FOR SELECT TO authenticated
  USING (report_id IN (
    SELECT id FROM audit_trail_reports WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert access log entries"
  ON audit_trail_access_log FOR INSERT TO authenticated
  WITH CHECK (report_id IN (
    SELECT id FROM audit_trail_reports WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- Service role full access
CREATE POLICY "Service role full access audit reports"
  ON audit_trail_reports FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access access log"
  ON audit_trail_access_log FOR ALL TO service_role USING (true);
