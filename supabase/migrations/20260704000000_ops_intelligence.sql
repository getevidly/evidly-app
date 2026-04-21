-- ================================================================
-- SP8-OPS-INTEL-01: Operations Intelligence
-- Creates ops_intelligence_insights table for proactive ops insights.
-- Reads from all existing data sources, writes only to this table.
-- ================================================================

-- ── 1. Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ops_intelligence_insights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  priority          INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3),
  category          TEXT NOT NULL CHECK (category IN (
    'pse_exposure', 'document_currency', 'service_currency',
    'team_performance', 'checklist_trend', 'temp_trend',
    'ca_aging', 'multi_location', 'certification_gap',
    'trajectory', 'inspection_readiness', 'jurisdiction_signal',
    'vendor_risk', 'general'
  )),
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  source            TEXT NOT NULL,
  action_text       TEXT,
  action_url        TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed')),
  generated_at      TIMESTAMPTZ DEFAULT now(),
  expires_at        TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  dismissed_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ops_intel_org_status
  ON ops_intelligence_insights(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_ops_intel_org_priority
  ON ops_intelligence_insights(organization_id, priority);

CREATE INDEX IF NOT EXISTS idx_ops_intel_expires
  ON ops_intelligence_insights(expires_at)
  WHERE status = 'active';

-- ── 3. RLS ──────────────────────────────────────────────────────

ALTER TABLE ops_intelligence_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org ops insights" ON ops_intelligence_insights;
CREATE POLICY "Users can view own org ops insights"
  ON ops_intelligence_insights FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own org ops insights" ON ops_intelligence_insights;
CREATE POLICY "Users can update own org ops insights"
  ON ops_intelligence_insights FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role full access on ops_intelligence_insights" ON ops_intelligence_insights;
CREATE POLICY "Service role full access on ops_intelligence_insights"
  ON ops_intelligence_insights FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. Updated_at trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_ops_intelligence_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ops_intelligence_insights_updated_at ON ops_intelligence_insights;
CREATE TRIGGER trg_ops_intelligence_insights_updated_at
  BEFORE UPDATE ON ops_intelligence_insights
  FOR EACH ROW EXECUTE FUNCTION update_ops_intelligence_insights_updated_at();
