-- ── GAP-11: Re-Score Alerts ─────────────────────────────────────────
-- Stores alerts generated when compliance data changes warrant a score review.
-- Triggers: overdue CAs, expired certs, equipment maintenance, incidents, signals.
-- ────────────────────────────────────────────────────────────────────

DO $$ BEGIN

-- ── Table: rescore_alerts ──
IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rescore_alerts') THEN
  CREATE TABLE rescore_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facility_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
    facility_name   TEXT NOT NULL,

    -- Alert classification
    pillar          TEXT NOT NULL CHECK (pillar IN ('food', 'fire', 'both')),
    severity        TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),

    -- Trigger source
    trigger_source       TEXT NOT NULL,
    trigger_record_type  TEXT NOT NULL CHECK (trigger_record_type IN ('corrective_action', 'certification', 'equipment', 'incident', 'signal', 'inspection_score')),
    trigger_record_id    TEXT,

    -- Content
    message         TEXT NOT NULL,

    -- Lifecycle
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_rescore_alerts_org_status ON rescore_alerts(org_id, status);
  CREATE INDEX IF NOT EXISTS idx_rescore_alerts_facility ON rescore_alerts(facility_id, status);
  CREATE INDEX IF NOT EXISTS idx_rescore_alerts_severity ON rescore_alerts(org_id, severity, status);
  CREATE INDEX IF NOT EXISTS idx_rescore_alerts_trigger ON rescore_alerts(trigger_record_type, trigger_record_id);
  CREATE INDEX IF NOT EXISTS idx_rescore_alerts_created ON rescore_alerts(created_at DESC);

  -- RLS
  ALTER TABLE rescore_alerts ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS rescore_alerts_org_read ON rescore_alerts;
  CREATE POLICY rescore_alerts_org_read ON rescore_alerts
    FOR SELECT USING (org_id = auth.uid()::UUID OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND organization_id = rescore_alerts.org_id
    ));

  DROP POLICY IF EXISTS rescore_alerts_org_write ON rescore_alerts;
  CREATE POLICY rescore_alerts_org_write ON rescore_alerts
    FOR ALL USING (org_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

  RAISE NOTICE 'Created rescore_alerts table with indexes and RLS';
END IF;

END $$;

-- ── Updated_at trigger ──
CREATE OR REPLACE FUNCTION update_rescore_alerts_updated_at()
RETURNS TRIGGER AS $tr$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$tr$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_rescore_alerts_updated_at ON rescore_alerts;
CREATE TRIGGER set_rescore_alerts_updated_at
  BEFORE UPDATE ON rescore_alerts
  FOR EACH ROW EXECUTE FUNCTION update_rescore_alerts_updated_at();
