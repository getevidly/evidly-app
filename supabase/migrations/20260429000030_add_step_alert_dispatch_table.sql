-- Migration: Add step_alert_dispatch table replacing cooldown_alert_dispatch
-- Why: Constitutional rule — every HACCP step can trigger alerts, not just
--      cooldown. cooldown_alert_dispatch was a single-step prototype (0 rows,
--      never wired). step_alert_dispatch is the polymorphic replacement that
--      covers all 8 HACCP steps with a single table.
-- Destructive changes:
--   - DROP TABLE cooldown_alert_dispatch (0 rows, pre-launch safe)
--   - DROP TYPE cooldown_alert_method (orphan after table drop)
--   - DROP TYPE cooldown_alert_outcome (orphan after table drop)
-- Design notes:
--   - step column uses existing haccp_step enum (8 values)
--   - alert_severity enum: info, warning, critical, escalated
--   - alert_dispatch_status enum: pending, dispatched, acknowledged, resolved, failed
--   - 6 nullable source FKs (temperature_log_id, receiving_temp_log_id,
--     cooldown_log_id, cooldown_temp_check_id, equipment_id, food_batch_id)
--   - acknowledged_by + resolved_by FK to user_profiles
--   - RLS: SELECT + UPDATE only — alerts are system-generated (no INSERT),
--     resolution is irreversible (no DELETE)
--   - dispatch_channels TEXT[] for multi-channel dispatch (email, sms, push)
--   - escalation_count + next_escalation_at for escalation scheduling
-- Cross-references:
--   - Phase 1 Schema Sprint commit 1 (haccp_step enum)
--   - Phase 1 Schema Sprint commit 7.5 (dropped legacy sensor_alerts →
--     step_alert_dispatch absorbs that role)
--   - Future Alert Engine Sprint (edge function that writes to this table)

-- ── Drop legacy cooldown_alert_dispatch + orphan enums ──────────────

DROP TABLE IF EXISTS cooldown_alert_dispatch CASCADE;
DROP TYPE IF EXISTS cooldown_alert_method;
DROP TYPE IF EXISTS cooldown_alert_outcome;

-- ── alert_severity enum ────────────────────────────────────────────

CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical',
  'escalated'
);

-- ── alert_dispatch_status enum ─────────────────────────────────────

CREATE TYPE alert_dispatch_status AS ENUM (
  'pending',
  'dispatched',
  'acknowledged',
  'resolved',
  'failed'
);

-- ── step_alert_dispatch table ──────────────────────────────────────

CREATE TABLE step_alert_dispatch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  step haccp_step NOT NULL,
  severity alert_severity NOT NULL,
  status alert_dispatch_status NOT NULL DEFAULT 'pending',
  rule_key TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  temperature_log_id UUID NULL REFERENCES temperature_logs(id) ON DELETE SET NULL,
  receiving_temp_log_id UUID NULL REFERENCES receiving_temp_logs(id) ON DELETE SET NULL,
  cooldown_log_id UUID NULL REFERENCES cooldown_logs(id) ON DELETE SET NULL,
  cooldown_temp_check_id UUID NULL REFERENCES cooldown_temp_checks(id) ON DELETE SET NULL,
  equipment_id UUID NULL REFERENCES temperature_equipment(id) ON DELETE SET NULL,
  food_batch_id UUID NULL REFERENCES food_batches(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ NULL,
  acknowledged_at TIMESTAMPTZ NULL,
  acknowledged_by UUID NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  escalation_count SMALLINT NOT NULL DEFAULT 0,
  next_escalation_at TIMESTAMPTZ NULL,
  dispatch_channels TEXT[] NOT NULL DEFAULT '{}'::text[],
  dispatch_errors JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes

CREATE INDEX idx_step_alert_dispatch_organization_id
  ON step_alert_dispatch(organization_id);

CREATE INDEX idx_step_alert_dispatch_location_id
  ON step_alert_dispatch(location_id);

CREATE INDEX idx_step_alert_dispatch_step_status
  ON step_alert_dispatch(step, status);

CREATE INDEX idx_step_alert_dispatch_temperature_log_id
  ON step_alert_dispatch(temperature_log_id)
  WHERE temperature_log_id IS NOT NULL;

CREATE INDEX idx_step_alert_dispatch_cooldown_log_id
  ON step_alert_dispatch(cooldown_log_id)
  WHERE cooldown_log_id IS NOT NULL;

CREATE INDEX idx_step_alert_dispatch_equipment_id
  ON step_alert_dispatch(equipment_id)
  WHERE equipment_id IS NOT NULL;

CREATE INDEX idx_step_alert_dispatch_triggered_desc
  ON step_alert_dispatch(triggered_at DESC);

CREATE INDEX idx_step_alert_dispatch_unresolved
  ON step_alert_dispatch(location_id, triggered_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX idx_step_alert_dispatch_pending_escalation
  ON step_alert_dispatch(next_escalation_at)
  WHERE status IN ('pending', 'dispatched')
    AND next_escalation_at IS NOT NULL;

-- RLS

ALTER TABLE step_alert_dispatch ENABLE ROW LEVEL SECURITY;

CREATE POLICY step_alert_dispatch_select ON step_alert_dispatch
  FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY step_alert_dispatch_update ON step_alert_dispatch
  FOR UPDATE
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

-- NOTE: No INSERT policy — alerts are system-generated via edge functions.
-- NOTE: No DELETE policy — alert resolution is irreversible per audit rules.
