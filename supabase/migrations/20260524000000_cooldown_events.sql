-- ============================================================
-- Cooldown Events — PRP-powered two-stage cooldown tracking
-- CalCode §114002 · FDA §3-501.14
-- ============================================================

-- ── cooldown_events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cooldown_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  food_item_name TEXT NOT NULL,
  cooling_location TEXT,
  starting_temperature NUMERIC(5,1) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage_1_target_at TIMESTAMPTZ NOT NULL,
  stage_2_target_at TIMESTAMPTZ NOT NULL,
  stage_1_completed_at TIMESTAMPTZ,
  stage_2_completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'stage_1_complete', 'completed', 'failed', 'cancelled')),
  failed_stage SMALLINT CHECK (failed_stage IN (1, 2)),
  disposition TEXT CHECK (disposition IN ('discarded', 'reheated_recooled', 'other')),
  disposition_notes TEXT,
  disposition_witnessed_by UUID,
  disposition_corrective_action_id UUID REFERENCES corrective_actions(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── cooldown_checks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cooldown_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooldown_event_id UUID NOT NULL REFERENCES cooldown_events(id) ON DELETE CASCADE,
  temperature NUMERIC(5,1) NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  checked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cooldown_events_org ON cooldown_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_cooldown_events_location ON cooldown_events(location_id);
CREATE INDEX IF NOT EXISTS idx_cooldown_events_status ON cooldown_events(status);
CREATE INDEX IF NOT EXISTS idx_cooldown_checks_event ON cooldown_checks(cooldown_event_id);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE cooldown_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooldown_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY cooldown_events_org_isolation ON cooldown_events
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY cooldown_checks_org_isolation ON cooldown_checks
  USING (cooldown_event_id IN (
    SELECT id FROM cooldown_events WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- ── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_cooldown_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cooldown_events_updated_at
  BEFORE UPDATE ON cooldown_events
  FOR EACH ROW
  EXECUTE FUNCTION update_cooldown_events_updated_at();
