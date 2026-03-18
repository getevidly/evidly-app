-- ============================================================
-- JURISDICTION-DRIFT-MONITOR-02: Support tickets + full execution logging
-- ============================================================
-- Creates the complete drift detection infrastructure:
--   1. fire_jurisdiction_config column on jurisdictions
--   2. jurisdiction_config_baselines — hash-locked audit baselines
--   3. drift_alert_log — every detected config change
--   4. support_tickets — auto-generated tickets for unauthorized changes
--   5. drift_monitor_executions — full trigger execution audit trail
--   6. fn_jurisdiction_config_drift_check() trigger function
-- ============================================================

-- ── PREREQUISITE: Add fire_jurisdiction_config JSONB to jurisdictions ──
-- Consolidates fire-related config into a single hashable JSONB column.
ALTER TABLE jurisdictions
  ADD COLUMN IF NOT EXISTS fire_jurisdiction_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN jurisdictions.fire_jurisdiction_config IS
  'Consolidated fire AHJ configuration. Hashed for drift detection alongside grading_config.';

-- ── TABLE 1: jurisdiction_config_baselines ──────────────────
-- Stores the verified hash of each jurisdiction''s grading_config
-- and fire_jurisdiction_config at the time of the last audit.

CREATE TABLE IF NOT EXISTS jurisdiction_config_baselines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE UNIQUE,
  grading_config_hash TEXT NOT NULL,
  fire_config_hash TEXT NOT NULL,
  baseline_locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by TEXT NOT NULL DEFAULT 'system',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_baselines_jurisdiction
  ON jurisdiction_config_baselines(jurisdiction_id);

COMMENT ON TABLE jurisdiction_config_baselines IS
  'Hash-locked baselines from JURISDICTION-AUDIT-TRIPLE-PASS. Any config change that does not match triggers a drift alert.';


-- ── TABLE 2: drift_alert_log ───────────────────────────────
-- Logs every detected drift event with old/new hashes and values.

CREATE TABLE IF NOT EXISTS drift_alert_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  jurisdiction_name TEXT NOT NULL,
  config_changed TEXT NOT NULL,
  old_hash TEXT,
  new_hash TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drift_alerts_jurisdiction
  ON drift_alert_log(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_drift_alerts_detected
  ON drift_alert_log(detected_at DESC);

COMMENT ON TABLE drift_alert_log IS
  'Immutable log of every detected jurisdiction config drift. Never delete rows.';


-- ── TABLE 3: support_tickets ───────────────────────────────
-- Auto-generated tickets for drift events. Also usable for manual tickets.

CREATE TYPE ticket_status AS ENUM ('open', 'investigating', 'resolved', 'false_alarm');
CREATE TYPE ticket_priority AS ENUM ('critical', 'high', 'medium', 'low');

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'jurisdiction_drift',
  priority ticket_priority NOT NULL DEFAULT 'critical',
  status ticket_status NOT NULL DEFAULT 'open',
  related_jurisdiction_id UUID REFERENCES jurisdictions(id),
  related_drift_alert_id UUID REFERENCES drift_alert_log(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT
);

CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_jurisdiction ON support_tickets(related_jurisdiction_id);

COMMENT ON TABLE support_tickets IS
  'Auto-generated and manual support tickets. Jurisdiction drift tickets are auto-created by the drift monitor — never delete, only resolve.';

-- Auto-increment ticket number sequence
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_updated
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_timestamp();


-- ── TABLE 4: drift_monitor_executions ──────────────────────
-- Logs EVERY trigger fire — drift or no drift. Full audit trail.

CREATE TABLE IF NOT EXISTS drift_monitor_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  jurisdiction_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  grading_config_hash TEXT NOT NULL,
  fire_config_hash TEXT NOT NULL,
  baseline_grading_hash TEXT,
  baseline_fire_hash TEXT,
  grading_match BOOLEAN NOT NULL,
  fire_match BOOLEAN NOT NULL,
  drift_detected BOOLEAN NOT NULL DEFAULT false,
  drift_alert_id UUID REFERENCES drift_alert_log(id),
  ticket_id UUID REFERENCES support_tickets(id),
  execution_duration_ms INTEGER,
  changed_by TEXT
);

CREATE INDEX idx_drift_executions_at ON drift_monitor_executions(executed_at DESC);
CREATE INDEX idx_drift_executions_jurisdiction ON drift_monitor_executions(jurisdiction_id);
CREATE INDEX idx_drift_executions_drift ON drift_monitor_executions(drift_detected) WHERE drift_detected = true;

COMMENT ON TABLE drift_monitor_executions IS
  'Complete execution log of every drift monitor trigger fire. Proves the monitor ran even when no drift was found. Never delete rows.';


-- ── TRIGGER FUNCTION ───────────────────────────────────────
-- Replaces the original fn_jurisdiction_config_drift_check (if any).
-- Logs every execution, creates support tickets on drift.

CREATE OR REPLACE FUNCTION fn_jurisdiction_config_drift_check()
RETURNS TRIGGER AS $$
DECLARE
  baseline RECORD;
  new_grading_hash TEXT;
  new_fire_hash TEXT;
  grading_changed BOOLEAN := false;
  fire_changed BOOLEAN := false;
  config_changed_label TEXT;
  alert_id UUID;
  ticket_id UUID;
  execution_id UUID;
  start_ts TIMESTAMPTZ := clock_timestamp();
  exec_duration INTEGER;
  changer TEXT;
BEGIN
  -- Identify who made the change
  changer := COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'sub',
    auth.uid()::text,
    current_user,
    'unknown'
  );

  -- Compute hashes of the NEW config values
  new_grading_hash := encode(sha256(COALESCE(NEW.grading_config::text, 'null')::bytea), 'hex');
  new_fire_hash := encode(sha256(COALESCE(NEW.fire_jurisdiction_config::text, 'null')::bytea), 'hex');

  -- Look up baseline
  SELECT * INTO baseline
  FROM jurisdiction_config_baselines
  WHERE jurisdiction_id = NEW.id;

  -- ── NO BASELINE — log execution, create ticket, alert, exit ──
  IF NOT FOUND THEN
    exec_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_ts)::integer;

    -- Log execution
    INSERT INTO drift_monitor_executions (
      jurisdiction_id, jurisdiction_name, grading_config_hash, fire_config_hash,
      baseline_grading_hash, baseline_fire_hash, grading_match, fire_match,
      drift_detected, execution_duration_ms, changed_by
    ) VALUES (
      NEW.id, NEW.agency_name, new_grading_hash, new_fire_hash,
      NULL, NULL, false, false,
      true, exec_duration, changer
    );

    -- Log drift alert
    INSERT INTO drift_alert_log (
      jurisdiction_id, jurisdiction_name, config_changed,
      old_hash, new_hash, new_value, changed_by
    ) VALUES (
      NEW.id, NEW.agency_name, 'NO_BASELINE',
      'none', new_grading_hash, NEW.grading_config, changer
    ) RETURNING id INTO alert_id;

    -- Create support ticket
    INSERT INTO support_tickets (
      title, description, category, priority,
      related_jurisdiction_id, related_drift_alert_id, metadata
    ) VALUES (
      'DRIFT: No baseline — ' || NEW.agency_name,
      'Jurisdiction "' || NEW.agency_name || '" was updated but has no audit baseline. '
        || 'This jurisdiction may have been added after the last audit or was missed. '
        || 'Changed by: ' || changer || '. '
        || 'Action: Run JURISDICTION-AUDIT-TRIPLE-PASS to establish a baseline.',
      'jurisdiction_drift', 'critical',
      NEW.id, alert_id,
      jsonb_build_object(
        'alert_type', 'NO_BASELINE',
        'changed_by', changer,
        'new_grading_hash', new_grading_hash,
        'new_fire_hash', new_fire_hash
      )
    ) RETURNING id INTO ticket_id;

    -- Fire Edge Function
    PERFORM net.http_post(
      url := current_setting('app.settings.drift_alert_url', true),
      body := jsonb_build_object(
        'alert_id', alert_id,
        'ticket_id', ticket_id,
        'jurisdiction_name', NEW.agency_name,
        'alert_type', 'NO_BASELINE',
        'changed_by', changer,
        'message', 'Jurisdiction has no audit baseline — may be newly added or missed by audit'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      )
    );

    RETURN NEW;
  END IF;

  -- ── Compare hashes ──
  grading_changed := (new_grading_hash IS DISTINCT FROM baseline.grading_config_hash);
  fire_changed := (new_fire_hash IS DISTINCT FROM baseline.fire_config_hash);

  -- Calculate duration
  exec_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_ts)::integer;

  -- ── NO DRIFT — log clean execution and exit ──
  IF NOT grading_changed AND NOT fire_changed THEN
    INSERT INTO drift_monitor_executions (
      jurisdiction_id, jurisdiction_name, grading_config_hash, fire_config_hash,
      baseline_grading_hash, baseline_fire_hash, grading_match, fire_match,
      drift_detected, execution_duration_ms, changed_by
    ) VALUES (
      NEW.id, NEW.agency_name, new_grading_hash, new_fire_hash,
      baseline.grading_config_hash, baseline.fire_config_hash, true, true,
      false, exec_duration, changer
    );
    RETURN NEW;
  END IF;

  -- ── DRIFT DETECTED ──
  config_changed_label := CASE
    WHEN grading_changed AND fire_changed THEN 'both'
    WHEN grading_changed THEN 'grading_config'
    ELSE 'fire_jurisdiction_config'
  END;

  -- Log drift alert
  INSERT INTO drift_alert_log (
    jurisdiction_id, jurisdiction_name, config_changed,
    old_hash, new_hash, old_value, new_value, changed_by
  ) VALUES (
    NEW.id, NEW.agency_name, config_changed_label,
    CASE WHEN grading_changed THEN baseline.grading_config_hash ELSE baseline.fire_config_hash END,
    CASE WHEN grading_changed THEN new_grading_hash ELSE new_fire_hash END,
    CASE WHEN grading_changed THEN OLD.grading_config ELSE OLD.fire_jurisdiction_config END,
    CASE WHEN grading_changed THEN NEW.grading_config ELSE NEW.fire_jurisdiction_config END,
    changer
  ) RETURNING id INTO alert_id;

  -- Create support ticket
  INSERT INTO support_tickets (
    title, description, category, priority,
    related_jurisdiction_id, related_drift_alert_id, metadata
  ) VALUES (
    'DRIFT: Unauthorized change — ' || NEW.agency_name || ' (' || config_changed_label || ')',
    'Jurisdiction "' || NEW.agency_name || '" config was modified. '
      || 'Config changed: ' || config_changed_label || '. '
      || 'Changed by: ' || changer || '. '
      || 'Old hash: ' || CASE WHEN grading_changed THEN baseline.grading_config_hash ELSE baseline.fire_config_hash END || '. '
      || 'New hash: ' || CASE WHEN grading_changed THEN new_grading_hash ELSE new_fire_hash END || '. '
      || 'Action: Review the change in drift_alert_log (id: ' || alert_id || '). '
      || 'If unauthorized, revert immediately and investigate source. '
      || 'If authorized, update the baseline by running JURISDICTION-AUDIT-TRIPLE-PASS.',
    'jurisdiction_drift', 'critical',
    NEW.id, alert_id,
    jsonb_build_object(
      'config_changed', config_changed_label,
      'changed_by', changer,
      'old_grading_hash', baseline.grading_config_hash,
      'new_grading_hash', new_grading_hash,
      'old_fire_hash', baseline.fire_config_hash,
      'new_fire_hash', new_fire_hash,
      'grading_changed', grading_changed,
      'fire_changed', fire_changed
    )
  ) RETURNING id INTO ticket_id;

  -- Log execution with drift
  INSERT INTO drift_monitor_executions (
    jurisdiction_id, jurisdiction_name, grading_config_hash, fire_config_hash,
    baseline_grading_hash, baseline_fire_hash, grading_match, fire_match,
    drift_detected, drift_alert_id, ticket_id, execution_duration_ms, changed_by
  ) VALUES (
    NEW.id, NEW.agency_name, new_grading_hash, new_fire_hash,
    baseline.grading_config_hash, baseline.fire_config_hash,
    NOT grading_changed, NOT fire_changed,
    true, alert_id, ticket_id, exec_duration, changer
  );

  -- Fire Edge Function for email alert
  PERFORM net.http_post(
    url := current_setting('app.settings.drift_alert_url', true),
    body := jsonb_build_object(
      'alert_id', alert_id,
      'ticket_id', ticket_id,
      'ticket_number', (SELECT ticket_number FROM support_tickets WHERE id = ticket_id),
      'jurisdiction_name', NEW.agency_name,
      'jurisdiction_id', NEW.id,
      'config_changed', config_changed_label,
      'changed_by', changer,
      'old_hash', CASE WHEN grading_changed THEN baseline.grading_config_hash ELSE baseline.fire_config_hash END,
      'new_hash', CASE WHEN grading_changed THEN new_grading_hash ELSE new_fire_hash END,
      'detected_at', now()
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── ATTACH TRIGGER ─────────────────────────────────────────
-- Fires on every UPDATE to jurisdictions that touches config columns.

DROP TRIGGER IF EXISTS trg_jurisdiction_config_drift ON jurisdictions;

CREATE TRIGGER trg_jurisdiction_config_drift
  AFTER UPDATE OF grading_config, fire_jurisdiction_config ON jurisdictions
  FOR EACH ROW
  EXECUTE FUNCTION fn_jurisdiction_config_drift_check();
